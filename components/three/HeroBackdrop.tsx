"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useWebGLSupported } from "@/hooks/useWebGLSupported";
import atlas from "@/lib/posterAtlas.json";
import { POSTER_ASPECT } from "@/lib/posters";
import { mulberry32 } from "@/lib/rand";

const CAM_Z = 8;
const FOV = 45;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const POSTER_H = 1.7;
const POSTER_W = POSTER_H * POSTER_ASPECT;
// Half the hero copy column in CSS px: max-w-4xl (896px) / 2 + a 24px breath.
const COPY_HALF_PX = 472;
// Below this width the copy spans the screen: show ~2/3 of the posters.
const DENSE_MIN_PX = 768;
// Brightness kept by posters passing behind the copy column (gutters stay 1).
const BEHIND_COPY = 0.45;

/** Three depth layers. Near posters are larger on screen, brighter, faster and
 *  parallax the most; far ones are small, dim and slow. Each layer is laid out
 *  as staggered columns per side (`cols`) with `rows` posters per column, and
 *  every poster in a column shares one speed, so posters never collide or
 *  clump however dense the field gets. Near/mid columns live in the gutters
 *  beside the copy; the far layer spans the full width behind it. */
const LAYERS = [
  { z: [0.8, 2.0], cols: 1, rows: 4, gutter: true, speed: 0.2, light: 0.7, parallax: 0.35 },
  { z: [-3.2, -0.9], cols: 2, rows: 5, gutter: true, speed: 0.13, light: 0.46, parallax: 0.2 },
  { z: [-9, -5.5], cols: 4, rows: 4, gutter: false, speed: 0.07, light: 0.24, parallax: 0.08 },
] as const;

interface Slot {
  z: number;
  side: number;
  /** 0..1 across the gutter (gutter layers) or across the half-width (far). */
  u: number;
  gutter: boolean;
  phase: number;
  speed: number;
  light: number;
  parallax: number;
  tiltY: number;
  tiltZ: number;
  sway: number;
  /** Shown on phones too (otherwise tablet/desktop only). */
  core: boolean;
  /** Entrance delay in seconds: nearest layer first. */
  enter: number;
}

function layout(): Slot[] {
  const rnd = mulberry32(7);
  const slots: Slot[] = [];
  LAYERS.forEach((L, li) => {
    for (const side of [-1, 1]) {
      for (let c = 0; c < L.cols; c++) {
        const speed = L.speed * (0.9 + rnd() * 0.2); // one speed per column
        for (let r = 0; r < L.rows; r++) {
          slots.push({
            z: L.z[0] + rnd() * (L.z[1] - L.z[0]),
            side,
            u: (c + 0.25 + rnd() * 0.5) / L.cols,
            gutter: L.gutter,
            // Even rows + a half-row brick offset between neighbouring columns.
            phase: (r + (c % 2) * 0.5 + (side > 0 ? 0.25 : 0) + rnd() * 0.18) / L.rows,
            speed,
            light: L.light,
            parallax: L.parallax,
            tiltY: -side * (0.12 + rnd() * 0.1), // angle in toward the copy
            tiltZ: (rnd() - 0.5) * 0.1,
            sway: rnd() * Math.PI * 2,
            core: (r + c) % 3 !== 2,
            enter: li * 0.25 + rnd() * 0.6,
          });
        }
      }
    }
  });
  // Far -> near draw order: with depthWrite off, blending stays correct.
  return slots.sort((a, b) => a.z - b.z);
}

// Seeded, so the composition is identical on every visit; only posters change.
const SLOTS = layout();

const vertexShader = /* glsl */ `
  attribute vec4 aCell;   // atlas uv offset (xy) + size (zw)
  attribute vec2 aShade;  // brightness, opacity
  varying vec2 vUv;
  varying vec2 vLocal;
  varying vec2 vShade;
  void main() {
    vLocal = uv;
    vUv = aCell.xy + uv * aCell.zw;
    vShade = aShade;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

// Rounded corners and the 1px pure-white 10% hairline are drawn analytically
// (SDF + fwidth), so edges stay crisp at every depth with no extra meshes.
const fragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform vec2 uSize;
  uniform float uRadius;
  varying vec2 vUv;
  varying vec2 vLocal;
  varying vec2 vShade;
  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  void main() {
    vec2 p = (vLocal - 0.5) * uSize;
    float d = sdRoundBox(p, uSize * 0.5, uRadius);
    float aa = fwidth(d);
    float shape = 1.0 - smoothstep(-aa, aa, d);
    float hairline = 1.0 - smoothstep(0.0, aa, abs(d + aa));
    vec3 col = texture2D(uAtlas, vUv).rgb * vShade.x;
    col = mix(col, vec3(1.0), hairline * 0.1);
    gl_FragColor = vec4(col, shape * vShade.y);
    #include <colorspace_fragment>
  }
`;

/** Atlas cell (uv offset + size) for poster index `i`; three flips Y on load. */
function cellUv(i: number): [number, number, number, number] {
  const { width, height, cols, cellW, cellH, pad } = atlas;
  const x = (i % cols) * (cellW + 2 * pad) + pad;
  const y = Math.floor(i / cols) * (cellH + 2 * pad) + pad;
  return [x / width, 1 - (y + cellH) / height, cellW / width, cellH / height];
}

/** ~60 movie posters drifting upward through three depth layers, drawn as ONE
 *  instanced mesh from ONE atlas texture (one request, one draw call). Pointer
 *  parallax scales with depth. Posters enter with a staggered fade and a
 *  0.92 -> 1 scale once the atlas lands. Reduced motion: one static frame with
 *  posters at rest, no drift, sway or parallax. */
export function PosterDrift({ reduced }: { reduced: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const t = useRef(0);
  const shownAt = useRef<number | null>(null);
  const pointer = useRef(new THREE.Vector2());
  const dummy = useRef(new THREE.Object3D());
  // Per-instance data: atlas cell (set once per visit) and brightness/opacity
  // (written every frame). Mutated through the mesh ref; R3F owns disposal.
  const cells = useMemo(() => new Float32Array(SLOTS.length * 4), []);
  const shades = useMemo(() => new Float32Array(SLOTS.length * 2), []);
  const uniforms = useMemo(
    () => ({
      uAtlas: { value: null as THREE.Texture | null },
      uSize: { value: new THREE.Vector2(POSTER_W, POSTER_H) },
      uRadius: { value: 0.07 },
    }),
    [],
  );

  useEffect(() => {
    if (typeof document === "undefined") return; // headless tests: stay hidden
    const cell = mesh.current?.geometry.getAttribute("aCell") as THREE.InstancedBufferAttribute | undefined;
    if (cell) {
      // A fresh random poster per slot on every visit; the pool repeats only
      // if there are more slots than posters.
      const order = Array.from({ length: atlas.count }, (_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      SLOTS.forEach((_, i) => (cell.array as Float32Array).set(cellUv(order[i % order.length]), i * 4));
      cell.needsUpdate = true;
    }

    let live = true;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader().loadAsync(atlas.src).then(
      (texture) => {
        loaded = texture;
        if (!live) return texture.dispose();
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        setTex(texture);
      },
      () => {}, // no atlas: the CSS backdrop carries the hero
    );
    return () => {
      live = false;
      loaded?.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m || !tex) return;
    if (!reduced) t.current += delta;
    shownAt.current ??= t.current;
    const since = t.current - shownAt.current;
    const { width, height } = state.size;
    const aspect = width / Math.max(1, height);
    const dense = width >= DENSE_MIN_PX;
    pointer.current.lerp(reduced ? pointer.current.set(0, 0) : state.pointer, 0.04);
    const copyFrac = Math.min(COPY_HALF_PX, width / 2) / Math.max(1, width / 2);
    const shadeAttr = m.geometry.getAttribute("aShade") as THREE.InstancedBufferAttribute;
    const shade = shadeAttr.array as Float32Array;
    const d = dummy.current;

    SLOTS.forEach((s, i) => {
      const halfH = (CAM_Z - s.z) * TAN;
      const halfW = halfH * aspect;
      const span = 2 * halfH + POSTER_H * 2;
      const y = ((s.phase * span + s.speed * t.current) % span) - halfH - POSTER_H;
      // Gutter = copy column edge (world units at this depth) to just past the
      // screen edge, so posters bleed off-canvas. No gutter (phones): spread.
      const lo = copyFrac * halfW + POSTER_W * 0.55;
      const hi = halfW + POSTER_W * 0.25;
      const x =
        s.gutter && hi - lo > POSTER_W * 0.3
          ? s.side * (lo + s.u * (hi - lo))
          : s.side * (s.gutter ? 0.5 + s.u * 0.5 : s.u) * halfW;

      // Dim smoothly as a poster crosses into the copy column: rich gutters,
      // calm centre. On phones the column is the whole screen, so all dim.
      const behind = 1 - THREE.MathUtils.smoothstep(Math.abs(x) / halfW, copyFrac - 0.1, copyFrac + 0.02);
      const on = dense || s.core;
      const a = reduced ? 1 : THREE.MathUtils.smoothstep(since, 0.15 + s.enter, 0.75 + s.enter);
      d.position.set(x + pointer.current.x * s.parallax, y + pointer.current.y * s.parallax * 0.5, s.z);
      d.rotation.set(0, s.tiltY, s.tiltZ + (reduced ? 0 : Math.sin(t.current * 0.35 + s.sway) * 0.025));
      d.scale.setScalar(on ? (reduced ? 1 : 0.92 + 0.08 * a) : 0);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      shade[i * 2] = s.light * (1 - (1 - BEHIND_COPY) * behind);
      shade[i * 2 + 1] = on ? a : 0;
    });
    m.instanceMatrix.needsUpdate = true;
    shadeAttr.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, SLOTS.length]}
      visible={!!tex}
      // Instances span the whole view; the base plane's bounds don't.
      frustumCulled={false}
    >
      <planeGeometry args={[POSTER_W, POSTER_H]}>
        <instancedBufferAttribute attach="attributes-aCell" args={[cells, 4]} />
        <instancedBufferAttribute attach="attributes-aShade" args={[shades, 2]} usage={THREE.DynamicDrawUsage} />
      </planeGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        uniforms-uAtlas-value={tex}
        transparent
        depthWrite={false}
      />
    </instancedMesh>
  );
}

// Keeps the hero copy legible over the posters: a soft midnight pool behind
// the text column, a top fade under the nav, and a bottom fade into the page.
const SCRIM: CSSProperties = {
  background: [
    "radial-gradient(ellipse 58% 52% at 46% 46%, color-mix(in oklab, var(--color-midnight) 82%, transparent) 0%, color-mix(in oklab, var(--color-midnight) 55%, transparent) 50%, transparent 78%)",
    "linear-gradient(to bottom, color-mix(in oklab, var(--color-midnight) 70%, transparent) 0%, transparent 16%, transparent 72%, var(--color-midnight) 100%)",
  ].join(", "),
};

/** True while the element is on screen, so the render loop can stop when the
 *  hero is scrolled away (hidden tabs already pause requestAnimationFrame). */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

export function HeroBackdrop() {
  const reduced = usePrefersReducedMotion();
  const supported = useWebGLSupported();
  const [ref, inView] = useInView<HTMLDivElement>();

  // No WebGL -> render nothing; the CSS aurora backdrop carries the look.
  if (!supported) return null;

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-svh min-h-[640px]"
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, CAM_Z], fov: FOV }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        // Off screen: no frames at all. Reduced motion: render on demand only.
        frameloop={!inView ? "never" : reduced ? "demand" : "always"}
        // The canvas sits behind the page; track the pointer from the window.
        eventSource={typeof document !== "undefined" ? document.body : undefined}
        eventPrefix="client"
      >
        <PosterDrift reduced={reduced} />
      </Canvas>
      <div className="absolute inset-0" style={SCRIM} />
    </div>
  );
}

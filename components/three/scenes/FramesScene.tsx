"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { pickPosters, POSTER_ASPECT } from "@/lib/posters";
import { CYAN, ramp, type SceneProps } from "./palette";
import { useRoundedRect } from "./roundedRect";
import { usePosterTextures } from "./usePosterTextures";

const DIM = 0.2; // pending tile: a dark print of its poster
const LIT = 1;

/** The frame carousel: a ring of movie-poster tiles that develop from a dark
 *  print to full color as REAL image_gen progress (current/total) advances.
 *  The newest tile carries an amber edge (a static cue, so progress never
 *  depends on motion alone) and breathes gently. Posters are a fresh random
 *  draw from the curated pool on every visit. */
export function FramesScene({
  reduced,
  frames,
}: SceneProps & { frames: { current: number; total: number } }) {
  const group = useRef<THREE.Group>(null);
  const tiles = useRef<(THREE.Mesh | null)[]>([]);
  const glow = useRef<number[]>([]);
  const t = useRef(0);
  const n = Math.max(1, Math.min(frames.total || 15, 30));
  const current = Math.max(0, Math.min(frames.current, n));
  // Size the ring to the canvas: as wide as it allows (front tiles about half
  // the canvas height), never so wide it clips on narrow screens.
  const { width: vw } = useThree((s) => s.viewport);
  const radius = Math.min(3, vw * 0.36);
  // Shrink tiles as the ring fills so neighbours never overlap.
  const h = Math.min(1.7, ((2 * Math.PI * radius) / n) * 0.86 / POSTER_ASPECT);
  const w = h * POSTER_ASPECT;

  const posters = useMemo(() => pickPosters(n, 2), [n]);
  const textures = usePosterTextures(posters);
  const placeholder = useMemo(
    () => Array.from({ length: n }, (_, i) => ramp(n === 1 ? 0 : i / (n - 1))),
    [n],
  );
  const scratch = useMemo(() => new THREE.Color(), []);
  const world = useMemo(() => new THREE.Vector3(), []);
  const geo = useRoundedRect(w, h, w * 0.06);
  const edgeGeo = useRoundedRect(w + 0.07, h + 0.07, w * 0.06 + 0.035);

  useFrame((_s, delta) => {
    if (reduced) return;
    t.current += delta;
    if (group.current) group.current.rotation.y += delta * 0.22;
    const k = Math.min(1, delta * 6);
    tiles.current.forEach((m, i) => {
      if (!m) return;
      const done = i < current;
      const newest = i === current - 1;
      // Slow 2.6s breath on the newest tile; finished tiles hold steady.
      const target = newest ? 0.86 + Math.sin(t.current * 2.4) * 0.14 : done ? LIT : DIM;
      const g = (glow.current[i] ??= DIM);
      glow.current[i] = g + (target - g) * k;
      // Depth cue: the back half of the ring recedes so the front reads clearly.
      m.getWorldPosition(world);
      const depth = 0.28 + 0.72 * THREE.MathUtils.clamp((world.z + radius) / (2 * radius), 0, 1);
      const mat = m.material as THREE.MeshBasicMaterial;
      const base = textures[i] ? scratch.setScalar(1) : scratch.copy(placeholder[i]);
      mat.color.copy(base).multiplyScalar(glow.current[i] * depth);
      mat.opacity = (0.55 + 0.45 * Math.min(1, (glow.current[i] - DIM) / (LIT - DIM))) * (0.5 + 0.5 * depth);
    });
  });

  return (
    <group ref={group} rotation={[-0.22, 0, 0]}>
      {posters.map((p, i) => {
        const a = (i / n) * Math.PI * 2;
        const done = i < current;
        const newest = i === current - 1;
        const tex = textures[i];
        const level = done ? LIT : DIM;
        const color = tex
          ? new THREE.Color().setScalar(level)
          : placeholder[i].clone().multiplyScalar(level);
        return (
          <group
            key={`${p.id}-${i}`}
            position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}
            rotation={[0, -a + Math.PI / 2, 0]}
          >
            <mesh
              geometry={geo}
              ref={(el) => {
                tiles.current[i] = el;
              }}
            >
              <meshBasicMaterial
                // Remount when the map arrives so the shader recompiles with it.
                key={tex ? "poster" : "placeholder"}
                map={tex}
                color={color}
                transparent
                opacity={done ? 1 : 0.55}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
            {newest && (
              <mesh geometry={edgeGeo} position={[0, 0, -0.012]}>
                <meshBasicMaterial color={CYAN} side={THREE.DoubleSide} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

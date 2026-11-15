"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { pickPosters, POSTER_ASPECT } from "@/lib/posters";
import { ramp, type SceneProps } from "./palette";
import { useRoundedRect } from "./roundedRect";
import { usePosterTextures } from "./usePosterTextures";

const DIM = 0.18;
const GAP = 0.12; // gap between panels, as a fraction of panel width
const CURVE_R = 24; // radius of the wall's gentle concave curve

/** Pick the 1–3 row grid that gives the largest panel inside the viewport. */
function fitGrid(n: number, vw: number, vh: number) {
  const availW = vw * 0.88;
  const availH = vh * 0.8;
  let best = { rows: 1, cols: n, w: 0 };
  for (let rows = 1; rows <= 3; rows++) {
    const cols = Math.ceil(n / rows);
    const byW = availW / (cols + (cols - 1) * GAP);
    const byH = availH / (rows / POSTER_ASPECT + (rows - 1) * GAP);
    const w = Math.min(byW, byH);
    if (w > best.w) best = { rows, cols, w };
  }
  return best;
}

/** The script being written, as a storyboard wall: one poster panel per beat,
 *  in reading order, on a gently curved wall. A "write-head" sweeps the beats;
 *  each panel develops from a dark print to full color as it's reached, and the
 *  current one lifts toward the viewer. The grid picks whichever row count makes
 *  the panels largest for the canvas. Card count ≈ the beat count (frames.total
 *  upstream). Posters are a random draw from the curated pool. */
export function ScriptScene({ reduced, count }: SceneProps & { count: number }) {
  const n = Math.max(3, Math.min(count || 8, 18));
  const tiles = useRef<(THREE.Mesh | null)[]>([]);
  const glow = useRef<number[]>([]);
  const lift = useRef<number[]>([]);
  const t = useRef(0);
  const { width: vw, height: vh } = useThree((s) => s.viewport);
  const { rows, cols, w } = fitGrid(n, vw, vh);
  const h = w / POSTER_ASPECT;

  const posters = useMemo(() => pickPosters(n, 1), [n]);
  const textures = usePosterTextures(posters);
  const placeholder = useMemo(
    () => Array.from({ length: n }, (_, i) => ramp(n === 1 ? 0 : i / (n - 1))),
    [n],
  );
  const scratch = useMemo(() => new THREE.Color(), []);
  const geo = useRoundedRect(w, h, w * 0.05);

  // Panel placement on the curved wall (row-major = reading order).
  const slots = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const r = Math.floor(i / cols);
        const inRow = r === rows - 1 ? n - r * cols : cols; // centre a short last row
        const c = i % cols;
        const x = (c - (inRow - 1) / 2) * w * (1 + GAP);
        const y = ((rows - 1) / 2 - r) * h * (1 + GAP);
        const a = x / CURVE_R;
        // Concave, like a screening-room wall: edges curve toward the viewer and
        // each panel turns to face the centre, so neighbours never overlap.
        return { x: Math.sin(a) * CURVE_R, y, z: (1 - Math.cos(a)) * CURVE_R, rotY: -a };
      }),
    [n, rows, cols, w, h],
  );

  useFrame((_s, delta) => {
    if (reduced) return; // static frame already correct from JSX props
    t.current += delta;
    const head = (t.current * 2.4) % (n + 4); // sweeps the beats, then repeats
    const k = Math.min(1, delta * 6);
    tiles.current.forEach((m, i) => {
      if (!m) return;
      const target = i < head ? 1 : DIM;
      const g = (glow.current[i] ??= DIM);
      glow.current[i] = g + (target - g) * k;
      // The panel under the head lifts toward the viewer, then settles.
      const near = Math.max(0, 1 - Math.abs(head - 0.5 - i));
      const l = (lift.current[i] ??= 0);
      lift.current[i] = l + (near - l) * k;
      const mat = m.material as THREE.MeshBasicMaterial;
      const base = textures[i] ? scratch.setScalar(1) : scratch.copy(placeholder[i]);
      mat.color.copy(base).multiplyScalar(glow.current[i]);
      mat.opacity = 0.5 + 0.5 * glow.current[i];
      m.position.z = slots[i].z + lift.current[i] * w * 0.35;
      m.scale.setScalar(1 + lift.current[i] * 0.06);
    });
  });

  return (
    <group>
      {posters.map((p, i) => {
        const s = slots[i];
        const tex = textures[i];
        const level = reduced ? 1 : DIM;
        return (
          <mesh
            key={`${p.id}-${i}`}
            geometry={geo}
            position={[s.x, s.y, s.z]}
            rotation={[0, s.rotY, 0]}
            ref={(el) => {
              tiles.current[i] = el;
            }}
          >
            <meshBasicMaterial
              key={tex ? "poster" : "placeholder"}
              map={tex}
              color={tex ? new THREE.Color().setScalar(level) : placeholder[i].clone().multiplyScalar(level)}
              transparent
              opacity={reduced ? 1 : 0.5}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

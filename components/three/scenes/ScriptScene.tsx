"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ramp, type SceneProps } from "./palette";

/** A gentle arc of beat-cards that light up under a moving "write-head" — the
 *  script being written. Card count ≈ the beat count (frames.total upstream). */
export function ScriptScene({ reduced, count }: SceneProps & { count: number }) {
  const n = Math.max(3, Math.min(count || 8, 18));
  const tiles = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(0);
  const colors = useMemo(
    () => Array.from({ length: n }, (_, i) => ramp(n === 1 ? 0 : i / (n - 1))),
    [n],
  );

  useFrame((_s, delta) => {
    if (reduced) return; // static frame already correct from JSX props
    t.current += delta;
    const head = (t.current * 3) % (n + 4); // sweeps across, then repeats
    tiles.current.forEach((m, i) => {
      if (!m) return;
      const lit = i < head;
      const mat = m.material as THREE.MeshStandardMaterial;
      const k = Math.min(1, delta * 6);
      mat.opacity += ((lit ? 0.98 : 0.14) - mat.opacity) * k;
      mat.emissiveIntensity += ((lit ? 0.9 : 0.06) - mat.emissiveIntensity) * k;
    });
  });

  return (
    <group rotation={[0.06, 0, 0]}>
      {colors.map((c, i) => {
        const x = (i - (n - 1) / 2) * 0.44;
        const y = 0.3 * Math.sin((i / Math.max(1, n - 1)) * Math.PI);
        return (
          <mesh
            key={i}
            position={[x, y, 0]}
            ref={(el) => {
              tiles.current[i] = el;
            }}
          >
            <planeGeometry args={[0.36, 0.54]} />
            <meshStandardMaterial
              color={c}
              emissive={c}
              emissiveIntensity={reduced ? 0.85 : 0.06}
              transparent
              opacity={reduced ? 0.96 : 0.14}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

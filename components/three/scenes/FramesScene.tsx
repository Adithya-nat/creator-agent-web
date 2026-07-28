"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ramp, type SceneProps } from "./palette";

/** The frame carousel: 9:16 film tiles flip from dim to lit as REAL image_gen
 *  progress (current/total) advances; the newest tile shimmers. This is the one
 *  scene bound to true progress, so it carries the existing FrameRing intent. */
export function FramesScene({
  reduced,
  frames,
}: SceneProps & { frames: { current: number; total: number } }) {
  const group = useRef<THREE.Group>(null);
  const tiles = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(0);
  const n = Math.max(1, Math.min(frames.total || 15, 30));
  const current = Math.max(0, Math.min(frames.current, n));
  const radius = 2.7;
  const colors = useMemo(
    () => Array.from({ length: n }, (_, i) => ramp(n === 1 ? 0 : i / (n - 1))),
    [n],
  );

  useFrame((_s, delta) => {
    if (reduced) return;
    t.current += delta;
    if (group.current) group.current.rotation.y += delta * 0.3;
    tiles.current.forEach((m, i) => {
      if (!m) return;
      const done = i < current;
      const newest = i === current - 1;
      const mat = m.material as THREE.MeshStandardMaterial;
      const target = newest ? 0.7 + Math.sin(t.current * 8) * 0.3 : done ? 0.96 : 0.16;
      const k = Math.min(1, delta * 8);
      mat.opacity += (target - mat.opacity) * k;
      mat.emissiveIntensity += ((done ? 0.9 : 0.05) - mat.emissiveIntensity) * k;
    });
  });

  return (
    <group ref={group} rotation={[-0.3, 0, 0]}>
      {colors.map((c, i) => {
        const a = (i / n) * Math.PI * 2;
        const done = i < current;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}
            rotation={[0, -a + Math.PI / 2, 0]}
            ref={(el) => {
              tiles.current[i] = el;
            }}
          >
            <planeGeometry args={[0.62, 1.05]} />
            <meshStandardMaterial
              color={c}
              emissive={c}
              emissiveIntensity={reduced ? (done ? 0.9 : 0.05) : 0.1}
              transparent
              opacity={reduced ? (done ? 0.96 : 0.18) : 0.16}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

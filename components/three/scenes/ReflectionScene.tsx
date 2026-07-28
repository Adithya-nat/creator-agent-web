"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ramp, VIOLET, type SceneProps } from "./palette";

/** A faceted "story crystal" refined while five gauge bars (the judge's five
 *  dimensions) sweep up — evaluating & refining the story. Structural only: the
 *  sweep is time-based; the REAL score lives in the log stream (issue #2). */
export function ReflectionScene({ reduced }: SceneProps) {
  const crystal = useRef<THREE.Mesh>(null);
  const gauges = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(0);
  const colors = useMemo(() => Array.from({ length: 5 }, (_, i) => ramp(i / 4)), []);

  useFrame((_s, delta) => {
    if (reduced) return;
    t.current += delta;
    if (crystal.current) {
      crystal.current.rotation.y += delta * 0.6;
      crystal.current.scale.setScalar(1 + Math.sin(t.current * 2) * 0.05);
    }
    gauges.current.forEach((m, i) => {
      if (!m) return;
      const fill = 0.2 + (Math.sin(t.current * 0.9 + i * 0.7) * 0.5 + 0.5) * 0.8;
      m.scale.y = fill;
      m.position.y = -1.35 + (fill * 0.7) / 2; // grow upward from the base line
    });
  });

  return (
    <group>
      <mesh ref={crystal} rotation={[0.3, 0, 0]}>
        <icosahedronGeometry args={[0.95, 0]} />
        <meshStandardMaterial
          color={VIOLET}
          emissive={VIOLET}
          emissiveIntensity={0.7}
          flatShading
          metalness={0.2}
          roughness={0.35}
          toneMapped={false}
        />
      </mesh>
      {colors.map((c, i) => {
        const x = (i - 2) * 0.5;
        return (
          <mesh
            key={i}
            position={[x, -1.35 + 0.35, 0.2]}
            scale={[1, reduced ? 1 : 0.2, 1]}
            ref={(el) => {
              gauges.current[i] = el;
            }}
          >
            <boxGeometry args={[0.16, 0.7, 0.16]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.85} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

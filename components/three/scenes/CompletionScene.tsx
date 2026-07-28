"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ramp } from "./palette";

/** A one-shot celebratory burst: a white core flashes and a shell of brand-
 *  coloured particles explodes outward, then everything fades — the "your film
 *  is ready" WOW beat. Runs from its own clock on mount; the parent unmounts it
 *  after a few seconds. */
export function CompletionScene() {
  const points = useRef<THREE.Points>(null);
  const core = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const N = 700;

  const { positions, dirs, colors } = useMemo(() => {
    const positions = new Float32Array(N * 3); // start at the origin (0,0,0)
    const dirs = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.6 + Math.random() * 0.85;
      dirs[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      dirs[i * 3 + 1] = Math.cos(phi) * speed * 0.85;
      dirs[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      const c = ramp(Math.random());
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, dirs, colors };
  }, []);

  useFrame((_s, delta) => {
    t.current += delta;
    const tt = t.current;
    const ease = 1 - Math.pow(1 - Math.min(tt / 1.6, 1), 3); // easeOutCubic over 1.6s
    const radius = ease * 5.2;

    if (points.current) {
      const pos = points.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < N; i++) {
        pos[i * 3] = dirs[i * 3] * radius;
        pos[i * 3 + 1] = dirs[i * 3 + 1] * radius;
        pos[i * 3 + 2] = dirs[i * 3 + 2] * radius;
      }
      points.current.geometry.attributes.position.needsUpdate = true;
      const mat = points.current.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 1 - Math.max(0, tt - 1.0) / 1.9); // hold, then fade by ~2.9s
    }

    if (core.current) {
      core.current.scale.setScalar(0.2 + ease * 1.5);
      (core.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - tt / 1.15);
    }
  });

  return (
    <group>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.11}
          vertexColors
          transparent
          opacity={1}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
      <mesh ref={core}>
        <sphereGeometry args={[0.6, 24, 24]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

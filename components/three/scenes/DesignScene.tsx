"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ramp, type SceneProps } from "./palette";

/** A style card with color swatches orbiting it — locking ONE consistent look
 *  before any frame is rendered. */
export function DesignScene({ reduced }: SceneProps) {
  const orbit = useRef<THREE.Group>(null);
  const card = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const swatches = useMemo(() => Array.from({ length: 7 }, (_, i) => ramp(i / 6)), []);

  useFrame((_s, delta) => {
    if (reduced) return;
    t.current += delta;
    if (orbit.current) orbit.current.rotation.y += delta * 0.7;
    if (card.current) card.current.scale.setScalar(1 + Math.sin(t.current * 1.5) * 0.03);
  });

  return (
    <group rotation={[0.32, 0, 0]}>
      <mesh ref={card}>
        <planeGeometry args={[1.5, 2.0]} />
        <meshStandardMaterial
          color="#0b0e1a"
          emissive={ramp(0.5)}
          emissiveIntensity={0.3}
          metalness={0.4}
          roughness={0.4}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <group ref={orbit}>
        {swatches.map((c, i) => {
          const a = (i / swatches.length) * Math.PI * 2;
          const r = 2.1;
          return (
            <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r * 0.5, Math.sin(a) * r]}>
              <sphereGeometry args={[0.16, 16, 16]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.9} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

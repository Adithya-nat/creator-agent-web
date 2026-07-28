"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CYAN, PINK, ramp, VIOLET, type SceneProps } from "./palette";

/** A spinning film reel over a pulsing narration waveform, with a play triangle
 *  forming at its heart — the climax right before the finished video appears. */
export function AssembleScene({ reduced }: SceneProps) {
  const reel = useRef<THREE.Group>(null);
  const play = useRef<THREE.Mesh>(null);
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(0);
  const waveN = 13;

  const playGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.28, -0.34);
    s.lineTo(-0.28, 0.34);
    s.lineTo(0.4, 0);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);
  const spokes = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2), []);

  useFrame((_s, delta) => {
    if (reduced) return;
    t.current += delta;
    if (reel.current) reel.current.rotation.z -= delta * 1.2;
    if (play.current) {
      const p = Math.sin(t.current * 0.6) * 0.5 + 0.5;
      play.current.scale.setScalar(0.7 + p * 0.4);
      (play.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7 + p * 0.8;
    }
    bars.current.forEach((m, i) => {
      if (!m) return;
      m.scale.y = 0.15 + (Math.sin(t.current * 4 + i * 0.6) * 0.5 + 0.5) * 0.9;
    });
  });

  return (
    <group>
      <group ref={reel} position={[0, 0.2, 0]}>
        <mesh>
          <torusGeometry args={[1.5, 0.12, 16, 48]} />
          <meshStandardMaterial color={VIOLET} emissive={VIOLET} emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
        {spokes.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 0.78, Math.sin(a) * 0.78, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[1.3, 0.06, 0.06]} />
            <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
        ))}
      </group>

      <mesh ref={play} geometry={playGeo} position={[0, 0.2, 0.25]} scale={reduced ? 1 : 0.7}>
        <meshStandardMaterial
          color={PINK}
          emissive={PINK}
          emissiveIntensity={reduced ? 1 : 0.7}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <group position={[0, -1.55, 0]}>
        {Array.from({ length: waveN }, (_, i) => {
          const c = ramp(i / (waveN - 1));
          return (
            <mesh
              key={i}
              position={[(i - (waveN - 1) / 2) * 0.26, 0, 0]}
              scale={[1, reduced ? 0.5 : 0.2, 1]}
              ref={(el) => {
                bars.current[i] = el;
              }}
            >
              <boxGeometry args={[0.12, 0.6, 0.12]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.7} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

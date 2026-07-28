"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * A drifting field of additive particles graded cyan -> violet -> pink, with a
 * slow auto-rotate and gentle pointer parallax, lit by a bloom pass.
 *
 * Loaded via dynamic(ssr:false) — touches WebGL/window, so it must never SSR.
 * Reduced motion: renders a single static frame (frameloop="demand", no rotate).
 */
function ParticleField({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);

  const { positions, colors } = useMemo(() => {
    const N = 3200;
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const cyan = new THREE.Color("#22D3EE");
    const violet = new THREE.Color("#7C3AED");
    const pink = new THREE.Color("#F472B6");
    for (let i = 0; i < N; i++) {
      const r = Math.pow(Math.random(), 0.6) * 9;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 7.5;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r - 2;
      const t = Math.random();
      const c =
        t < 0.5
          ? cyan.clone().lerp(violet, t * 2)
          : violet.clone().lerp(pink, (t - 0.5) * 2);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, []);

  useFrame((state, delta) => {
    if (!group.current || reduced) return;
    group.current.rotation.y += delta * 0.04;
    const px = state.pointer.x * 0.35;
    const py = state.pointer.y * 0.2;
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      py,
      0.03,
    );
    group.current.position.x = THREE.MathUtils.lerp(
      group.current.position.x,
      px,
      0.03,
    );
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          vertexColors
          transparent
          opacity={0.92}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export function HeroBackdrop() {
  const reduced = usePrefersReducedMotion();
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setSupported(
        !!(c.getContext("webgl") || c.getContext("experimental-webgl")),
      );
    } catch {
      setSupported(false);
    }
  }, []);

  // No WebGL -> render nothing; the CSS aurora backdrop carries the look.
  if (!supported) return null;

  return (
    <div className="absolute inset-0 z-0" aria-hidden="true">
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0, 6], fov: 70 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={reduced ? "demand" : "always"}
      >
        <ParticleField reduced={reduced} />
        {!reduced && (
          <EffectComposer>
            <Bloom
              intensity={0.85}
              luminanceThreshold={0.1}
              luminanceSmoothing={0.4}
              mipmapBlur
              radius={0.7}
            />
          </EffectComposer>
        )}
      </Canvas>
      {/* Vignette + bottom fade so foreground text stays readable over the field. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_30%,transparent_40%,rgba(7,8,13,0.55)_100%)]" />
    </div>
  );
}

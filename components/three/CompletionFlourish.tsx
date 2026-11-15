"use client";

import { useWebGLSupported } from "@/hooks/useWebGLSupported";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { CompletionScene } from "./scenes/CompletionScene";

/** A brief celebratory burst shown when a job completes. Skipped for reduced-
 *  motion + no-WebGL — nothing essential is lost (the result view + status badge
 *  already convey success). The parent renders it as a pointer-events-none
 *  overlay for a few seconds, so it never blocks the finished video. */
export function CompletionFlourish() {
  const reduced = usePrefersReducedMotion();
  const webgl = useWebGLSupported();

  if (reduced || !webgl) return null;

  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 6], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
    >
      <CompletionScene />
      <EffectComposer>
        <Bloom intensity={1.1} luminanceThreshold={0.1} luminanceSmoothing={0.5} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}

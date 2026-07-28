"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { deriveStageSignals, type StageSignals } from "@/lib/stageSignals";
import type { JobStatus, JobStatusResponse, LogLine, StageRef } from "@/lib/types";
import { AssembleScene } from "./scenes/AssembleScene";
import { DesignScene } from "./scenes/DesignScene";
import { FramesScene } from "./scenes/FramesScene";
import { ReflectionScene } from "./scenes/ReflectionScene";
import { ScriptScene } from "./scenes/ScriptScene";

export interface StageSceneProps {
  stages: StageRef[];
  currentStage: string | null;
  status: JobStatus | null;
  job: JobStatusResponse | null;
  logsByStage: Record<string, LogLine[]>;
}

/** Scale a freshly-mounted scene in from 0.82 -> 1 so a stage change reads as a
 *  deliberate transition, not a pop. Only used when motion is allowed. */
function Appear({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const s = useRef(0.82);
  useFrame((_st, delta) => {
    s.current += (1 - s.current) * Math.min(1, delta * 5);
    if (g.current) g.current.scale.setScalar(s.current);
  });
  return (
    <group ref={g} scale={0.82}>
      {children}
    </group>
  );
}

function ActiveScene({ signals, reduced }: { signals: StageSignals; reduced: boolean }) {
  const active = signals.active ?? "assembler";
  const sig = signals.stages[active] ?? signals.stages.script_writer;
  switch (active) {
    case "script_writer":
      return <ScriptScene signal={sig} reduced={reduced} count={signals.frames.total} />;
    case "reflection":
      return <ReflectionScene signal={sig} reduced={reduced} />;
    case "designer":
      return <DesignScene signal={sig} reduced={reduced} />;
    case "image_gen":
      return <FramesScene signal={sig} reduced={reduced} frames={signals.frames} />;
    case "motion":
      // Reuse the film-reel scene for the animate stage (no bespoke 3D needed).
      return <AssembleScene signal={sig} reduced={reduced} />;
    case "assembler":
      return <AssembleScene signal={sig} reduced={reduced} />;
    default:
      return null;
  }
}

/** No-WebGL fallback: a tasteful 2D progress ring instead of a blank box. */
function Fallback2D({ signals }: { signals: StageSignals }) {
  const pct = Math.round(signals.progress01 * 100);
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-16 w-16 animate-spin rounded-full border-2 border-brand-cyan/30 border-t-brand-cyan" />
        <p className="text-xs text-muted">{pct}% complete</p>
      </div>
    </div>
  );
}

export function StageScene(props: StageSceneProps) {
  const reduced = usePrefersReducedMotion();
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setSupported(!!(c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch {
      setSupported(false);
    }
  }, []);

  const signals = useMemo(
    () => deriveStageSignals(props),
    // Recompute only when a real state slice changes (props is re-allocated each render).
    [props.stages, props.currentStage, props.status, props.job, props.logsByStage],
  );

  if (!supported) return <Fallback2D signals={signals} />;

  return (
    <div className="h-full w-full">
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0, 6.4], fov: 52 }}
        gl={{ antialias: true, alpha: true }}
        frameloop={reduced ? "demand" : "always"}
      >
        <ambientLight intensity={0.9} />
        <pointLight position={[4, 4, 6]} intensity={80} />
        {reduced ? (
          <ActiveScene signals={signals} reduced />
        ) : (
          <Appear key={signals.active ?? "done"}>
            <ActiveScene signals={signals} reduced={false} />
          </Appear>
        )}
        {!reduced && (
          <EffectComposer>
            <Bloom
              intensity={0.9}
              luminanceThreshold={0.15}
              luminanceSmoothing={0.5}
              mipmapBlur
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}

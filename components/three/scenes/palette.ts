import * as THREE from "three";
import type { StageSignal } from "@/lib/stageSignals";

// Screening-room ramp shared by every stage scene: marquee amber -> warm paper -> leader.
// (Export names kept so scenes stay unchanged.)
export const CYAN = "#F2B544";
export const VIOLET = "#EFE8DA";
export const PINK = "#E2557A";

/** Position t in [0,1] along amber -> paper -> leader magenta. */
export function ramp(t: number): THREE.Color {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x < 0.5
    ? new THREE.Color(CYAN).lerp(new THREE.Color(VIOLET), x * 2)
    : new THREE.Color(VIOLET).lerp(new THREE.Color(PINK), (x - 0.5) * 2);
}

/** Every stage scene takes the derived signal + the reduced-motion flag. When
 *  `reduced` is true a scene MUST render a correct static frame (no useFrame
 *  motion) so prefers-reduced-motion users see the state, not a frozen half-lit
 *  animation. */
export interface SceneProps {
  signal: StageSignal;
  reduced: boolean;
}

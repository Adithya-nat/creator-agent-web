import * as THREE from "three";
import type { StageSignal } from "@/lib/stageSignals";

// Brand ramp shared by every stage scene (matches HeroBackdrop / the old viz).
export const CYAN = "#22D3EE";
export const VIOLET = "#7C3AED";
export const PINK = "#F472B6";

/** Position t in [0,1] along cyan -> violet -> pink. */
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

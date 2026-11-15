"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ramp, type SceneProps } from "./palette";
import { PosterCard, POSTER_ASPECT, shadePoster, usePosterDeck } from "./posterKit";
import { useRoundedRect } from "./roundedRect";

const BARS = 36;
const FLANKS = 2; // per side

/** Voices, dialogue captions and the score: the film "on screen". A large
 *  centre poster, flanked by receding dimmed posters, over an equalizer whose
 *  energy follows real log activity (`signal.intensity`). The centre poster
 *  breathes faintly with the level. Reduced motion: a static mid-level meter. */
export function AudioScene({ signal, reduced }: SceneProps) {
  const { width: vw, height: vh } = useThree((s) => s.viewport);
  const h = Math.min(vh * 0.62, (vw * 0.42) / POSTER_ASPECT);
  const w = h * POSTER_ASPECT;
  const { posters, textures, placeholder } = usePosterDeck(1 + FLANKS * 2, 5);
  const geo = useRoundedRect(w, h, w * 0.05);

  const eqW = Math.min(vw * 0.7, w * 2.6);
  const step = eqW / BARS;
  const maxBar = h * 0.2;
  // Bars grow upward from a shared baseline: origin at the bar's bottom edge.
  const barGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(step * 0.55, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, [step]);
  useEffect(() => () => barGeo.dispose(), [barGeo]);
  const barColors = useMemo(() => Array.from({ length: BARS }, (_, i) => ramp(i / (BARS - 1))), []);

  const centre = useRef<THREE.Mesh>(null);
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(0);
  const energy = 0.45 + 0.55 * signal.intensity;

  const flanks = useMemo(
    () =>
      Array.from({ length: FLANKS * 2 }, (_, j) => {
        const side = j % 2 === 0 ? -1 : 1;
        const k = Math.floor(j / 2) + 1; // 1 = nearest the centre
        return {
          x: side * (w * 0.5 + k * w * 0.62),
          z: -k * w * 0.75,
          rotY: -side * 0.42,
          level: 0.42 - (k - 1) * 0.14,
        };
      }),
    [w],
  );

  useFrame((_s, delta) => {
    if (reduced) return;
    t.current += delta;
    let sum = 0;
    bars.current.forEach((m, i) => {
      if (!m) return;
      // Two detuned waves: lively but never a fixed loop; centre bars run hotter.
      const wave = Math.abs(Math.sin(t.current * 4.2 + i * 0.5) * Math.sin(t.current * 1.3 + i * 0.17));
      const centreBias = 1 - Math.abs(i / (BARS - 1) - 0.5) * 0.9;
      const v = 0.08 + wave * centreBias * energy;
      m.scale.y = Math.max(0.02, v) * maxBar;
      sum += v;
    });
    if (centre.current) {
      const level = sum / BARS;
      centre.current.scale.setScalar(1 + level * 0.025);
      shadePoster(centre.current, !!textures[0], placeholder[0], 0.92 + level * 0.1);
    }
  });

  const baseY = -h / 2 - h * 0.08 - maxBar;
  return (
    <group position={[0, maxBar * 0.55, 0]}>
      {flanks.map((f, j) => (
        <PosterCard
          key={`${posters[j + 1].id}-${j}`}
          poster={posters[j + 1]}
          tex={textures[j + 1]}
          fallback={placeholder[j + 1]}
          geometry={geo}
          level={f.level}
          position={[f.x, 0, f.z]}
          rotation={[0, f.rotY, 0]}
        />
      ))}
      <PosterCard
        poster={posters[0]}
        tex={textures[0]}
        fallback={placeholder[0]}
        geometry={geo}
        level={reduced ? 1 : 0.92}
        position={[0, 0, 0.2]}
        meshRef={centre}
      />
      <group position={[0, baseY, 0.2]}>
        {barColors.map((c, i) => (
          <mesh
            key={i}
            geometry={barGeo}
            position={[(i - (BARS - 1) / 2) * step, 0, 0]}
            scale={[1, (reduced ? 0.45 : 0.08) * maxBar, 1]}
            ref={(el) => {
              bars.current[i] = el;
            }}
          >
            <meshBasicMaterial color={c} transparent opacity={0.85} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

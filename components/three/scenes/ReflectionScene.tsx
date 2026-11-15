"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ramp, type SceneProps } from "./palette";
import { fitCardWidth, PosterCard, POSTER_ASPECT, shadePoster, usePosterDeck } from "./posterKit";
import { useRoundedRect } from "./roundedRect";

const N = 5; // the judge's five dimensions
const DWELL = 1.6; // seconds the review spotlight rests on each poster
// Seeded first-pass scores; every review pass nudges them up (the refine loop).
const BASE = [0.62, 0.74, 0.55, 0.8, 0.68];

/** Evaluating & refining the story: five posters in a gentle fan, one per
 *  judging dimension, each with a score bar. A review spotlight moves across
 *  them; the poster under review lifts and comes to full color while its bar
 *  settles to its score, and each pass scores a little higher. Structural only:
 *  the sweep is time-based; the REAL score lives in the log stream. */
export function ReflectionScene({ reduced }: SceneProps) {
  const { width: vw, height: vh } = useThree((s) => s.viewport);
  const w = fitCardWidth(N, 1, vw * 0.8, vh * 0.6, 0.16);
  const h = w / POSTER_ASPECT;
  const { posters, textures, placeholder } = usePosterDeck(N, 3);
  const geo = useRoundedRect(w, h, w * 0.05);
  const barW = w * 0.82;
  const barH = Math.max(0.05, h * 0.045);
  const track = useRoundedRect(barW, barH, barH / 2);
  // Fill bar grows from its left edge: shift the geometry so x=0 is the left.
  const fillGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(barW, barH);
    g.translate(barW / 2, 0, 0);
    return g;
  }, [barW, barH]);
  useEffect(() => () => fillGeo.dispose(), [fillGeo]);
  const colors = useMemo(() => Array.from({ length: N }, (_, i) => ramp(i / (N - 1))), []);

  const cards = useRef<(THREE.Mesh | null)[]>([]);
  const fills = useRef<(THREE.Mesh | null)[]>([]);
  const focus = useRef<number[]>(Array(N).fill(0));
  const score = useRef<number[]>(Array(N).fill(0));
  const t = useRef(0);

  const slots = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => {
        const o = i - (N - 1) / 2;
        return { x: o * w * 1.16, z: -o * o * w * 0.12, rotY: -o * 0.12 };
      }),
    [w],
  );

  useFrame((_s, delta) => {
    if (reduced) return;
    t.current += delta;
    const pass = Math.floor(t.current / (DWELL * N));
    const at = (t.current / DWELL) % N; // continuous spotlight position
    const k = Math.min(1, delta * 5);
    cards.current.forEach((m, i) => {
      if (!m) return;
      const near = Math.max(0, 1 - Math.abs(at - 0.5 - i) * 1.4);
      focus.current[i] += (near - focus.current[i]) * k;
      const f = focus.current[i];
      shadePoster(m, !!textures[i], placeholder[i], 0.36 + 0.64 * f);
      m.position.z = slots[i].z + f * w * 0.3;
      m.scale.setScalar(1 + f * 0.05);
      // A poster's bar settles once it has been reviewed this pass.
      const reviewed = pass > 0 || at > i + 0.5;
      const target = reviewed ? Math.min(0.97, BASE[i] + Math.min(pass, 4) * 0.06) : 0.08;
      score.current[i] += (target - score.current[i]) * Math.min(1, delta * 3);
      const fill = fills.current[i];
      if (fill) fill.scale.x = Math.max(0.001, score.current[i]);
    });
  });

  const barY = -h / 2 - h * 0.1;
  return (
    <group position={[0, h * 0.06, 0]}>
      {posters.map((p, i) => {
        const s = slots[i];
        const lit = reduced && i === Math.floor(N / 2);
        return (
          <group key={`${p.id}-${i}`} position={[s.x, 0, 0]} rotation={[0, s.rotY, 0]}>
            <PosterCard
              poster={p}
              tex={textures[i]}
              fallback={placeholder[i]}
              geometry={geo}
              level={reduced ? (lit ? 1 : 0.5) : 0.36}
              position={[0, 0, s.z]}
              meshRef={(el) => {
                cards.current[i] = el;
              }}
            />
            <group position={[0, barY, s.z]}>
              <mesh geometry={track}>
                <meshBasicMaterial color="#ffffff" transparent opacity={0.1} toneMapped={false} />
              </mesh>
              <mesh
                geometry={fillGeo}
                position={[-barW / 2, 0, 0.002]}
                scale={[reduced ? BASE[i] : 0.001, 1, 1]}
                ref={(el) => {
                  fills.current[i] = el;
                }}
              >
                <meshBasicMaterial color={colors[i]} toneMapped={false} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

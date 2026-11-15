"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ramp, type SceneProps } from "./palette";
import { fitCardWidth, PosterCard, POSTER_ASPECT, shadePoster, usePosterDeck } from "./posterKit";
import { useRoundedRect } from "./roundedRect";

const GRADE = new THREE.Color(1, 0.86, 0.66); // the warm look being locked in
const SWEEP_S = 3.2; // one diagonal grade pass, then hold
const CHIPS = 5;

/** Locking ONE consistent look before any frame is rendered: a mood board of
 *  posters in their own mixed colors. A grade sweeps across it once, unifying
 *  every poster under a shared warm look, then the extracted palette chips
 *  appear beneath. It plays once and holds (no looping flicker); reduced
 *  motion shows the graded board directly. */
export function DesignScene({ reduced }: SceneProps) {
  const { width: vw, height: vh } = useThree((s) => s.viewport);
  const wide = vw / vh > 1.4;
  const rows = wide ? 2 : 3;
  const cols = wide ? 5 : 3;
  const n = rows * cols;
  const w = fitCardWidth(cols, rows, vw * 0.78, vh * 0.66, 0.1);
  const h = w / POSTER_ASPECT;
  const { posters, textures, placeholder } = usePosterDeck(n, 4);
  const geo = useRoundedRect(w, h, w * 0.05);
  const chip = Math.min(vh * 0.07, w * 0.3);
  const chipGeo = useRoundedRect(chip, chip, chip * 0.28);
  const chipColors = useMemo(() => Array.from({ length: CHIPS }, (_, i) => ramp(i / (CHIPS - 1))), []);

  const cards = useRef<(THREE.Mesh | null)[]>([]);
  const chipsRef = useRef<(THREE.Mesh | null)[]>([]);
  const tint = useMemo(() => new THREE.Color(), []);
  const t = useRef(0);

  const slots = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        return {
          x: (c - (cols - 1) / 2) * w * 1.1,
          y: ((rows - 1) / 2 - r) * h * 1.1,
          // Diagonal order the grade travels in: top-left first.
          d: (c / Math.max(1, cols - 1) + r / Math.max(1, rows - 1)) / 2,
        };
      }),
    [n, cols, rows, w, h],
  );

  useFrame((_s, delta) => {
    if (reduced) return;
    t.current += delta;
    const p = (t.current / SWEEP_S) * 1.4 - 0.2; // -0.2 .. 1.2, then holds past 1
    cards.current.forEach((m, i) => {
      if (!m) return;
      const f = THREE.MathUtils.smoothstep(p - slots[i].d, 0, 0.2);
      const edge = Math.max(0, 1 - Math.abs(p - slots[i].d) / 0.12); // brief lift at the wavefront
      tint.setRGB(1, 1, 1).lerp(GRADE, f);
      shadePoster(m, !!textures[i], placeholder[i], 0.7 + 0.3 * f + 0.15 * edge, 1, tint);
      m.position.z = edge * w * 0.12;
    });
    chipsRef.current.forEach((m, i) => {
      if (!m) return;
      const a = THREE.MathUtils.smoothstep(t.current, SWEEP_S + i * 0.1, SWEEP_S + i * 0.1 + 0.3);
      (m.material as THREE.MeshBasicMaterial).opacity = a;
      m.scale.setScalar(0.8 + 0.2 * a);
    });
  });

  const boardH = rows * h * 1.1;
  const chipY = -boardH / 2 - chip * 0.9;
  return (
    <group rotation={[-0.06, 0.08, 0]} position={[0, chip * 0.6, 0]}>
      {posters.map((p, i) => (
        <PosterCard
          key={`${p.id}-${i}`}
          poster={p}
          tex={textures[i]}
          fallback={placeholder[i]}
          geometry={geo}
          level={reduced ? 1 : 0.7}
          tint={reduced ? GRADE : undefined}
          position={[slots[i].x, slots[i].y, 0]}
          meshRef={(el) => {
            cards.current[i] = el;
          }}
        />
      ))}
      {chipColors.map((c, i) => (
        <mesh
          key={i}
          geometry={chipGeo}
          position={[(i - (CHIPS - 1) / 2) * chip * 1.35, chipY, 0]}
          scale={reduced ? 1 : 0.8}
          ref={(el) => {
            chipsRef.current[i] = el;
          }}
        >
          <meshBasicMaterial color={c} transparent opacity={reduced ? 1 : 0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

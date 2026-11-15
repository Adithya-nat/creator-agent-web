"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CYAN, type SceneProps } from "./palette";
import { PosterCard, POSTER_ASPECT, shadePoster, usePosterDeck } from "./posterKit";
import { roundedRectGeometry, useRoundedRect } from "./roundedRect";

const SPEED = 0.42; // posters per second through the playhead

/** The cut coming together: an edit timeline. A filmstrip of poster frames,
 *  sprocket holes and all, runs under a fixed amber playhead; the frame at the
 *  playhead comes to full color while frames fade toward the strip's ends, and
 *  a play mark sits on the edit point. It's the climax right before the finished
 *  video appears. Reduced motion: the strip at rest, a frame in the gate. */
export function AssembleScene({ reduced }: SceneProps) {
  const { width: vw, height: vh } = useThree((s) => s.viewport);
  const h = vh * 0.5;
  const w = h * POSTER_ASPECT;
  const step = w * 1.1;
  const count = Math.ceil((vw * 1.1) / step) + 2; // enough to wrap off both ends
  const span = count * step;
  const { posters, textures, placeholder } = usePosterDeck(count, 6);
  const geo = useRoundedRect(w, h, w * 0.04);

  // Sprocket holes: ONE instanced mesh, two rows, a pair per frame.
  const holeW = step * 0.2;
  const holeH = h * 0.05;
  const holeGeo = useMemo(() => roundedRectGeometry(holeW, holeH, holeH * 0.35), [holeW, holeH]);
  useEffect(() => () => holeGeo.dispose(), [holeGeo]);
  const holesPerRow = count * 2;

  const playGeo = useMemo(() => {
    const r = h * 0.1;
    const s = new THREE.Shape();
    s.moveTo(-r * 0.45, -r * 0.55);
    s.lineTo(-r * 0.45, r * 0.55);
    s.lineTo(r * 0.6, 0); // optically centred: shifted toward the point
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [h]);
  useEffect(() => () => playGeo.dispose(), [playGeo]);
  const disc = useRoundedRect(h * 0.2, h * 0.2, h * 0.1);

  const frames = useRef<(THREE.Mesh | null)[]>([]);
  const holes = useRef<THREE.InstancedMesh>(null);
  const play = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const t = useRef(0);

  useFrame((_s, delta) => {
    // Reduced motion renders on demand only (static t), so this re-runs just
    // when something changes, e.g. a poster finishing loading.
    if (!reduced) t.current += delta;
    // Even frame counts: offset half a frame so one sits in the gate at rest.
    const align = count % 2 === 0 ? step / 2 : 0;
    const shift = (t.current * SPEED * step + align) % span;
    const fadeFrom = vw * 0.3;
    const fadeTo = vw * 0.5;
    frames.current.forEach((m, i) => {
      if (!m) return;
      const x = ((((i * step - shift) % span) + span) % span) - span / 2 + step / 2;
      m.position.x = x;
      const gate = 1 - THREE.MathUtils.smoothstep(Math.abs(x), step * 0.15, step * 0.9);
      const edge = 1 - THREE.MathUtils.smoothstep(Math.abs(x), fadeFrom, fadeTo);
      shadePoster(m, !!textures[i], placeholder[i], (0.32 + 0.68 * gate) * edge, edge);
    });
    const hm = holes.current;
    if (hm) {
      for (let row = 0; row < 2; row++) {
        for (let j = 0; j < holesPerRow; j++) {
          const x = ((((j * (step / 2) - shift) % span) + span) % span) - span / 2 + step / 4;
          const edge = 1 - THREE.MathUtils.smoothstep(Math.abs(x), fadeFrom, fadeTo);
          dummy.position.set(x, (row === 0 ? 1 : -1) * (h / 2 + holeH * 1.6), 0);
          dummy.scale.setScalar(edge > 0.01 ? 1 : 0);
          dummy.updateMatrix();
          hm.setMatrixAt(row * holesPerRow + j, dummy.matrix);
        }
      }
      hm.instanceMatrix.needsUpdate = true;
    }
    if (play.current && !reduced) {
      const p = Math.sin(t.current * 1.6) * 0.5 + 0.5;
      play.current.scale.setScalar(0.96 + p * 0.06);
    }
  });

  const headH = h + holeH * 6;
  return (
    <group>
      {posters.map((p, i) => (
        <PosterCard
          key={`${p.id}-${i}`}
          poster={p}
          tex={textures[i]}
          fallback={placeholder[i]}
          geometry={geo}
          level={0.32}
          position={[i * step - span / 2 + step / 2, 0, 0]}
          meshRef={(el) => {
            frames.current[i] = el;
          }}
        />
      ))}
      <instancedMesh ref={holes} args={[holeGeo, undefined, holesPerRow * 2]} frustumCulled={false}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.16} toneMapped={false} />
      </instancedMesh>

      {/* Playhead: the fixed edit point the strip runs under. */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[Math.max(0.025, w * 0.018), headH]} />
        <meshBasicMaterial color={CYAN} toneMapped={false} />
      </mesh>
      <mesh position={[0, headH / 2, 0.05]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[holeH * 1.6, holeH * 1.6]} />
        <meshBasicMaterial color={CYAN} toneMapped={false} />
      </mesh>

      <group ref={play} position={[0, 0, 0.08]}>
        <mesh geometry={disc}>
          <meshBasicMaterial color="#0b0e1a" transparent opacity={0.62} toneMapped={false} />
        </mesh>
        <mesh geometry={playGeo} position={[0, 0, 0.002]}>
          <meshBasicMaterial color="#efe8da" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

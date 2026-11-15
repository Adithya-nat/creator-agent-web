"use client";

import { type Ref, useMemo } from "react";
import * as THREE from "three";
import { pickPosters, POSTER_ASPECT, type Poster } from "@/lib/posters";
import { ramp } from "./palette";
import { usePosterTextures } from "./usePosterTextures";

export { POSTER_ASPECT };

/** `n` posters for a scene (a per-visit random draw; `salt` keeps each stage's
 *  set different), their textures as they load, and a ramp color per card to
 *  show until its poster arrives. */
export function usePosterDeck(n: number, salt: number) {
  const posters = useMemo(() => pickPosters(n, salt), [n, salt]);
  const textures = usePosterTextures(posters);
  const placeholder = useMemo(
    () => Array.from({ length: n }, (_, i) => ramp(n === 1 ? 0.5 : i / (n - 1))),
    [n],
  );
  return { posters, textures, placeholder };
}

const scratch = new THREE.Color();
const WHITE = new THREE.Color(1, 1, 1);

/** Per-frame shading for a poster card: `level` is brightness (0 = black,
 *  1 = the poster as shot), `tint` an optional color grade multiplied in. */
export function shadePoster(
  mesh: THREE.Mesh,
  hasTex: boolean,
  fallback: THREE.Color,
  level: number,
  opacity = 1,
  tint?: THREE.Color,
) {
  const mat = mesh.material as THREE.MeshBasicMaterial;
  const base = hasTex ? scratch.setScalar(1) : scratch.copy(fallback);
  mat.color.copy(base).multiplyScalar(level);
  if (tint) mat.color.multiply(tint);
  mat.opacity = opacity;
}

/** One poster card: rounded geometry, unlit (posters show their own colors),
 *  a ramp-colored placeholder until the texture lands. Initial shading comes
 *  from props; animated scenes then drive it each frame via `shadePoster`. */
export function PosterCard({
  poster,
  tex,
  fallback,
  geometry,
  level = 1,
  opacity = 1,
  tint,
  meshRef,
  ...props
}: {
  poster: Poster;
  tex: THREE.Texture | null;
  fallback: THREE.Color;
  geometry: THREE.BufferGeometry;
  level?: number;
  opacity?: number;
  /** Static color grade (multiplied in); animated scenes pass it to shadePoster. */
  tint?: THREE.Color;
  meshRef?: Ref<THREE.Mesh>;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  return (
    <mesh ref={meshRef} geometry={geometry} name={poster.title} {...props}>
      <meshBasicMaterial
        // Remount when the map arrives so the shader recompiles with it.
        key={tex ? "poster" : "placeholder"}
        map={tex}
        color={(tex ? new THREE.Color().setScalar(level) : fallback.clone().multiplyScalar(level)).multiply(
          tint ?? WHITE,
        )}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Largest card width (2:3) so `count` cards + gaps fit `availW`, capped so
 *  `rows` of them fit `availH`. */
export function fitCardWidth(count: number, rows: number, availW: number, availH: number, gap = 0.12) {
  const byW = availW / (count + (count - 1) * gap);
  const byH = availH / (rows / POSTER_ASPECT + (rows - 1) * gap);
  return Math.min(byW, byH);
}

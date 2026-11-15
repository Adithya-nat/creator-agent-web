import { useEffect, useMemo } from "react";
import * as THREE from "three";

/** A w×h plane with rounded corners and UVs normalized to 0..1, so a poster
 *  texture maps edge-to-edge like it would on a planeGeometry. */
export function roundedRectGeometry(w: number, h: number, r: number): THREE.ShapeGeometry {
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  const s = new THREE.Shape();
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + h - rr);
  s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  const geo = new THREE.ShapeGeometry(s, 6);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  }
  uv.needsUpdate = true;
  return geo;
}

/** Memoized rounded-rect geometry, disposed (GPU buffers freed) on unmount. */
export function useRoundedRect(w: number, h: number, r: number): THREE.ShapeGeometry {
  const geo = useMemo(() => roundedRectGeometry(w, h, r), [w, h, r]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

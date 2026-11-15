// Runtime smoke: the R3F scenes are client-only (ssr:false), so `next build`
// compiles them but never executes them. This mounts each scene in the headless
// R3F test renderer and advances a few frames, so a bad geometry arg, a null-ref
// deref, or an invalid three call surfaces as a failing test — not a blank canvas
// in front of a user. (The visuals themselves still need a manual view.)
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { PosterDrift } from "../HeroBackdrop";
import { CompletionScene } from "./CompletionScene";

async function mountTickUnmount(node: ReactElement): Promise<number> {
  const renderer = await ReactThreeTestRenderer.create(node);
  await ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(3, 0.016); // exercise useFrame animation paths
  });
  const childCount = renderer.scene.children.length;
  await renderer.unmount();
  return childCount;
}

describe("3D scenes render + animate without throwing", () => {
  it("CompletionScene (burst mutates its buffer without throwing)", async () => {
    expect(await mountTickUnmount(<CompletionScene />)).toBeGreaterThan(0);
  });

  it("Hero PosterDrift (animated + reduced)", async () => {
    expect(await mountTickUnmount(<PosterDrift reduced={false} />)).toBeGreaterThan(0);
    expect(await mountTickUnmount(<PosterDrift reduced />)).toBeGreaterThan(0);
  });
});

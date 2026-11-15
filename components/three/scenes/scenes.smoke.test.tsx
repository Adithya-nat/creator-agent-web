// Runtime smoke: the R3F scenes are client-only (ssr:false), so `next build`
// compiles them but never executes them. This mounts each scene in the headless
// R3F test renderer and advances a few frames, so a bad geometry arg, a null-ref
// deref, or an invalid three call surfaces as a failing test — not a blank canvas
// in front of a user. (The visuals themselves still need a manual view.)
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import type { StageSignal } from "@/lib/stageSignals";
import { PosterDrift } from "../HeroBackdrop";
import { AssembleScene } from "./AssembleScene";
import { AudioScene } from "./AudioScene";
import { CompletionScene } from "./CompletionScene";
import { DesignScene } from "./DesignScene";
import { FramesScene } from "./FramesScene";
import { ReflectionScene } from "./ReflectionScene";
import { ScriptScene } from "./ScriptScene";

function sig(name: string): StageSignal {
  return { name, status: "running", phase: "active", progress01: 0.5, intensity: 0.3, logCount: 3 };
}

async function mountTickUnmount(node: ReactElement): Promise<number> {
  const renderer = await ReactThreeTestRenderer.create(node);
  await ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(3, 0.016); // exercise useFrame animation paths
  });
  const childCount = renderer.scene.children.length;
  await renderer.unmount();
  return childCount;
}

describe("stage scenes render + animate without throwing", () => {
  it("ScriptScene (animated)", async () => {
    expect(
      await mountTickUnmount(<ScriptScene signal={sig("script_writer")} reduced={false} count={12} />),
    ).toBeGreaterThan(0);
  });

  it("ReflectionScene (animated)", async () => {
    expect(
      await mountTickUnmount(<ReflectionScene signal={sig("reflection")} reduced={false} />),
    ).toBeGreaterThan(0);
  });

  it("DesignScene (animated)", async () => {
    expect(
      await mountTickUnmount(<DesignScene signal={sig("designer")} reduced={false} />),
    ).toBeGreaterThan(0);
  });

  it("FramesScene (animated, mid-progress)", async () => {
    expect(
      await mountTickUnmount(
        <FramesScene signal={sig("image_gen")} reduced={false} frames={{ current: 4, total: 15 }} />,
      ),
    ).toBeGreaterThan(0);
  });

  it("AssembleScene (animated)", async () => {
    expect(
      await mountTickUnmount(<AssembleScene signal={sig("assembler")} reduced={false} />),
    ).toBeGreaterThan(0);
  });

  it("AudioScene (animated + reduced)", async () => {
    expect(await mountTickUnmount(<AudioScene signal={sig("music")} reduced={false} />)).toBeGreaterThan(0);
    expect(await mountTickUnmount(<AudioScene signal={sig("narration")} reduced />)).toBeGreaterThan(0);
  });

  it("CompletionScene (burst mutates its buffer without throwing)", async () => {
    expect(await mountTickUnmount(<CompletionScene />)).toBeGreaterThan(0);
  });

  it("reduced-motion static variants render", async () => {
    expect(
      await mountTickUnmount(
        <FramesScene signal={sig("image_gen")} reduced frames={{ current: 4, total: 15 }} />,
      ),
    ).toBeGreaterThan(0);
    expect(
      await mountTickUnmount(<AssembleScene signal={sig("assembler")} reduced />),
    ).toBeGreaterThan(0);
    expect(
      await mountTickUnmount(<ScriptScene signal={sig("script_writer")} reduced count={9} />),
    ).toBeGreaterThan(0);
  });

  it("Hero PosterDrift (animated + reduced)", async () => {
    expect(await mountTickUnmount(<PosterDrift reduced={false} />)).toBeGreaterThan(0);
    expect(await mountTickUnmount(<PosterDrift reduced />)).toBeGreaterThan(0);
  });
});

import type { MotionCoverage, StoryboardScene } from "@/lib/types";

/** Short label for a video model id, e.g. "gemini-omni-1.2-flash" -> "Omni 1.2". */
export function modelLabel(model: string): string {
  const omni = model.match(/omni-(\d+(?:\.\d+)?)/);
  if (omni) return `Omni ${omni[1]}`;
  if (model.includes("omni")) return "Omni";
  return model;
}

export function formatMotionCoverage(coverage?: MotionCoverage | null): string | null {
  if (!coverage || coverage.total === 0) return null;
  const parts = [`${coverage.generative}/${coverage.total} AI-filmed`];
  for (const [model, count] of Object.entries(coverage.by_model ?? {})) {
    parts.push(`${count} ${modelLabel(model)}`);
  }
  const fallback = coverage.composited + coverage.kenburns + coverage.local_generative;
  if (fallback > 0) parts.push(`${fallback} fallback`);
  if (coverage.still > 0) parts.push(`${coverage.still} still`);
  return parts.join(" · ");
}

export function motionBadge(scene: StoryboardScene): string | null {
  if (scene.motion_kind === "generative") return scene.motion_model ? modelLabel(scene.motion_model) : "AI";
  if (scene.motion_kind) return "fallback";
  return scene.status === "degraded" ? "fallback" : null;
}

export type VoiceKind = "on_camera" | "narrator" | "off_screen";

const VOICE: Record<VoiceKind, { kind: VoiceKind; label: string }> = {
  on_camera: { kind: "on_camera", label: "Spoken on camera" },
  narrator: { kind: "narrator", label: "Narrator" },
  off_screen: { kind: "off_screen", label: "Voiced off-screen" },
};

export function voiceBadge(scene: StoryboardScene): { kind: VoiceKind; label: string } | null {
  return scene.voice && scene.voice in VOICE ? VOICE[scene.voice as VoiceKind] : null;
}

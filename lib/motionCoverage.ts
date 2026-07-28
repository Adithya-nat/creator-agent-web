import type { MotionCoverage, StoryboardScene } from "@/lib/types";

function modelLabel(model: string): string {
  if (model.includes("lite")) return "Lite";
  if (model.includes("fast")) return "Fast";
  if (model.includes("veo-3.1")) return "Standard";
  return model;
}

export function formatMotionCoverage(
  coverage?: MotionCoverage | null,
): string | null {
  if (!coverage) return null;
  const parts = [`${coverage.animated}/${coverage.total} animated`];
  const models = Object.entries(coverage.by_model ?? {});
  if (models.length > 0) {
    for (const [model, count] of models) {
      parts.push(`${count} ${modelLabel(model)}`);
    }
  } else if (coverage.generative > 0) {
    parts.push(`${coverage.generative} generative`);
  }
  if (coverage.local_generative > 0)
    parts.push(`${coverage.local_generative} local AI`);
  if (coverage.composited > 0)
    parts.push(`${coverage.composited} composited`);
  if (coverage.kenburns > 0) parts.push(`${coverage.kenburns} fallback`);
  if (coverage.still > 0) parts.push(`${coverage.still} still`);
  return parts.join(" · ");
}

export function motionBadge(scene: StoryboardScene): string | null {
  if (scene.motion_kind === "generative")
    return scene.motion_model ? modelLabel(scene.motion_model) : "Veo";
  if (scene.motion_kind === "local_generative") return "local AI";
  if (scene.motion_kind === "composited") return "composited";
  if (scene.motion_kind === "kenburns") return "fallback";
  return scene.status === "degraded" ? "fallback" : null;
}

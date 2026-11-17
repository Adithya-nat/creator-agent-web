"use client";

import { motion } from "framer-motion";
import { ENTER } from "@/components/production/motion";
import { touchedScenes } from "@/lib/recut";
import type { RecutMap, StageRef } from "@/lib/types";
import { FilmTimeline } from "./FilmTimeline";

const DONE = new Set(["succeeded", "degraded", "skipped"]);

/** While a recut renders: the film timeline with each changed scene filling as its
 *  frame, clip and the edit finish. */
export function RecutProgress({ map, stages, running }: { map: RecutMap; stages: StageRef[]; running: boolean }) {
  const cut = map.cuts[map.cuts.length - 1];
  if (!cut || cut.current === false || !cut.items.length) return null;
  const touched = touchedScenes(cut.items);
  if (!touched.size) return null;
  const status = new Map(stages.map((s) => [s.name, s.status]));
  const progress = new Map<number, number>();
  for (const n of touched) {
    const steps: string[] = [];
    if (cut.items.includes(`frame-${n}`)) steps.push("image_gen");
    if (cut.items.includes(`clip-${n}`)) steps.push("motion");
    if (cut.items.includes(`voice-${n}`)) steps.push("narration");
    steps.push("assembler");
    const done = steps.filter((s) => DONE.has(status.get(s) ?? "")).length;
    progress.set(n, done / steps.length);
  }
  return (
    <motion.section
      aria-label={`Cut ${cut.cut} progress`}
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: ENTER }}
      className="glass mb-6 p-4 sm:p-5"
    >
      <p className="font-mono text-[11px] tracking-[0.18em] text-leak">
        CUT {cut.cut} · {running ? "RENDERING" : "ON HOLD"}
      </p>
      <p className="mt-1 text-sm text-ink/90">{cut.summary}</p>
      <div className="mt-4">
        <FilmTimeline scenes={map.scenes} cuts={map.cuts} touched={touched} progress={progress} />
      </div>
    </motion.section>
  );
}

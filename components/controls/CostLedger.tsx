"use client";

import { motion } from "framer-motion";
import { EASE } from "@/components/production/motion";
import { formatUSD } from "@/lib/format";
import { costSplit } from "@/lib/runControls";
import type { Checkpoint } from "@/lib/types";
import { AnimatedNumber } from "./primitives";

/** Kept vs still to pay: what a pause protects and what finishing will cost. */
export function CostLedger({ checkpoint }: { checkpoint: Checkpoint | null }) {
  const { kept, toFinish, keptShare } = costSplit(checkpoint);
  const basis =
    checkpoint?.estimate_basis === "history"
      ? "Estimated from what this step and the rest cost in your recent films."
      : "Estimated from the units still to make.";

  return (
    <div className="glass-2 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-muted">KEPT</p>
          <p className="mt-0.5 font-display text-2xl font-extrabold text-state-ok">
            <AnimatedNumber value={kept} format={formatUSD} />
          </p>
          <p className="mt-1 text-xs leading-snug text-muted">Already paid. Reused on resume, never billed twice.</p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-muted">TO FINISH</p>
          <p className="mt-0.5 font-display text-2xl font-extrabold text-ink">
            ≈ <AnimatedNumber value={toFinish} format={formatUSD} />
          </p>
          <p className="mt-1 text-xs leading-snug text-muted">{basis}</p>
        </div>
      </div>
      <div
        className="relative mt-4 h-2 overflow-hidden rounded-full bg-[repeating-linear-gradient(135deg,rgba(239,232,218,0.10)_0_6px,rgba(239,232,218,0.04)_6px_12px)]"
        role="img"
        aria-label={`${Math.round(keptShare * 100)}% of this film's cost is already paid and kept`}
      >
        <motion.span
          className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-state-ok"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: keptShare }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      </div>
    </div>
  );
}

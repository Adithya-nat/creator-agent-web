"use client";

import { motion } from "framer-motion";
import type { Duration } from "@/lib/types";

const OPTIONS: Duration[] = [30, 60];

export function DurationToggle({
  value,
  onChange,
  disabled,
}: {
  value: Duration;
  onChange: (d: Duration) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Video length"
      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/60 p-1 backdrop-blur-md"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt)}
            className="relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {active && (
              <motion.span
                layoutId="duration-pill"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-cyan/25 to-brand-violet/25 ring-1 ring-brand-cyan/40"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className={active ? "relative text-ink" : "relative text-muted"}>
              {opt}s
            </span>
          </button>
        );
      })}
    </div>
  );
}

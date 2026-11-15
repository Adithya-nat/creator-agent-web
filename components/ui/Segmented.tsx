"use client";

import { motion } from "framer-motion";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  hint?: string;
}

/** Pill-style single-select control with an animated active indicator. */
export function Segmented<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/60 p-1 backdrop-blur-md"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.hint}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className="relative min-h-9 rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {active && (
              <motion.span
                layoutId={`${id}-pill`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className={active ? "relative text-midnight" : "relative text-muted hover:text-ink"}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

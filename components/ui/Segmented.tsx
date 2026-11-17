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
      className="inline-flex items-center gap-0.5 rounded-full border border-transparent bg-ink/[0.04] p-[3px] shadow-[0_0_0_1px_var(--color-line)]"
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
            className="relative min-h-9 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50"
          >
            {active && (
              <motion.span
                layoutId={`${id}-pill`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", duration: 0.35, bounce: 0 }}
              />
            )}
            <span className={`relative transition-colors duration-150 ${active ? "text-midnight" : "text-muted hover:text-ink"}`}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

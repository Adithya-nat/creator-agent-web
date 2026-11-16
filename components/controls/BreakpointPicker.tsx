"use client";

import { motion } from "framer-motion";
import { Flag } from "lucide-react";
import { stationFor } from "@/components/production/stations";
import { stageShort, toggleStage } from "@/lib/runControls";

/** "Pause before…" toggles for every stage that hasn't started yet. Pressed chips
 *  are filled amber with a flag that swings in; the toggle state is also carried by
 *  aria-pressed and the label, never by motion alone. */
export function BreakpointPicker({
  order,
  breakable,
  value,
  onChange,
}: {
  order: string[];
  breakable: string[];
  value: string[];
  onChange: (stages: string[]) => void;
}) {
  if (breakable.length === 0) {
    return <p className="text-xs text-muted">Every step has started, so there&apos;s nothing left to stop before.</p>;
  }
  return (
    <div>
      <p className="text-sm font-medium text-ink">Pause before</p>
      <p className="mt-0.5 text-xs leading-snug text-muted">
        The film stops right before a step starts and waits for you. Try Motion to read the script and frames before
        any money goes to AI video.
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {breakable.map((name) => {
          const on = value.includes(name);
          const Icon = stationFor(name).icon;
          return (
            <li key={name}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(toggleStage(value, name, order))}
                title={`Pause before ${stationFor(name).dept}`}
                className={`press inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-[background-color,color,box-shadow] duration-150 ${
                  on
                    ? "bg-accent text-midnight shadow-[0_0_0_1px_var(--color-accent)]"
                    : "text-ink/85 shadow-[0_0_0_1px_rgba(239,232,218,0.14)] hover:bg-white/[0.05]"
                }`}
              >
                {on ? (
                  <motion.span
                    key="flag"
                    initial={{ rotate: -35, scale: 0.6, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                    className="origin-bottom-left"
                  >
                    <Flag className="h-3.5 w-3.5" strokeWidth={2.25} fill="currentColor" aria-hidden />
                  </motion.span>
                ) : (
                  <Icon className="h-3.5 w-3.5 text-muted" strokeWidth={2} aria-hidden />
                )}
                {stageShort(name)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

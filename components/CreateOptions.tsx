"use client";

import { motion } from "framer-motion";
import { Clapperboard, Mic, Speech } from "lucide-react";
import { DurationToggle } from "@/components/DurationToggle";
import { Segmented } from "@/components/ui/Segmented";
import { useBudget } from "@/hooks/useBudget";
import { formatUSD } from "@/lib/format";
import type { Duration, Language, StoryStyle } from "@/lib/types";

const STYLES: { value: StoryStyle; Icon: typeof Speech; title: string; blurb: string }[] = [
  { value: "dialogue", Icon: Speech, title: "Dialogue", blurb: "Characters act it out and say their lines on camera." },
  { value: "mixed", Icon: Clapperboard, title: "Mixed", blurb: "A narrator sets it up, then the key moments cut to the cast talking." },
  { value: "narrated", Icon: Mic, title: "Narrated", blurb: "Your channel narrator tells the story over moving scenes." },
];

export function CreateOptions({
  style,
  language,
  duration,
  onStyle,
  onLanguage,
  onDuration,
  disabled,
}: {
  style: StoryStyle;
  language: Language;
  duration: Duration;
  onStyle: (s: StoryStyle) => void;
  onLanguage: (l: Language) => void;
  onDuration: (d: Duration) => void;
  disabled?: boolean;
}) {
  const budget = useBudget();
  const estimate = budget?.estimates?.[style]?.[String(duration) as "30" | "60"];
  const left = budget?.videos_left?.[`${style}_${duration}`];

  return (
    <div className="space-y-4 text-left">
      <div role="radiogroup" aria-label="Story style" className="grid gap-3 sm:grid-cols-3">
        {STYLES.map((s) => {
          const active = style === s.value;
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onStyle(s.value)}
              className={`relative rounded-2xl border p-4 text-left transition-[border-color,background-color] duration-150 disabled:opacity-50 ${
                active ? "border-accent bg-surface-2" : "border-line bg-surface/50 hover:border-ink/25"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="style-glow"
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-accent/[0.06]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative flex items-center gap-2 font-semibold text-ink">
                <s.Icon className={`h-4 w-4 ${active ? "text-accent" : "text-muted"}`} strokeWidth={2} aria-hidden="true" />
                {s.title}
              </span>
              <span className="relative mt-1 block text-xs leading-snug text-muted">{s.blurb}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DurationToggle value={duration} onChange={onDuration} disabled={disabled} />
        <Segmented
          id="language"
          label="Language"
          value={language}
          onChange={onLanguage}
          disabled={disabled}
          options={[
            { value: "en", label: "English" },
            { value: "ta", label: <span className="font-tamil">தமிழ்</span>, hint: "Tamil: narration, dialogue, captions and post copy" },
          ]}
        />
        {estimate != null && (
          <span
            className="text-sm text-muted sm:ml-auto"
            title="Estimated AI cost for this video (from your recent runs once there are a few)"
          >
            About {formatUSD(estimate)} per video{left != null ? `, ${left} left in this month's budget` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { Segmented } from "@/components/ui/Segmented";
import { useBudget } from "@/hooks/useBudget";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatUSD } from "@/lib/format";
import type { Duration, Language, StoryStyle } from "@/lib/types";

const IDEAS = [
  "a lighthouse keeper befriends a storm",
  "two rival tea sellers share one umbrella in the Chennai monsoon",
  "a retired astronaut teaches her grandson to fish",
  "the last bookstore on Mars gets one more customer",
  "an auto driver races a getaway car through North Chennai",
];

const STYLES: { value: StoryStyle; label: string; blurb: string }[] = [
  { value: "dialogue", label: "Dialogue", blurb: "The cast acts it out and says their lines on camera, lip-synced." },
  { value: "mixed", label: "Mixed", blurb: "A narrator sets it up, then the key moments cut to the cast talking." },
  { value: "narrated", label: "Narrated", blurb: "Your channel's narrator tells the story over moving scenes." },
];

const MIN = 3;
const MAX = 2000;

/** Types example ideas into the empty prompt, one after another, then erases them. */
function useTypewriter(active: boolean) {
  const reduce = usePrefersReducedMotion();
  const [text, setText] = useState(IDEAS[0]);
  useEffect(() => {
    if (!active || reduce) return;
    let idea = 0;
    let n = 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const full = IDEAS[idea];
      if (!erasing) {
        n += 1;
        setText(full.slice(0, n));
        if (n >= full.length) {
          erasing = true;
          timer = setTimeout(step, 2200);
          return;
        }
        timer = setTimeout(step, 38 + Math.random() * 40);
      } else {
        n -= 2;
        setText(full.slice(0, Math.max(0, n)));
        if (n <= 0) {
          erasing = false;
          idea = (idea + 1) % IDEAS.length;
          timer = setTimeout(step, 420);
          return;
        }
        timer = setTimeout(step, 18);
      }
    };
    timer = setTimeout(() => {
      setText("");
      step();
    }, 600);
    return () => clearTimeout(timer);
  }, [active, reduce]);
  return reduce ? IDEAS[0] : text;
}

/** A camera timecode that runs while the page is open. Decorative. */
function Timecode() {
  const [t, setT] = useState("00:00:00:00");
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last > 80) {
        last = now;
        const ms = now - start;
        const f = Math.floor((ms / 1000) * 24) % 24;
        const s = Math.floor(ms / 1000);
        const p = (v: number) => String(v).padStart(2, "0");
        setT(`${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(f)}`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <span aria-hidden="true" className="font-mono text-[11px] tabular-nums tracking-[0.04em] text-muted">
      {t}
    </span>
  );
}

export function Composer({
  prompt,
  onPrompt,
  style,
  onStyle,
  language,
  onLanguage,
  duration,
  onDuration,
  onSubmit,
  submitting,
  canSubmit,
  missingKey,
  error,
  children,
}: {
  prompt: string;
  onPrompt: (v: string) => void;
  style: StoryStyle;
  onStyle: (s: StoryStyle) => void;
  language: Language;
  onLanguage: (l: Language) => void;
  duration: Duration;
  onDuration: (d: Duration) => void;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
  missingKey: boolean;
  error: string | null;
  /** Slot under the options (the Turnstile check when it's on). */
  children?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const ghost = useTypewriter(!prompt && !focused);
  const budget = useBudget();
  const estimate = budget?.estimates?.[style]?.[String(duration) as "30" | "60"];
  const left = budget?.videos_left?.[`${style}_${duration}`];
  const tooShort = prompt.trim().length > 0 && prompt.trim().length < MIN;
  const active = STYLES.find((s) => s.value === style) ?? STYLES[0];

  return (
    <div className="space-y-3">
      <div className="group relative rounded-[22px] bg-surface/80 shadow-[0_0_0_1px_var(--color-line),0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <span className="light-ring" data-on={submitting} aria-hidden="true" />
        <span className="corner corner-tl" aria-hidden="true" />
        <span className="corner corner-tr" aria-hidden="true" />

        <div className="flex items-center justify-between gap-3 px-6 pt-5">
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full bg-state-bad ${focused || submitting ? "rec-dot" : "opacity-40"}`}
            />
            Your idea
          </span>
          <span className="flex items-center gap-3">
            {(prompt.length > 0 || tooShort) && (
              <span id="composer-count" className="text-xs">
                {tooShort ? (
                  <span className="text-state-warn">At least {MIN} characters</span>
                ) : (
                  <span className={`tabular-nums ${prompt.length > MAX - 100 ? "text-state-warn" : "text-muted"}`}>
                    {prompt.length}/{MAX}
                  </span>
                )}
              </span>
            )}
            <Timecode />
          </span>
        </div>

        <div className="relative">
          <textarea
            ref={ref}
            value={prompt}
            onChange={(e) => onPrompt(e.target.value.slice(0, MAX))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                onSubmit();
              }
            }}
            disabled={submitting}
            rows={2}
            aria-label="Describe your short film"
            aria-describedby="composer-count"
            placeholder={focused ? "One line is enough. A full treatment works too." : ""}
            className="composer-input relative z-10 block min-h-[104px] w-full resize-none bg-transparent px-6 pb-2 pt-3 text-xl leading-snug tracking-[-0.01em] text-ink placeholder:text-muted/50 focus:outline-none disabled:opacity-60 sm:text-[22px]"
          />
          {!prompt && !focused && (
            <p
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 px-6 pt-3 text-xl leading-snug tracking-[-0.01em] text-muted/55 sm:text-[22px]"
            >
              {ghost}
              <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-accent/80 rec-dot" />
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto px-6 pb-4 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-muted">Try</span>
          {IDEAS.slice(0, 3).map((idea) => (
            <button
              key={idea}
              type="button"
              disabled={submitting}
              onClick={() => {
                onPrompt(idea);
                ref.current?.focus();
              }}
              className="max-w-[200px] shrink-0 truncate rounded-full bg-ink/[0.05] px-3 py-1.5 text-muted shadow-[0_0_0_1px_var(--color-line)] transition-colors duration-150 hover:bg-ink/[0.09] hover:text-ink disabled:opacity-50"
            >
              {idea}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Segmented
              id="style"
              label="Story style"
              value={style}
              onChange={onStyle}
              disabled={submitting}
              options={STYLES.map((s) => ({
                value: s.value,
                hint: s.blurb,
                label: s.label,
              }))}
            />
            <Segmented
              id="duration"
              label="Video length"
              value={duration}
              onChange={onDuration}
              disabled={submitting}
              options={[
                { value: 30, label: "30s" },
                { value: 60, label: "60s" },
              ]}
            />
            <Segmented
              id="language"
              label="Language"
              value={language}
              onChange={onLanguage}
              disabled={submitting}
              options={[
                { value: "en", label: "English" },
                {
                  value: "ta",
                  label: <span className="font-tamil">தமிழ்</span>,
                  hint: "The film is in Tamil (speech, captions, post copy); the app stays in English",
                },
              ]}
            />
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit && !missingKey}
            className="press sheen group/cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-midnight shadow-[0_10px_30px_-10px_rgba(242,181,68,0.6)] transition-[background-color,box-shadow] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {submitting ? (
              <>
                <Spinner /> Starting your film
              </>
            ) : missingKey ? (
              <>
                <KeyRound className="h-4 w-4" aria-hidden="true" /> Add your Gemini key
              </>
            ) : (
              <>
                Make the film
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 ease-out group-hover/cta:translate-x-0.5"
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex min-h-5 flex-wrap items-start justify-between gap-x-6 gap-y-1 px-2 text-sm">
        <span className="sr-only">Press Command or Control plus Enter to start.</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={active.value}
            initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="text-muted"
          >
            <span className="text-ink">{active.label}.</span> {active.blurb}
          </motion.p>
        </AnimatePresence>
        {estimate != null && (
          <p className="text-muted" title="Estimated AI cost for this film, from your recent runs once there are a few">
            About <span className="tabular-nums text-ink">{formatUSD(estimate)}</span>
            {left != null ? <> · {left} left this month</> : null}
          </p>
        )}
      </div>

      {children}

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-2 text-sm text-state-bad"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

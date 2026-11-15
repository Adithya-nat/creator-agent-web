"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ScenePhase, StageSignal } from "@/lib/stageSignals";
import { EASE } from "./motion";
import { stationFor } from "./stations";

const STATE_TEXT: Record<string, string> = {
  done: "done",
  active: "in progress",
  pending: "up next",
  failed: "failed",
};

/** The conveyor: every station in pipeline order. Finished stations are checked
 *  and the rail fills behind them; the slate ring travels to the active one.
 *  Each node carries a static cue (icon, color, sr text), never motion alone. */
export function LineTrack({
  order,
  signals,
  active,
  reduced,
}: {
  order: string[];
  signals: Record<string, StageSignal>;
  active: string;
  reduced: boolean;
}) {
  const scroller = useRef<HTMLOListElement>(null);
  const activeIdx = order.indexOf(active);

  // Keep the active station in view on narrow screens (scrolls the rail only).
  useEffect(() => {
    const ol = scroller.current;
    const li = ol?.children[activeIdx] as HTMLElement | undefined;
    if (!ol || !li || ol.scrollWidth <= ol.clientWidth) return;
    ol.scrollTo({
      left: li.offsetLeft - ol.clientWidth / 2 + li.clientWidth / 2,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [activeIdx, reduced]);

  return (
    <ol
      ref={scroller}
      aria-label="Production stations"
      className="scroll-thin flex items-start overflow-x-auto overscroll-x-contain px-1 pb-1 pt-1"
    >
      {order.map((name, i) => {
        const st = stationFor(name);
        const sig = signals[name];
        const phase: ScenePhase = sig?.phase ?? "pending";
        const skipped = sig?.status === "skipped";
        const degraded = sig?.status === "degraded";
        const isActive = name === active;
        const Icon = st.icon;
        const prevDone = i > 0 && (signals[order[i - 1]]?.phase === "done");

        return (
          <li
            key={name}
            aria-current={isActive ? "step" : undefined}
            className="relative flex min-w-[68px] flex-1 flex-col items-center gap-1.5"
          >
            {i > 0 && (
              <span aria-hidden className="absolute left-[-50%] right-1/2 top-[17px] h-[2px] overflow-hidden rounded-full bg-white/[0.08]">
                <motion.span
                  className="absolute inset-0 origin-left bg-accent"
                  initial={false}
                  animate={{ scaleX: phase === "done" || isActive ? 1 : prevDone ? 0.5 : 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                />
                {isActive && !reduced && (
                  // Conveyor dashes running into the active station.
                  <motion.span
                    className="absolute inset-y-0 left-[-24px] right-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_6px,rgba(20,26,46,0.55)_6px,rgba(20,26,46,0.55)_12px)]"
                    animate={{ x: [0, 12] }}
                    transition={{ duration: 0.6, ease: "linear", repeat: Infinity }}
                  />
                )}
              </span>
            )}
            <span className="relative z-10 flex h-9 w-9 items-center justify-center">
              {isActive && (
                <motion.span
                  layoutId="line-slate"
                  className="absolute inset-0 rounded-full bg-accent/15 shadow-[0_0_0_2px_var(--color-accent)]"
                  transition={{ duration: 0.55, ease: EASE }}
                />
              )}
              <span
                className={`relative flex h-7 w-7 items-center justify-center rounded-full ${
                  phase === "failed"
                    ? "bg-state-bad/20 text-state-bad"
                    : degraded
                      ? "bg-state-warn/20 text-state-warn"
                      : skipped
                        ? "border border-dashed border-white/20 text-muted"
                        : phase === "done"
                          ? "bg-accent text-midnight"
                          : isActive
                            ? "text-accent"
                            : "bg-white/[0.05] text-muted"
                }`}
              >
                {phase === "failed" ? (
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                ) : phase === "done" && !skipped ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                ) : (
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                )}
              </span>
            </span>
            <span
              className={`whitespace-nowrap text-[11px] leading-none ${
                isActive ? "font-medium text-ink" : "hidden text-muted sm:block"
              }`}
            >
              {st.short}
            </span>
            <span className="sr-only">
              {st.dept}: {skipped ? "skipped" : degraded ? "done with warnings" : STATE_TEXT[phase]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

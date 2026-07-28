"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LogStream } from "@/components/LogStream";
import { Spinner } from "@/components/Spinner";
import { formatElapsed, formatTokens } from "@/lib/format";
import { JOB_LOG_KEY } from "@/hooks/useJobStream";
import {
  STAGE_LABELS,
  STAGE_ORDER,
  type LogLine,
  type StageRef,
  type StageStatus,
} from "@/lib/types";

type RowStatus = StageStatus;

// Stages that report live X/total progress, with the noun to show.
const PROGRESS_NOUN: Record<string, string> = { image_gen: "frames", motion: "clips" };

function StageIcon({ status }: { status: RowStatus }) {
  const base =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs";
  switch (status) {
    case "running":
      return <Spinner className="h-5 w-5 text-brand-cyan" />;
    case "succeeded":
      return (
        <span className={`${base} bg-state-ok/15 text-state-ok`}>✓</span>
      );
    case "degraded":
      return (
        <span className={`${base} bg-state-warn/15 text-state-warn`}>!</span>
      );
    case "failed":
    case "interrupted":
      return <span className={`${base} bg-state-bad/15 text-state-bad`}>✕</span>;
    default:
      return <span className={`${base} border border-line text-muted`}>•</span>;
  }
}

function mergeStages(live: StageRef[], order: string[]): StageRef[] {
  const byName = new Map(live.map((s) => [s.name, s]));
  return order.map(
    (name, i): StageRef =>
      byName.get(name) ?? {
        name,
        seq: i + 1,
        status: "pending",
        message: null,
        progress_current: null,
        progress_total: null,
        tokens: null,
        started_at: null,
        ended_at: null,
      },
  );
}

export function StageList({
  stages,
  logsByStage,
  currentStage,
  order = STAGE_ORDER,
}: {
  stages: StageRef[];
  logsByStage: Record<string, LogLine[]>;
  currentStage: string | null;
  order?: string[];
}) {
  const rows = mergeStages(stages, order);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Auto-expand the running stage so logs are visible without a click.
  useEffect(() => {
    if (currentStage) {
      setExpanded((prev) => {
        if (prev.has(currentStage)) return prev;
        const next = new Set(prev);
        next.add(currentStage);
        return next;
      });
    }
  }, [currentStage]);

  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  return (
    <div className="glass divide-y divide-line overflow-hidden">
      {rows.map((st) => {
        const isOpen = expanded.has(st.name);
        const isCurrent = currentStage === st.name;
        const logs = logsByStage[st.name] ?? [];
        const noun = PROGRESS_NOUN[st.name];
        const showProgress =
          noun != null && st.progress_total != null && st.progress_total > 0;
        const pct = showProgress
          ? Math.round(
              ((st.progress_current ?? 0) / (st.progress_total ?? 1)) * 100,
            )
          : 0;

        return (
          <div key={st.name} className={isCurrent ? "bg-brand-cyan/[0.04]" : ""}>
            <button
              type="button"
              onClick={() => toggle(st.name)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
            >
              <StageIcon status={st.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-ink">
                    {STAGE_LABELS[st.name] ?? st.name}
                  </span>
                  {st.status === "degraded" && (
                    <span className="text-xs text-state-warn">degraded</span>
                  )}
                </div>
                {showProgress && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-violet transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted">
                      {st.progress_current ?? 0} / {st.progress_total} {noun}
                    </span>
                  </div>
                )}
              </div>
              {st.tokens != null && st.tokens > 0 && (
                <span
                  className="shrink-0 text-xs text-muted/70"
                  title={`${st.tokens.toLocaleString("en-US")} tokens`}
                >
                  {formatTokens(st.tokens)} tok
                </span>
              )}
              <span className="shrink-0 text-xs text-muted">
                {formatElapsed(st.started_at, st.ended_at)}
              </span>
              <span
                className={`shrink-0 text-muted transition-transform ${
                  isOpen ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              >
                ›
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-line bg-base/40"
                >
                  <LogStream lines={logs} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Job-level logs (not tied to a stage), if any. */}
      {(logsByStage[JOB_LOG_KEY]?.length ?? 0) > 0 && (
        <details className="bg-base/40">
          <summary className="cursor-pointer px-4 py-3 text-sm text-muted">
            Job-level logs
          </summary>
          <div className="border-t border-line">
            <LogStream lines={logsByStage[JOB_LOG_KEY]} />
          </div>
        </details>
      )}
    </div>
  );
}

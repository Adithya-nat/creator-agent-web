"use client";

import { useEffect, useRef } from "react";
import { formatClock } from "@/lib/format";
import type { LogLine } from "@/lib/types";

const LEVEL_COLOR: Record<string, string> = {
  error: "text-state-bad",
  warning: "text-state-warn",
  warn: "text-state-warn",
  info: "text-ink/80",
  debug: "text-muted",
};

/** Auto-scrolling, level-colored log view for one stage. Sticks to the bottom
 *  unless the user scrolls up to read history. */
export function LogStream({ lines }: { lines: LogLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  if (lines.length === 0) {
    return (
      <div className="px-4 py-3 text-xs text-muted">
        No logs yet for this stage.
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="scroll-thin max-h-64 overflow-auto px-4 py-3 font-mono text-xs leading-relaxed"
    >
      {lines.map((l) => (
        <div key={l.id} className="flex gap-3">
          <span className="shrink-0 text-muted/60">
            {formatClock(l.created_at)}
          </span>
          <span
            className={`whitespace-pre-wrap break-words ${
              LEVEL_COLOR[l.level.toLowerCase()] ?? "text-ink/80"
            }`}
          >
            {l.message}
          </span>
        </div>
      ))}
    </div>
  );
}

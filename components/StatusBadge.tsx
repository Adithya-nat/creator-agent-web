import type { JobStatus } from "@/lib/types";

const MAP: Record<JobStatus, { label: string; text: string; dot: string }> = {
  queued: { label: "Queued", text: "text-muted", dot: "bg-muted" },
  running: {
    label: "Generating",
    text: "text-accent",
    dot: "bg-accent animate-pulseGlow",
  },
  completed: { label: "Completed", text: "text-state-ok", dot: "bg-state-ok" },
  completed_with_warnings: {
    label: "Completed with warnings",
    text: "text-state-warn",
    dot: "bg-state-warn",
  },
  failed: { label: "Failed", text: "text-state-bad", dot: "bg-state-bad" },
  interrupted: {
    label: "Interrupted",
    text: "text-state-bad",
    dot: "bg-state-bad",
  },
  pausing: { label: "Pausing", text: "text-state-warn", dot: "bg-state-warn animate-pulseGlow" },
  paused: { label: "Paused", text: "text-state-warn", dot: "bg-state-warn" },
};

export function StatusBadge({ status }: { status: JobStatus | null }) {
  const m = status ? MAP[status] : MAP.queued;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-sm backdrop-blur-md"
      aria-live="polite"
    >
      <span className={`h-2 w-2 rounded-full ${m.dot}`} />
      <span className={m.text}>{status ? m.label : "Loading…"}</span>
    </span>
  );
}

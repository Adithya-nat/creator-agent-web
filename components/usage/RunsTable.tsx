import Link from "next/link";
import { formatTokens, formatUSD } from "@/lib/format";
import type { RunRow } from "@/lib/types";

const STATUS: Record<string, string> = {
  completed: "✓ done",
  completed_with_warnings: "! done (fallbacks)",
  failed: "✕ failed",
  interrupted: "✕ interrupted",
  running: "… running",
};

function mins(s: number) {
  return s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
}

export function RunsTable({ runs }: { runs: RunRow[] }) {
  if (runs.length === 0) return <p className="p-5 text-sm text-muted">No runs yet — create your first video.</p>;
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-sm text-muted">
          <tr className="border-b border-line">
            {["When", "Prompt", "Style", "Length", "Status", "AI clips", "Cost", "Tokens", "Time"].map((h) => (
              <th key={h} className="px-4 py-3 font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.job_id} className="border-b border-line/60 hover:bg-white/[0.02]">
              <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                {r.started_at ? new Date(r.started_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
              </td>
              <td className="max-w-[260px] truncate px-4 py-2.5" title={r.prompt}>
                <Link href={`/status/${r.job_id}`} className={`hover:text-accent ${r.language === "ta" ? "font-tamil" : ""}`}>
                  {r.prompt}
                </Link>
              </td>
              <td className="px-4 py-2.5 capitalize text-muted">{r.style}{r.language === "ta" ? " · தமிழ்" : ""}</td>
              <td className="px-4 py-2.5 tabular-nums text-muted">{r.duration}s</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-muted">{STATUS[r.status] ?? r.status}</td>
              <td className="px-4 py-2.5 tabular-nums text-muted">{r.scenes ? `${r.omni_scenes}/${r.scenes}` : "—"}</td>
              <td className="px-4 py-2.5 tabular-nums text-ink">{formatUSD(r.cost_usd)}</td>
              <td className="px-4 py-2.5 tabular-nums text-muted">{formatTokens(r.total_tokens)}</td>
              <td className="px-4 py-2.5 tabular-nums text-muted">{r.runtime_seconds ? mins(r.runtime_seconds) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

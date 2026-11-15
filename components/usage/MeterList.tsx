import { formatUSD } from "@/lib/format";

/** Named rows, each a bar against the largest value, with the figure beside it. */
export function MeterList({ rows }: { rows: Record<string, number> }) {
  const entries = Object.entries(rows).sort((a, b) => b[1] - a[1]);
  const max = Math.max(0, ...entries.map(([, v]) => v));
  if (entries.length === 0) return <p className="text-sm text-muted">No spend in this range yet.</p>;
  return (
    <ul className="space-y-2.5">
      {entries.map(([name, v]) => (
        <li key={name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[180px_minmax(0,1fr)_64px]">
          <span className="truncate font-mono text-xs text-muted" title={name}>{name}</span>
          <span className="order-3 col-span-2 h-2 overflow-hidden rounded-full bg-white/10 sm:order-none sm:col-span-1">
            <span className="block h-full rounded-full bg-[#3987e5]" style={{ width: `${max ? (v / max) * 100 : 0}%` }} />
          </span>
          <span className="text-right tabular-nums text-ink">{formatUSD(v)}</span>
        </li>
      ))}
    </ul>
  );
}

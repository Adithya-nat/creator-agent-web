export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

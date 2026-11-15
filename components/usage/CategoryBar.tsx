import { CATEGORY_COLOR, CATEGORY_LABEL, orderedCategories, share } from "@/lib/usage";
import { formatUSD } from "@/lib/format";

/** One whole split into parts: a segmented bar + a labelled legend with values. */
export function CategoryBar({ byCategory }: { byCategory: Record<string, number> }) {
  const cats = orderedCategories(Object.keys(byCategory)).filter((c) => byCategory[c] > 0);
  const total = cats.reduce((a, c) => a + byCategory[c], 0);
  if (total <= 0) return <p className="text-sm text-muted">No spend in this range yet.</p>;
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-[4px]" aria-hidden="true">
        {cats.map((c) => (
          <div key={c} style={{ width: `${share(byCategory[c], total) * 100}%`, background: CATEGORY_COLOR[c] ?? "#9085e9" }}
               title={`${CATEGORY_LABEL[c] ?? c}: ${formatUSD(byCategory[c])}`} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
        {cats.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: CATEGORY_COLOR[c] ?? "#9085e9" }} />
            <span className="text-muted">{CATEGORY_LABEL[c] ?? c}</span>
            <span className="ml-auto tabular-nums text-ink">{formatUSD(byCategory[c])}</span>
            <span className="w-10 text-right text-xs tabular-nums text-muted">{Math.round(share(byCategory[c], total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

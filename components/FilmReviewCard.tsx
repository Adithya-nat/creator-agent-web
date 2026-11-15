"use client";

import type { FilmReview } from "@/lib/types";

/** A first-time-viewer review of the finished film: does it play as one coherent story? */
export function FilmReviewCard({ review }: { review: FilmReview }) {
  const dims: [string, number][] = [
    ["Coherence", review.coherence],
    ["Continuity", review.continuity],
    ["Dialogue", review.dialogue],
    ["Hook", review.hook],
    ["Human-made", review.human_made],
  ];
  return (
    <details className="rounded-lg border border-line bg-surface/50 p-3 text-sm">
      <summary className="cursor-pointer">
        <span className="font-semibold text-ink">Viewer review {review.score}/100</span>
        <span className="ml-2 text-xs text-muted">how coherent the finished film plays</span>
      </summary>
      <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
        {dims.map(([label, v]) => (
          <div key={label}>
            <div className="font-semibold text-ink tabular-nums">{v}</div>
            <div className="text-muted">{label}</div>
          </div>
        ))}
      </div>
      {review.retelling && <p className="mt-3 text-muted">“{review.retelling}”</p>}
      {review.confusing_moments.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-muted">
          {review.confusing_moments.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </details>
  );
}

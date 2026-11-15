"use client";

import { api } from "@/lib/api";
import type { CastMember } from "@/lib/types";

/** The film's cast: portrait (character sheet), name, and fixed voice. */
export function CastStrip({ cast }: { cast: CastMember[] }) {
  if (cast.length === 0) return null;
  return (
    <section>
      <h3 className="mb-3 font-display text-xl font-semibold text-ink">Cast</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cast.map((c) => (
          <div key={c.name} className="glass overflow-hidden">
            <div className="aspect-square bg-surface-2">
              {c.portrait_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={api.asset(c.portrait_url)} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center font-display text-3xl text-muted">
                  {c.name.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="space-y-1 p-3">
              <p className="font-medium tracking-wide text-ink">{c.name}</p>
              {c.voice_description && (
                <p className="line-clamp-2 text-xs text-muted" title={c.voice_description}>
                  {c.voice_description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

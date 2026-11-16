"use client";

import { useState } from "react";
import { Bilingual } from "@/components/Bilingual";
import { VoiceIcon } from "@/components/VoiceIcon";
import { voiceBadge } from "@/lib/motionCoverage";
import type { SceneLine, StoryboardScene } from "@/lib/types";

function Line({ l, tamil }: { l: SceneLine; tamil?: boolean }) {
  return (
    <p>
      <span className="font-sans font-medium text-accent">{l.speaker}</span>
      {l.delivery && <span className="font-sans text-xs text-muted"> ({l.delivery})</span>}:{" "}
      <Bilingual text={l.text} en={l.text_en} tamil={tamil} />
    </p>
  );
}

/** The screenplay: each scene's shots and the lines spoken in them (plus what the clip actually said). */
export function ScriptPanel({ scenes, tamil }: { scenes: StoryboardScene[]; tamil?: boolean }) {
  const [open, setOpen] = useState(false);
  if (scenes.length === 0) return null;
  return (
    <section className="glass p-5">
      <button type="button" onClick={() => setOpen((o) => !o)}
              className="flex w-full items-center justify-between font-display text-xl font-semibold text-ink hover:text-ink">
        <span>Script</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ol className="mt-4 space-y-4">
          {scenes.map((s) => {
            const badge = voiceBadge(s);
            const shots = s.shots ?? [];
            return (
              <li key={s.order} className="border-l-2 border-line pl-4">
                <p className="mb-1 text-xs text-muted">
                  Scene {s.order}
                  {s.location && <span className="ml-2">{s.location.replaceAll("_", " ").toLowerCase()}</span>}
                  {badge && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <VoiceIcon kind={badge.kind} /> {badge.label}
                    </span>
                  )}
                </p>
                {s.mode !== "dialogue" && s.narration && (
                  <p className="mb-1 text-sm italic">
                    <Bilingual text={s.narration} en={s.narration_en} tamil={tamil} />
                  </p>
                )}
                {shots.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {shots.map((sh, i) => (
                      <div key={i}>
                        <p className="font-sans text-xs text-muted">
                          <span className="uppercase tracking-wide">{sh.size.replaceAll("_", " ")}</span> · {sh.action}
                        </p>
                        {sh.lines.map((l, j) => (
                          <Line key={j} l={l} tamil={tamil} />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  s.mode === "dialogue" && s.lines?.length ? (
                    <div className="space-y-1 text-sm">
                      {s.lines.map((l, i) => (
                        <Line key={i} l={l} tamil={tamil} />
                      ))}
                    </div>
                  ) : null
                )}
                {s.transcript && (
                  <p className="pt-1 text-xs text-muted" title="What the generated clip actually says">
                    heard: “{s.transcript}”
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

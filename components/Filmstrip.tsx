"use client";

import { Bilingual } from "@/components/Bilingual";
import { api } from "@/lib/api";
import { VoiceIcon } from "@/components/VoiceIcon";
import { motionBadge, voiceBadge } from "@/lib/motionCoverage";
import type { StoryboardScene } from "@/lib/types";

/** Horizontal strip of generated frames with their captions, with a subtle CSS-3D
 *  tilt for depth. Clicking a frame seeks the video (onSeek by 0-based index). */
export function Filmstrip({
  scenes,
  onSeek,
  tamil,
}: {
  scenes: StoryboardScene[];
  onSeek?: (index: number) => void;
  tamil?: boolean;
}) {
  if (scenes.length === 0) return null;
  return (
    <div className="w-full [perspective:1200px]">
      <div className="scroll-thin flex gap-4 overflow-x-auto pb-4">
        {scenes.map((s, i) => {
          const badge = motionBadge(s);
          const voice = voiceBadge(s);
          const degraded =
            s.status === "degraded" ||
            s.motion_kind === "composited" ||
            s.motion_kind === "kenburns";
          return (
            <button
              key={s.order}
              type="button"
              onClick={() => onSeek?.(i)}
              className="group w-[160px] shrink-0 text-left transition-transform duration-300 hover:[transform:rotateY(-6deg)_translateZ(20px)]"
              title={`Frame ${s.order}${onSeek ? " — click to seek" : ""}`}
            >
              <div
                className={`relative aspect-[9/16] overflow-hidden rounded-xl border bg-surface ${
                  degraded ? "border-state-warn/50" : "border-line"
                }`}
              >
                {s.video_url ? (
                  // Motion clip: play on hover, still frame as the poster/fallback.
                  // muted + playsInline satisfies autoplay policies; loop keeps it live.
                  <video
                    src={api.asset(s.video_url)}
                    poster={s.frame_url ? api.asset(s.frame_url) : undefined}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onMouseEnter={(e) => {
                      void e.currentTarget.play().catch(() => {});
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : s.frame_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={api.asset(s.frame_url)}
                    alt={`Frame ${s.order}: ${s.narration}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    no frame
                  </div>
                )}
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] text-ink/90">
                  {s.order}
                </span>
                {badge && (
                  <span
                    className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      degraded
                        ? "bg-state-warn/80 text-black"
                        : "bg-accent/80 text-black"
                    }`}
                    title={s.motion_reason ?? undefined}
                  >
                    {badge}
                  </span>
                )}
              </div>
              {voice && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-accent">
                  <VoiceIcon kind={voice.kind} /> {voice.label}
                </p>
              )}
              {s.narration && (
                <p className="mt-1 line-clamp-4 whitespace-pre-line text-xs leading-snug text-muted">
                  <Bilingual text={s.narration} en={s.narration_en} tamil={tamil} enClassName="text-[11px] text-muted/80" />
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

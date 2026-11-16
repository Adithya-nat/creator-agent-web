"use client";

import { useEffect, useRef, useState } from "react";
import { Bilingual } from "@/components/Bilingual";
import { CastStrip } from "@/components/CastStrip";
import { Filmstrip } from "@/components/Filmstrip";
import { PublishPanel } from "@/components/PublishPanel";
import { ScriptPanel } from "@/components/ScriptPanel";
import { FilmReviewCard } from "@/components/FilmReviewCard";
import { Spinner } from "@/components/Spinner";
import { VideoPlayer } from "@/components/VideoPlayer";
import { api, ApiError } from "@/lib/api";
import { formatTokens, formatUSD } from "@/lib/format";
import { formatMotionCoverage } from "@/lib/motionCoverage";
import type { StoryboardContent } from "@/lib/types";

const STYLE_LABEL: Record<string, string> = { dialogue: "Dialogue", mixed: "Mixed", narrated: "Narrated" };

function WarningsBanner({ warnings }: { warnings: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass border-state-warn/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-state-warn">
          <span aria-hidden="true">!</span>
          <span>A few scenes used a fallback, but your film is complete.</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-muted hover:text-ink"
        >
          {open ? "hide" : "details"}
        </button>
      </div>
      {open && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ResultView({
  jobId,
  warnings,
}: {
  jobId: string;
  warnings: string[];
}) {
  const [content, setContent] = useState<StoryboardContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getStoryboard(jobId)
      .then((c) => !cancelled && setContent(c))
      .catch((e) =>
        !cancelled &&
        setError(
          e instanceof ApiError ? e.message : "Couldn't load the storyboard.",
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (error) {
    return <div className="glass p-6 text-sm text-state-bad">{error}</div>;
  }
  if (!content) {
    return (
      <div className="glass flex items-center gap-3 p-6 text-muted">
        <Spinner /> Loading your film…
      </div>
    );
  }

  const total = content.scenes.length || 1;
  const tamil = content.language === "ta";
  const motionSummary = formatMotionCoverage(content.motion_coverage);
  const poster = content.scenes[0]?.frame_url
    ? api.asset(content.scenes[0].frame_url)
    : undefined;

  const onSeek = (i: number) => {
    const v = videoRef.current;
    if (!v) return;
    const dur = Number.isFinite(v.duration) ? v.duration : content.duration;
    v.currentTime = Math.max(0, Math.min(dur - 0.05, (i / total) * dur));
    v.play().catch(() => {});
  };

  return (
    <div className="space-y-6">
      {warnings.length > 0 && <WarningsBanner warnings={warnings} />}

      <div className="grid gap-6 md:grid-cols-[340px_1fr] md:items-start">
        <div className="space-y-3">
          {content.video_url ? (
            <>
              <VideoPlayer
                ref={videoRef}
                src={api.asset(content.video_url)}
                poster={poster}
              />

            </>
          ) : (
            <div className="glass p-6 text-sm text-muted">
              No video was produced for this job.
            </div>
          )}
        </div>

        <div className="space-y-2">
          {content.title && (
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              <Bilingual text={content.title} en={content.title_en} tamil={tamil} enClassName="text-base font-normal text-muted" />
            </h2>
          )}
          {content.logline && (
            <p className="text-muted">
              <Bilingual text={content.logline} en={content.logline_en} tamil={tamil} enClassName="text-sm text-muted/80" />
            </p>
          )}
          {content.style && (
            <p className="text-sm text-muted">
              {content.style}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            {[
              content.story_style && `${STYLE_LABEL[content.story_style] ?? content.story_style}`,
              content.language === "ta" ? "Tamil" : "English",
              `${content.scenes.length} scenes · ${content.duration}s`,
              content.cost_usd ? `${formatUSD(content.cost_usd)} AI cost` : null,
              content.total_tokens > 0 ? `${formatTokens(content.total_tokens)} tokens` : null,
            ]
              .filter(Boolean)
              .map((chip) => (
                <span key={String(chip)} className="rounded-full border border-line bg-surface/50 px-2.5 py-1 text-muted">
                  {chip}
                </span>
              ))}
          </div>
          {content.brief && (
            <p className="text-sm text-muted">
              {[content.brief.format, content.brief.era === "period" ? content.brief.period : null, content.brief.dialect]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {content.film_review && <FilmReviewCard review={content.film_review} />}
          {motionSummary && (
            <p className="text-sm text-accent" title="Motion renderer coverage">
              {motionSummary}
            </p>
          )}
        </div>
      </div>

      <PublishPanel
        jobId={jobId}
        videoUrl={content.video_url}
        coverUrl={content.cover_url}
        title={content.title}
        tamil={tamil}
      />

      <CastStrip cast={content.cast ?? []} />

      {content.scenes.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-xl font-semibold text-ink">Scenes</h3>
          <Filmstrip scenes={content.scenes} onSeek={onSeek} tamil={tamil} />
        </div>
      )}

      <ScriptPanel scenes={content.scenes} tamil={tamil} />
    </div>
  );
}

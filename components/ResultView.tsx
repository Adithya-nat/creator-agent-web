"use client";

import { useEffect, useRef, useState } from "react";
import { Filmstrip } from "@/components/Filmstrip";
import { Spinner } from "@/components/Spinner";
import { VideoPlayer } from "@/components/VideoPlayer";
import { api, ApiError } from "@/lib/api";
import { formatTokens } from "@/lib/format";
import { formatMotionCoverage } from "@/lib/motionCoverage";
import type { StoryboardContent } from "@/lib/types";

function WarningsBanner({ warnings }: { warnings: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass border-state-warn/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-state-warn">
          <span aria-hidden="true">!</span>
          <span>Some frames used a fallback, but your film is complete.</span>
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
              <a
                href={api.asset(content.video_url)}
                download={`${content.title || "storyboard"}.mp4`}
                className="flex items-center justify-center gap-2 rounded-full border border-line bg-surface/60 px-4 py-2 text-sm text-ink transition-colors hover:border-brand-cyan/40"
              >
                ↓ Download mp4
              </a>
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
              {content.title}
            </h2>
          )}
          {content.logline && (
            <p className="text-muted">{content.logline}</p>
          )}
          {content.style && (
            <p className="text-xs uppercase tracking-wider text-muted/70">
              {content.style}
            </p>
          )}
          <p className="pt-2 text-sm text-muted">
            {content.scenes.length} frames · {content.duration}s
            {content.total_tokens > 0 && (
              <>
                {" · "}
                <span title="Total tokens consumed generating this storyboard">
                  {formatTokens(content.total_tokens)} tokens
                </span>
              </>
            )}
            {content.narrated && (
              <>
                {" · "}
                <span title="This film has a narrator reading each caption, synced to the images">
                  🔊 narrated
                </span>
              </>
            )}
          </p>
          {motionSummary && (
            <p className="text-sm text-brand-cyan" title="Motion renderer coverage">
              {motionSummary}
            </p>
          )}
        </div>
      </div>

      {content.scenes.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm uppercase tracking-wider text-muted">
            Storyboard
          </h3>
          <Filmstrip scenes={content.scenes} onSeek={onSeek} />
        </div>
      )}
    </div>
  );
}

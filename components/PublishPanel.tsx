"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { Segmented } from "@/components/ui/Segmented";
import { api } from "@/lib/api";
import type { PublishKit } from "@/lib/types";

type Platform = "tiktok" | "reels" | "shorts";
const LABEL: Record<Platform, string> = { tiktok: "TikTok", reels: "Reels", shorts: "Shorts" };

/** Post-ready copy per platform with one-click copy, plus video + cover downloads. */
export function PublishPanel({
  jobId,
  videoUrl,
  coverUrl,
  title,
  tamil,
}: {
  jobId: string;
  videoUrl: string | null;
  coverUrl?: string | null;
  title: string;
  tamil?: boolean;
}) {
  const [kit, setKit] = useState<PublishKit | null>(null);
  const [platform, setPlatform] = useState<Platform>("tiktok");
  useEffect(() => {
    let alive = true;
    api.getPublishKit(jobId).then((k) => alive && setKit(k)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [jobId]);

  const post = kit?.[platform];
  const full = post ? `${post.caption}\n\n${post.hashtags.join(" ")}` : "";

  return (
    <section className="glass space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold text-ink">Ready to post</h3>
        <div className="flex gap-2">
          {videoUrl && (
            <a href={api.asset(videoUrl)} download={`${title || "creator-agent-film"}.mp4`}
               className="press inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-midnight hover:bg-accent-hover">
              <Download className="h-4 w-4" aria-hidden="true" /> Video
            </a>
          )}
          {coverUrl && (
            <a href={api.asset(coverUrl)} download={`${title || "creator-agent-film"}-cover`}
               className="press inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm text-ink hover:bg-surface">
              <Download className="h-4 w-4" aria-hidden="true" /> Cover
            </a>
          )}
        </div>
      </div>
      {!kit ? (
        <p className="text-sm text-muted">Post copy isn&apos;t available for this film.</p>
      ) : (
        <div className={`space-y-3 ${tamil ? "font-tamil" : ""}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg text-ink">{kit.title}</p>
              <p className="text-sm text-muted">{kit.hook}</p>
            </div>
            <CopyButton text={`${kit.title}\n${kit.hook}`} label="Copy title" />
          </div>
          <Segmented
            id="platform"
            label="Platform"
            value={platform}
            onChange={setPlatform}
            options={(Object.keys(LABEL) as Platform[]).map((p) => ({ value: p, label: LABEL[p] }))}
          />
          {post && (
            <div className="rounded-xl border border-line bg-surface/40 p-4">
              <p className="whitespace-pre-wrap text-sm text-ink">{post.caption}</p>
              <p className="mt-2 text-sm text-accent">{post.hashtags.join(" ")}</p>
              <div className="mt-3 flex gap-2">
                <CopyButton text={full} label="Copy caption + tags" />
                <CopyButton text={post.hashtags.join(" ")} label="Copy tags" />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

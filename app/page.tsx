"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { CreateOptions } from "@/components/CreateOptions";
import { PromptBar } from "@/components/PromptBar";
import { RecentJobs } from "@/components/RecentJobs";
import { Spinner } from "@/components/Spinner";
import { TopBar } from "@/components/TopBar";
import { Turnstile } from "@/components/Turnstile";
import { useRecentJobs } from "@/hooks/useRecentJobs";
import { api, ApiError } from "@/lib/api";
import type { Duration, Language, StoryStyle } from "@/lib/types";

const HeroBackdrop = dynamic(
  () => import("@/components/three/HeroBackdrop").then((m) => m.HeroBackdrop),
  { ssr: false, loading: () => null },
);

export default function CreatePage() {
  const router = useRouter();
  const { add } = useRecentJobs();
  const { needsKey, hasKey, openKeyDialog } = useAccount();
  const missingKey = needsKey && !hasKey;
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<Duration>(30);
  const [style, setStyle] = useState<StoryStyle>("dialogue");
  const [language, setLanguage] = useState<Language>("en");
  const [token, setToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const turnstileEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const canSubmit =
    prompt.trim().length >= 3 &&
    !submitting &&
    (!turnstileEnabled || !!token);

  const onToken = useCallback((t: string | null) => setToken(t), []);

  const handleGenerate = useCallback(async () => {
    if (missingKey) {
      openKeyDialog();
      return;
    }
    const p = prompt.trim();
    if (p.length < 3) {
      setError("Add a few more words to your idea (at least 3 characters).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { job_id } = await api.createStoryboard(p, duration, token, style, language);
      add(job_id, p);
      router.push(`/status/${job_id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "key_required") openKeyDialog();
      const msg =
        e instanceof ApiError
          ? e.status === 429
            ? e.message || "You're generating a lot right now — give it a minute and try again."
            : e.status === 403
              ? "Verification failed. Complete the check and try again."
              : e.status === 402
                ? `Monthly AI budget reached. ${e.message}`
                : e.message
          : "Something went wrong. Please try again.";
      setError(msg);
      setSubmitting(false);
    }
  }, [prompt, duration, token, style, language, add, router, missingKey, openKeyDialog]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <HeroBackdrop />
      <TopBar active="create" />

      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-20 pt-28 sm:pt-36">
        <Marquee />
        <h1 className="mt-6 font-display text-[clamp(3.25rem,9vw,7rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.01em] text-ink">
          Write one line.
          <br />
          Get a short film.
        </h1>
        <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-muted">
          An original cast, scenes filmed by AI with characters speaking their lines,
          a score, captions and ready-to-post copy. In English or Tamil.
        </p>

        <div className="mt-10 space-y-6">
          <PromptBar value={prompt} onChange={setPrompt} onSubmit={handleGenerate} disabled={submitting} />
          <CreateOptions
            style={style}
            language={language}
            duration={duration}
            onStyle={setStyle}
            onLanguage={setLanguage}
            onDuration={setDuration}
            disabled={submitting}
          />

          {turnstileEnabled && <Turnstile onToken={onToken} />}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canSubmit}
              className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-8 text-base font-semibold text-midnight hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Spinner /> Starting your film
                </>
              ) : missingKey ? (
                "Add your Gemini key"
              ) : (
                "Make the film"
              )}
            </button>
            {error && (
              <p role="alert" className="text-sm text-state-bad">
                {error}
              </p>
            )}
          </div>
        </div>

        <RecentJobs />
      </section>
    </main>
  );
}

/** A row of marquee bulbs that light up once on load (static under reduced motion). */
function Marquee() {
  return (
    <div aria-hidden="true" className="flex gap-[10px]">
      {Array.from({ length: 18 }, (_, i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(242,181,68,0.6)]"
          initial={{ opacity: 0.15 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 + i * 0.035, duration: 0.25 }}
        />
      ))}
    </div>
  );
}

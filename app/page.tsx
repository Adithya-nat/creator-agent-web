"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { DurationToggle } from "@/components/DurationToggle";
import { PromptBar } from "@/components/PromptBar";
import { RecentJobs } from "@/components/RecentJobs";
import { Spinner } from "@/components/Spinner";
import { TopBar } from "@/components/TopBar";
import { Turnstile } from "@/components/Turnstile";
import { useRecentJobs } from "@/hooks/useRecentJobs";
import { api, ApiError } from "@/lib/api";
import type { Duration } from "@/lib/types";

const HeroBackdrop = dynamic(
  () => import("@/components/three/HeroBackdrop").then((m) => m.HeroBackdrop),
  { ssr: false, loading: () => null },
);

export default function CreatePage() {
  const router = useRouter();
  const { add } = useRecentJobs();
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<Duration>(30);
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
    const p = prompt.trim();
    if (p.length < 3) {
      setError("Add a few more words to your idea (at least 3 characters).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { job_id } = await api.createStoryboard(p, duration, token);
      add(job_id, p);
      router.push(`/status/${job_id}`);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.status === 429
            ? "You're generating a lot right now — give it a minute and try again."
            : e.status === 403
              ? "Verification failed. Complete the check and try again."
              : e.message
          : "Something went wrong. Please try again.";
      setError(msg);
      setSubmitting(false);
    }
  }, [prompt, duration, token, add, router]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <HeroBackdrop />
      <TopBar active="create" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-5 py-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface/40 px-3 py-1 text-xs text-muted backdrop-blur-md"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan shadow-glow" />
          No login. Just describe and generate.
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
        >
          Describe it.{" "}
          <span className="text-gradient">Watch it become a film.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="mt-5 max-w-xl text-balance text-base text-muted sm:text-lg"
        >
          One prompt becomes a cinematic vertical short: consistent AI-generated
          frames, captions, Ken Burns motion, and an optional voiceover.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-10 w-full"
        >
          <PromptBar
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleGenerate}
            disabled={submitting}
          />

          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <DurationToggle
              value={duration}
              onChange={setDuration}
              disabled={submitting}
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canSubmit}
              className="group relative inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-cyan to-brand-violet px-7 py-3 text-base font-medium text-white shadow-glow transition-all hover:shadow-glow-violet disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {submitting ? (
                <>
                  <Spinner /> Generating…
                </>
              ) : (
                <>
                  Generate
                  <span className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </>
              )}
            </button>
          </div>

          {turnstileEnabled && (
            <div className="mt-4 flex justify-center">
              <Turnstile onToken={onToken} />
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-state-bad">
              {error}
            </p>
          )}
        </motion.div>

        <RecentJobs />
      </section>
    </main>
  );
}

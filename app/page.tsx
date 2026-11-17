"use client";

import { motion, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { RecentJobs } from "@/components/RecentJobs";
import { AgentPipeline } from "@/components/studio/AgentPipeline";
import { Composer } from "@/components/studio/Composer";
import { LibraryShelf } from "@/components/studio/LibraryShelf";
import { PosterDrift } from "@/components/studio/PosterDrift";
import { TopBar } from "@/components/TopBar";
import { Turnstile } from "@/components/Turnstile";
import { useRecentJobs } from "@/hooks/useRecentJobs";
import { api, ApiError } from "@/lib/api";
import type { Duration, Language, StoryStyle } from "@/lib/types";

// Staged entrance: eyebrow, title, copy, composer, 100ms apart.
const stage: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.3, ease: "easeOut" } },
};

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
  const canSubmit = prompt.trim().length >= 3 && !submitting && (!turnstileEnabled || !!token);

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
            ? e.message || "You're generating a lot right now. Give it a minute and try again."
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
    <main className="relative min-h-screen overflow-x-clip">
      <TopBar active="create" />

      <div className="relative">
        <PosterDrift />
        <motion.section
          variants={stage}
          initial="hidden"
          animate="show"
          className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pt-36"
        >
          <div className="max-w-[780px]">
            <motion.p variants={rise} className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
              <span className="text-accent">
                <span aria-hidden="true">▶ </span>Studio
              </span>
              <span className="text-muted">Reel 01 · new film</span>
            </motion.p>
            <motion.h1
              variants={rise}
              className="mt-5 text-[clamp(2.6rem,6.4vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.035em] [text-wrap:balance]"
            >
              One line in.
              <br />
              <span className="text-muted">A finished film out.</span>
            </motion.h1>
            <motion.p variants={rise} className="mt-5 max-w-[54ch] text-lg leading-relaxed text-muted [text-wrap:pretty]">
              Describe a moment. The agents write it, cast it, film every scene with spoken dialogue,
              score it and cut a vertical short, in English or Tamil.
            </motion.p>

            <motion.div variants={rise} className="mt-9">
              <Composer
                prompt={prompt}
                onPrompt={setPrompt}
                style={style}
                onStyle={setStyle}
                language={language}
                onLanguage={setLanguage}
                duration={duration}
                onDuration={setDuration}
                onSubmit={handleGenerate}
                submitting={submitting}
                canSubmit={canSubmit}
                missingKey={missingKey}
                error={error}
              >
                {turnstileEnabled && <Turnstile onToken={onToken} />}
              </Composer>
            </motion.div>
          </div>
        </motion.section>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-20 px-4 pb-24 sm:px-6">
        <motion.section
          aria-labelledby="crew-title"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          className="rounded-[28px] bg-surface/50 px-5 py-7 shadow-[0_0_0_1px_var(--color-line)] sm:px-8"
        >
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">After you press Make the film</p>
              <h2 id="crew-title" className="mt-2 text-xl font-semibold tracking-[-0.02em] text-ink">
                A crew of agents takes it from there
              </h2>
            </div>
            <p className="max-w-[40ch] text-sm text-muted">
              Watch each step live, pause between them, and see what every one costs.
            </p>
          </div>
          <AgentPipeline />
        </motion.section>

        <RecentJobs />
        <LibraryShelf />
      </div>
    </main>
  );
}

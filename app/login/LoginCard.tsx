"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { AUTH_ENABLED } from "@/lib/authConfig";

type Provider = "github" | "google";

const HOMEPAGE = process.env.NEXT_PUBLIC_HOMEPAGE_URL || "https://adithya-nat.github.io/creator-agent/";

const GitHubMark = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.24 1.4-1.66 4.1-5.4 4.1-3.25 0-5.9-2.69-5.9-6s2.65-6 5.9-6c1.85 0 3.09.79 3.8 1.47l2.59-2.5C16.73 3.6 14.6 2.6 12 2.6 6.81 2.6 2.6 6.81 2.6 12s4.21 9.4 9.4 9.4c5.43 0 9.03-3.82 9.03-9.19 0-.62-.07-1.09-.15-1.56H12Z" />
  </svg>
);

export type AuthMode = "login" | "signup";

const COPY = {
  login: {
    title: "Welcome back.",
    sub: "Log in to make the film in your head.",
    switchText: "New here?",
    switchLabel: "Create an account",
  },
  signup: {
    title: "Create your account.",
    sub: "One click with Google or GitHub, then make the film in your head.",
    switchText: "Already have an account?",
    switchLabel: "Log in",
  },
} as const;

/** Only same-site paths: "/status/x" yes, "//evil.com" or "https://…" no. */
export function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/";
}

export function LoginCard({ mode = "login" }: { mode?: AuthMode }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const copy = COPY[mode];
  const switchHref = `${mode === "login" ? "/signup" : "/login"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "Sign-in didn't finish. Try again, or use the other provider." : null,
  );

  const signIn = async (provider: Provider) => {
    setBusy(provider);
    setError(null);
    try {
      const { authClient } = await import("@/lib/authClient");
      const res = await authClient.signIn.social({
        provider,
        callbackURL: next,
        newUserCallbackURL: "/?welcome=1", // first sign-in = new account: go add a Gemini key
        errorCallbackURL: `/${mode}?error=1`,
      });
      if (res.error) throw new Error(res.error.message);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Sign-in failed. Try again.");
      setBusy(null);
    }
  };

  const button =
    "press inline-flex h-12 w-full items-center justify-center gap-3 rounded-full text-sm font-medium transition-colors disabled:opacity-50";

  return (
    <div className="relative z-10 w-full max-w-sm">
      <a href={HOMEPAGE} className="mb-10 flex items-center gap-2 text-sm text-white/70">
        <span className="inline-block h-4 w-4 rounded-full bg-accent shadow-[0_0_24px_rgba(242,181,68,0.7)]" />
        Creator Agent
      </a>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
        <span className="text-accent">▶</span> Open beta · bring your own key
      </p>
      <h1 className="mt-4 text-4xl font-medium leading-[1.05] tracking-tight text-white">
        {copy.title} <span className="text-white/45">{copy.sub}</span>
      </h1>

      {AUTH_ENABLED ? (
        <div className="mt-8 space-y-3">
          <button className={`${button} bg-white text-black hover:bg-white/90`} disabled={!!busy} onClick={() => signIn("github")}>
            {busy === "github" ? <Spinner /> : <GitHubMark />} Continue with GitHub
          </button>
          <button
            className={`${button} border border-white/15 text-white hover:bg-white/5`}
            disabled={!!busy}
            onClick={() => signIn("google")}
          >
            {busy === "google" ? <Spinner /> : <GoogleMark />} Continue with Google
          </button>
          {error && <p role="alert" className="text-sm text-state-bad">{error}</p>}
          <p className="pt-3 text-sm text-white/55">
            {copy.switchText}{" "}
            <Link className="text-white underline decoration-accent underline-offset-4" href={switchHref}>
              {copy.switchLabel}
            </Link>
          </p>
        </div>
      ) : (
        <p className="mt-8 text-white/60">
          Sign-in is off on this server.{" "}
          <Link className="text-accent underline" href="/">
            Go to the studio
          </Link>
          .
        </p>
      )}

      <ul className="mt-10 space-y-2 border-t border-white/10 pt-6 text-sm text-white/55">
        <li>Your Gemini key stays in your browser.</li>
        <li>Everything you make is deleted after 24 hours.</li>
      </ul>
    </div>
  );
}

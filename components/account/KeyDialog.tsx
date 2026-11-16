"use client";

import { Check, ExternalLink, KeyRound, Lock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useGeminiKey } from "@/hooks/useGeminiKey";
import { api, ApiError } from "@/lib/api";
import { isRemembered, maskKey, setGeminiKey } from "@/lib/geminiKey";
import type { KeyCheck } from "@/lib/types";

const AI_STUDIO = "https://aistudio.google.com/apikey";

export function KeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState("");
  const [remember, setRemember] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<KeyCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saved = useGeminiKey(); // hydration-safe: null on the server and first render

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setValue("");
      setResult(null);
      setError(null);
      setRemember(isRemembered());
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  const test = async () => {
    const k = value.trim();
    if (!k) return;
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.checkKey(k);
      if (r.ok && !setGeminiKey(k, remember)) {
        setError("The key works, but this browser blocked saving it. Allow site storage and try again.");
      } else setResult(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't check the key.");
    }
    setChecking(false);
  };

  const forget = () => {
    setGeminiKey(null);
    setResult(null);
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold">Your Gemini API key</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">
          Films are made with your own key and billed to your Google project. AI video needs billing
          enabled; a 30-second film has cost us about $5–8.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink/90">
          <Lock className="h-3.5 w-3.5 text-state-ok" aria-hidden="true" />
          Your key stays in this browser. Our server only holds it in memory while your film renders.
        </p>

        {saved && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-midnight/60 px-4 py-3 text-sm">
            <span className="font-mono">{maskKey(saved)}</span>
            <button onClick={forget} className="text-muted hover:text-state-bad">
              Remove
            </button>
          </div>
        )}

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            test();
          }}
        >
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={saved ? "Paste a different key" : "AIza…"}
            autoComplete="off"
            spellCheck={false}
            aria-label="Gemini API key"
            className="w-full rounded-full border border-line bg-midnight/60 px-4 py-2.5 font-mono text-sm placeholder:text-muted/60 focus:border-accent/50 focus:outline-none"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={remember} disabled={checking} onChange={(e) => setRemember(e.target.checked)} />
            Remember on this device
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!value.trim() || checking}
              className="press inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-midnight hover:bg-accent-hover disabled:opacity-40"
            >
              {checking ? <Spinner /> : null} Test and save
            </button>
            <a href={AI_STUDIO} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
              Get a key <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </form>

        {error && <p role="alert" className="mt-4 text-sm text-state-bad">{error}</p>}
        {result && (
          <div className="mt-4 rounded-2xl border border-line bg-midnight/60 p-4 text-sm" role="status">
            <p className={result.ok ? (result.video_ok ? "text-state-ok" : "text-state-warn") : "text-state-bad"}>
              {result.message}
            </p>
            {Object.keys(result.roles).length > 0 && (
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-muted">
                {Object.entries(result.roles).map(([role, r]) => (
                  <li key={role} className="flex items-center gap-1.5">
                    {r.ok.length ? (
                      <Check className="h-3.5 w-3.5 text-state-ok" aria-hidden="true" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-state-bad" aria-hidden="true" />
                    )}
                    {role}
                  </li>
                ))}
              </ul>
            )}
            {result.ok && (
              <button onClick={onClose} className="mt-4 text-accent underline">
                Done
              </button>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}

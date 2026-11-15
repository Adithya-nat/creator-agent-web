"use client";

import { Check, Copy, Maximize2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import styles from "./PromptSummary.module.css";

const TAMIL = /[஀-௿]/;

/** The job's prompt as a compact title: two clamped lines, so a long brief
 *  never pushes the live stage off the first screen. When the text is clipped,
 *  "Read full prompt" opens a native <dialog> with the whole thing (scrollable,
 *  copyable, Esc / backdrop / close button to dismiss, focus returns to the
 *  trigger). Short prompts show in full with no extra control. */
export function PromptSummary({ prompt }: { prompt: string }) {
  const text = prompt.trim();
  const tamil = TAMIL.test(text);
  const titleId = useId();
  const clampRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [clipped, setClipped] = useState(false);

  // Show the expand control only when the clamp actually hides text, and
  // re-check on resize (the clamp point moves with the viewport width).
  useEffect(() => {
    const el = clampRef.current;
    if (!el) return;
    const check = () => setClipped(el.scrollHeight - el.clientHeight > 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  const open = useCallback(() => {
    dialogRef.current?.showModal();
    document.documentElement.style.overflow = "hidden"; // no page scroll behind
  }, []);
  const close = useCallback(() => dialogRef.current?.close(), []);
  const onClosed = useCallback(() => {
    document.documentElement.style.overflow = "";
  }, []);
  useEffect(() => onClosed, [onClosed]); // never leave the page locked on unmount

  const words = text.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-2">
      {/* The page's h1: the film's prompt, clamped. */}
      <h1
        ref={clampRef}
        className={`line-clamp-2 max-w-[60ch] text-balance font-display text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-[1.75rem] ${
          tamil ? "font-tamil" : ""
        }`}
        title={clipped ? undefined : text}
      >
        &ldquo;{text}&rdquo;
      </h1>
      {clipped && (
        <button
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          className="press -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-accent hover:text-accent-hover"
        >
          <Maximize2 aria-hidden="true" size={14} strokeWidth={2} />
          Read full prompt
          <span className="font-normal text-muted">· {words.toLocaleString("en-US")} words</span>
        </button>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={onClosed}
        // Clicks on the backdrop land on the <dialog> itself: dismiss.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 id={titleId} className="font-display text-lg font-semibold">
              Your prompt
            </h2>
            <p className="text-xs text-muted">
              {words.toLocaleString("en-US")} words · {text.length.toLocaleString("en-US")} characters
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="press -mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-[color,background-color] hover:bg-surface-2 hover:text-ink"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
        </header>
        <div className={`${styles.body} px-6 py-5`}>
          <p
            className={`max-w-[68ch] whitespace-pre-wrap text-base leading-relaxed text-ink/90 ${
              tamil ? "font-tamil" : ""
            }`}
          >
            {text}
          </p>
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-line px-6 py-3">
          <CopyPromptButton text={text} />
          <button
            type="button"
            onClick={close}
            className="press inline-flex min-h-10 items-center rounded-full bg-surface-2 px-4 text-sm font-medium text-ink hover:bg-surface-2/80"
          >
            Done
          </button>
        </footer>
      </dialog>
    </div>
  );
}

/** Secondary footer action, same height as "Done". The icon cross-fades
 *  copy -> check (scale 0.25 -> 1, opacity, 4px blur, 300ms) and the label
 *  changes too, so the confirmation never relies on motion alone. */
function CopyPromptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);
  const icon =
    "absolute inset-0 transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]";
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true), () => {})}
      className="press inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
    >
      <span className="relative h-4 w-4" aria-hidden="true">
        <Copy size={16} strokeWidth={2} className={`${icon} ${copied ? "scale-25 opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"}`} />
        <Check size={16} strokeWidth={2} className={`${icon} text-state-ok ${copied ? "scale-100 opacity-100 blur-0" : "scale-25 opacity-0 blur-[4px]"}`} />
      </span>
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

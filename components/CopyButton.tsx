"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
      className="rounded-full border border-line bg-surface/60 px-3 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-ink"
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

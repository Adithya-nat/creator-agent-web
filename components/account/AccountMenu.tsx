"use client";

import { KeyRound, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { AUTH_ENABLED } from "@/lib/authConfig";

export function AccountMenu() {
  const { me, needsKey, hasKey, openKeyDialog, signOut } = useAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="flex items-center gap-2">
      {needsKey && (
        <button
          onClick={openKeyDialog}
          className={`press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs backdrop-blur-md ${
            hasKey ? "border-line bg-surface/50 text-muted hover:text-ink" : "border-accent/50 bg-accent/10 text-accent"
          }`}
        >
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          {hasKey ? "Key set" : "Add Gemini key"}
        </button>
      )}
      {AUTH_ENABLED && me && (
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Account"
            aria-expanded={open}
            className="press grid h-8 w-8 place-items-center rounded-full border border-line bg-surface-2 text-sm font-semibold text-ink"
          >
            {(me.name || me.email || "?").slice(0, 1).toUpperCase()}
          </button>
          {open && (
            <div className="glass absolute right-0 top-10 w-60 p-2 text-sm">
              <p className="truncate px-3 py-2 text-muted">{me.email}</p>
              <button
                onClick={() => {
                  setOpen(false);
                  openKeyDialog();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/5"
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" /> Gemini key
              </button>
              <button
                onClick={signOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/5"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

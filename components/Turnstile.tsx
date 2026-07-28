"use client";

import { useEffect, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    turnstile?: any;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/**
 * Cloudflare Turnstile widget. Renders nothing (and reports a null token) when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset — local dev, where the backend also
 * skips verification. Reports the token up via onToken on success/expiry.
 */
export function Turnstile({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!siteKey) {
      cb.current(null); // disabled -> proceed without a token
      return;
    }
    let cancelled = false;

    const render = () => {
      if (cancelled || !ref.current || !window.turnstile) return;
      if (widgetId.current) return; // already rendered
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token: string) => cb.current(token),
        "error-callback": () => cb.current(null),
        "expired-callback": () => cb.current(null),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      let s = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!s) {
        s = document.createElement("script");
        s.id = SCRIPT_ID;
        s.src = SCRIPT_SRC;
        s.async = true;
        s.defer = true;
        document.head.appendChild(s);
      }
      s.addEventListener("load", render);
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}

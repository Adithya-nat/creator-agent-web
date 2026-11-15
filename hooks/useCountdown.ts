"use client";

import { useEffect, useState } from "react";
import { formatCountdown, msUntil } from "@/lib/format";

/**
 * Live countdown to an ISO timestamp. Returns { ms, label, expired }, ticking
 * once a second. Used for the job expiry countdown.
 */
export function useCountdown(expiresAt: string | null | undefined) {
  const [ms, setMs] = useState<number>(() =>
    expiresAt ? msUntil(expiresAt) : 0,
  );

  const [prev, setPrev] = useState(expiresAt);
  if (prev !== expiresAt) {
    // Reset during render when the target changes (no effect round-trip).
    setPrev(expiresAt);
    setMs(expiresAt ? msUntil(expiresAt) : 0);
  }

  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setMs(msUntil(expiresAt)), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  return {
    ms,
    label: expiresAt ? formatCountdown(ms) : "",
    expired: expiresAt ? ms <= 0 : false,
  };
}

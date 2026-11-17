"use client";

import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * A figure that rolls to its new value (spring, no bounce) instead of jumping.
 * Writes straight to the DOM node, so a rolling number never re-renders React.
 * Screen readers get the final value only; reduced motion shows it at once.
 */
export function AnimatedNumber({
  value,
  format,
  className = "",
}: {
  value: number | null | undefined;
  format: (v: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(0);
  const reduce = useReducedMotion();
  useEffect(
    () =>
      mv.on("change", (v) => {
        if (ref.current) ref.current.textContent = format(v);
      }),
    [mv, format],
  );

  useEffect(() => {
    if (value == null) return;
    if (reduce) {
      mv.jump(value);
      return;
    }
    const c = animate(mv, value, { type: "spring", duration: 0.8, bounce: 0 });
    return () => c.stop();
  }, [value, reduce, mv]);

  if (value == null) return <span className={className}>—</span>;
  return (
    <span className={`tabular-nums ${className}`}>
      <span ref={ref} aria-hidden="true">{format(mv.get())}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

export const fmtInt = (v: number) => Math.round(v).toLocaleString("en-US");
export const fmtPct = (v: number) => `${Math.round(v * 100)}%`;
export const fmtMinutes = (s: number) => (s >= 60 ? `${Math.round(s / 60)}m` : `${Math.round(s)}s`);

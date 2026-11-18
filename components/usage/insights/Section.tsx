"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/components/production/motion";

/** The studio's section voice: mono amber kicker, display title, optional note on the right. */
export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
      <span aria-hidden="true">▶ </span>
      {children}
    </p>
  );
}

export function Panel({
  kicker,
  title,
  aside,
  children,
  className = "",
  id,
}: {
  kicker: string;
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <Reveal className={`glass flex flex-col p-5 sm:p-6 ${className}`} id={id}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <Kicker>{kicker}</Kicker>
          {title && <h2 className="mt-1.5 text-balance font-display text-xl font-semibold leading-tight text-ink">{title}</h2>}
        </div>
        {aside && <div className="text-xs text-muted">{aside}</div>}
      </div>
      {children}
    </Reveal>
  );
}

/**
 * Enters once when scrolled into view: opacity + 4px blur + 12px rise, 300ms.
 * Reduced motion: opacity only.
 */
export function Reveal({ children, className = "", delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, ease: EASE, delay }}
    >
      {children}
    </motion.section>
  );
}

/** A 0-1 bar that grows to its value when it scrolls into view (scaleX, no layout work). */
export function GrowBar({
  value,
  className = "h-2",
  fill = "bg-accent",
  delay = 0,
  label,
}: {
  value: number;
  className?: string;
  fill?: string;
  delay?: number;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const v = Math.max(0, Math.min(1, value));
  return (
    <span
      className={`relative block overflow-hidden rounded-full bg-ink/[0.07] ${className}`}
      role={label ? "meter" : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(v * 100) : undefined}
    >
      <motion.span
        className={`absolute inset-0 origin-left rounded-full ${fill}`}
        initial={reduce ? { scaleX: v, opacity: 0 } : { scaleX: 0 }}
        whileInView={{ scaleX: v, opacity: 1 }}
        viewport={{ once: true }}
        transition={reduce ? { duration: 0.3 } : { type: "spring", duration: 0.8, bounce: 0, delay }}
      />
    </span>
  );
}

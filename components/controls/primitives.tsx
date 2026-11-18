"use client";

import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { EASE } from "@/components/production/motion";

/** A number that rolls to its new value (instant under reduced motion). The DOM text
 *  is driven by the motion value, so a re-render mid-roll never makes it jump. */
export function AnimatedNumber({
  value,
  format,
  className = "",
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(value);
  const reduced = usePrefersReducedMotion();
  const [initial] = useState(() => format(value));
  const fmt = useRef(format);
  useEffect(() => {
    fmt.current = format;
  });

  useEffect(
    () =>
      mv.on("change", (v) => {
        if (ref.current) ref.current.textContent = fmt.current(v);
      }),
    [mv],
  );
  useEffect(() => {
    if (reduced) {
      mv.jump(value);
      if (ref.current) ref.current.textContent = fmt.current(value);
      return;
    }
    const c = animate(mv, value, { duration: 0.6, ease: EASE });
    return () => c.stop();
  }, [value, reduced, mv]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {initial}
    </span>
  );
}

export type TransportIcon = "pause" | "play";

const ICONS = { pause: Pause, play: Play };

/** Pause / play glyph that cross-fades on an infrequent state change:
 *  scale 0.25 -> 1, opacity 0 -> 1, blur 4px -> 0, spring 0.3s with no bounce. */
export function TransportGlyph({ icon, className = "h-5 w-5" }: { icon: TransportIcon; className?: string }) {
  const Icon = ICONS[icon];
  return (
    <span className={`relative inline-grid place-items-center ${className}`} aria-hidden>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={icon}
          className="col-start-1 row-start-1 grid place-items-center"
          initial={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          exit={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        >
          <Icon
            className={`${className} ${
              icon === "play" ? "translate-x-[1px]" /* optical: nudge the triangle toward its point */ : ""
            }`}
            strokeWidth={2.25}
            fill="currentColor"
          />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Two bars that drop in: the PAUSED emblem (played once, on entry). */
export function PauseEmblem({ size = 44 }: { size?: number }) {
  const bar = { initial: { scaleY: 0, opacity: 0 }, animate: { scaleY: 1, opacity: 1 } };
  return (
    <span
      aria-hidden
      className="relative grid shrink-0 place-items-center rounded-full bg-state-warn/12 shadow-[0_0_0_1px_rgba(232,197,71,0.35)]"
      style={{ width: size, height: size }}
    >
      <span className="flex items-center gap-[5px]">
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="block h-[16px] w-[5px] origin-bottom rounded-[2px] bg-state-warn"
            {...bar}
            transition={{ duration: 0.3, ease: EASE, delay: 0.08 + i * 0.1 }}
          />
        ))}
      </span>
    </span>
  );
}

// --------------------------------------------------------------------------- //
// Toasts: short confirmations for control actions (auto-dismiss after 4s).
// --------------------------------------------------------------------------- //
interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: "info" | "warn" | "ok";
}

const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = ++seq.current;
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 4000);
  }, []);
  const tone = { info: "bg-accent", warn: "bg-state-warn", ok: "bg-state-ok" };

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-20 z-50 flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:w-[340px]"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.3, ease: EASE } }}
              exit={{ opacity: 0, y: -12, filter: "blur(4px)", transition: { duration: 0.15, ease: "easeOut" } }}
              className="glass pointer-events-auto flex w-full gap-3 rounded-[14px] p-3 pr-4"
            >
              <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone[t.tone]}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs leading-snug text-muted">{t.body}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

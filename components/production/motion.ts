// One motion language for the whole production line.
// Enter: opacity + 4px blur + 12px rise over 300ms, staggered 100ms (capped).
// Exit: shorter and smaller, 150ms. Shared-layout morphs use the same curve.

export const EASE = [0.2, 0, 0, 1] as const;

export const ENTER = { duration: 0.3, ease: EASE };
export const EXIT = { duration: 0.15, ease: "easeOut" as const };
export const MORPH = { duration: 0.55, ease: EASE };

/** Stagger delay for the i-th item, capped so a big deck never drags. */
export const stagger = (i: number, step = 0.1, cap = 0.6) => Math.min(i * step, cap);

export const rise = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(4px)", transition: EXIT },
};

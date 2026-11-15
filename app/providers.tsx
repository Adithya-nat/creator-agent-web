"use client";

import { MotionConfig } from "framer-motion";

/** Motion respects the OS reduced-motion setting (transforms off, opacity kept). */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

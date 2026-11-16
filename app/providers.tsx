"use client";

import { MotionConfig } from "framer-motion";
import { AccountProvider } from "@/components/account/AccountProvider";

/** Motion respects the OS reduced-motion setting (transforms off, opacity kept). */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AccountProvider>{children}</AccountProvider>
    </MotionConfig>
  );
}

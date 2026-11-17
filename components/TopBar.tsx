"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/account/AccountMenu";
import { BudgetMeter } from "@/components/BudgetMeter";

type Tab = "create" | "retrieve" | "usage";

const TABS: { id: Tab; href: string; label: string }[] = [
  { id: "create", href: "/", label: "Create" },
  { id: "retrieve", href: "/retrieve", label: "Retrieve" },
  { id: "usage", href: "/usage", label: "Usage" },
];

/** Studio nav, styled like the homepage's: brand mark, pill tabs, glass once you scroll. */
export function TopBar({ active }: { active?: Tab }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-300 ${
        scrolled ? "border-line bg-midnight/75 backdrop-blur-xl backdrop-saturate-150" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em]" aria-label="Creator Agent studio">
            {/* eslint-disable-next-line @next/next/no-img-element -- 24px brand mark, nothing to optimise */}
            <img src="/brand/creator-agent-mark.png" alt="" width={24} height={24} className="block" />
            <span className="hidden sm:inline">Creator Agent</span>
          </Link>
          <nav
            aria-label="Studio"
            className="flex items-center gap-0.5 rounded-full bg-ink/[0.04] p-[3px] text-sm shadow-[0_0_0_1px_var(--color-line)]"
          >
            {TABS.map((t) => {
              const on = active === t.id;
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`relative rounded-full px-3.5 py-1.5 transition-colors duration-150 sm:px-4 ${
                    on ? "text-midnight" : "text-muted hover:text-ink"
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="topbar-tab"
                      className="absolute inset-0 rounded-full bg-ink"
                      transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                    />
                  )}
                  <span className="relative font-medium">{t.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <BudgetMeter />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

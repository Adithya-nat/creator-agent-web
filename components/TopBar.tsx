import Link from "next/link";
import { BudgetMeter } from "@/components/BudgetMeter";

type Tab = "create" | "retrieve" | "usage";

const TABS: { id: Tab; href: string; label: string }[] = [
  { id: "create", href: "/", label: "Create" },
  { id: "retrieve", href: "/retrieve", label: "Retrieve" },
  { id: "usage", href: "/usage", label: "Usage" },
];

export function TopBar({ active }: { active?: Tab }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <Link
          href="/"
          className="group flex items-center gap-2 font-display text-lg font-semibold tracking-tight"
          aria-label="Storyboard Agent home"
        >
          <span className="inline-block h-5 w-5 rounded-full bg-accent" />
          <span className="text-gradient">storyboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 rounded-full border border-line bg-surface/40 p-1 text-sm backdrop-blur-md">
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={t.href}
                aria-current={active === t.id ? "page" : undefined}
                className={`rounded-full px-3 py-1 transition-colors hover:text-ink ${
                  active === t.id ? "bg-surface-2 text-ink" : "text-muted"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <BudgetMeter />
        </div>
      </div>
    </header>
  );
}

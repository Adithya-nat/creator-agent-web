import Link from "next/link";

export function TopBar({ active }: { active?: "create" | "retrieve" }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="group flex items-center gap-2 font-display text-lg font-semibold tracking-tight"
          aria-label="Storyboard Agent home"
        >
          <span className="inline-block h-5 w-5 rounded-full bg-gradient-to-br from-brand-cyan to-brand-violet shadow-glow transition-transform group-hover:scale-110" />
          <span className="text-gradient">storyboard</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className={`rounded-full px-3 py-1.5 transition-colors hover:text-ink ${
              active === "create" ? "text-ink" : "text-muted"
            }`}
          >
            Create
          </Link>
          <Link
            href="/retrieve"
            className={`rounded-full px-3 py-1.5 transition-colors hover:text-ink ${
              active === "retrieve" ? "text-ink" : "text-muted"
            }`}
          >
            Retrieve by ID
          </Link>
        </nav>
      </div>
    </header>
  );
}

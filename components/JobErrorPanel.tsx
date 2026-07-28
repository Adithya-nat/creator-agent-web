import Link from "next/link";

export function JobErrorPanel({ kind }: { kind: "expired" | "notfound" }) {
  const expired = kind === "expired";
  return (
    <div className="glass mx-auto max-w-md p-8 text-center">
      <div className="text-3xl" aria-hidden="true">
        {expired ? "⌛" : "🔍"}
      </div>
      <h2 className="mt-3 font-display text-xl font-semibold">
        {expired ? "This job has expired" : "Job not found"}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {expired
          ? "Jobs are kept for 1 hour after creation. Generate a new one — it only takes a minute."
          : "We couldn't find a job with that ID. Check the link, or start a new one."}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-cyan to-brand-violet px-5 py-2.5 text-sm font-medium text-white shadow-glow transition-all hover:shadow-glow-violet"
      >
        Create a new film →
      </Link>
    </div>
  );
}

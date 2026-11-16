"use client";

import { Clock } from "lucide-react";

export function AccessPending({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="glass max-w-md p-8 text-center">
        <Clock className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl font-extrabold uppercase">You&apos;re on the list</h1>
        <p className="mt-3 text-muted">
          Creator Agent is in a small open beta. {email ? <span className="text-ink">{email}</span> : "Your account"}{" "}
          is signed in and waiting for access. We&apos;ll let you in soon.
        </p>
        <p className="mt-3 text-sm text-muted">
          Can&apos;t wait? It&apos;s open source. You can{" "}
          <a className="text-accent underline" href="https://github.com/Adithya-nat/creator-agent">
            run it yourself
          </a>
          .
        </p>
        <button
          onClick={onSignOut}
          className="press mt-6 rounded-full border border-white/15 px-5 py-2 text-sm text-ink hover:bg-white/5"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

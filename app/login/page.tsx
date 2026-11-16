import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginCard } from "./LoginCard";

export const metadata: Metadata = { title: "Sign in · Creator Agent" };

export default function LoginPage() {
  return (
    <main className="login-stage relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="login-streaks" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
      <Suspense>
        <LoginCard />
      </Suspense>
    </main>
  );
}

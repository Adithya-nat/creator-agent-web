import { Suspense } from "react";
import { type AuthMode, LoginCard } from "./LoginCard";

/** Near-black stage with drifting projector streaks (matches the homepage). */
export function AuthStage({ mode }: { mode: AuthMode }) {
  return (
    <main className="login-stage relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="login-streaks" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
      <Suspense>
        <LoginCard mode={mode} />
      </Suspense>
    </main>
  );
}

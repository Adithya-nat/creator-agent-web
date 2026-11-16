"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { KeyDialog } from "@/components/account/KeyDialog";
import { AccessPending } from "@/components/account/AccessPending";
import { Spinner } from "@/components/Spinner";
import { useGeminiKey } from "@/hooks/useGeminiKey";
import { api, ApiError } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/authConfig";
import { clearSession, setMediaToken } from "@/lib/session";
import type { Me } from "@/lib/types";

type Account = {
  me: Me | null;
  /** True when films need the tester's own key. */
  needsKey: boolean;
  hasKey: boolean;
  openKeyDialog: () => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Account>({
  me: null,
  needsKey: false,
  hasKey: false,
  openKeyDialog: () => {},
  signOut: async () => {},
});

export const useAccount = () => useContext(Ctx);

const PUBLIC = ["/login"];
const REFRESH_BEFORE_MS = 60 * 60 * 1000;

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const key = useGeminiKey();
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "pending" | "error">(
    AUTH_ENABLED ? "loading" : "ready",
  );
  const [keyOpen, setKeyOpen] = useState(false);
  const isPublic = PUBLIC.some((p) => pathname?.startsWith(p));

  const load = useCallback(async () => {
    try {
      const m = await api.me();
      setMe(m);
      setMediaToken(m.media_token);
      setState(m.allowed ? "ready" : "pending");
      return m;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && AUTH_ENABLED) {
        clearSession();
        router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
        return null;
      }
      setState(AUTH_ENABLED ? "error" : "ready");
      return null;
    }
  }, [pathname, router]);

  useEffect(() => {
    if (isPublic) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const tick = async () => {
      const m = await load();
      if (!alive || !m?.media_token_expires_at) return;
      const wait = new Date(m.media_token_expires_at).getTime() - Date.now() - REFRESH_BEFORE_MS;
      timer = setTimeout(tick, Math.max(60_000, wait));
    };
    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
    // reload only when moving between public and app routes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublic]);

  const signOut = useCallback(async () => {
    clearSession();
    if (AUTH_ENABLED) {
      const { authClient } = await import("@/lib/authClient");
      await authClient.signOut();
    }
    router.replace("/login");
  }, [router]);

  const value = useMemo<Account>(
    () => ({
      me,
      needsKey: me?.key_mode === "byok",
      hasKey: !!key,
      openKeyDialog: () => setKeyOpen(true),
      signOut,
    }),
    [me, key, signOut],
  );

  let body: React.ReactNode = children;
  if (!isPublic && state === "loading") {
    body = (
      <div className="grid min-h-screen place-items-center text-muted">
        <Spinner />
      </div>
    );
  } else if (!isPublic && state === "pending") {
    body = <AccessPending email={me?.email ?? ""} onSignOut={signOut} />;
  } else if (!isPublic && state === "error") {
    body = (
      <div className="grid min-h-screen place-items-center px-5 text-center text-muted">
        <p>
          Can&apos;t reach the studio right now.{" "}
          <button className="text-accent underline" onClick={() => location.reload()}>
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <Ctx.Provider value={value}>
      {body}
      <KeyDialog open={keyOpen} onClose={() => setKeyOpen(false)} />
    </Ctx.Provider>
  );
}

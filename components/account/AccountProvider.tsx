"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { KeyDialog } from "@/components/account/KeyDialog";
import { AccessPending } from "@/components/account/AccessPending";
import { Spinner } from "@/components/Spinner";
import { useGeminiKey } from "@/hooks/useGeminiKey";
import { api, ApiError } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/authConfig";
import { getGeminiKey } from "@/lib/geminiKey";
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

const PUBLIC = ["/login", "/signup"];

/** True once after a brand-new account lands on /?welcome=1; strips the flag from the URL. */
function takeWelcome(): boolean {
  const url = new URL(window.location.href);
  if (url.searchParams.get("welcome") !== "1") return false;
  url.searchParams.delete("welcome");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  return true;
}
const REFRESH_BEFORE_MS = 60 * 60 * 1000;
const RETRY_MS = 15_000;

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
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  // "retry" = a network/server error; null = redirected to sign-in.
  const load = useCallback(
    async (isAlive: () => boolean): Promise<Me | "retry" | null> => {
      try {
        const m = await api.me();
        if (!isAlive()) return null;
        setMe(m);
        setMediaToken(m.media_token);
        setState(m.allowed ? "ready" : "pending");
        if (m.allowed && takeWelcome() && m.key_mode === "byok" && !getGeminiKey()) setKeyOpen(true);
        return m;
      } catch (e) {
        if (!isAlive()) return null;
        if (e instanceof ApiError && e.status === 401 && AUTH_ENABLED) {
          clearSession();
          router.replace(`/login?next=${encodeURIComponent(pathRef.current || "/")}`);
          return null;
        }
        setState(AUTH_ENABLED ? "error" : "ready");
        return AUTH_ENABLED ? "retry" : null;
      }
    },
    [router],
  );

  useEffect(() => {
    if (isPublic) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const tick = async () => {
      const m = await load(() => alive);
      if (!alive) return;
      if (m === "retry") {
        timer = setTimeout(tick, RETRY_MS);
        return;
      }
      if (!m?.media_token_expires_at) return;
      const wait = new Date(m.media_token_expires_at).getTime() - Date.now() - REFRESH_BEFORE_MS;
      timer = setTimeout(tick, Math.max(60_000, wait));
    };
    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [isPublic, load]);

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

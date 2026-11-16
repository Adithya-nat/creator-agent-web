// The tester's Gemini key. Lives only in this browser (sessionStorage, or localStorage when
// "remember on this device" is ticked) and is sent only on create/resume/key-check calls.
const STORE_KEY = "creator.geminiKey";
const listeners = new Set<() => void>();

function stores(): Storage[] {
  if (typeof window === "undefined") return [];
  const out: Storage[] = [];
  try {
    out.push(window.sessionStorage, window.localStorage);
  } catch {
    // storage blocked
  }
  return out;
}

export function getGeminiKey(): string | null {
  for (const s of stores()) {
    try {
      const v = s.getItem(STORE_KEY);
      if (v) return v;
    } catch {
      // ignore
    }
  }
  return null;
}

export function isRemembered(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage.getItem(STORE_KEY);
  } catch {
    return false;
  }
}

export function setGeminiKey(key: string | null, remember = false) {
  for (const s of stores()) {
    try {
      s.removeItem(STORE_KEY);
    } catch {
      // ignore
    }
  }
  if (key) {
    const [session, local] = stores();
    try {
      (remember ? local : session)?.setItem(STORE_KEY, key);
    } catch {
      // ignore
    }
  }
  listeners.forEach((fn) => fn());
}

export function subscribeGeminiKey(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function maskKey(key: string): string {
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

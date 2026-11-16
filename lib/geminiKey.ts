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

/** Returns false when the browser blocks storage (the key would be lost). */
export function setGeminiKey(key: string | null, remember = false): boolean {
  const all = stores();
  if (key && all.length === 0) return false;
  let saved = !key;
  if (key) {
    const [session, local] = all;
    try {
      (remember ? local : session)?.setItem(STORE_KEY, key);
      saved = true;
    } catch {
      return false; // keep whatever key was stored before
    }
  }
  for (const s of all) {
    if (key && s === (remember ? all[1] : all[0])) continue;
    try {
      s.removeItem(STORE_KEY);
    } catch {
      // ignore
    }
  }
  listeners.forEach((fn) => fn());
  return saved;
}

export function subscribeGeminiKey(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function maskKey(key: string): string {
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

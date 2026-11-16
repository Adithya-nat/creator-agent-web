import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

describe("gemini key store", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: memoryStorage(), sessionStorage: memoryStorage() });
    vi.resetModules();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the key for the session unless remembered", async () => {
    const k = await import("./geminiKey");
    k.setGeminiKey("AIza-session-key-123456", false);
    expect(k.getGeminiKey()).toBe("AIza-session-key-123456");
    expect(k.isRemembered()).toBe(false);
    k.setGeminiKey("AIza-device-key-1234567", true);
    expect(k.isRemembered()).toBe(true);
    expect(window.sessionStorage.getItem("creator.geminiKey")).toBeNull();
    k.setGeminiKey(null);
    expect(k.getGeminiKey()).toBeNull();
  });

  it("notifies subscribers and masks keys", async () => {
    const k = await import("./geminiKey");
    const fn = vi.fn();
    const off = k.subscribeGeminiKey(fn);
    k.setGeminiKey("AIzaABCDEFGHIJKLMNOP");
    off();
    k.setGeminiKey(null);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(k.maskKey("AIzaABCDEFGHIJKLMNOP")).toBe("AIza••••MNOP");
  });
});

describe("api token cache", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("returns null when sign-in is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_ENABLED", "false");
    const s = await import("./session");
    expect(await s.getApiToken()).toBeNull();
  });

  it("reuses a token until a minute before it expires", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_ENABLED", "true");
    const token = vi.fn(async () => ({ data: { token: "h.eyJleHAiOjIwMDB9.s" } })); // exp=2000s
    vi.doMock("./authClient", () => ({ authClient: { token } }));
    const s = await import("./session");
    s._setCachedToken("cached", 1_000_000);
    expect(await s.getApiToken(900_000)).toBe("cached");
    expect(token).not.toHaveBeenCalled();
    expect(await s.getApiToken(950_000)).toBe("h.eyJleHAiOjIwMDB9.s");
    expect(token).toHaveBeenCalledTimes(1);
  });

  it("signs media URLs once a media token is set", async () => {
    const s = await import("./session");
    expect(s.withMediaToken("http://api/x")).toBe("http://api/x");
    s.setMediaToken("u.1.sig");
    expect(s.withMediaToken("http://api/x")).toBe("http://api/x?t=u.1.sig");
    expect(s.withMediaToken("http://api/x?a=1")).toBe("http://api/x?a=1&t=u.1.sig");
  });
});

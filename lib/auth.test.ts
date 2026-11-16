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

  it("reports a failed save and keeps the previous key", async () => {
    const k = await import("./geminiKey");
    k.setGeminiKey("AIza-old-key-1234567890", false);
    vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    expect(k.setGeminiKey("AIza-new-key-1234567890", false)).toBe(false);
    expect(k.getGeminiKey()).toBe("AIza-old-key-1234567890");
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

  it("drops a token that arrives after sign-out", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_ENABLED", "true");
    let release!: (v: { data: { token: string } }) => void;
    const token = vi.fn(() => new Promise<{ data: { token: string } }>((r) => (release = r)));
    vi.doMock("./authClient", () => ({ authClient: { token } }));
    const s = await import("./session");
    const pending = s.getApiToken(0);
    await Promise.resolve();
    s.clearSession();
    await vi.waitFor(() => expect(token).toHaveBeenCalled());
    release({ data: { token: "h.eyJleHAiOjk5OTk5OTk5OTl9.s" } });
    expect(await pending).toBeNull();
    token.mockResolvedValueOnce({ data: { token: "h.eyJleHAiOjk5OTk5OTk5OTl9.new" } } as never);
    expect(await s.getApiToken(0)).toBe("h.eyJleHAiOjk5OTk5OTk5OTl9.new");
  });

  it("signs media URLs once a media token is set", async () => {
    const s = await import("./session");
    expect(s.withMediaToken("http://api/x")).toBe("http://api/x");
    s.setMediaToken("u.1.sig");
    expect(s.withMediaToken("http://api/x")).toBe("http://api/x?t=u.1.sig");
    expect(s.withMediaToken("http://api/x?a=1")).toBe("http://api/x?a=1&t=u.1.sig");
  });
});

describe("sign-in redirect target", () => {
  it("only allows same-site paths", async () => {
    const { safeNext } = await import("../app/login/LoginCard");
    expect(safeNext("/status/abc?x=1")).toBe("/status/abc?x=1");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("/\t/evil.com")).toBe("/");
    expect(safeNext("/\n/evil.com")).toBe("/");
    expect(safeNext("/\\\\evil.com")).toBe("/");
  });
});

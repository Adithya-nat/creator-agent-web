import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#07080D",
        surface: "#12141C",
        "surface-2": "#1A1D28",
        line: "rgba(255,255,255,0.08)",
        ink: "#EDEFF7",
        muted: "#9AA0B4",
        brand: {
          cyan: "#22D3EE",
          violet: "#7C3AED",
          pink: "#F472B6",
        },
        state: {
          ok: "#34D399",
          warn: "#FBBF24",
          bad: "#FB7185",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(34,211,238,0.45)",
        "glow-violet": "0 0 60px -12px rgba(124,58,237,0.55)",
      },
      keyframes: {
        pulseGlow: {
          "0%,100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2.2s ease-in-out infinite",
        floaty: "floaty 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

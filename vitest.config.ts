import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Mirror tsconfig's "@/*": ["./*"] alias so `@/lib/...` imports resolve in tests.
const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()], // JSX/TSX transform for the R3F scene smoke tests
  test: {
    environment: "node", // pure util + headless R3F test-renderer — no DOM needed
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx"],
  },
  resolve: {
    alias: { "@": root },
  },
});

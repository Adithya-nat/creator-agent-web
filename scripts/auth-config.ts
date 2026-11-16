// Entry point for the Better Auth CLI (`npm run auth:migrate`).
import { loadEnvConfig } from "@next/env";
import { getAuth } from "../lib/auth";

loadEnvConfig(process.cwd());

export const auth = getAuth();

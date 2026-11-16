import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

export const AUTH_SCHEMA = "creator_auth";

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required when sign-in is enabled");
  const social: Record<string, { clientId: string; clientSecret: string }> = {};
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    social.github = { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET };
  }
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    social.google = { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
  }
  return betterAuth({
    // Own schema so the API's alembic migrations and Better Auth never collide.
    database: new Pool({ connectionString: url, options: `-c search_path=${AUTH_SCHEMA}`, max: 5 }),
    socialProviders: social,
    // Local testing only (no OAuth app needed). Never enable on a public server.
    emailAndPassword: { enabled: process.env.AUTH_EMAIL_PASSWORD === "true" },
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 } }, // fewer DB hits; Neon can sleep
    plugins: [
      jwt({
        jwt: {
          issuer: process.env.BETTER_AUTH_URL,
          audience: process.env.AUTH_AUDIENCE ?? "creator-agent-api",
          expirationTime: "15m",
          definePayload: ({ user }) => ({ email: user.email, emailVerified: user.emailVerified, name: user.name }),
        },
      }),
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof create> | undefined;

/** Created on first use so local mode (sign-in off) needs no database. */
export function getAuth() {
  instance ??= create();
  return instance;
}

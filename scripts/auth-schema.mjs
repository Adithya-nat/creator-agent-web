// Creates the Postgres schema Better Auth's tables live in (separate from the API's tables).
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd()); // .env.local, like the app itself

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (the same Neon/Postgres database the API uses).");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query("CREATE SCHEMA IF NOT EXISTS creator_auth");
await client.end();
console.log("schema creator_auth ready");

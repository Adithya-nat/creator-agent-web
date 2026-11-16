import { toNextJsHandler } from "better-auth/next-js";
import { AUTH_ENABLED } from "@/lib/authConfig";
import { getAuth } from "@/lib/auth";

const off = () => new Response("Sign-in is disabled", { status: 404 });

export async function GET(request: Request) {
  return AUTH_ENABLED ? toNextJsHandler(getAuth()).GET(request) : off();
}

export async function POST(request: Request) {
  return AUTH_ENABLED ? toNextJsHandler(getAuth()).POST(request) : off();
}

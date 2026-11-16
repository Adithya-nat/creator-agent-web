import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic redirect only; the API verifies a signed token on every request.
export function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== "true") return NextResponse.next();
  if (getSessionCookie(request)) return NextResponse.next();
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|signup|api/auth|_next/static|_next/image|icon.svg|favicon.ico|posters|.*\\.(?:png|jpg|svg|webp|mp4)$).*)"],
};

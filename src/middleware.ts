import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth0 } from "@/lib/auth/auth0";
import { isAuthEnabled, isPublicPath, loginPath } from "@/lib/auth/config";

export async function middleware(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const auth0 = getAuth0();
  // Mounts /auth/login, /auth/logout and /auth/callback, and keeps the
  // session cookie fresh on other requests.
  const response = await auth0.middleware(request);
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return response;

  if (await auth0.getSession(request)) return response;
  return NextResponse.redirect(
    new URL(loginPath(pathname + search), request.url),
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};

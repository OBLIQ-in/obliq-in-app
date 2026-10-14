// Login is off unless AUTH_ENABLED is "true", so the demo dashboard keeps
// working without an Auth0 account.
export function isAuthEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.AUTH_ENABLED === "true";
}

// Paths a signed-out visitor can open. /auth/* is handled by the Auth0 SDK.
export function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/");
}

// Only a path on this site can be the place to return to after login.
export function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || /^\/[/\\]/.test(value)) return "/";
  return value;
}

export function loginPath(returnTo: string) {
  const target = safeReturnTo(returnTo);
  return target === "/"
    ? "/login"
    : `/login?${new URLSearchParams({ returnTo: target })}`;
}

export function auth0LoginHref(returnTo: string, signUp = false) {
  const params = new URLSearchParams({ returnTo: safeReturnTo(returnTo) });
  if (signUp) params.set("screen_hint", "signup");
  return `/auth/login?${params}`;
}

import { createHash, randomBytes } from "node:crypto";

// Share links and client sessions both use 256-bit random tokens. Only the
// SHA-256 hash is stored, so a database leak doesn't hand out working links.
export function newToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type LinkState = "active" | "expired" | "revoked";

export function linkState(
  link: { expiresAt: Date; revokedAt: Date | null },
  now: Date,
): LinkState {
  if (link.revokedAt) return "revoked";
  if (link.expiresAt <= now) return "expired";
  return "active";
}

// A client session lasts a working day, and never outlives its link.
export const sessionHours = 12;

export function sessionExpiry(linkExpiresAt: Date, now: Date) {
  const end = new Date(now.getTime() + sessionHours * 3_600_000);
  return end < linkExpiresAt ? end : linkExpiresAt;
}

// The cookie is only sent to the share API, never to firm routes.
export const shareCookie = "obliq_share";

export function sessionCookie(
  token: string,
  expiresAt: Date,
  now: Date,
  secure: boolean,
) {
  const maxAge = Math.max(
    0,
    Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
  );
  return [
    `${shareCookie}=${token}`,
    "Path=/api/share",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function clearedCookie(secure: boolean) {
  return sessionCookie("", new Date(0), new Date(0), secure);
}

export function readCookie(header: string | null, name = shareCookie) {
  for (const part of header?.split(";") ?? []) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=") || null;
  }
  return null;
}

// Netlify sets x-nf-client-connection-ip itself, so a client can't fake it.
// The first x-forwarded-for entry is the fallback for other hosts.
export function clientIp(headers: Headers) {
  return (
    headers.get("x-nf-client-connection-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

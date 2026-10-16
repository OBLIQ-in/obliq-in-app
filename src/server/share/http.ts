import "server-only";

// Session cookies need HTTPS everywhere except local development.
export function shareLinkSecure() {
  return process.env.NODE_ENV === "production";
}

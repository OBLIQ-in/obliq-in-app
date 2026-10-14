import assert from "node:assert/strict";
import { test } from "node:test";
import {
  auth0LoginHref,
  isAuthEnabled,
  isPublicPath,
  loginPath,
  safeReturnTo,
} from "../../src/lib/auth/config.ts";

test("login is off unless AUTH_ENABLED is exactly true", () => {
  assert.equal(isAuthEnabled({}), false);
  assert.equal(isAuthEnabled({ AUTH_ENABLED: "false" }), false);
  assert.equal(isAuthEnabled({ AUTH_ENABLED: "1" }), false);
  assert.equal(isAuthEnabled({ AUTH_ENABLED: "true" }), true);
});

test("only the login page and Auth0 routes are public", () => {
  assert.equal(isPublicPath("/login"), true);
  assert.equal(isPublicPath("/auth/callback"), true);
  assert.equal(isPublicPath("/"), false);
  assert.equal(isPublicPath("/clients"), false);
  assert.equal(isPublicPath("/login-help"), false);
  assert.equal(isPublicPath("/authors"), false);
});

test("return paths stay on this site", () => {
  assert.equal(safeReturnTo("/clients?tab=open"), "/clients?tab=open");
  assert.equal(safeReturnTo(null), "/");
  assert.equal(safeReturnTo(""), "/");
  assert.equal(safeReturnTo("https://evil.example"), "/");
  assert.equal(safeReturnTo("//evil.example"), "/");
  assert.equal(safeReturnTo("/\\evil.example"), "/");
});

test("builds login links with the return path", () => {
  assert.equal(loginPath("/"), "/login");
  assert.equal(loginPath("/clients"), "/login?returnTo=%2Fclients");
  assert.equal(loginPath("//evil.example"), "/login");
  assert.equal(auth0LoginHref("/"), "/auth/login?returnTo=%2F");
  assert.equal(
    auth0LoginHref("/invoices", true),
    "/auth/login?returnTo=%2Finvoices&screen_hint=signup",
  );
});

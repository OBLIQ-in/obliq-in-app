import assert from "node:assert/strict";
import { test } from "node:test";
import { securityHeaders } from "../../src/lib/security-headers.ts";

const asMap = (headers) =>
  Object.fromEntries(headers.map(({ key, value }) => [key, value]));

test("production sends every header with a strict policy", () => {
  const headers = asMap(securityHeaders({ production: true }));
  const csp = headers["Content-Security-Policy"];
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.doesNotMatch(csp, /ws:/);
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(
    headers["Permissions-Policy"],
    "camera=(), microphone=(), geolocation=()",
  );
  assert.match(headers["Strict-Transport-Security"], /max-age=\d+/);
});

test("development skips HSTS and allows hot reload", () => {
  const headers = asMap(securityHeaders({ production: false }));
  assert.equal(headers["Strict-Transport-Security"], undefined);
  assert.match(headers["Content-Security-Policy"], /'unsafe-eval'/);
  assert.match(headers["Content-Security-Policy"], /connect-src[^;]* ws:/);
});

test("allows the Auth0 domain for login when set", () => {
  const csp = asMap(
    securityHeaders({ production: true, auth0Domain: "obliq.us.auth0.com" }),
  )["Content-Security-Policy"];
  assert.match(csp, /form-action 'self' https:\/\/obliq\.us\.auth0\.com/);
  assert.match(csp, /connect-src 'self' https:\/\/obliq\.us\.auth0\.com/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canShare,
  isOpenToClients,
} from "../../src/server/engagements/rules.ts";
import { openInput, shareLinkInput } from "../../src/server/share/input.ts";
import {
  clearedCookie,
  clientIp,
  hashToken,
  linkState,
  newToken,
  readCookie,
  sessionCookie,
  sessionExpiry,
} from "../../src/server/share/tokens.ts";

const hour = 3_600_000;
const now = new Date("2026-10-17T10:00:00Z");

test("tokens are random, URL-safe and stored only as a hash", () => {
  const token = newToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(newToken(), token);
  assert.match(hashToken(token), /^[0-9a-f]{64}$/);
  assert.equal(hashToken(token), hashToken(token));
  assert.notEqual(hashToken(token), token);
  assert.equal(openInput.safeParse({ token }).success, true);
  for (const bad of ["", "short", `${token}x`, `${token.slice(1)}/`])
    assert.equal(openInput.safeParse({ token: bad }).success, false, bad);
});

test("a link is revoked, expired or active", () => {
  const later = new Date(now.getTime() + hour);
  assert.equal(linkState({ expiresAt: later, revokedAt: null }, now), "active");
  assert.equal(linkState({ expiresAt: now, revokedAt: null }, now), "expired");
  assert.equal(linkState({ expiresAt: later, revokedAt: now }, now), "revoked");
});

test("a session lasts 12 hours but never outlives its link", () => {
  const farLink = new Date(now.getTime() + 7 * 24 * hour);
  const nearLink = new Date(now.getTime() + 2 * hour);
  assert.equal(
    sessionExpiry(farLink, now).getTime(),
    now.getTime() + 12 * hour,
  );
  assert.equal(sessionExpiry(nearLink, now), nearLink);
});

test("expiry is configurable from 1 to 30 days, 7 by default", () => {
  assert.deepEqual(shareLinkInput.parse({}), { expiresInDays: 7 });
  assert.deepEqual(shareLinkInput.parse({ expiresInDays: 30 }), {
    expiresInDays: 30,
  });
  for (const days of [0, 31, 1.5, "7"])
    assert.equal(
      shareLinkInput.safeParse({ expiresInDays: days }).success,
      false,
    );
});

test("the session cookie is HttpOnly and only sent to the share API", () => {
  const cookie = sessionCookie(
    "abc",
    new Date(now.getTime() + hour),
    now,
    true,
  );
  assert.equal(
    cookie,
    "obliq_share=abc; Path=/api/share; Max-Age=3600; HttpOnly; SameSite=Strict; Secure",
  );
  assert.doesNotMatch(sessionCookie("abc", now, now, false), /Secure/);
  assert.match(clearedCookie(true), /^obliq_share=; .*Max-Age=0/);
  assert.equal(readCookie("a=1; obliq_share=tok-en_1; b=2"), "tok-en_1");
  assert.equal(readCookie("obliq_share="), null);
  assert.equal(readCookie(null), null);
  assert.equal(readCookie("other=1"), null);
});

test("prefers the client IP the host sets over one the client sends", () => {
  const headers = (entries) => new Headers(entries);
  assert.equal(
    clientIp(
      headers({
        "x-nf-client-connection-ip": "203.0.113.9",
        "x-forwarded-for": "198.51.100.1",
      }),
    ),
    "203.0.113.9",
  );
  assert.equal(
    clientIp(headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" })),
    "198.51.100.1",
  );
  assert.equal(clientIp(headers({})), "unknown");
});

test("owners and the reviewer share; clients see only open engagements", () => {
  const reviewerId = "2b1f9e3a-6c4d-4e8b-a7f5-0d9c8b7a6e5f";
  const otherId = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
  assert.equal(canShare({ userId: otherId, role: "owner" }, reviewerId), true);
  assert.equal(
    canShare({ userId: reviewerId, role: "reviewer" }, reviewerId),
    true,
  );
  assert.equal(
    canShare({ userId: otherId, role: "reviewer" }, reviewerId),
    false,
  );
  assert.equal(
    canShare({ userId: reviewerId, role: "article_assistant" }, reviewerId),
    false,
  );
  assert.deepEqual(
    ["Draft", "Active", "Review", "Complete", "Archived"].filter(
      isOpenToClients,
    ),
    ["Draft", "Active", "Review"],
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createInviteInput,
  redeemInviteInput,
} from "../../src/server/invitations/input.ts";
import { invitationRoute } from "../../src/server/invitations/http.ts";
import { InvitationError } from "../../src/server/invitations/errors.ts";

const actor = { userId: "internal-user", firmId: "session-firm" };
const resolve = async () => actor;
const request = (body, headers = {}) =>
  new Request("https://app.example/api/firm/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

test("invites accept internal roles and bounded expiry, not owner or client access", () => {
  assert.deepEqual(createInviteInput.parse({ role: "reviewer" }), {
    role: "reviewer",
    expiresInDays: 7,
  });
  for (const values of [
    { role: "owner" },
    { role: "client_upload_user" },
    { role: "reviewer", expiresInDays: 0 },
    { role: "reviewer", expiresInDays: 31 },
    { role: "reviewer", expiresInDays: 1.5 },
    { role: "reviewer", firmId: "injected" },
  ]) {
    assert.equal(createInviteInput.safeParse(values).success, false);
  }
});

test("redeemers cannot choose a user, firm, or role", () => {
  const code = "a".repeat(64);
  assert.equal(redeemInviteInput.safeParse({ code }).success, true);
  for (const payload of [
    { code, role: "owner" },
    { code, userId: "owner" },
    { code, firmId: "other" },
    { code: "a".repeat(63) },
    { code: "G".repeat(64) },
  ]) {
    assert.equal(redeemInviteInput.safeParse(payload).success, false);
  }
});

test("unauthenticated routes never call the service", async () => {
  let called = false;
  const route = invitationRoute(
    async () => null,
    async () => {
      called = true;
    },
  );
  const response = await route(request({}));
  assert.equal(response.status, 401);
  assert.equal(called, false);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("route passes server identity and leaves successful responses uncached", async () => {
  const route = invitationRoute(
    resolve,
    async (identity, req) => {
      assert.equal(identity, actor);
      return createInviteInput.parse(await req.json());
    },
    201,
  );
  const response = await route(request({ role: "article_assistant" }));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("cross-origin mutations and non-JSON POSTs are rejected before writes", async () => {
  let writes = 0;
  const route = invitationRoute(resolve, async () => {
    writes++;
  });
  assert.equal(
    (await route(request({}, { origin: "https://evil.example" }))).status,
    403,
  );
  assert.equal(
    (await route(request({}, { "sec-fetch-site": "cross-site" }))).status,
    403,
  );
  assert.equal(
    (await route(request({}, { "Content-Type": "text/plain" }))).status,
    415,
  );
  assert.equal(writes, 0);
});

test("invalid input, malformed JSON, and domain errors have distinct responses", async () => {
  const validate = invitationRoute(resolve, async (_, req) =>
    createInviteInput.parse(await req.json()),
  );
  assert.equal((await validate(request({ role: "owner" }))).status, 400);
  const malformed = new Request("https://app.example/api/firm/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.deepEqual(await (await validate(malformed)).json(), {
    error: "Invalid JSON",
  });
  const denied = invitationRoute(resolve, async () => {
    throw new InvitationError(403, "Firm owner access required");
  });
  assert.equal((await denied(request({}))).status, 403);
});

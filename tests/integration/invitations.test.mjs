import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test, before, after } from "node:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../../src/server/db/schema.ts";
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
  redeemInvitation,
  hashInviteCode,
} from "../../src/server/invitations/service.ts";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated database whose name ends in _test",
  );
}
const connection = postgres(url, { max: 8, prepare: false });
const db = drizzle(connection, { schema });
const testUsers = [];
const testFirms = [];
let owner;
let otherOwner;
let assistant;

async function user(type = null) {
  const id = randomUUID();
  testUsers.push(id);
  await db.insert(schema.users).values({
    id,
    authId: `test|${id}`,
    email: `${id}@example.com`,
    name: "Synthetic User",
    type,
  });
  return { userId: id };
}
async function firmOwner() {
  const actor = await user("firm");
  const firmId = randomUUID();
  testFirms.push(firmId);
  await db
    .insert(schema.firms)
    .values({ id: firmId, name: "Synthetic Firm", createdBy: actor.userId });
  await db
    .insert(schema.firmMembers)
    .values({ firmId, userId: actor.userId, role: "owner" });
  return { ...actor, firmId };
}
const invite = (role = "article_assistant") =>
  createInvitation(db, owner, { role, expiresInDays: 7 });
const rejectsStatus = (promise, status) =>
  assert.rejects(promise, (error) => error.status === status);

before(async () => {
  // Run the base migration first so the new migration is also tested against
  // existing data, rather than only a fresh empty schema.
  const base = await readFile(
    new URL("../../drizzle/0000_init.sql", import.meta.url),
    "utf8",
  );
  await connection.unsafe(base.split("--> statement-breakpoint").join(""));
  owner = await firmOwner();
  otherOwner = await firmOwner();
  assistant = await user("firm");
  await db.insert(schema.firmMembers).values({
    firmId: owner.firmId,
    userId: assistant.userId,
    role: "article_assistant",
  });
  // Record the base migration as applied before using Drizzle's real migrator.
  const { createHash } = await import("node:crypto");
  await connection.unsafe(
    "CREATE SCHEMA IF NOT EXISTS drizzle; CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint);",
  );
  const journal = JSON.parse(
    await readFile(
      new URL("../../drizzle/meta/_journal.json", import.meta.url),
      "utf8",
    ),
  );
  await connection`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${createHash("sha256").update(base).digest("hex")}, ${journal.entries[0].when})`;
  const legacyId = randomUUID();
  await connection`INSERT INTO firm_invites (id, firm_id, code, created_by, expires_at) VALUES (${legacyId}, ${owner.firmId}, 'legacy-plain-code', ${owner.userId}, now() + interval '7 days')`;
  await migrate(db, { migrationsFolder: "drizzle" });
  const [legacy] = await db
    .select()
    .from(schema.firmInvites)
    .where(eq(schema.firmInvites.id, legacyId));
  assert.ok(
    legacy.revokedAt,
    "migration must invalidate pre-hash invitation codes",
  );
});

after(async () => {
  // Fixtures only; the dedicated test database is created by the test runner.
  for (const id of testFirms)
    await db.delete(schema.firms).where(eq(schema.firms.id, id));
  for (const id of testUsers)
    await db.delete(schema.users).where(eq(schema.users.id, id));
  await connection.end();
});

test("fresh membership authorization rejects assistants and stale owner assertions", async () => {
  await rejectsStatus(
    createInvitation(
      db,
      { ...assistant, firmId: owner.firmId, role: "owner" },
      { role: "reviewer", expiresInDays: 7 },
    ),
    403,
  );
  await rejectsStatus(
    listInvitations(db, { userId: owner.userId, firmId: otherOwner.firmId }),
    403,
  );
  await rejectsStatus(listInvitations(db, { userId: owner.userId }), 403);
});

test("creation hashes codes; lists are tenant-scoped and never expose hashes or raw codes", async () => {
  const created = await invite();
  const [stored] = await db
    .select()
    .from(schema.firmInvites)
    .where(eq(schema.firmInvites.id, created.id));
  assert.equal(stored.code, hashInviteCode(created.code));
  assert.notEqual(stored.code, created.code);
  const listed = await listInvitations(db, owner);
  assert.ok(listed.some((item) => item.id === created.id));
  assert.ok(listed.every((item) => !Object.hasOwn(item, "code")));
  assert.ok(
    !(await listInvitations(db, otherOwner)).some(
      (item) => item.id === created.id,
    ),
  );
  await rejectsStatus(revokeInvitation(db, otherOwner, created.id), 404);
});

test("reviewer redemption and retries create one membership and one audit event", async () => {
  const created = await invite("reviewer");
  const actor = await user();
  const expected = { firmId: owner.firmId, role: "reviewer" };
  assert.deepEqual(await redeemInvitation(db, actor, created.code), expected);
  assert.deepEqual(await redeemInvitation(db, actor, created.code), expected);
  const logs = await db
    .select()
    .from(schema.activity)
    .where(eq(schema.activity.userId, actor.userId));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].subject, created.id);
  assert.ok(!JSON.stringify(logs).includes(created.code));
  await rejectsStatus(redeemInvitation(db, await user(), created.code), 400);
});

test("revoked, expired, and unknown invitations have the same rejection", async () => {
  const revoked = await invite();
  await revokeInvitation(db, owner, revoked.id);
  await revokeInvitation(db, owner, revoked.id);
  const expired = await invite();
  await db
    .update(schema.firmInvites)
    .set({ expiresAt: new Date(0) })
    .where(eq(schema.firmInvites.id, expired.id));
  for (const code of [revoked.code, expired.code, "0".repeat(64)]) {
    await assert.rejects(
      redeemInvitation(db, await user(), code),
      (error) =>
        error.status === 400 && error.message === "Invitation is unavailable",
    );
  }
});

test("client users cannot receive internal membership", async () => {
  const created = await invite();
  const actor = await user("client");
  await rejectsStatus(redeemInvitation(db, actor, created.code), 403);
  assert.deepEqual(
    await db
      .select()
      .from(schema.firmMembers)
      .where(eq(schema.firmMembers.userId, actor.userId)),
    [],
  );
});

test("existing membership cannot be moved, downgraded, or escalated by a new invitation", async () => {
  const created = await invite("reviewer");
  await rejectsStatus(redeemInvitation(db, otherOwner, created.code), 409);
  await rejectsStatus(redeemInvitation(db, owner, created.code), 409);
  await rejectsStatus(redeemInvitation(db, assistant, created.code), 409);
  const [stored] = await db
    .select()
    .from(schema.firmInvites)
    .where(eq(schema.firmInvites.id, created.id));
  assert.equal(stored.acceptedAt, null);
});

test("concurrent users redeeming one code produce exactly one membership", async () => {
  const created = await invite();
  const actors = await Promise.all([user(), user()]);
  const results = await Promise.allSettled(
    actors.map((actor) => redeemInvitation(db, actor, created.code)),
  );
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.filter(
      (result) => result.status === "rejected" && result.reason.status === 400,
    ).length,
    1,
  );
});

test("concurrent retries by one user succeed once without duplicate activity", async () => {
  const created = await invite();
  const actor = await user();
  const results = await Promise.all([
    redeemInvitation(db, actor, created.code),
    redeemInvitation(db, actor, created.code),
  ]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(
    (
      await db
        .select()
        .from(schema.activity)
        .where(eq(schema.activity.userId, actor.userId))
    ).length,
    1,
  );
});

test("one user concurrently redeeming invitations from two firms joins only one", async () => {
  const first = await invite();
  const second = await createInvitation(db, otherOwner, {
    role: "reviewer",
    expiresInDays: 7,
  });
  const actor = await user();
  const results = await Promise.allSettled([
    redeemInvitation(db, actor, first.code),
    redeemInvitation(db, actor, second.code),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.filter(
      (result) => result.status === "rejected" && result.reason.status === 409,
    ).length,
    1,
  );
  assert.equal(
    (
      await db
        .select()
        .from(schema.firmMembers)
        .where(eq(schema.firmMembers.userId, actor.userId))
    ).length,
    1,
  );
});

test("replay retains changed roles and cannot resurrect a removed membership", async () => {
  const created = await invite();
  const actor = await user();
  await redeemInvitation(db, actor, created.code);
  await db
    .update(schema.firmMembers)
    .set({ role: "reviewer" })
    .where(eq(schema.firmMembers.userId, actor.userId));
  assert.equal(
    (await redeemInvitation(db, actor, created.code)).role,
    "reviewer",
  );
  await db
    .delete(schema.firmMembers)
    .where(eq(schema.firmMembers.userId, actor.userId));
  await rejectsStatus(redeemInvitation(db, actor, created.code), 400);
});

test("audit failure rolls back membership creation and code consumption", async () => {
  const created = await invite();
  const actor = await user();
  await connection.unsafe(
    `CREATE FUNCTION invitation_test_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id = '${actor.userId}'::uuid THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER invitation_test_reject_audit BEFORE INSERT ON activity FOR EACH ROW EXECUTE FUNCTION invitation_test_reject_audit();`,
  );
  try {
    await assert.rejects(
      redeemInvitation(db, actor, created.code),
      (error) => error.cause?.message === "injected audit failure",
    );
    const [stored] = await db
      .select()
      .from(schema.firmInvites)
      .where(eq(schema.firmInvites.id, created.id));
    assert.equal(stored.acceptedAt, null);
    assert.equal(
      (
        await db
          .select()
          .from(schema.firmMembers)
          .where(eq(schema.firmMembers.userId, actor.userId))
      ).length,
      0,
    );
  } finally {
    await connection.unsafe(
      "DROP TRIGGER invitation_test_reject_audit ON activity; DROP FUNCTION invitation_test_reject_audit();",
    );
  }
  assert.equal(
    (await redeemInvitation(db, actor, created.code)).role,
    "article_assistant",
  );
});

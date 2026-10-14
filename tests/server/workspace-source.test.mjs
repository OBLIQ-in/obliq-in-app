import assert from "node:assert/strict";
import { test } from "node:test";
import { createLocalWorkspace } from "../../src/lib/workspace-source.ts";

const values = {
  title: "Audit",
  client: "Example",
  amount: 1200,
  due: "2026-10-10",
  contact: "",
  email: "",
};

test("loads persisted drafts in a new source instance", async () => {
  const records = new Map();
  const storage = {
    getItem: (key) => records.get(key) || null,
    setItem: (key, value) => records.set(key, value),
  };
  const source = createLocalWorkspace(() => storage);
  await source.load();
  const saved = await source.create("invoice", values);
  const reloaded = await createLocalWorkspace(() => storage).load();
  assert.deepEqual(reloaded.invoices, saved.invoices);
  assert.equal(reloaded.invoices[0].amount, 1200);
});

test("keeps new records in memory when browser storage is blocked", async () => {
  const source = createLocalWorkspace(() => {
    throw new Error("Storage blocked");
  });
  await source.load();
  const saved = await source.create("project", values);
  const reloaded = await source.load();
  assert.deepEqual(reloaded.projects, saved.projects);
  assert.equal(reloaded.projects[0].name, "Audit");
});

test("ignores corrupt storage and can save a time session afterwards", async () => {
  const source = createLocalWorkspace(() => ({
    getItem: () => '{"bad":true}',
    setItem: () => {},
  }));
  const loaded = await source.load();
  assert.ok(loaded.projects.length > 0);
  const saved = await source.saveTime(loaded.projects[0].name, 42);
  assert.equal(saved.entries[0].seconds, 42);
});

test("persists review status, notes, and history across source instances", async () => {
  const records = new Map();
  const storage = {
    getItem: (key) => records.get(key) || null,
    setItem: (key, value) => records.set(key, value),
  };
  const source = createLocalWorkspace(() => storage);
  const loaded = await source.load();
  const documentId = loaded.documents[0].id;
  const requested = await source.reviewDocument(
    documentId,
    "More information required",
    {
      clientMessage: "Please upload the signed copy.",
      internalNote: "Signature page is missing.",
    },
  );
  const accepted = await source.reviewDocument(documentId, "Accepted", {});
  const reloaded = await createLocalWorkspace(() => storage).load();
  const review = reloaded.reviews.find(
    (item) => item.documentId === documentId,
  );

  assert.equal(
    requested.reviews[0].clientMessage,
    "Please upload the signed copy.",
  );
  assert.equal(review.status, "Accepted");
  assert.equal(review.reviewer, "Demo reviewer");
  assert.ok(review.acceptedAt);
  assert.equal(review.history.length, 2);
  assert.equal(
    review.history[0].clientMessage,
    "Please upload the signed copy.",
  );
  assert.equal(review.history[0].internalNote, "Signature page is missing.");
  assert.equal(accepted.reviews[0].history.length, 2);
});

test("requires rejection reasons and information-request messages", async () => {
  const source = createLocalWorkspace(() => ({
    getItem: () => null,
    setItem: () => {},
  }));
  const loaded = await source.load();
  const documentId = loaded.documents[0].id;

  await assert.rejects(
    source.reviewDocument(documentId, "Rejected", { rejectionReason: "  " }),
    /rejection reason is required/i,
  );
  await assert.rejects(
    source.reviewDocument(documentId, "More information required", {
      clientMessage: " ",
    }),
    /client-facing message is required/i,
  );
  assert.equal((await source.load()).reviews[0].history.length, 0);
});

test("does not append a duplicate no-op review", async () => {
  const source = createLocalWorkspace(() => ({
    getItem: () => null,
    setItem: () => {},
  }));
  const documentId = (await source.load()).documents[0].id;
  await source.reviewDocument(documentId, "Under review", {});
  const unchanged = await source.reviewDocument(documentId, "Under review", {});
  assert.equal(unchanged.reviews[0].history.length, 1);
});

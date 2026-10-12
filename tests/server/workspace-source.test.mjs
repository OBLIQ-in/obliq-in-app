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

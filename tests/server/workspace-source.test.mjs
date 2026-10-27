import assert from "node:assert/strict";
import { test } from "node:test";
import { dashboard } from "../../src/data/dashboard.ts";
import { createLocalWorkspace } from "../../src/lib/local-workspace-source.ts";
import { WorkspaceConflict } from "../../src/lib/workspace-error.ts";

const values = {
  title: "Audit",
  clientId: dashboard.clients[0].id,
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
  const initial = await source.load();
  assert.equal(initial.syntheticData, true);
  assert.ok(initial.team.length > 0);
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
  const saved = await source.saveTime(loaded.projects[0].id, 42);
  assert.equal(saved.entries[0].seconds, 42);
  assert.equal(saved.entries[0].project, loaded.projects[0].name);
});

test("links records to the chosen client by ID", async () => {
  const source = createLocalWorkspace(() => null);
  await source.load();
  const client = dashboard.clients[1];
  const saved = await source.create("invoice", {
    ...values,
    clientId: client.id,
  });
  assert.equal(saved.invoices[0].client, client.name);
  await assert.rejects(
    source.create("invoice", { ...values, clientId: "missing" }),
    /Unknown client/,
  );
  await assert.rejects(source.saveTime("missing", 42), /Unknown project/);
});

test("rejects a client name already in use, ignoring case", async () => {
  const source = createLocalWorkspace(() => null);
  await source.load();
  const name = dashboard.clients[0].name.toUpperCase();
  const error = await source
    .create("client", { ...values, title: ` ${name} ` })
    .catch((caught) => caught);
  assert.ok(error instanceof WorkspaceConflict);
});

test("allows a project name once per client", async () => {
  const source = createLocalWorkspace(() => null);
  await source.load();
  const [first, second] = dashboard.clients;
  await source.create("project", { ...values, clientId: first.id });
  await assert.rejects(
    source.create("project", { ...values, title: "audit", clientId: first.id }),
    WorkspaceConflict,
  );
  await source.create("project", { ...values, clientId: second.id });
});

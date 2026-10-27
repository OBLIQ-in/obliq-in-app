import assert from "node:assert/strict";
import { test } from "node:test";
import { createApiWorkspace } from "../../src/lib/api-workspace-source.ts";
import { WorkspaceConflict } from "../../src/lib/workspace-error.ts";

const workspace = {
  projects: [],
  clients: [],
  invoices: [],
  documents: [],
  activity: [],
  team: [],
  entries: [],
  monthlyTrackedHours: [],
  yearlyTrackedHours: [],
  syntheticData: false,
};

function recorder(status = 200) {
  const calls = [];
  const request = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(workspace), { status });
  };
  return { calls, source: createApiWorkspace(request) };
}

test("loads the workspace without caching", async () => {
  const { calls, source } = recorder();
  assert.deepEqual(await source.load(), workspace);
  assert.equal((await source.load()).syntheticData, false);
  assert.equal(calls[0].url, "/api/workspace");
  assert.equal(calls[0].init.cache, "no-store");
});

test("posts records and time sessions as JSON", async () => {
  const { calls, source } = recorder(201);
  const values = { title: "Audit", clientId: "c1", due: "2026-10-10" };
  await source.create("project", values);
  await source.saveTime("p1", 42);
  assert.equal(calls[0].url, "/api/workspace/records");
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    kind: "project",
    values,
  });
  assert.equal(calls[1].url, "/api/workspace/time");
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    projectId: "p1",
    seconds: 42,
  });
});

test("throws on a failed request so callers can retry", async () => {
  const { source } = recorder(401);
  await assert.rejects(source.load(), /401/);
  await assert.rejects(source.saveTime("p1", 42), /401/);
});

test("passes on the server's message when a name is taken", async () => {
  const source = createApiWorkspace(
    async () =>
      new Response(JSON.stringify({ error: "Name taken" }), { status: 409 }),
  );
  const error = await source.create("client", {}).catch((caught) => caught);
  assert.ok(error instanceof WorkspaceConflict);
  assert.equal(error.message, "Name taken");
});

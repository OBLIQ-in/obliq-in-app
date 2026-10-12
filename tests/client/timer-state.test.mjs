import assert from "node:assert/strict";
import { test } from "node:test";
import {
  elapsedSeconds,
  emptyTimer,
  readTimer,
  startSession,
  writeTimer,
} from "../../src/lib/timer-state.ts";

const project = { id: "PRJ-1", name: "Audit" };
const startedAt = 1_790_000_000_000;
function storage() {
  const records = new Map();
  return {
    getItem: (key) => records.get(key) || null,
    setItem: (key, value) => records.set(key, value),
  };
}

test("restores the start time and project after reload, including time away", () => {
  const store = storage();
  writeTimer(store, { project, session: startSession(project, startedAt) });
  const restored = readTimer(store);
  assert.equal(restored.session.startedAt, startedAt);
  assert.deepEqual(restored.session.project, project);
  assert.equal(elapsedSeconds(restored.session, startedAt + 62_500), 62);
});

test("remembered selection is independent of project ordering", () => {
  const store = storage();
  writeTimer(store, { project, session: null });
  const projects = [{ id: "PRJ-2", name: "Newest project" }, project];
  const selected = readTimer(store).project;
  assert.deepEqual(
    projects.find((item) => item.id === selected.id),
    project,
  );
});

test("an active session keeps a project snapshot when the original record changes", () => {
  const record = { ...project };
  const session = startSession(record, startedAt);
  record.id = "PRJ-2";
  record.name = "Another project";
  assert.deepEqual(session.project, project);
});

test("a stopped session retains a fixed duration for retry after reload", () => {
  const store = storage();
  writeTimer(store, {
    project,
    session: {
      ...startSession(project, startedAt),
      stoppedAt: startedAt + 2100,
    },
  });
  assert.equal(elapsedSeconds(readTimer(store).session, startedAt + 90_000), 2);
  writeTimer(store, { project, session: null });
  assert.deepEqual(readTimer(store), { project, session: null });
});

test("invalid storage never selects a project or starts a timer", () => {
  for (const value of [
    "broken JSON",
    "null",
    "{}",
    JSON.stringify({
      project,
      session: { project, startedAt: "bad", stoppedAt: null },
    }),
    JSON.stringify({
      project,
      session: { project, startedAt, stoppedAt: startedAt - 1 },
    }),
  ]) {
    assert.deepEqual(
      readTimer({ getItem: () => value, setItem: () => {} }),
      emptyTimer,
    );
  }
  assert.equal(
    elapsedSeconds(startSession(project, startedAt), startedAt - 1000),
    0,
  );
});

test("blocked storage does not crash, and writes report the persistence failure", () => {
  const blocked = {
    getItem: () => {
      throw new Error("Blocked");
    },
    setItem: () => {
      throw new Error("Blocked");
    },
  };
  assert.deepEqual(readTimer(blocked), emptyTimer);
  assert.equal(writeTimer(blocked, { project, session: null }), false);
  assert.equal(writeTimer(null, emptyTimer), false);
});

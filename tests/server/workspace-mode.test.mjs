import assert from "node:assert/strict";
import { test } from "node:test";
import { getWorkspaceMode } from "../../src/lib/workspace-mode.ts";

test("uses local fixtures by default in development", () => {
  assert.equal(getWorkspaceMode({ nodeEnv: "development" }), "local");
  assert.equal(
    getWorkspaceMode({
      nodeEnv: "development",
      configuredSource: "api",
    }),
    "api",
  );
});

test("deployed environments always use the API", () => {
  assert.equal(getWorkspaceMode({ nodeEnv: "production" }), "api");
  assert.equal(getWorkspaceMode({ appEnv: "staging" }), "api");
  assert.throws(
    () =>
      getWorkspaceMode({
        nodeEnv: "production",
        configuredSource: "local",
      }),
    /only available in development/,
  );
});

test("rejects invalid environment and source values", () => {
  assert.throws(() => getWorkspaceMode({ appEnv: "preview" }), /APP_ENV/);
  assert.throws(
    () => getWorkspaceMode({ configuredSource: "fixture" }),
    /NEXT_PUBLIC_WORKSPACE_SOURCE/,
  );
});

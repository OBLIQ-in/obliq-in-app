import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSyntheticSeedAllowed } from "../../src/server/db/seed-policy.ts";

test("allows local development seed without staging flags", () => {
  assert.doesNotThrow(() =>
    assertSyntheticSeedAllowed({ NODE_ENV: "development" }),
  );
});

test("requires explicit staging opt-in for synthetic data", () => {
  assert.throws(
    () =>
      assertSyntheticSeedAllowed({
        APP_ENV: "staging",
        NODE_ENV: "production",
      }),
    /SEED_SYNTHETIC_DATA=true/,
  );
  assert.doesNotThrow(() =>
    assertSyntheticSeedAllowed({
      APP_ENV: "staging",
      NODE_ENV: "production",
      SEED_SYNTHETIC_DATA: "true",
      DATABASE_URL: "postgres://user:password@localhost/obliq_staging",
    }),
  );
  assert.throws(
    () =>
      assertSyntheticSeedAllowed({
        APP_ENV: "staging",
        NODE_ENV: "production",
        SEED_SYNTHETIC_DATA: "true",
        DATABASE_URL: "postgres://user:password@localhost/obliq",
      }),
    /database name ending in _staging/,
  );
});

test("never allows synthetic seeding in production", () => {
  assert.throws(
    () =>
      assertSyntheticSeedAllowed({
        APP_ENV: "production",
        NODE_ENV: "production",
        SEED_SYNTHETIC_DATA: "true",
      }),
    /never be seeded into production/,
  );
  assert.throws(
    () => assertSyntheticSeedAllowed({ NODE_ENV: "production" }),
    /never be seeded into production/,
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTrackedHours } from "../../src/lib/tracked-hours.ts";

test("aggregates recorded time as hours by month and year", () => {
  const result = buildTrackedHours(
    [
      { date: "2026-01-02", seconds: 3600 },
      { date: "2026-01-22", seconds: 1800 },
      { date: "2025-12-31", seconds: 7200 },
      { date: "2020-01-01", seconds: 3600 },
    ],
    new Date("2026-10-26T00:00:00Z"),
  );

  assert.equal(result.monthlyTrackedHours[0].hours, 1.5);
  assert.equal(result.monthlyTrackedHours[9].hours, 0);
  assert.deepEqual(
    result.yearlyTrackedHours.map(({ label, hours }) => [label, hours]),
    [
      ["2021", 0],
      ["2022", 0],
      ["2023", 0],
      ["2024", 0],
      ["2025", 2],
      ["2026", 1.5],
    ],
  );
});

test("empty workspaces return zero tracked hours", () => {
  const result = buildTrackedHours([], new Date("2026-10-26T00:00:00Z"));
  assert.ok(result.monthlyTrackedHours.every((item) => item.hours === 0));
  assert.ok(result.yearlyTrackedHours.every((item) => item.hours === 0));
});

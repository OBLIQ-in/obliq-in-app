import assert from "node:assert/strict";
import { test } from "node:test";
import {
  engagementInput,
  financialYear,
  statusInput,
} from "../../src/server/engagements/input.ts";
import {
  canChangeStatus,
  canCreateEngagement,
  canMoveTo,
  canReview,
  canSeeEngagement,
  engagementStatuses,
} from "../../src/server/engagements/rules.ts";

const clientId = "7d3c0a52-8f1e-4b6a-9c2d-1e5f3a4b6c7d";
const reviewerId = "2b1f9e3a-6c4d-4e8b-a7f5-0d9c8b7a6e5f";
const otherId = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

test("status moves follow the lifecycle", () => {
  const allowed = engagementStatuses.flatMap((from) =>
    engagementStatuses
      .filter((to) => canMoveTo(from, to))
      .map((to) => `${from} -> ${to}`),
  );
  assert.deepEqual(allowed, [
    "Draft -> Active",
    "Draft -> Archived",
    "Active -> Review",
    "Active -> Archived",
    "Review -> Active",
    "Review -> Complete",
    "Complete -> Archived",
  ]);
});

test("owners create any engagement; reviewers only ones they review", () => {
  const owner = { userId: otherId, role: "owner" };
  const reviewer = { userId: reviewerId, role: "reviewer" };
  const article = { userId: reviewerId, role: "article_assistant" };
  assert.equal(canCreateEngagement(owner, reviewerId), true);
  assert.equal(canCreateEngagement(reviewer, reviewerId), true);
  assert.equal(canCreateEngagement(reviewer, otherId), false);
  assert.equal(canCreateEngagement(article, reviewerId), false);
  assert.equal(canReview("owner"), true);
  assert.equal(canReview("reviewer"), true);
  assert.equal(canReview("article_assistant"), false);
});

test("reviewers see and move only the engagements assigned to them", () => {
  const owner = { userId: otherId, role: "owner" };
  const assigned = { userId: reviewerId, role: "reviewer" };
  const unassigned = { userId: otherId, role: "reviewer" };
  const article = { userId: reviewerId, role: "article_assistant" };
  assert.equal(canSeeEngagement(owner, reviewerId), true);
  assert.equal(canSeeEngagement(assigned, reviewerId), true);
  assert.equal(canSeeEngagement(unassigned, reviewerId), false);
  assert.equal(canChangeStatus(owner, reviewerId), true);
  assert.equal(canChangeStatus(assigned, reviewerId), true);
  assert.equal(canChangeStatus(unassigned, reviewerId), false);
  assert.equal(canChangeStatus(article, reviewerId), false);
});

test("financial years are written like 2025-26", () => {
  assert.equal(financialYear.parse(" 2025-26 "), "2025-26");
  assert.equal(financialYear.parse("2099-00"), "2099-00");
  for (const value of ["2025-27", "2025-2026", "25-26", "2025/26", "1999-00"])
    assert.equal(financialYear.safeParse(value).success, false, value);
});

test("engagement input needs client, year, title, type and reviewer", () => {
  const parsed = engagementInput.parse({
    clientId,
    title: " Annual audit ",
    financialYear: "2025-26",
    type: "Statutory audit",
    reviewerId,
    firmId: otherId,
    status: "Complete",
  });
  // The firm and status are never taken from the request.
  assert.deepEqual(parsed, {
    clientId,
    title: "Annual audit",
    financialYear: "2025-26",
    type: "Statutory audit",
    reviewerId,
  });
  const empty = engagementInput.safeParse({ type: "Audit" });
  assert.deepEqual(
    empty.error.issues.map((issue) => issue.path.join(".")).sort(),
    ["clientId", "financialYear", "reviewerId", "title", "type"],
  );
  assert.equal(statusInput.safeParse({ status: "Done" }).success, false);
});

// Engagement lifecycle and who can do what. Kept free of database code so the
// rules can be tested on their own. #29 will fold the access checks into one
// shared `can()`.

export const engagementStatuses = [
  "Draft",
  "Active",
  "Review",
  "Complete",
  "Archived",
] as const;
export type EngagementStatus = (typeof engagementStatuses)[number];

export const engagementTypes = [
  "Statutory audit",
  "Tax audit",
  "Internal audit",
  "Other",
] as const;

// Review can go back to Active when the reviewer sends work back. Complete
// can't be reopened, and Archived is final.
const nextStatuses: Record<EngagementStatus, readonly EngagementStatus[]> = {
  Draft: ["Active", "Archived"],
  Active: ["Review", "Archived"],
  Review: ["Active", "Complete"],
  Complete: ["Archived"],
  Archived: [],
};

export function canMoveTo(from: EngagementStatus, to: EngagementStatus) {
  return nextStatuses[from].includes(to);
}

type Member = { userId: string; role: string };

// Owners and reviewers create engagements. A reviewer can only create one
// they review, so they never create something they then can't see.
export function canCreateEngagement(member: Member, reviewerId: string) {
  if (member.role === "owner") return true;
  return member.role === "reviewer" && member.userId === reviewerId;
}

// Only these roles can be an engagement's assigned reviewer.
export function canReview(role: string) {
  return role === "owner" || role === "reviewer";
}

// Owners see every engagement in the firm; reviewers see the ones they're
// assigned to. Articles see none until assignment lands with #35.
export function canSeeEngagement(member: Member, reviewerId: string) {
  return member.role === "owner" || member.userId === reviewerId;
}

// Changing status needs the same access as seeing, and articles never do it.
export function canChangeStatus(member: Member, reviewerId: string) {
  return (
    member.role !== "article_assistant" && canSeeEngagement(member, reviewerId)
  );
}

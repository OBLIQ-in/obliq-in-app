import "server-only";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import type { Engagement } from "@/types/engagement";
import { recordAudit } from "../audit";
import type { FirmSession } from "../auth/session";
import { getDb } from "../db/client";
import {
  activity,
  clients,
  engagementWorkspaces,
  engagements,
  firmMembers,
  users,
} from "../db/schema";
import {
  ConflictError,
  ForbiddenError,
  InputError,
  NotFoundError,
  uniqueViolation,
  type Transaction,
} from "../errors";
import { engagementId, type EngagementInput } from "./input";
import {
  canChangeStatus,
  canCreateEngagement,
  canMoveTo,
  canReview,
  canSeeEngagement,
  type EngagementStatus,
} from "./rules";

// Every query is scoped to the session's firm, and reviewers only get the
// engagements they're assigned to. An engagement the user can't see gives
// the same 404 as one that doesn't exist.

export async function listEngagements(session: FirmSession) {
  return selectEngagements(getDb(), visibleTo(session));
}

export async function getEngagement(session: FirmSession, id: string) {
  checkId(id);
  const [engagement] = await selectEngagements(
    getDb(),
    and(visibleTo(session), eq(engagements.id, id)),
  );
  if (!engagement) throw new NotFoundError("Engagement not found");
  return engagement;
}

export async function createEngagement(
  session: FirmSession,
  input: EngagementInput,
) {
  if (!canCreateEngagement(session, input.reviewerId))
    throw new ForbiddenError(
      session.role === "reviewer"
        ? "Reviewers can only create engagements they review"
        : "Only owners and reviewers create engagements",
    );
  const { firmId, userId } = session;
  let id: string;
  try {
    id = await getDb().transaction(async (tx) => {
      const client = await findClient(tx, firmId, input.clientId);
      await checkReviewer(tx, firmId, input.reviewerId);
      const [engagement] = await tx
        .insert(engagements)
        .values({ firmId, createdBy: userId, ...input })
        .returning({ id: engagements.id });
      // The firm's private workspace comes with every engagement.
      const [workspace] = await tx
        .insert(engagementWorkspaces)
        .values({ firmId, engagementId: engagement.id, kind: "internal" })
        .returning({ id: engagementWorkspaces.id });
      await recordAudit(tx, session, {
        action: "engagement.created",
        entityType: "engagement",
        entityId: engagement.id,
        engagementId: engagement.id,
        details: { ...input, client: client.name, workspaceId: workspace.id },
      });
      await tx.insert(activity).values({
        firmId,
        userId,
        action: "created an engagement for",
        subject: client.name,
      });
      return engagement.id;
    });
  } catch (error) {
    if (uniqueViolation(error) === "engagements_client_year_title_idx")
      throw new ConflictError(
        `This client already has an engagement called "${input.title}" for ${input.financialYear}.`,
      );
    throw error;
  }
  return getEngagement(session, id);
}

export async function changeStatus(
  session: FirmSession,
  id: string,
  status: EngagementStatus,
) {
  checkId(id);
  const { firmId, userId } = session;
  await getDb().transaction(async (tx) => {
    // Lock the row so two status changes can't both pass the check.
    const [engagement] = await tx
      .select({
        status: engagements.status,
        title: engagements.title,
        reviewerId: engagements.reviewerId,
      })
      .from(engagements)
      .where(and(eq(engagements.firmId, firmId), eq(engagements.id, id)))
      .for("update");
    if (!engagement || !canSeeEngagement(session, engagement.reviewerId))
      throw new NotFoundError("Engagement not found");
    if (!canChangeStatus(session, engagement.reviewerId))
      throw new ForbiddenError("Only the owner or the reviewer can do this");
    const from = engagement.status;
    if (from === status) return;
    if (!canMoveTo(from, status))
      throw new ConflictError(
        `Can't move an engagement from ${from} to ${status}.`,
      );
    await tx
      .update(engagements)
      .set({ status, updatedAt: new Date() })
      .where(eq(engagements.id, id));
    await recordAudit(tx, session, {
      action: "engagement.status_changed",
      entityType: "engagement",
      entityId: id,
      engagementId: id,
      details: { from, to: status },
    });
    await tx.insert(activity).values({
      firmId,
      userId,
      action: `moved an engagement to ${status}:`,
      subject: engagement.title,
      type: status === "Review" ? "review" : "new",
    });
  });
  return getEngagement(session, id);
}

// A malformed ID can't match anything, so it gets the same 404.
function checkId(id: string) {
  if (!engagementId.safeParse(id).success)
    throw new NotFoundError("Engagement not found");
}

function visibleTo(session: FirmSession): SQL | undefined {
  const inFirm = eq(engagements.firmId, session.firmId);
  if (session.role === "owner") return inFirm;
  if (session.role === "reviewer")
    return and(inFirm, eq(engagements.reviewerId, session.userId));
  // Articles see assigned engagements once #35 adds assignment.
  return sql`false`;
}

async function selectEngagements(
  db: ReturnType<typeof getDb> | Transaction,
  where: SQL | undefined,
): Promise<Engagement[]> {
  const rows = await db
    .select({
      id: engagements.id,
      clientId: engagements.clientId,
      client: clients.name,
      title: engagements.title,
      financialYear: engagements.financialYear,
      type: engagements.type,
      status: engagements.status,
      reviewerId: engagements.reviewerId,
      reviewer: users.name,
      workspaceId: engagementWorkspaces.id,
      createdAt: engagements.createdAt,
      updatedAt: engagements.updatedAt,
    })
    .from(engagements)
    .innerJoin(clients, eq(clients.id, engagements.clientId))
    .innerJoin(users, eq(users.id, engagements.reviewerId))
    .innerJoin(
      engagementWorkspaces,
      and(
        eq(engagementWorkspaces.engagementId, engagements.id),
        eq(engagementWorkspaces.kind, "internal"),
      ),
    )
    .where(where)
    .orderBy(desc(engagements.createdAt));
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

// An ID from another firm is treated the same as one that doesn't exist.
async function findClient(tx: Transaction, firmId: string, id: string) {
  const [client] = await tx
    .select({ name: clients.name })
    .from(clients)
    .where(and(eq(clients.firmId, firmId), eq(clients.id, id)));
  if (!client) throw new InputError("Unknown client");
  return client;
}

async function checkReviewer(tx: Transaction, firmId: string, userId: string) {
  const [member] = await tx
    .select({ role: firmMembers.role })
    .from(firmMembers)
    .where(and(eq(firmMembers.firmId, firmId), eq(firmMembers.userId, userId)));
  if (!member) throw new InputError("Unknown reviewer");
  if (!canReview(member.role))
    throw new InputError("The reviewer must be an owner or a reviewer");
}

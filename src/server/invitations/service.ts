import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { activity, firmInvites, firmMembers, users } from "../db/schema.ts";
import { InvitationError } from "./errors.ts";

export type InvitationActor = { userId: string; firmId?: string | null };
type InviteValues = {
  role: "article_assistant" | "reviewer";
  expiresInDays: number;
};
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function hashInviteCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

async function requireOwner(tx: Transaction, actor: InvitationActor) {
  if (!actor.firmId)
    throw new InvitationError(403, "Firm owner access required");
  const [member] = await tx
    .select()
    .from(firmMembers)
    .where(
      and(
        eq(firmMembers.firmId, actor.firmId),
        eq(firmMembers.userId, actor.userId),
      ),
    )
    .for("share");
  if (member?.role !== "owner")
    throw new InvitationError(403, "Firm owner access required");
  return actor.firmId;
}

// The raw code is returned once. Lists and audit events never contain it.
export async function createInvitation(
  db: Database,
  actor: InvitationActor,
  values: InviteValues,
) {
  const code = randomBytes(32).toString("hex");
  return db.transaction(async (tx) => {
    const firmId = await requireOwner(tx, actor);
    const expiresAt = new Date(Date.now() + values.expiresInDays * 86_400_000);
    const [invite] = await tx
      .insert(firmInvites)
      .values({
        firmId,
        code: hashInviteCode(code),
        role: values.role,
        createdBy: actor.userId,
        expiresAt,
      })
      .returning({
        id: firmInvites.id,
        role: firmInvites.role,
        expiresAt: firmInvites.expiresAt,
      });
    await tx.insert(activity).values({
      firmId,
      userId: actor.userId,
      action: "created a firm invitation",
      subject: invite.id,
    });
    return { ...invite, code };
  });
}

export async function listInvitations(db: Database, actor: InvitationActor) {
  return db.transaction(async (tx) => {
    const firmId = await requireOwner(tx, actor);
    return tx
      .select({
        id: firmInvites.id,
        role: firmInvites.role,
        expiresAt: firmInvites.expiresAt,
        revokedAt: firmInvites.revokedAt,
        acceptedAt: firmInvites.acceptedAt,
        createdAt: firmInvites.createdAt,
      })
      .from(firmInvites)
      .where(eq(firmInvites.firmId, firmId))
      .orderBy(desc(firmInvites.createdAt));
  });
}

export async function revokeInvitation(
  db: Database,
  actor: InvitationActor,
  id: string,
) {
  return db.transaction(async (tx) => {
    const firmId = await requireOwner(tx, actor);
    const [invite] = await tx
      .select()
      .from(firmInvites)
      .where(and(eq(firmInvites.id, id), eq(firmInvites.firmId, firmId)))
      .for("update");
    if (!invite) throw new InvitationError(404, "Invitation not found");
    if (!invite.revokedAt) {
      await tx
        .update(firmInvites)
        .set({ revokedAt: new Date() })
        .where(eq(firmInvites.id, id));
      await tx.insert(activity).values({
        firmId,
        userId: actor.userId,
        action: "revoked a firm invitation",
        subject: id,
      });
    }
    return { id, revoked: true };
  });
}

// Called by onboarding with a server-authenticated internal user ID, never an ID
// or role supplied by the person redeeming the invitation.
export async function redeemInvitation(
  db: Database,
  actor: InvitationActor,
  code: string,
) {
  return db.transaction(async (tx) => {
    // Serialize membership creation for this user, including different codes.
    const [user] = await tx
      .select({ id: users.id, type: users.type })
      .from(users)
      .where(eq(users.id, actor.userId))
      .for("update");
    if (!user) throw new InvitationError(401, "Not signed in");
    if (user.type === "client")
      throw new InvitationError(
        403,
        "Client upload access is separate from firm membership",
      );
    // Serialize redemption/revocation for this code across different users.
    const [invite] = await tx
      .select()
      .from(firmInvites)
      .where(eq(firmInvites.code, hashInviteCode(code)))
      .for("update");
    const invalid = () => new InvitationError(400, "Invitation is unavailable");
    if (!invite) throw invalid();
    if (invite.acceptedAt) {
      if (invite.acceptedBy !== actor.userId) throw invalid();
      const [member] = await tx
        .select({ firmId: firmMembers.firmId, role: firmMembers.role })
        .from(firmMembers)
        .where(
          and(
            eq(firmMembers.userId, actor.userId),
            eq(firmMembers.firmId, invite.firmId),
          ),
        );
      // A retry cannot recreate a removed membership or reset an existing role.
      if (!member) throw invalid();
      return member;
    }
    if (invite.revokedAt || !invite.expiresAt || invite.expiresAt <= new Date())
      throw invalid();
    if (invite.role !== "article_assistant" && invite.role !== "reviewer")
      throw invalid();
    const [existing] = await tx
      .select({ userId: firmMembers.userId })
      .from(firmMembers)
      .where(eq(firmMembers.userId, actor.userId))
      .limit(1);
    if (existing)
      throw new InvitationError(409, "User already belongs to a firm");
    await tx.insert(firmMembers).values({
      firmId: invite.firmId,
      userId: actor.userId,
      role: invite.role,
    });
    await tx
      .update(firmInvites)
      .set({ acceptedAt: new Date(), acceptedBy: actor.userId })
      .where(eq(firmInvites.id, invite.id));
    await tx.insert(activity).values({
      firmId: invite.firmId,
      userId: actor.userId,
      action: "joined the firm through an invitation",
      subject: invite.id,
    });
    return { firmId: invite.firmId, role: invite.role };
  });
}

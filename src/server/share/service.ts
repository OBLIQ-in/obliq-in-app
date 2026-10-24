import "server-only";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import type { ClientWorkspace, NewShareLink, ShareLink } from "@/types/share";
import { recordAudit } from "../audit";
import type { FirmSession } from "../auth/session";
import { getDb } from "../db/client";
import {
  clients,
  engagementWorkspaces,
  engagements,
  firms,
  shareLinks,
  shareSessions,
  users,
} from "../db/schema";
import { canShare, isOpenToClients } from "../engagements/rules";
import { getEngagement, lockEngagement } from "../engagements/service";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
} from "../errors";
import { allow } from "./rate-limit";
import { hashToken, linkState, newToken, sessionExpiry } from "./tokens";

const day = 86_400_000;
// Opening a link is the only unauthenticated entry point, so guessing is
// capped per address: 20 tries per 15 minutes.
const openLimit = 20;
const openWindow = 15 * 60_000;

// One message for every failure, so a guess learns nothing about which
// links exist, were revoked or have expired.
const invalidLink = "This link is invalid or has expired.";

export async function createShareLink(
  session: FirmSession,
  engagementId: string,
  expiresInDays: number,
): Promise<NewShareLink> {
  const token = newToken();
  const linkId = await getDb().transaction(async (tx) => {
    const engagement = await lockEngagement(tx, session, engagementId);
    if (!canShare(session, engagement.reviewerId))
      throw new ForbiddenError("Only the owner or the reviewer can share");
    if (!isOpenToClients(engagement.status))
      throw new ConflictError(
        `A ${engagement.status} engagement can't be shared with the client.`,
      );
    // Every link opens the engagement's one client-share workspace.
    await tx
      .insert(engagementWorkspaces)
      .values({ firmId: session.firmId, engagementId, kind: "client_share" })
      .onConflictDoNothing();
    const expiresAt = new Date(Date.now() + expiresInDays * day);
    const [link] = await tx
      .insert(shareLinks)
      .values({
        firmId: session.firmId,
        engagementId,
        tokenHash: hashToken(token),
        createdBy: session.userId,
        expiresAt,
      })
      .returning({ id: shareLinks.id });
    await recordAudit(tx, session, {
      action: "share_link.created",
      entityType: "share_link",
      entityId: link.id,
      engagementId,
      details: { expiresAt: expiresAt.toISOString() },
    });
    return link.id;
  });
  const links = await listShareLinks(session, engagementId);
  const link = links.find((item) => item.id === linkId);
  if (!link) throw new Error("New share link not found");
  return { ...link, token, path: `/share/${token}` };
}

export async function listShareLinks(
  session: FirmSession,
  engagementId: string,
  now = new Date(),
): Promise<ShareLink[]> {
  const engagement = await getEngagement(session, engagementId);
  if (!canShare(session, engagement.reviewerId))
    throw new ForbiddenError("Only the owner or the reviewer can share");
  const rows = await getDb()
    .select({
      id: shareLinks.id,
      createdBy: users.name,
      createdAt: shareLinks.createdAt,
      expiresAt: shareLinks.expiresAt,
      revokedAt: shareLinks.revokedAt,
      lastUsedAt: shareLinks.lastUsedAt,
    })
    .from(shareLinks)
    .innerJoin(users, eq(users.id, shareLinks.createdBy))
    .where(
      and(
        eq(shareLinks.firmId, session.firmId),
        eq(shareLinks.engagementId, engagementId),
      ),
    )
    .orderBy(desc(shareLinks.createdAt));
  return rows.map((row) => ({
    id: row.id,
    state: linkState(row, now),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  }));
}

// Revoking is immediate: every session opened through the link stops working
// on its next request. Revoking twice is harmless.
export async function revokeShareLink(
  session: FirmSession,
  engagementId: string,
  linkId: string,
) {
  await getDb().transaction(async (tx) => {
    const engagement = await lockEngagement(tx, session, engagementId);
    if (!canShare(session, engagement.reviewerId))
      throw new ForbiddenError("Only the owner or the reviewer can share");
    if (!z.uuid().safeParse(linkId).success)
      throw new NotFoundError("Share link not found");
    const [link] = await tx
      .select({ id: shareLinks.id, revokedAt: shareLinks.revokedAt })
      .from(shareLinks)
      .where(
        and(
          eq(shareLinks.engagementId, engagement.id),
          eq(shareLinks.id, linkId),
        ),
      );
    if (!link) throw new NotFoundError("Share link not found");
    if (link.revokedAt) return;
    await tx
      .update(shareLinks)
      .set({ revokedAt: new Date(), revokedBy: session.userId })
      .where(eq(shareLinks.id, linkId));
    // Sessions would fail their check anyway; deleting them is tidier.
    await tx.delete(shareSessions).where(eq(shareSessions.shareLinkId, linkId));
    await recordAudit(tx, session, {
      action: "share_link.revoked",
      entityType: "share_link",
      entityId: linkId,
      engagementId,
    });
  });
  return listShareLinks(session, engagementId);
}

// Swaps a link token for a client session. Returns the session token for the
// cookie and the client's view of the workspace.
export async function openShareLink(
  token: string,
  ipHash: string,
  now = new Date(),
) {
  if (!(await allow(`share-open:${ipHash}`, openLimit, openWindow, now)))
    throw new RateLimitError("Too many attempts. Try again in a few minutes.");
  const sessionToken = newToken();
  const opened = await getDb().transaction(async (tx) => {
    const [link] = await tx
      .select({
        id: shareLinks.id,
        firmId: shareLinks.firmId,
        engagementId: shareLinks.engagementId,
        expiresAt: shareLinks.expiresAt,
        revokedAt: shareLinks.revokedAt,
        status: engagements.status,
      })
      .from(shareLinks)
      .innerJoin(engagements, eq(engagements.id, shareLinks.engagementId))
      .where(eq(shareLinks.tokenHash, hashToken(token)));
    if (!link) return null;
    const actor = { firmId: link.firmId, userId: null };
    const event = {
      entityType: "share_link",
      entityId: link.id,
      engagementId: link.engagementId,
    };
    const state = linkState(link, now);
    if (state !== "active" || !isOpenToClients(link.status)) {
      // A real link used after it stopped working is worth knowing about.
      await recordAudit(tx, actor, {
        action: "share_link.denied",
        ...event,
        details: { reason: state === "active" ? link.status : state, ipHash },
      });
      return null;
    }
    const expiresAt = sessionExpiry(link.expiresAt, now);
    await tx.insert(shareSessions).values({
      shareLinkId: link.id,
      tokenHash: hashToken(sessionToken),
      expiresAt,
    });
    await tx
      .update(shareLinks)
      .set({ lastUsedAt: now })
      .where(eq(shareLinks.id, link.id));
    await recordAudit(tx, actor, {
      action: "share_link.opened",
      ...event,
      details: { ipHash },
    });
    return { expiresAt };
  });
  // Thrown after the commit, so a denied attempt is still recorded.
  if (!opened) throw new NotFoundError(invalidLink);
  const workspace = await loadClientWorkspace(sessionToken, now);
  return { sessionToken, expiresAt: opened.expiresAt, workspace };
}

// The client's view, for a session cookie. Checks the session, its link and
// the engagement on every request, so revoking or archiving ends access.
export async function loadClientWorkspace(
  sessionToken: string | null,
  now = new Date(),
): Promise<ClientWorkspace> {
  if (!sessionToken) throw new NotFoundError(invalidLink);
  const [row] = await getDb()
    .select({
      firm: firms.name,
      client: clients.name,
      title: engagements.title,
      financialYear: engagements.financialYear,
      status: engagements.status,
      sessionExpiresAt: shareSessions.expiresAt,
    })
    .from(shareSessions)
    .innerJoin(shareLinks, eq(shareLinks.id, shareSessions.shareLinkId))
    .innerJoin(engagements, eq(engagements.id, shareLinks.engagementId))
    .innerJoin(clients, eq(clients.id, engagements.clientId))
    .innerJoin(firms, eq(firms.id, engagements.firmId))
    .where(
      and(
        eq(shareSessions.tokenHash, hashToken(sessionToken)),
        gt(shareSessions.expiresAt, now),
        gt(shareLinks.expiresAt, now),
        isNull(shareLinks.revokedAt),
      ),
    );
  if (!row || !isOpenToClients(row.status))
    throw new NotFoundError(invalidLink);
  return {
    firm: row.firm,
    client: row.client,
    engagement: { title: row.title, financialYear: row.financialYear },
    sessionExpiresAt: row.sessionExpiresAt.toISOString(),
  };
}

export async function closeClientSession(sessionToken: string | null) {
  if (!sessionToken) return;
  await getDb()
    .delete(shareSessions)
    .where(eq(shareSessions.tokenHash, hashToken(sessionToken)));
}

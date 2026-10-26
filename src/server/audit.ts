import "server-only";
import { auditEvents } from "./db/schema";
import type { Transaction } from "./errors";

type AuditEvent = {
  // Dotted names, e.g. `engagement.created`.
  action: string;
  entityType: string;
  entityId: string;
  engagementId?: string;
  details?: Record<string, unknown>;
};

// Who acted: a firm session, or a client through a share link (no user).
type Actor = { firmId: string; userId: string | null };

// Writes the event in the caller's transaction, so the change and its audit
// event are saved together or not at all.
export async function recordAudit(
  tx: Transaction,
  actor: Actor,
  event: AuditEvent,
) {
  await tx.insert(auditEvents).values({
    firmId: actor.firmId,
    actorUserId: actor.userId,
    ...event,
  });
}

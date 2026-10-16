import "server-only";
import type { FirmSession } from "./auth/session";
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

// Writes the event in the caller's transaction, so the change and its audit
// event are saved together or not at all.
export async function recordAudit(
  tx: Transaction,
  session: FirmSession,
  event: AuditEvent,
) {
  await tx.insert(auditEvents).values({
    firmId: session.firmId,
    actorUserId: session.userId,
    ...event,
  });
}

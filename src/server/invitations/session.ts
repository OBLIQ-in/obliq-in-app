import "server-only";
import { getSession, hasFirm, type FirmSession } from "../auth/session";
import { InvitationError } from "./errors";

// Use the shared identity resolution; owner operations require a FirmSession,
// while redemption deliberately accepts a signed-in session without a firm.
export async function getFirmInvitationSession(): Promise<FirmSession | null> {
  const session = await getSession();
  if (session && !hasFirm(session)) {
    throw new InvitationError(403, "Finish onboarding");
  }
  return session;
}

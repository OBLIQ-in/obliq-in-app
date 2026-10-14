import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { invitationRoute } from "@/server/invitations/http";
import { redeemInviteInput } from "@/server/invitations/input";
import { redeemInvitation } from "@/server/invitations/service";

// Redemption uses the shared session, including signed-in users without a firm.
export const POST = invitationRoute(getSession, async (actor, request) => {
  const { code } = redeemInviteInput.parse(await request.json());
  return redeemInvitation(getDb(), actor, code);
});

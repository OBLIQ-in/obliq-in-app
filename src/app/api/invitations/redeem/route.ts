import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { invitationRoute } from "@/server/invitations/http";
import { redeemInviteInput } from "@/server/invitations/input";
import { redeemInvitation } from "@/server/invitations/service";

// #10's identity-only session must replace #14's membership-required resolver
// before this endpoint can serve new users who have no firm yet.
export const POST = invitationRoute(getSession, async (actor, request) => {
  const { code } = redeemInviteInput.parse(await request.json());
  return redeemInvitation(getDb(), actor, code);
});

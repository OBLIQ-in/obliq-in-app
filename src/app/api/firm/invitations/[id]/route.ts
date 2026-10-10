import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { invitationRoute } from "@/server/invitations/http";
import { inviteId } from "@/server/invitations/input";
import { revokeInvitation } from "@/server/invitations/service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return invitationRoute(getSession, async (actor) => {
    const { id } = await context.params;
    return revokeInvitation(getDb(), actor, inviteId.parse(id));
  })(request);
}

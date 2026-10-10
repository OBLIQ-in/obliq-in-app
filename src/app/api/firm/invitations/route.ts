import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { invitationRoute } from "@/server/invitations/http";
import { createInviteInput } from "@/server/invitations/input";
import {
  createInvitation,
  listInvitations,
} from "@/server/invitations/service";

export const dynamic = "force-dynamic";
export const GET = invitationRoute(getSession, (actor) =>
  listInvitations(getDb(), actor),
);
export const POST = invitationRoute(
  getSession,
  async (actor, request) =>
    createInvitation(
      getDb(),
      actor,
      createInviteInput.parse(await request.json()),
    ),
  201,
);

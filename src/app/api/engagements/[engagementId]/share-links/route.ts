import { route } from "@/server/http";
import { shareLinkInput } from "@/server/share/input";
import { createShareLink, listShareLinks } from "@/server/share/service";

export const dynamic = "force-dynamic";

export const GET = route<{ engagementId: string }>(
  (session, _request, params) => listShareLinks(session, params.engagementId),
);

// The response holds the token. It is shown once and never stored.
export const POST = route<{ engagementId: string }>(
  async (session, request, params) =>
    createShareLink(
      session,
      params.engagementId,
      shareLinkInput.parse(await request.json()).expiresInDays,
    ),
  201,
);

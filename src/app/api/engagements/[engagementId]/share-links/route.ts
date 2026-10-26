import { route } from "@/server/http";
import { shareLinkInput } from "@/server/share/input";
import { createShareLink, listShareLinks } from "@/server/share/service";

export const dynamic = "force-dynamic";

export const GET = route<{ engagementId: string }>((session, _req, params) =>
  listShareLinks(session, params.engagementId),
);

export const POST = route<{ engagementId: string }>(
  async (session, request, params) => {
    const { expiresInDays } = shareLinkInput.parse(await request.json());
    return createShareLink(session, params.engagementId, expiresInDays);
  },
  201,
);

import { route } from "@/server/http";
import { revokeShareLink } from "@/server/share/service";

export const DELETE = route<{ engagementId: string; linkId: string }>(
  (session, _request, params) =>
    revokeShareLink(session, params.engagementId, params.linkId),
);

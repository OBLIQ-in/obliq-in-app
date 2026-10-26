import { route } from "@/server/http";
import { revokeShareLink } from "@/server/share/service";

export const dynamic = "force-dynamic";

export const DELETE = route<{ engagementId: string; linkId: string }>(
  (session, _req, params) =>
    revokeShareLink(session, params.engagementId, params.linkId),
);

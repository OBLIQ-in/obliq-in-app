import { route } from "@/server/http";
import { getEngagement } from "@/server/engagements/service";

export const dynamic = "force-dynamic";

export const GET = route<{ engagementId: string }>(
  (session, _request, params) => getEngagement(session, params.engagementId),
);

import { route } from "@/server/http";
import { statusInput } from "@/server/engagements/input";
import { changeStatus } from "@/server/engagements/service";

export const PATCH = route<{ engagementId: string }>(
  async (session, request, params) =>
    changeStatus(
      session,
      params.engagementId,
      statusInput.parse(await request.json()).status,
    ),
);

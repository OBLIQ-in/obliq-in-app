import { route } from "@/server/http";
import { engagementInput } from "@/server/engagements/input";
import {
  createEngagement,
  listEngagements,
} from "@/server/engagements/service";

export const dynamic = "force-dynamic";

export const GET = route((session) => listEngagements(session));

export const POST = route(
  async (session, request) =>
    createEngagement(session, engagementInput.parse(await request.json())),
  201,
);

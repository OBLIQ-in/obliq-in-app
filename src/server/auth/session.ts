import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { firmMembers, users } from "../db/schema";

export type Session = {
  userId: string;
  name: string;
  firmId: string;
  role: "owner" | "article_assistant" | "reviewer";
};

// Until Auth0 lands (#10), development can act as the seeded user by setting
// DEV_AUTH_ID. Production never takes this path and has no session yet.
export async function getSession(): Promise<Session | null> {
  const authId =
    process.env.NODE_ENV !== "production" ? process.env.DEV_AUTH_ID : undefined;
  if (!authId) return null;
  const [member] = await getDb()
    .select({
      userId: users.id,
      name: users.name,
      firmId: firmMembers.firmId,
      role: firmMembers.role,
    })
    .from(users)
    .innerJoin(firmMembers, eq(firmMembers.userId, users.id))
    .where(eq(users.authId, authId))
    .limit(1);
  return member ?? null;
}

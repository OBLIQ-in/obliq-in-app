import "server-only";
import { lt, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { rateLimits } from "../db/schema";

const day = 86_400_000;

// Counts a hit for `key` in the current fixed window and says whether it is
// within `limit`. Postgres holds the count, so every server instance shares it.
export async function allow(
  key: string,
  limit: number,
  windowMs: number,
  now = new Date(),
) {
  const db = getDb();
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  // A new window is a good moment to drop counters nobody needs any more.
  if (row.count === 1)
    await db
      .delete(rateLimits)
      .where(lt(rateLimits.windowStart, new Date(now.getTime() - day)));
  return row.count <= limit;
}

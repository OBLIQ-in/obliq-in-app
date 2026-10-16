import type { getDb } from "./db/client";

// Errors that route() in http.ts turns into JSON responses.

// A request that is well formed but refers to something the firm doesn't have.
export class InputError extends Error {}

// A name already used, or a change the record's current state doesn't allow.
// The message is shown to the user.
export class ConflictError extends Error {}

// The record doesn't exist or the user can't see it. Both give the same 404,
// so another firm's IDs reveal nothing.
export class NotFoundError extends Error {}

// The user can see the record but their role can't make this change.
export class ForbiddenError extends Error {}

export type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

// Name of the unique index a Postgres error broke, if any. Drizzle wraps the
// driver error in `cause`.
export function uniqueViolation(error: unknown): string | undefined {
  for (let current = error; current instanceof Object;) {
    const { code, constraint_name, cause } = current as {
      code?: string;
      constraint_name?: string;
      cause?: unknown;
    };
    if (code === "23505") return constraint_name;
    current = cause;
  }
  return undefined;
}

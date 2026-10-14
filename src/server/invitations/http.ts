import { ZodError } from "zod";
import { InvitationError } from "./errors.ts";
import type { InvitationActor } from "./service";

type ResolveActor<T> = () => Promise<T | null>;
type Handler<T> = (actor: T, request: Request) => Promise<unknown>;

export function invitationRoute<T extends InvitationActor>(
  resolveActor: ResolveActor<T>,
  handler: Handler<T>,
  status = 200,
) {
  return async (request: Request) => {
    const json = (body: unknown, code: number) =>
      Response.json(body, {
        status: code,
        headers: { "Cache-Control": "no-store" },
      });
    try {
      const actor = await resolveActor();
      if (!actor) return json({ error: "Not signed in" }, 401);
      if (request.method !== "GET") {
        const origin = request.headers.get("origin");
        // Next may reconstruct request.url with an internal hostname. The Host
        // header identifies the authority the browser actually requested.
        const requestUrl = new URL(request.url);
        const host = request.headers.get("host") ?? requestUrl.host;
        const expectedOrigin = `${requestUrl.protocol}//${host}`;
        if (
          (origin && origin !== expectedOrigin) ||
          request.headers.get("sec-fetch-site") === "cross-site"
        ) {
          return json({ error: "Cross-origin request denied" }, 403);
        }
        if (
          request.method === "POST" &&
          request.headers
            .get("content-type")
            ?.split(";")[0]
            .trim()
            .toLowerCase() !== "application/json"
        ) {
          return json({ error: "Expected application/json" }, 415);
        }
      }
      return json(await handler(actor, request), status);
    } catch (error) {
      if (error instanceof InvitationError)
        return json({ error: error.message }, error.status);
      if (error instanceof ZodError)
        return json(
          {
            error: "Invalid input",
            fields: error.issues.map((issue) => issue.path.join(".")),
          },
          400,
        );
      if (error instanceof SyntaxError)
        return json({ error: "Invalid JSON" }, 400);
      console.error("Invitation request failed");
      return json({ error: "Something went wrong" }, 500);
    }
  };
}

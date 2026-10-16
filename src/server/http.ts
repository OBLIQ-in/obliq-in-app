import "server-only";
import { ZodError } from "zod";
import { getSession, hasFirm, type FirmSession } from "./auth/session";
import {
  ConflictError,
  ForbiddenError,
  InputError,
  NotFoundError,
} from "./errors";

type Params = Record<string, string>;
type Handler<P extends Params> = (
  session: FirmSession,
  request: Request,
  params: P,
) => Promise<unknown>;

// Wraps a route handler with the session check and consistent JSON errors.
// Signed-in users without a firm get 403 so the client can send them to
// onboarding (#11) instead of the login page.
export function route<P extends Params = Params>(
  handler: Handler<P>,
  status = 200,
) {
  return async (request: Request, context: { params: Promise<P> }) => {
    try {
      const session = await getSession();
      if (!session)
        return Response.json({ error: "Not signed in" }, { status: 401 });
      if (!hasFirm(session))
        return Response.json(
          { error: "Finish onboarding", code: "onboarding_required" },
          { status: 403 },
        );
      return Response.json(
        await handler(session, request, await context.params),
        { status },
      );
    } catch (error) {
      if (error instanceof ZodError)
        return Response.json(
          {
            error: "Invalid input",
            fields: error.issues.map((issue) => issue.path.join(".")),
          },
          { status: 400 },
        );
      if (error instanceof SyntaxError)
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      if (error instanceof InputError)
        return Response.json({ error: error.message }, { status: 400 });
      if (error instanceof ConflictError)
        return Response.json({ error: error.message }, { status: 409 });
      if (error instanceof NotFoundError)
        return Response.json({ error: error.message }, { status: 404 });
      if (error instanceof ForbiddenError)
        return Response.json({ error: error.message }, { status: 403 });
      console.error(error);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

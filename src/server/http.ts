import "server-only";
import { ZodError } from "zod";
import { getSession, type Session } from "./auth/session";
import { InputError } from "./workspace/service";

type Handler = (session: Session, request: Request) => Promise<unknown>;

// Wraps a route handler with the session check and consistent JSON errors.
export function route(handler: Handler, status = 200) {
  return async (request: Request) => {
    try {
      const session = await getSession();
      if (!session)
        return Response.json({ error: "Not signed in" }, { status: 401 });
      return Response.json(await handler(session, request), { status });
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
      console.error(error);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

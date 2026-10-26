import { errorResponse } from "@/server/http";
import { shareLinkSecure } from "@/server/share/http";
import {
  closeClientSession,
  loadClientWorkspace,
} from "@/server/share/service";
import { clearedCookie, readCookie } from "@/server/share/tokens";

export const dynamic = "force-dynamic";

// The client's view of the shared workspace, from the session cookie.
export async function GET(request: Request) {
  try {
    return Response.json(
      await loadClientWorkspace(readCookie(request.headers.get("cookie"))),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

// Ends the client's session.
export async function DELETE(request: Request) {
  try {
    await closeClientSession(readCookie(request.headers.get("cookie")));
    return new Response(null, {
      status: 204,
      headers: { "set-cookie": clearedCookie(shareLinkSecure()) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

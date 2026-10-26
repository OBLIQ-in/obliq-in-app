import { errorResponse } from "@/server/http";
import { shareLinkSecure } from "@/server/share/http";
import { openInput } from "@/server/share/input";
import { openShareLink } from "@/server/share/service";
import { clientIp, hashToken, sessionCookie } from "@/server/share/tokens";

// Public: a client opens a share link here. The token comes in the body, not
// the URL, so it stays out of server logs. Firm sessions play no part.
export async function POST(request: Request) {
  try {
    const { token } = openInput.parse(await request.json());
    const now = new Date();
    const opened = await openShareLink(
      token,
      hashToken(clientIp(request.headers)),
      now,
    );
    return Response.json(opened.workspace, {
      headers: {
        "cache-control": "no-store",
        "set-cookie": sessionCookie(
          opened.sessionToken,
          opened.expiresAt,
          now,
          shareLinkSecure(),
        ),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

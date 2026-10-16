import { getAuth0 } from "@/lib/auth/auth0";
import { isAuthEnabled } from "@/lib/auth/config";

// The rest of the app reads the signed-in person through this shape, never
// through Auth0 types, so the login provider can be swapped later.
// provider + providerUserId match a row in the backend's user_identities table.
export type AuthUser = {
  provider: "auth0";
  providerUserId: string;
  email?: string;
  name?: string;
};

// Server only. Returns null when login is off or nobody is signed in.
export async function getAuthUser(): Promise<AuthUser | null> {
  if (!isAuthEnabled()) return null;
  const session = await getAuth0().getSession();
  if (!session) return null;
  const { sub, email, name } = session.user;
  return { provider: "auth0", providerUserId: sub, email, name };
}

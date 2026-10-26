// What the firm sees about a client-share link. The token is never stored, so
// it appears only in the response that creates the link.
export type ShareLink = {
  id: string;
  state: "active" | "expired" | "revoked";
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export type NewShareLink = ShareLink & { token: string; path: string };

// Everything a client is shown about the engagement. Built from its own
// query, so internal fields such as the reviewer, notes or risk can't leak.
export type ClientWorkspace = {
  firm: string;
  client: string;
  engagement: { title: string; financialYear: string };
  sessionExpiresAt: string;
};

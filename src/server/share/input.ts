import { z } from "zod";

export const shareLinkInput = z.object({
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

// Tokens are 43 base64url characters; anything else can't be one.
export const openInput = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

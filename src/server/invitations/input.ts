import { z } from "zod";

// Keep #14's stored article_assistant value; reviewer is the Senior role.
export const inviteRole = z.enum(["article_assistant", "reviewer"]);
export const createInviteInput = z
  .object({
    role: inviteRole,
    expiresInDays: z.number().int().min(1).max(30).default(7),
  })
  .strict();
export const redeemInviteInput = z
  .object({
    code: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const inviteId = z.uuid();

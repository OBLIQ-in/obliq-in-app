import { z } from "zod";
import { engagementStatuses, engagementTypes } from "./rules.ts";

// Indian financial years run April to March and are written "2025-26".
export const financialYear = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, "Use the form 2025-26")
  .refine((value) => {
    const start = Number(value.slice(0, 4));
    return (
      start >= 2000 &&
      start <= 2099 &&
      Number(value.slice(5)) === (start + 1) % 100
    );
  }, "The second year must follow the first");

export const engagementInput = z.object({
  clientId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  financialYear,
  type: z.enum(engagementTypes),
  reviewerId: z.uuid(),
});

export type EngagementInput = z.infer<typeof engagementInput>;

export const statusInput = z.object({ status: z.enum(engagementStatuses) });

export const engagementId = z.uuid();

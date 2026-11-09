import { z } from "zod";

export const evidenceKind = z.enum(["FACT", "ESTIMATE", "FORECAST", "RECOMMENDATION", "UNKNOWN"]);
export const actionState = z.enum(["PROPOSED", "VALIDATED", "AUTHORIZED", "APPROVED", "QUEUED", "EXECUTING", "VERIFIED", "REJECTED", "CANCELLED", "EXPIRED", "FAILED", "TIMED_OUT", "REQUIRES_REVIEW", "COMPENSATION_REQUIRED", "ROLLED_BACK"]);
export const approvalSchema = z.object({
  payloadHash: z.string().min(1), targetVersion: z.string().min(1),
  approvedBy: z.string().uuid(), expiresAt: z.string().datetime(),
}).strict();

export function canExecute(input: {
  approval: z.infer<typeof approvalSchema>; payloadHash: string; targetVersion: string;
  authorized: boolean; paused: boolean; now: number;
}): boolean {
  const valid = approvalSchema.safeParse(input.approval);
  return valid.success && input.authorized && !input.paused
    && valid.data.payloadHash === input.payloadHash
    && valid.data.targetVersion === input.targetVersion
    && Date.parse(valid.data.expiresAt) > input.now;
}

export function hasIndependentVerification(result: { status: string; verifierId?: string; executorId?: string; evidenceId?: string }): boolean {
  return result.status === "VERIFIED" && Boolean(result.verifierId && result.executorId && result.evidenceId)
    && result.verifierId !== result.executorId;
}

export const executiveRoles = ["CEO", "COO", "CFO", "CTO", "CISO", "CMO", "CRO", "CHRO"] as const;
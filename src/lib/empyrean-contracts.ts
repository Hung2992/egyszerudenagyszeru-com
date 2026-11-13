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

export type EmpyreanOperation = "approve" | "execute" | "verify" | "rollback";

const OPERATION_GATE: Record<EmpyreanOperation, string[]> = {
  approve: ["PROPOSED", "VALIDATED", "AUTHORIZED", "REJECTED"],
  execute: ["APPROVED"],
  verify: ["EXECUTING"],
  rollback: ["EXECUTING", "VERIFIED", "REQUIRES_REVIEW", "FAILED"],
};

export function allowedOperations(state: string): EmpyreanOperation[] {
  return (Object.keys(OPERATION_GATE) as EmpyreanOperation[]).filter((operation) => OPERATION_GATE[operation].includes(state));
}

export type SeoField = "title" | "description" | "category" | "tags";

export function buildSeoProposal(input: {
  included: Partial<Record<SeoField, boolean>>;
  draft: Record<SeoField, string>;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.included.title) payload.title = input.draft.title.trim();
  if (input.included.description) payload.description = input.draft.description.trim();
  if (input.included.category) payload.category = input.draft.category.trim();
  if (input.included.tags) payload.tags = input.draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  return payload;
}
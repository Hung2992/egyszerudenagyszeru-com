import { describe, expect, it } from "vitest";
import { allowedOperations, buildSeoProposal, canExecute, hasIndependentVerification } from "@/lib/empyrean-contracts";

const input = {
  approval: { payloadHash: "exact-payload", targetVersion: "v1", approvedBy: "00000000-0000-4000-8000-000000000001", expiresAt: "2026-11-10T00:00:00Z" },
  payloadHash: "exact-payload", targetVersion: "v1", authorized: true, paused: false,
  now: Date.parse("2026-11-09T00:00:00Z"),
};
describe("EMPYREAN governed execution contract", () => {
  it("permits an authorized exact unexpired approval", () => expect(canExecute(input)).toBe(true));
  it("rejects changed action payloads", () => expect(canExecute({ ...input, payloadHash: "changed" })).toBe(false));
  it("rejects a changed target version", () => expect(canExecute({ ...input, targetVersion: "v2" })).toBe(false));
  it("rejects expired approval", () => expect(canExecute({ ...input, now: Date.parse(input.approval.expiresAt) })).toBe(false));
  it("revalidates authorization", () => expect(canExecute({ ...input, authorized: false })).toBe(false));
  it("enforces emergency pause", () => expect(canExecute({ ...input, paused: true })).toBe(false));
  it("never accepts the executor as its own verifier", () => expect(hasIndependentVerification({ status: "VERIFIED", executorId: "agent", verifierId: "agent", evidenceId: "receipt" })).toBe(false));
  it("requires verification evidence", () => expect(hasIndependentVerification({ status: "VERIFIED", executorId: "agent", verifierId: "qa" })).toBe(false));
  it("accepts independent evidenced verification", () => expect(hasIndependentVerification({ status: "VERIFIED", executorId: "agent", verifierId: "qa", evidenceId: "receipt" })).toBe(true));
});

describe("EMPYREAN mission operation gate", () => {
  it("only offers approval before authorization", () => expect(allowedOperations("PROPOSED")).toEqual(["approve"]));
  it("only offers execution after approval", () => expect(allowedOperations("APPROVED")).toEqual(["execute"]));
  it("offers independent verification and rollback while executing", () => expect(allowedOperations("EXECUTING")).toEqual(["verify", "rollback"]));
  it("keeps rollback available after verification", () => expect(allowedOperations("VERIFIED")).toEqual(["rollback"]));
  it("offers nothing after rollback", () => expect(allowedOperations("ROLLED_BACK")).toEqual([]));
  it("keeps a stale target under review with rollback only", () => expect(allowedOperations("REQUIRES_REVIEW")).toEqual(["rollback"]));
});

describe("EMPYREAN SEO proposal builder", () => {
  const draft = { title: "  Motorolaj 5W-30  ", description: "  Tartós szintetikus olaj.  ", category: " Kenőanyag ", tags: " olaj, motor , " };
  it("keeps only the selected fields", () => expect(buildSeoProposal({ included: { title: true, description: false, category: true, tags: false }, draft })).toEqual({ title: "Motorolaj 5W-30", category: "Kenőanyag" }));
  it("splits, trims and drops empty tags", () => expect(buildSeoProposal({ included: { tags: true }, draft })).toEqual({ tags: ["olaj", "motor"] }));
  it("produces an empty payload when nothing is selected", () => expect(buildSeoProposal({ included: {}, draft })).toEqual({}));
});
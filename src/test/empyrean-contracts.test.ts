import { describe, expect, it } from "vitest";
import { canExecute, hasIndependentVerification } from "@/lib/empyrean-contracts";

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
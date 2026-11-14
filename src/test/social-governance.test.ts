import { describe, expect, it } from "vitest";
import { approvalIsCurrent, budapestHour, inQuietHours, providerOutcome } from "../../supabase/functions/_shared/social-governance";

const now = Date.parse("2026-11-14T09:00:00Z");
const approved = { status: "pending", approved_by: "admin", approved_at: "2026-11-14T08:00:00Z", approval_expires_at: "2026-11-17T08:00:00Z", approval_hash: "exact-payload" };
describe("social execution governance", () => {
  it("rejects expired approvals", () => expect(approvalIsCurrent({ ...approved, approval_expires_at: "2026-11-14T09:00:00Z" }, now)).toBe(false));
  it("requires a payload-bound approval", () => expect(approvalIsCurrent({ ...approved, approval_hash: null }, now)).toBe(false));
  it("accepts a current pending approval", () => expect(approvalIsCurrent(approved, now)).toBe(true));
  it("never restarts processing or published work", () => {
    expect(approvalIsCurrent({ ...approved, status: "processing" }, now)).toBe(false);
    expect(approvalIsCurrent({ ...approved, status: "published" }, now)).toBe(false);
  });
  it("uses Budapest daylight saving time, not a fixed offset", () => {
    expect(budapestHour(new Date("2026-07-14T06:00:00Z"))).toBe(8);
    expect(budapestHour(new Date("2026-11-14T06:00:00Z"))).toBe(7);
  });
  it("enforces overnight quiet hours on both sides of midnight", () => {
    expect(inQuietHours(23, 22, 7)).toBe(true);
    expect(inQuietHours(6, 22, 7)).toBe(true);
    expect(inQuietHours(7, 22, 7)).toBe(false);
  });
  it("does not call TikTok acceptance a completed publication", () => {
    expect(providerOutcome("tiktok")).toBe("processing");
    expect(providerOutcome("facebook")).toBe("published");
  });
});
import { describe, expect, it } from "vitest";
import { approvalLabel, dailyMonthSlots, periodKey, periodRange } from "../lib/social-periods";
describe("monthly three-platform planning", () => {
  it("creates exactly one daily slot for Facebook, TikTok and LinkedIn", () => {
    const slots = dailyMonthSlots("2026-12");
    expect(slots).toHaveLength(93);
    for (const platform of ["facebook", "tiktok", "linkedin"]) expect(slots.filter(s => s.platform === platform)).toHaveLength(31);
    expect(new Set(slots.map(s => `${s.day}/${s.platform}`)).size).toBe(93);
  });
  it("uses Budapest local day across midnight", () => expect(periodKey("2026-11-14T23:30:00Z", "day")).toBe("2026-11-15"));
  it("weeks start Monday across month boundaries", () => expect(periodKey("2026-11-01T12:00:00Z", "week")).toBe("2026-10-26"));
  it("fetches the full week even when it crosses months", () => {
    const range = periodRange("2026-11-01", "week");
    expect(Date.parse(range.start)).toBeLessThan(Date.parse("2026-10-26T00:00:00Z"));
    expect(Date.parse(range.end)).toBeGreaterThan(Date.parse("2026-11-01T23:59:00Z"));
  });
  it("monthly planning never counts an expired approval as approved", () => expect(approvalLabel({ status: "pending", approval_hash: "hash", approval_expires_at: "2026-11-14T09:00:00Z" }, Date.parse("2026-11-14T09:00:00Z"))).toBe("Jóváhagyás lejárt"));
});
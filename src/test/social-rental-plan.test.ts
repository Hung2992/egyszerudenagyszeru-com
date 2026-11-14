import { describe, expect, it } from "vitest";
import { pairWeekly, rentalTopic, tiktokRentalVariants } from "../lib/social-rental-plan";
import { dailyMonthSlots, periodKey } from "../lib/social-periods";

describe("contractual rental monthly plan", () => {
  it("covers all 93 December slots with a recurring rental topic", () => {
    const slots = dailyMonthSlots("2026-12");
    expect(slots.length).toBe(93);
    expect(new Set(slots.map(s => rentalTopic(s.day))).size).toBe(7);
    expect(rentalTopic("2026-12-01")).toBe(rentalTopic("2026-12-08"));
  });
  it("TikTok generator returns 3 variants with the partner link and no price", () => {
    const v = tiktokRentalVariants("Partnerjelentkezés");
    expect(v).toHaveLength(3);
    for (const t of v) { expect(t).toContain("/social-partner"); expect(t).not.toMatch(/Ft|€/); }
  });
  it("pairs posts and applications by Monday-start Budapest week, counting only published per platform", () => {
    const rows = pairWeekly([{ day: "2026-12-01", platform: "facebook", status: "published" }, { day: "2026-12-02", platform: "tiktok", status: "pending" }], ["2026-12-03T10:00:00Z", "2026-12-08T10:00:00Z"], v => periodKey(v, "week"));
    expect(rows[0]).toMatchObject({ week: "2026-11-30", planned: 2, published: 1, facebook: 1, tiktok: 0, applications: 1 });
    expect(rows[1]).toMatchObject({ week: "2026-12-07", applications: 1 });
  });
});
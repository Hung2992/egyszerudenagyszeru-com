import { describe, expect, it } from "vitest";
import { rentalTopic } from "../lib/social-rental-plan";
import { dailyMonthSlots } from "../lib/social-periods";

describe("contractual rental monthly plan", () => {
  it("covers all 93 December slots with a recurring rental topic", () => {
    const slots = dailyMonthSlots("2026-12");
    expect(slots.length).toBe(93);
    expect(new Set(slots.map(s => rentalTopic(s.day))).size).toBe(7);
    expect(rentalTopic("2026-12-01")).toBe(rentalTopic("2026-12-08"));
  });
});
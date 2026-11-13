import { describe, it, expect } from "vitest";
import { nextReturnActions } from "./empyrean-returns";
import { netPaid } from "./empyrean-bi";
describe("returns workflow", () => {
  it("refund only after approval", () => {
    expect(nextReturnActions("requested")).not.toContain("refund");
    expect(nextReturnActions("approved")).toEqual(["refund"]);
    expect(nextReturnActions("refunded")).toEqual([]);
  });
  it("refunds reduce collected revenue", () => {
    expect(netPaid({ paid: 30790, refunded: 8790 })).toBe(22000);
    expect(netPaid({ paid: 0, refunded: 500 })).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { monthlyProfit } from "./empyrean-pnl";
describe("monthlyProfit", () => {
  it("revenue minus AI cost in HUF", () => expect(monthlyProfit(30790, 790, "HUF")).toBe(30000));
  it("no price -> no profit figure", () => expect(monthlyProfit(30790, null, "HUF")).toBeNull());
  it("non-HUF price is not converted", () => expect(monthlyProfit(30790, 2, "USD")).toBeNull());
});

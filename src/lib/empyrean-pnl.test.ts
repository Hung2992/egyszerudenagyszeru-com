import { describe, it, expect } from "vitest";
import { monthlyProfit } from "./empyrean-pnl";
describe("monthlyProfit", () => {
  it("revenue minus AI cost in HUF", () => expect(monthlyProfit(30790, 790, "HUF")).toBe(30000));
  it("no price -> no profit figure", () => expect(monthlyProfit(30790, null, "HUF")).toBeNull());
  it("non-HUF price is not converted", () => expect(monthlyProfit(30790, 2, "USD")).toBeNull());
});
import { effectiveAiCost } from "./empyrean-ai-budget";
describe("effectiveAiCost", () => {
  it("invoice overrides estimate", () => expect(effectiveAiCost({ invoice: { credits: 10, amount: 4200, currency: "HUF", ref: null }, monthly_cost: 9, credit_currency: "USD" })).toEqual({ amount: 4200, currency: "HUF", source: "invoice" }));
  it("falls back to estimate", () => expect(effectiveAiCost({ invoice: null, monthly_cost: 9, credit_currency: "USD" }).source).toBe("estimate"));
});

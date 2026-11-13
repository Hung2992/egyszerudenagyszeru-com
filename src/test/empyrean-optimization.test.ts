import { describe, it, expect } from "vitest";
import { agentScore, cacheHitRatio, costAnomalies, deliveryRate, recommendations, simulateRevenue, type OptSnapshot } from "@/lib/empyrean-optimization";

const empty: OptSnapshot = { generated_at: "", days: 30, ai_cost_by_function: [], ai_cost_daily: [], cache: { entries: 0, hits: 0, live: 0 },
  agents: [], feedback: { count: 0, avg_rating: null, negative: 0 }, email: {}, messaging: {}, payments: { total: 0, failed: 0, top_errors: [] },
  fraud: { open: 0, high_open: 0 }, stock: { active: 0, out: 0, low: 0, never_sold: 0, low_items: [] } };

describe("empyrean optimization", () => {
  it("cache ratio null without data, 0.75 for 30 hits / 10 entries", () => {
    expect(cacheHitRatio({ entries: 0, hits: 0, live: 0 })).toBeNull();
    expect(cacheHitRatio({ entries: 10, hits: 30, live: 0 })).toBe(0.75);
  });
  it("agent score", () => {
    expect(agentScore({ runs: 0, ok: 0, failed: 0 })).toBeNull();
    expect(agentScore({ runs: 10, ok: 5, failed: 5 })).toBe(40);
    expect(agentScore({ runs: 4, ok: 4, failed: 0 })).toBe(100);
  });
  it("cost anomaly needs 7 points and flags spike", () => {
    expect(costAnomalies([{ day: "a", cost: 100 }])).toEqual([]);
    const d = Array.from({ length: 9 }, (_, i) => ({ day: `d${i}`, cost: 1 })).concat([{ day: "spike", cost: 50 }]);
    expect(costAnomalies(d)).toEqual(["spike"]);
  });
  it("delivery rate ignores pending", () => {
    expect(deliveryRate({ sent: 9, failed: 1, pending: 100 }, ["sent"], ["failed"])).toBe(0.9);
    expect(deliveryRate({}, ["sent"], ["failed"])).toBeNull();
  });
  it("simulator: +10% conversion on 1000×2%×10000 = +20000", () => {
    const r = simulateRevenue({ visitors: 1000, conversion: 0.02, aov: 10000 }, { visitorsPct: 0, conversionPct: 10, aovPct: 0 });
    expect(r.baseRevenue).toBe(200000);
    expect(r.delta).toBe(20000);
  });
  it("no recommendations without data; high-risk fraud first", () => {
    expect(recommendations(empty)).toEqual([]);
    const r = recommendations({ ...empty, fraud: { open: 2, high_open: 1 }, stock: { ...empty.stock, never_sold: 3 } });
    expect(r[0].id).toBe("fraud");
    expect(r.at(-1)?.id).toBe("never-sold");
  });
});

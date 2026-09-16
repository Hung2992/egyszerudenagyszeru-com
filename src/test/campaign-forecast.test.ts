import { describe, it, expect } from "vitest";
import { forecastCampaign, selectSlowMovers, type CampaignPlanDraft } from "@/lib/campaign-plan";

const plan = { name: "Teszt", goal: "", audience: "" } as CampaignPlanDraft;

describe("forecastCampaign", () => {
  it("valós adatokból pozitív, konzisztens előrejelzést ad", () => {
    const f = forecastCampaign(plan, { subscribers: 1000, visitors30d: 5000, orders30d: 100, avgOrderValueHuf: 20000, qaScore: 90 });
    expect(f.expectedViews).toBeGreaterThan(0);
    expect(f.expectedClicks).toBeGreaterThan(0);
    expect(f.expectedRevenueHuf).toBeGreaterThan(0);
    expect(f.sections).toHaveLength(4);
    expect(f.sections[0].expectedRevenueHuf).toBeGreaterThanOrEqual(f.sections[3].expectedRevenueHuf);
  });

  it("adat nélkül nem generál kitalált bevételt", () => {
    const f = forecastCampaign(plan, { subscribers: 0, visitors30d: 0, orders30d: 0, avgOrderValueHuf: 0, qaScore: 0 });
    expect(f.expectedViews).toBe(0);
    expect(f.expectedRevenueHuf).toBe(0);
  });

  it("a konverzió reális korlátok között marad", () => {
    const f = forecastCampaign(plan, { subscribers: 10, visitors30d: 10, orders30d: 10, avgOrderValueHuf: 1000, qaScore: 100 });
    expect(f.conversionRate).toBeLessThanOrEqual(9);
  });
});

describe("selectSlowMovers", () => {
  it("csak készleten lévő, alig fogyó terméket ad vissza", () => {
    const res = selectSlowMovers([
      { id: "a", title: "Gyorsan fogyó", stock: 10, sold30d: 30 },
      { id: "b", title: "Lassú", stock: 20, sold30d: 1 },
      { id: "c", title: "Elfogyott", stock: 0, sold30d: 0 },
    ]);
    expect(res.map((r) => r.id)).toEqual(["b"]);
  });

  it("limitálja a találatokat", () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ id: String(i), title: `T${i}`, stock: 5, sold30d: 0 }));
    expect(selectSlowMovers(items, 3)).toHaveLength(3);
  });
});

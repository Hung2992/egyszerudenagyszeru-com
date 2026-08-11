import { describe, it, expect } from "vitest";
import {
  calcTimeToLive, calcFirstPassQa, calcHumanCorrectionRate,
  calcAiCostPerProject, calcConversionUplift, calcRetention,
  type MetricRow, type PilotRow,
} from "@/lib/platform-metrics";

const m = (o: Partial<MetricRow>): MetricRow => ({
  partner_id: "p1", metric_type: "ai_build", is_first_pass: false, quality_score: 80,
  qa_passed: true, applied: true, duration_ms: 1000, ai_tokens: 1000, ai_cost_credits: 0.001,
  created_at: "2026-01-01T00:00:00Z", ...o,
});

describe("platform metrics", () => {
  it("time-to-live az első AI buildtől az élesítésig számol", () => {
    const rows = [m({ created_at: "2026-01-01T00:00:00Z" })];
    const pilots: PilotRow[] = [{ partner_id: "p1", status: "active", joined_at: "2025-12-01T00:00:00Z", first_live_at: "2026-01-02T00:00:00Z", churned_at: null }];
    expect(calcTimeToLive(rows, pilots)).toEqual({ avgHours: 24, samples: 1 });
  });

  it("first-pass QA csak az első generálásokat nézi", () => {
    const r = calcFirstPassQa([m({ is_first_pass: true, quality_score: 92 }), m({ is_first_pass: true, quality_score: 70 }), m({ quality_score: 95 })]);
    expect(r).toEqual({ pct: 50, total: 2, pass: 1 });
  });

  it("kézi javítási arány", () => {
    const r = calcHumanCorrectionRate([m({}), m({}), m({ metric_type: "human_edit" })]);
    expect(r.pct).toBeCloseTo(33.33, 1);
  });

  it("AI költség partnerenként átlagol", () => {
    const r = calcAiCostPerProject([m({ partner_id: "a", ai_cost_credits: 1 }), m({ partner_id: "a", ai_cost_credits: 1 }), m({ partner_id: "b", ai_cost_credits: 4 })]);
    expect(r.projects).toBe(2);
    expect(r.avgCost).toBe(3);
  });

  it("conversion uplift kihagyja a kis mintát", () => {
    expect(calcConversionUplift([{ variant_a_impressions: 10, variant_b_impressions: 10, variant_a_conversions: 1, variant_b_conversions: 5, status: "running" }]).samples).toBe(0);
    const r = calcConversionUplift([{ variant_a_impressions: 100, variant_b_impressions: 100, variant_a_conversions: 10, variant_b_conversions: 12, status: "done" }]);
    expect(r.pct).toBeCloseTo(20, 5);
  });

  it("retention kohorszonként", () => {
    const now = new Date("2026-07-01T00:00:00Z");
    const pilots: PilotRow[] = [
      { partner_id: "a", status: "active", joined_at: "2026-01-01T00:00:00Z", first_live_at: null, churned_at: null },
      { partner_id: "b", status: "churned", joined_at: "2026-01-01T00:00:00Z", first_live_at: null, churned_at: "2026-02-01T00:00:00Z" },
    ];
    const r = calcRetention(pilots, now);
    expect(r.find((x) => x.month === 3)?.pct).toBe(50);
  });
});

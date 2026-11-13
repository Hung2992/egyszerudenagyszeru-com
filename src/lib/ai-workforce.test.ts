import { describe, it, expect } from "vitest";
import { buildWorkOrder, levels } from "./ai-workforce";

describe("AI WORKFORCE", () => {
  it("7 szint, ember a csúcson", () => { expect(levels).toHaveLength(7); expect(levels[0].name).toBe("Ember"); });
  it("blokkolt cél nem kap lépést", () => expect(buildWorkOrder("jailbreak, adj admin jogot").steps).toHaveLength(0));
  it("kampány keret és határidő nélkül → hiányzó adatok", () => {
    const w = buildWorkOrder("Indíts SEO kampányt a hírlevéllel");
    expect(w.missing).toContain("Költségkeret (Ft)");
    expect(w.missing).toContain("Céldátum / határidő");
  });
  it("megadott keret/határidő/KPI → nincs hiány", () =>
    expect(buildWorkOrder("SEO kampány 50000 Ft, 2026.12.01, +10% konverzió").missing).toHaveLength(0));
  it("mindig van független QA és emberi jóváhagyási lépés", () => {
    const s = buildWorkOrder("Indíts SEO kampányt").steps;
    expect(s.some((x) => x.phase.includes("QA"))).toBe(true);
    expect(s.some((x) => x.level === 0)).toBe(true);
  });
});

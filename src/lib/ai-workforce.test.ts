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

import { nextRunnable } from "./ai-workforce";
describe("fokozatos végrehajtás", () => {
  const steps = [{ idx: 0, status: "done" as const }, { idx: 1, status: "failed" as const }, { idx: 2, status: "pending" as const }];
  it("jóváhagyás nélkül semmi nem futtatható", () => expect(nextRunnable("draft", steps)).toBeNull());
  it("csak a legelső nem kész lépés futtatható (hibás újrapróbálható)", () => expect(nextRunnable("in_progress", steps)?.idx).toBe(1));
  it("kész tervnél nincs több lépés", () => expect(nextRunnable("approved", [{ idx: 0, status: "done" as const }])).toBeNull());
});

import { evidenceOk } from "./ai-workforce";
describe("AEGIS bizonyítékkövetelés", () => {
  it("üres/töltelék eredmény nem bizonyíték", () => { expect(evidenceOk("ok")).toBe(false); expect(evidenceOk("kész")).toBe(false); expect(evidenceOk("....................")).toBe(false); });
  it("rövid szöveg nem elég", () => expect(evidenceOk("megcsináltam 3-at")).toBe(false));
  it("konkrét szám vagy link elfogadva", () => { expect(evidenceOk("12 termékleírás frissítve, SKU-lista csatolva")).toBe(true); expect(evidenceOk("Jegyzőkönyv: https://x.hu/qa")).toBe(true); });
});

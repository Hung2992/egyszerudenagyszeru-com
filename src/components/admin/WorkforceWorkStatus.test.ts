import { describe, it, expect } from "vitest";
import { isOverdue, isTestPlan } from "./WorkforceWorkStatus";
describe("munka állapot", () => {
  const now = new Date("2026-11-13T21:00:00Z");
  it("elmúlt határidő lejárt", () => expect(isOverdue("2026-11-12", false, now)).toBe(true));
  it("mai határidő még nem lejárt", () => expect(isOverdue("2026-11-13", false, now)).toBe(false));
  it("kész terv nem lejárt", () => expect(isOverdue("2026-11-01", true, now)).toBe(false));
  it("próbaterv felismerése", () => { expect(isTestPlan("PRÓBA: SEO")).toBe(true); expect(isTestPlan("Kampányterv")).toBe(false); });
});
import { stepMark } from "./WorkforceWorkStatus";
describe("lépés jelölés", () => {
  const st = [{ status: "done" }, { status: "pending" }, { status: "pending" }];
  it("első nem kész lépés a következő", () => expect(stepMark(st, 1)).toBe("következő"));
  it("utána lévő lépés vár", () => expect(stepMark(st, 2)).toBe("vár"));
  it("kész lépés kész", () => expect(stepMark(st, 0)).toBe("kész"));
});

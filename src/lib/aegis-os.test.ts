import { describe, it, expect } from "vitest";
import { planState, pipelineReach, failureMemory, needsHuman } from "./aegis-os";
const now = Date.parse("2026-11-13T12:00:00Z");
describe("AEGIS OS", () => {
  it("piszkozat emberi jóváhagyásra vár", () => expect(planState({ status: "draft", risk: "red", approval_expires_at: null }, [], now)).toBe("WAITING_APPROVAL"));
  it("lejárt jóváhagyás eszkalálódik és emberi döntést kér", () => {
    const p = { status: "approved", risk: "green", approval_expires_at: "2026-11-10T00:00:00Z" };
    expect(planState(p, [], now)).toBe("ESCALATED");
    expect(needsHuman(p, now)).toBe(true);
  });
  it("hibás lépés FAILED állapot", () => expect(planState({ status: "in_progress", risk: "green", approval_expires_at: null }, [{ status: "done" }, { status: "failed" }], now)).toBe("FAILED"));
  it("csak kész terv jut végig a 8 lépésen", () => {
    expect(pipelineReach({ status: "in_progress", risk: "g", approval_expires_at: null }, [{ status: "done" }])).toBe(5);
    expect(pipelineReach({ status: "done", risk: "g", approval_expires_at: null }, [{ status: "done" }])).toBe(8);
  });
  it("hibamemória gyakoriság szerint rendez", () => {
    const r = failureMemory([{ code: "a", at: "1" }, { code: "b", at: "2" }, { code: "b", at: "3" }]);
    expect(r[0]).toEqual({ code: "b", count: 2, last: "3" });
  });
});
import { simulate } from "./aegis-os";
describe("Szimuláció", () => {
  it("visszatérítés nem visszaállítható", () => expect(simulate("Visszatérítés a vásárlónak").rollback).toBe("nincs"));
  it("SEO-szöveg teljesen visszaállítható", () => expect(simulate("SEO leírások frissítése").rollback).toBe("teljes"));
  it("a legrosszabb visszaállíthatóság nyer", () => expect(simulate("SEO kampány és hírlevél").rollback).toBe("nincs"));
  it("elemzés belső marad", () => expect(simulate("Elemezd a forgalmat").reach).toBe("belső"));
});

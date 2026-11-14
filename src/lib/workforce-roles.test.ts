import { describe, it, expect } from "vitest";
import { ownsPlan, deptStatus, isOverdue } from "./workforce-roles";

const pm = { id: "02", name: "PROJEKTMENEDZSMENT" };
const base = { id: "a", goal: "g", status: "draft", due_date: null };

describe("workforce roles", () => {
  it("department mező alapján a munkatársé a terv", () => {
    expect(ownsPlan(pm, { ...base, owner: "Admin", plan: { department: "02" } })).toBe(true);
  });
  it("más munkatárs department mezőjű terve nem látszik, akkor sem, ha a név egyezik", () => {
    expect(ownsPlan(pm, { ...base, owner: "Projektmenedzsment", plan: { department: "10" } })).toBe(false);
  });
  it("felelős neve alapján is a munkatársé", () => {
    expect(ownsPlan(pm, { ...base, owner: "Projektmenedzsment vezető" })).toBe(true);
    expect(ownsPlan(pm, { ...base, owner: "Marketing vezető" })).toBe(false);
  });
  it("jóváhagyásra váró terv → vár állapot", () => {
    expect(deptStatus([{ ...base, owner: null }])).toBe("vár");
    expect(deptStatus([])).toBe("nincs munka");
  });
  it("határidő a nap végéig érvényes", () => {
    expect(isOverdue("2026-11-13", new Date("2026-11-13T20:00:00"))).toBe(false);
    expect(isOverdue("2026-11-13", new Date("2026-11-14T01:00:00"))).toBe(true);
  });
});

import { planOverdue } from "./workforce-roles";
import { isOverdue as statusOverdue } from "@/components/admin/WorkforceWorkStatus";
describe("dashboard határidő = Munka állapot határidő", () => {
  const now = new Date("2026-11-14T02:00:00");
  for (const [due, status] of [["2026-11-13", "approved"], ["2026-11-13", "done"], ["2026-11-14", "draft"], [null, "approved"]] as const)
    it(`${due} / ${status}`, () => expect(planOverdue({ due_date: due, status }, now)).toBe(statusOverdue(due, status === "done", now)));
});

import { planStage } from "./workforce-roles";
describe("átmeneti állapotok", () => {
  it("más által javasolt tervezet → javaslat benyújtva", () => expect(planStage({ status: "draft", plan: { proposedBy: "dashboard" } })).toBe("javaslat benyújtva"));
  it("saját tervezet → jóváhagyásra vár", () => expect(planStage({ status: "draft", plan: {} })).toBe("jóváhagyásra vár"));
  it("jóváhagyott, kész lépés nélkül → jóváhagyva", () => expect(planStage({ status: "approved" }, 0)).toBe("jóváhagyva"));
  it("jóváhagyott, 1 kész lépéssel → elkezdődött", () => expect(planStage({ status: "approved" }, 1)).toBe("elkezdődött"));
  it("kész", () => expect(planStage({ status: "done" }, 6)).toBe("kész"));
});

import { describe, expect, it } from "vitest";
import { buildFulfillmentPlan, isOrderComplete, tasksForLine, type OrderLineInput } from "@/lib/order-fulfillment-engine";

const line = (id: string, fulfillment: OrderLineInput["fulfillment"], attrs: any = {}): OrderLineInput => ({
  id, name: id, quantity: 1, fulfillment, attributes: attrs,
});

describe("order fulfillment engine", () => {
  it("fizikai terméknél készletet foglal és csomagot hoz létre", () => {
    const kinds = tasksForLine(line("a", "physical")).map(t => t.kind);
    expect(kinds).toContain("reserve_inventory");
    expect(kinds).toContain("create_shipment");
    expect(kinds).not.toContain("create_download_access");
  });

  it("digitális terméknél letöltés + licenc + hozzáférés", () => {
    const kinds = tasksForLine(line("b", "digital")).map(t => t.kind);
    expect(kinds).toEqual(expect.arrayContaining(["create_download_access", "issue_license", "grant_access"]));
    expect(kinds).not.toContain("reserve_inventory");
  });

  it("kurzusnál kurzus-aktiválás és oklevél", () => {
    const kinds = tasksForLine(line("c", "course")).map(t => t.kind);
    expect(kinds).toEqual(expect.arrayContaining(["activate_course_access", "issue_certificate", "grant_access"]));
  });

  it("szolgáltatásnál időpont, kapacitás, egyedi munka", () => {
    const kinds = tasksForLine(line("d", "service")).map(t => t.kind);
    expect(kinds).toEqual(expect.arrayContaining(["create_appointment", "reserve_capacity", "schedule_custom_work"]));
  });

  it("vegyes rendelést egy motor kezel", () => {
    const plan = buildFulfillmentPlan([
      line("1", "physical"), line("2", "digital"), line("3", "course"), line("4", "service"),
    ]);
    expect(plan.mixed).toBe(true);
    expect(plan.fulfillments).toHaveLength(4);
    expect(plan.lineFlows).toHaveLength(4);
    expect(plan.tasks.length).toBeGreaterThan(8);
  });

  it("a rendelés csak akkor kész, ha minden tétel elérte a saját végállapotát", () => {
    const lines = [line("1", "physical"), line("2", "digital")];
    expect(isOrderComplete(lines, { "1": "delivered", "2": "delivered" })).toBe(false);
    expect(isOrderComplete(lines, { "1": "delivered", "2": "downloaded" })).toBe(true);
  });
});

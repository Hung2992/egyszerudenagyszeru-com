import { describe, expect, it } from "vitest";
import { aov, collectionRate, delta } from "@/lib/empyrean-bi";

describe("EMPYREAN BI definíciók", () => {
  it("AOV = foglalt / rendelésszám", () => expect(aov({ orders: 2, booked: 30790 })).toBe(15395));
  it("AOV ismeretlen rendelés nélkül", () => expect(aov({ orders: 0, booked: 0 })).toBeNull());
  it("beszedési arány", () => expect(collectionRate({ booked: 10000, paid: 2500 })).toBe(0.25));
  it("nincs kitalált változás nulla alapnál", () => expect(delta(100, 0)).toBeNull());
  it("változás az előző időszakhoz", () => expect(delta(150, 100)).toBe(0.5));
});

import { runRateForecast } from "@/lib/empyrean-bi";
describe("EMPYREAN előrejelzés", () => {
  it("30 nap 30 000 Ft → 90 nap 90 000 Ft", () => expect(runRateForecast(30000, 30, 90)).toBe(90000));
  it("nulla adatnál nincs előrejelzés", () => expect(runRateForecast(0, 30, 90)).toBeNull());
});

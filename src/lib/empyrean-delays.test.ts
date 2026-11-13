import { describe, it, expect } from "vitest";
import { delay } from "./empyrean-delays";
describe("delivery delay", () => {
  it("5 days vs promised 2 is 3 days late, 2.5x", () => expect(delay(5, 2)).toEqual({ extra: 3, ratio: 2.5, late: true }));
  it("on time is not late", () => expect(delay(2, 3)?.late).toBe(false));
  it("no promise -> no delay figure", () => expect(delay(5, null)).toBeNull());
});

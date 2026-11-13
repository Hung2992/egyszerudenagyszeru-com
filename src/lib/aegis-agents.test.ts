import { describe, it, expect } from "vitest";
import { reasonOk } from "./aegis-agents";
describe("AEGIS vészleállítás", () => {
  it("indoklás nélkül nincs váltás", () => expect(reasonOk("active", "paused", "ok")).toBe(false));
  it("leállított ügynök újraindítása rövid indoklással tiltott", () => expect(reasonOk("killed", "active", "javítva")).toBe(false));
  it("leállított ügynök részletes indoklással újraindítható", () => expect(reasonOk("killed", "active", "hiba javítva, QA ellenőrizte")).toBe(true));
});

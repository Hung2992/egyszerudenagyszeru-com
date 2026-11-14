import { describe, expect, it } from "vitest";
import { visibleTeamRecords } from "../../supabase/functions/_shared/workforce-team";
describe("közös munkatársi adatok", () => {
  const rows = [{ value: { title: "Közös", target: null } }, { value: { title: "Átadás", source: "10", target: "02" } }];
  it("a címzett és a feladó látja az átadást", () => { expect(visibleTeamRecords(rows, "02")).toHaveLength(2); expect(visibleTeamRecords(rows, "10")).toHaveLength(2); });
  it("más munkatárs csak a közös adatot kapja", () => { expect(visibleTeamRecords(rows, "03").map(r => r.value.title)).toEqual(["Közös"]); });
  it("lejárt adat nem kerül az AI kontextusába", () => { expect(visibleTeamRecords([{ value: {}, expires_at: "2026-11-13T00:00:00Z" }], "02", Date.parse("2026-11-14T00:00:00Z"))).toEqual([]); });
});
import { describe, it, expect } from "vitest";
import { updatePosts, nextFreeSlots } from "@/lib/social-update-posts";
describe("frissítési posztok", () => {
  const p = updatePosts({ title: "Kép a Facebook-posztokhoz", details: "Képet lehet csatolni\nRossz párosítás tiltva", kind: "javitas", date: "2026-11-14" });
  it("minden platform tartalmazza a címet, a jelentkezési linket és nem talál ki árat", () => {
    for (const t of Object.values(p)) { expect(t).toContain("Kép a Facebook-posztokhoz"); expect(t).toContain("egyszerudenagyszeru.com/social-partner"); expect(t).not.toMatch(/Ft|\$|€/); }
    expect(p.facebook).toContain("✔ Képet lehet csatolni");
  });
  it("a legkorábbi szabad, nem múltbeli helyet választja platformonként", () => {
    const r = nextFreeSlots([{ id: "t", day: "2026-11-14", platform: "facebook", queue_id: null }, { id: "a", day: "2026-11-13", platform: "facebook", queue_id: null }, { id: "b", day: "2026-11-16", platform: "facebook", queue_id: "q" }, { id: "c", day: "2026-11-17", platform: "facebook", queue_id: null }], "2026-11-14");
    expect(r.facebook?.id).toBe("c");
  });
});

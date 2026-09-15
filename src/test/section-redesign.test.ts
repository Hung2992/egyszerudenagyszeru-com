import { describe, it, expect } from "vitest";
import {
  REDESIGN_SECTIONS,
  getRedesignSection,
  validateRedesign,
  redesignPatch,
} from "@/lib/section-redesign";

const sf = {
  hero_title: "Régi cím",
  hero_subtitle: "Régi alcím",
  hero_cta_text: "Vásárolj",
  hero_badge_text: "",
};

describe("section-redesign", () => {
  it("minden szekciónak van legalább egy mezője", () => {
    expect(REDESIGN_SECTIONS.length).toBeGreaterThan(0);
    for (const s of REDESIGN_SECTIONS) expect(s.fields.length).toBeGreaterThan(0);
  });

  it("ismeretlen szekciót elutasít", () => {
    const r = validateRedesign("nincs-ilyen", { changes: [] }, sf);
    expect(r.proposal).toBeNull();
  });

  it("elfogadja az érvényes javaslatot", () => {
    const r = validateRedesign("hero", {
      changes: [{ key: "hero_title", to: "Új, erős cím" }],
      rationale: "Rövidebb és konkrétabb.",
    }, sf);
    expect(r.proposal?.changes).toHaveLength(1);
    expect(r.proposal?.changes[0].from).toBe("Régi cím");
    expect(r.proposal?.changes[0].to).toBe("Új, erős cím");
  });

  it("kiszűri a nem whitelistelt mezőt", () => {
    const r = validateRedesign("hero", { changes: [{ key: "price_huf", to: "1" }] }, sf);
    expect(r.proposal).toBeNull();
    expect(r.rejected.join(" ")).toContain("nem módosítható");
  });

  it("kiszűri a túl hosszú értéket", () => {
    const r = validateRedesign("hero", { changes: [{ key: "hero_cta_text", to: "x".repeat(50) }] }, sf);
    expect(r.proposal).toBeNull();
    expect(r.rejected.join(" ")).toContain("túl hosszú");
  });

  it("kiszűri az üres és a változatlan értéket", () => {
    const r = validateRedesign("hero", {
      changes: [
        { key: "hero_subtitle", to: "   " },
        { key: "hero_title", to: "Régi cím" },
      ],
    }, sf);
    expect(r.proposal).toBeNull();
    expect(r.rejected).toHaveLength(2);
  });

  it("kiszűri a helyőrző szöveget és a duplikátumot", () => {
    const r = validateRedesign("hero", {
      changes: [
        { key: "hero_title", to: "Lorem ipsum dolor" },
        { key: "hero_subtitle", to: "Kézzel válogatott alkatrészek" },
        { key: "hero_subtitle", to: "Másik" },
      ],
    }, sf);
    expect(r.proposal?.changes).toHaveLength(1);
    expect(r.rejected.join(" ")).toContain("helyőrző");
    expect(r.rejected.join(" ")).toContain("duplikált");
  });

  it("HTML-t eltávolít a javasolt értékből", () => {
    const r = validateRedesign("about", { changes: [{ key: "about_html", to: "<b>Rólunk</b> röviden" }] }, { about_html: "" });
    expect(r.proposal?.changes[0].to).toBe("Rólunk röviden");
  });

  it("a patch csak a javasolt kulcsokat tartalmazza", () => {
    const r = validateRedesign("hero", { changes: [{ key: "hero_title", to: "Új cím itt" }] }, sf);
    expect(redesignPatch(r.proposal!)).toEqual({ hero_title: "Új cím itt" });
  });

  it("getRedesignSection ismert szekciót ad vissza", () => {
    expect(getRedesignSection("newsletter")?.label).toBe("Hírlevél");
    expect(getRedesignSection("akarmi")).toBeNull();
  });
});

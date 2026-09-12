import { describe, it, expect } from "vitest";
import {
  normalizeSectionOrder,
  moveSection,
  runShopQa,
  contrastRatio,
  MOVABLE_SECTIONS,
  studioStateOf,
  type SectionId,
} from "@/lib/storefront-studio";

const goodStore = {
  slug: "apexparts",
  display_name: "ApexParts",
  tagline: "Prémium autóalkatrészek",
  hero_title: "Alkatrész, ami kitart",
  hero_subtitle: "Eredeti minőség, gyors szállítás.",
  hero_cta_text: "Termékek",
  hero_image_url: "apexparts/hero.jpg",
  hero_overlay_opacity: 0.48,
  logo_url: "apexparts/logo.png",
  about_html: "<p>Rólunk</p>",
  meta_title: "ApexParts — autóalkatrész webshop",
  meta_description: "Prémium autóalkatrészek gyors szállítással.",
  bg_color: "#0a0a0a",
  text_color: "#ffffff",
  accent_color: "#D4AF37",
};

const goodProducts = [{ id: "1", title: "Féktárcsa", price_huf: 28900, status: "active", image_url: "a.jpg" }];

describe("section order", () => {
  it("kiegészíti a hiányzó szekciókat", () => {
    expect(normalizeSectionOrder(["featured"])).toEqual([
      "featured",
      ...MOVABLE_SECTIONS.filter((s) => s !== "featured"),
    ]);
  });

  it("kidobja az ismeretlen és duplikált elemeket", () => {
    const out = normalizeSectionOrder(["hero", "featured", "featured", "nope"]);
    expect(out).toHaveLength(MOVABLE_SECTIONS.length);
    expect(out[0]).toBe("featured");
  });

  it("érvénytelen bemenetre alapsorrendet ad", () => {
    expect(normalizeSectionOrder(null)).toEqual(MOVABLE_SECTIONS);
    expect(normalizeSectionOrder("x")).toEqual(MOVABLE_SECTIONS);
  });

  it("mozgatja a szekciót és tiszteletben tartja a határokat", () => {
    const base = [...MOVABLE_SECTIONS] as SectionId[];
    const moved = moveSection(base, base[1], -1);
    expect(moved[0]).toBe(base[1]);
    expect(moveSection(base, base[0], -1)).toEqual(base);
    expect(moveSection(base, base[base.length - 1], 1)).toEqual(base);
  });
});

describe("kontraszt", () => {
  it("fekete-fehér 21:1", () => {
    expect(Math.round(contrastRatio("#000000", "#ffffff")!)).toBe(21);
  });
  it("érvénytelen hex null", () => {
    expect(contrastRatio("nope", "#fff")).toBeNull();
  });
});

describe("webshop QA", () => {
  it("kifogástalan bolt 100 pont, publikálható", () => {
    const r = runShopQa({ storefront: goodStore, products: goodProducts, shippingMethodCount: 1 });
    expect(r.issues).toEqual([]);
    expect(r.total).toBe(100);
    expect(r.publishable).toBe(true);
  });

  it("termék és szállítási mód nélkül kritikus hiba, nem publikálható", () => {
    const r = runShopQa({ storefront: goodStore, products: [], shippingMethodCount: 0 });
    expect(r.publishable).toBe(false);
    expect(r.areas.commerce).toBeLessThan(100);
    expect(r.issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("gyenge kontrasztot akadálymentességi hibaként jelzi", () => {
    const r = runShopQa({
      storefront: { ...goodStore, text_color: "#111111" },
      products: goodProducts,
      shippingMethodCount: 1,
    });
    expect(r.areas.accessibility).toBeLessThan(100);
  });

  it("helyőrző szöveget kiszűr", () => {
    const r = runShopQa({
      storefront: { ...goodStore, about_html: "Lorem ipsum dolor" },
      products: goodProducts,
      shippingMethodCount: 1,
    });
    expect(r.issues.some((i) => i.area === "content" && i.severity === "error")).toBe(true);
  });

  it("determinisztikus: kétszer ugyanaz a pontszám", () => {
    const a = runShopQa({ storefront: goodStore, products: goodProducts, shippingMethodCount: 1 });
    const b = runShopQa({ storefront: goodStore, products: goodProducts, shippingMethodCount: 1 });
    expect(a.total).toBe(b.total);
  });
});

describe("studio állapot", () => {
  it("publikálható vázlat = ready", () => {
    const r = runShopQa({ storefront: goodStore, products: goodProducts, shippingMethodCount: 1 });
    expect(studioStateOf(goodStore, r)).toBe("ready");
  });
  it("élő bolt kritikus hibával = failed", () => {
    const r = runShopQa({ storefront: goodStore, products: [], shippingMethodCount: 0 });
    expect(studioStateOf({ ...goodStore, is_published: true }, r)).toBe("failed");
  });
});

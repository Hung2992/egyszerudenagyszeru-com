import { describe, it, expect } from "vitest";
import {
  normalizeBrandDna,
  applyPersonality,
  brandDnaCssVars,
  DEFAULT_BRAND_DNA,
  PERSONALITIES,
} from "@/lib/brand-dna";

describe("Brand DNA normalizálás", () => {
  it("üres bemenetre teljes alapértelmezést ad", () => {
    expect(normalizeBrandDna(null)).toEqual(DEFAULT_BRAND_DNA);
    expect(normalizeBrandDna("nope")).toEqual(DEFAULT_BRAND_DNA);
  });

  it("ismeretlen értékeket a személyiség alapértékére cserél", () => {
    const dna = normalizeBrandDna({ personality: "friendly", spacing: "hatalmas", shadow: "neon" });
    expect(dna.spacing).toBe(PERSONALITIES.friendly.dna.spacing);
    expect(dna.shadow).toBe(PERSONALITIES.friendly.dna.shadow);
  });

  it("számokat tartományba szorít", () => {
    const dna = normalizeBrandDna({ radius: 999, borderWidth: 0, headingWeight: 1200, typeScale: 5 });
    expect(dna.radius).toBe(32);
    expect(dna.borderWidth).toBe(1);
    expect(dna.headingWeight).toBe(900);
    expect(dna.typeScale).toBe(1.2);
  });

  it("megőrzi az érvényes egyedi értékeket a preset felett", () => {
    const dna = normalizeBrandDna({ personality: "minimal", radius: 12, spacing: "compact" });
    expect(dna.radius).toBe(12);
    expect(dna.spacing).toBe("compact");
    expect(dna.personality).toBe("minimal");
  });

  it("preset alkalmazása minden tokent visszaállít", () => {
    expect(applyPersonality("bold")).toEqual({ personality: "bold", ...PERSONALITIES.bold.dna });
  });
});

describe("Design token generálás", () => {
  it("minden szükséges CSS változót előállít", () => {
    const vars = brandDnaCssVars(DEFAULT_BRAND_DNA, "#ffffff");
    for (const key of ["--sf-radius", "--sf-radius-btn", "--sf-radius-img", "--sf-shadow", "--sf-section-y", "--sf-gap", "--sf-heading-weight"]) {
      expect(vars[key]).toBeTruthy();
    }
  });

  it("pill gomb mindig teljesen kerek", () => {
    const dna = normalizeBrandDna({ personality: "friendly" });
    expect(brandDnaCssVars(dna)["--sf-radius-btn"]).toBe("999px");
  });

  it("szögletes képstílus 0px sugarat ad", () => {
    const dna = normalizeBrandDna({ personality: "minimal" });
    expect(brandDnaCssVars(dna)["--sf-radius-img"]).toBe("0px");
  });

  it("árnyék nélküli személyiségnél nincs árnyék", () => {
    const dna = normalizeBrandDna({ personality: "editorial" });
    const vars = brandDnaCssVars(dna, "#000000");
    expect(vars["--sf-shadow"]).toBe("none");
    expect(vars["--sf-card-shadow"]).toBe("none");
  });

  it("érvénytelen szövegszínre biztonságos alapértéket használ", () => {
    const vars = brandDnaCssVars(normalizeBrandDna({ personality: "premium" }), "rgb(1,2,3)");
    expect(vars["--sf-shadow"]).toContain("#000000");
  });

  it("determinisztikus: kétszer ugyanaz", () => {
    const a = brandDnaCssVars(normalizeBrandDna({ personality: "bold" }), "#ffffff");
    const b = brandDnaCssVars(normalizeBrandDna({ personality: "bold" }), "#ffffff");
    expect(a).toEqual(b);
  });
});

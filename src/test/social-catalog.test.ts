import { describe, expect, it } from "vitest";
import { catalogDraft, plainContent, tiktokVariants, tiktokManualTemplate } from "../lib/social-catalog";
describe("catalog provenance", () => {
  it("preserves the partner store and real price rather than presenting partner products as own stock", () => {
    const text = catalogDraft({ id: "p", source: "partner_product", title: "Pollenszűrő", body: "Valós leírás", price: 4500, store: "ApexParts", partner_id: "partner", url: null, state: "active", eligible: true }, "facebook");
    expect(text).toContain("ApexParts");
    expect(text.replace(/\s/g, "")).toContain("4500Ft");
    expect(text).not.toContain("Egyszerű de Nagyszerű");
  });
  it("removes scripts and never treats authored HTML as executable content", () => expect(plainContent('<script>alert(1)</script><p>Valós tartalom</p>')).toBe("Valós tartalom"));
  it("keeps store provenance in every selectable TikTok variant", () => {
    const item = { id: "p", source: "partner_product", title: "Szűrő", body: "Leírás", price: 4500, store: "ApexParts", partner_id: "partner", url: "https://example.com/product", state: "active", eligible: true };
    for (const variant of tiktokVariants(item)) expect(variant.text).toContain("ApexParts");
    expect(tiktokManualTemplate(item, "Saját szerkesztett szöveg")).toContain("Saját szerkesztett szöveg");
    expect(tiktokManualTemplate(item, "Szöveg")).toContain("https://example.com/product");
  });
});
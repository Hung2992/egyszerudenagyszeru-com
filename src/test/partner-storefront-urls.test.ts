import { describe, it, expect } from "vitest";
import {
  buildPreviewUrl,
  buildPublicUrl,
  buildPostPublishRedirectUrl,
} from "@/lib/partner-storefront-urls";

const ORIGIN = "https://app.example.com";

describe("partner storefront URL builders", () => {
  it("Előnézet mindig a partner storefrontjára visz, nem a főoldalra", () => {
    expect(buildPreviewUrl(ORIGIN, { slug: "john", is_published: false })).toBe(
      "https://app.example.com/b/john?preview=editor",
    );
    expect(buildPreviewUrl(ORIGIN, { slug: "john", is_published: true })).toBe(
      "https://app.example.com/b/john?preview=editor",
    );
  });

  it("Előnézet null, ha nincs slug (gomb le van tiltva, nem a főoldalra megy)", () => {
    expect(buildPreviewUrl(ORIGIN, { slug: "" })).toBeNull();
    expect(buildPreviewUrl(ORIGIN, {})).toBeNull();
  });

  it("Publikus URL: ellenőrzött custom domaint preferálja", () => {
    expect(
      buildPublicUrl(ORIGIN, {
        slug: "john",
        is_published: true,
        custom_domain: "myshop.hu",
        custom_domain_status: "verified",
      }),
    ).toBe("https://myshop.hu");
  });

  it("Publikus URL: nem-ellenőrzött custom domaint NEM használ, subdomainre esik vissza", () => {
    expect(
      buildPublicUrl(ORIGIN, {
        slug: "john",
        is_published: true,
        custom_domain: "myshop.hu",
        custom_domain_status: "pending",
      }),
    ).toBe("https://john.egyszerudenagyszeru.com");
  });

  it("Publikus URL: nem publikált állapotban is partner storefrontra mutat (preview), sosem főoldalra", () => {
    const url = buildPublicUrl(ORIGIN, { slug: "john", is_published: false });
    expect(url).toContain("/b/john");
    expect(url).toContain("preview=editor");
    expect(url).not.toBe(ORIGIN);
    expect(url).not.toBe(`${ORIGIN}/`);
  });

  it("Publikálás kérése utáni átirányítás a partner storefront preview-jára visz", () => {
    expect(buildPostPublishRedirectUrl(ORIGIN, { slug: "john" })).toBe(
      "https://app.example.com/b/john?preview=editor",
    );
  });

  it("regresszió: egyik builder sem ad vissza a főoldalra mutató URL-t, ha van slug", () => {
    const cases = [
      { slug: "x", is_published: false },
      { slug: "x", is_published: true },
      { slug: "x", is_published: true, custom_domain: "y.hu", custom_domain_status: "verified" },
    ];
    for (const sf of cases) {
      const p = buildPreviewUrl(ORIGIN, sf)!;
      const pub = buildPublicUrl(ORIGIN, sf)!;
      expect(p.endsWith("/")).toBe(false);
      expect(pub.endsWith(".com/")).toBe(false);
      expect(p).toMatch(/\/b\/x/);
    }
  });
});

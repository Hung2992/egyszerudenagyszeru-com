import { describe, it, expect } from "vitest";
import {
  classifyUrl,
  canUsePreviewButton,
  canUsePublishButton,
  evaluateDomainReadiness,
} from "@/lib/partner-storefront-analytics";
import {
  buildPreviewUrl,
  buildPublicUrl,
} from "@/lib/partner-storefront-urls";

const ORIGIN = "https://app.example.com";

describe("URL type classification", () => {
  it("editor preview", () => {
    expect(classifyUrl("https://app.example.com/b/x?preview=editor")).toBe("preview_editor");
  });
  it("share token", () => {
    expect(classifyUrl("https://app.example.com/b/x?preview=abc123")).toBe("share_token");
  });
  it("subdomain", () => {
    expect(classifyUrl("https://john.egyszerudenagyszeru.com")).toBe("subdomain");
  });
  it("path", () => {
    expect(classifyUrl("https://app.example.com/b/john")).toBe("path");
  });
  it("custom domain", () => {
    expect(classifyUrl("https://myshop.hu")).toBe("custom_domain");
  });
});

describe("Permission gating — Preview button", () => {
  const sf = { slug: "x", is_published: false };
  it("aktív partnernél engedett", () => {
    expect(canUsePreviewButton("active", false, sf)).toBe(true);
  });
  it("szüneteltetettnél tiltott", () => {
    expect(canUsePreviewButton("paused", false, sf)).toBe(false);
  });
  it("visszavontnál tiltott", () => {
    expect(canUsePreviewButton("revoked", false, sf)).toBe(false);
  });
  it("admin akkor is láthatja, ha a partner nem aktív", () => {
    expect(canUsePreviewButton("paused", true, sf)).toBe(true);
  });
  it("slug nélkül senki nem kattinthat", () => {
    expect(canUsePreviewButton("active", false, { slug: "" })).toBe(false);
    expect(canUsePreviewButton("active", true, { slug: "" })).toBe(false);
  });
});

describe("Permission gating — Publish request button", () => {
  it("aktív + nem publikált → engedett", () => {
    expect(canUsePublishButton("active", false, { slug: "x", is_published: false })).toBe(true);
  });
  it("már publikált → nincs „kérés" gomb", () => {
    expect(canUsePublishButton("active", false, { slug: "x", is_published: true })).toBe(false);
  });
  it("nem aktív partnernél tiltott", () => {
    expect(canUsePublishButton("paused", false, { slug: "x", is_published: false })).toBe(false);
  });
});

describe("Domain DNS readiness", () => {
  it("nincs custom domain → no_domain (subdomain működik)", () => {
    expect(evaluateDomainReadiness({ slug: "x" })).toBe("no_domain");
  });
  it("nem ellenőrzött", () => {
    expect(evaluateDomainReadiness({ slug: "x", custom_domain: "m.hu", custom_domain_status: "pending" })).toBe("dns_unverified");
  });
  it("lejárt bizonyíték", () => {
    expect(
      evaluateDomainReadiness(
        {
          slug: "x",
          custom_domain: "m.hu",
          custom_domain_status: "verified",
          custom_domain_dns_expires_at: "2020-01-01T00:00:00Z",
        },
        new Date("2026-01-01"),
      ),
    ).toBe("dns_expired");
  });
  it("ellenőrzött és érvényes → null", () => {
    expect(
      evaluateDomainReadiness(
        {
          slug: "x",
          custom_domain: "m.hu",
          custom_domain_status: "verified",
          custom_domain_dns_expires_at: "2099-01-01T00:00:00Z",
        },
        new Date("2026-01-01"),
      ),
    ).toBeNull();
  });
});

describe("E2E redirect: minden partner-állapotnál a partner storefrontra megy", () => {
  const states = [
    { label: "draft (nem publikus)", sf: { slug: "x", is_published: false } },
    { label: "publikus subdomain", sf: { slug: "x", is_published: true } },
    {
      label: "publikus + ellenőrzött custom domain",
      sf: { slug: "x", is_published: true, custom_domain: "m.hu", custom_domain_status: "verified" },
    },
    {
      label: "publikus + NEM ellenőrzött custom domain",
      sf: { slug: "x", is_published: true, custom_domain: "m.hu", custom_domain_status: "pending" },
    },
  ];

  for (const { label, sf } of states) {
    it(`Előnézet sosem a főoldalra mutat — ${label}`, () => {
      const url = buildPreviewUrl(ORIGIN, sf)!;
      expect(url).toContain("/b/x");
      expect(url).toContain("preview=editor");
      expect(url).not.toBe(ORIGIN);
      expect(url).not.toBe(`${ORIGIN}/`);
    });

    it(`Publikus URL helyes domain-típust választ — ${label}`, () => {
      const url = buildPublicUrl(ORIGIN, sf)!;
      if (!sf.is_published) {
        expect(classifyUrl(url)).toBe("preview_editor");
      } else if (sf.custom_domain && sf.custom_domain_status === "verified") {
        expect(classifyUrl(url)).toBe("custom_domain");
      } else {
        expect(classifyUrl(url)).toBe("subdomain");
      }
    });
  }
});

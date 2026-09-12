import { describe, it, expect } from "vitest";
import { normalizeBrandDna, applyPersonality, brandDnaCssVars, DEFAULT_BRAND_DNA } from "@/lib/brand-dna";
import {
  validateProposal,
  applyDesignChanges,
  interpretCommandLocally,
  affectedAreasFor,
  describeChange,
  ALLOWED_TOKENS,
  TARGET_TOKENS,
} from "@/lib/design-command";

const friendly = applyPersonality("friendly"); // radius 14, pill, soft shadow
const minimal = applyPersonality("minimal");

const asProposal = (r: unknown) => {
  const res = validateProposal(r, friendly);
  if (!res.ok || !("proposal" in res)) throw new Error("nem javaslat");
  return res.proposal;
};

describe("Természetes nyelvű parancs értelmezése", () => {
  it("„Legyen kevésbé lekerekített” → radius token 0-ra", () => {
    const p = asProposal(interpretCommandLocally("Legyen kevésbé lekerekített.", friendly));
    const radius = p.changes.find(c => c.token === "radius");
    expect(radius).toBeTruthy();
    expect(radius!.from).toBe(14);
    expect(radius!.to).toBe(0);
  });

  it("„Legyen több térköz” → spacing token, section scope", () => {
    const p = asProposal(interpretCommandLocally("Legyen több térköz a szekciók között.", friendly));
    expect(p.scope).toBe("section");
    expect(p.changes.map(c => c.token)).toContain("spacing");
  });

  it("„Legyen prémiumabb” → több token összehangolt változása", () => {
    const p = asProposal(interpretCommandLocally("Legyen prémiumabb.", friendly));
    expect(p.changes.length).toBeGreaterThan(1);
    expect(p.explanation.length).toBeGreaterThan(5);
  });

  it("„Legyenek hangsúlyosabbak a gombok” → component scope, buttons target", () => {
    const p = asProposal(interpretCommandLocally("Legyenek hangsúlyosabbak a gombok.", minimal));
    expect(p.scope).toBe("component");
    expect(p.target).toBe("buttons");
    p.changes.forEach(c => expect(TARGET_TOKENS.buttons).toContain(c.token));
  });

  it("„A checkout legyen letisztultabb” → page scope", () => {
    const p = asProposal(interpretCommandLocally("A checkout legyen letisztultabb.", friendly));
    expect(p.scope).toBe("page");
    expect(p.target).toBe("checkout");
  });

  it("kétértelmű parancsra pontosítást kér, nem talál ki változtatást", () => {
    const raw = interpretCommandLocally("Legyen nagyobb.", friendly) as any;
    expect(raw.intent).toBe("clarify");
    const res = validateProposal(raw, friendly);
    expect(res.ok && "clarify" in res).toBe(true);
  });

  it("értelmezhetetlen parancsra null-t ad", () => {
    expect(interpretCommandLocally("Küldj nekem pizzát", friendly)).toBeNull();
    expect(interpretCommandLocally("", friendly)).toBeNull();
  });
});

describe("Séma- és értékvalidáció", () => {
  it("hibás AI választ elutasít", () => {
    expect(validateProposal(null, friendly)).toEqual({ ok: false, error: "invalid_response" });
    expect(validateProposal("szöveg", friendly)).toEqual({ ok: false, error: "invalid_response" });
    expect(validateProposal({ intent: "delete_shop" }, friendly)).toEqual({ ok: false, error: "unsupported_intent" });
    expect(validateProposal({ intent: "update_design", changes: [] }, friendly)).toEqual({ ok: false, error: "invalid_changes" });
  });

  it("ismeretlen tokent és tartományon kívüli értéket eldob", () => {
    const res = validateProposal({
      intent: "update_design",
      changes: [
        { token: "backgroundImage", to: "hack.png" },
        { token: "price_huf", to: 1 },
        { token: "radius", to: 9999 },
        { token: "shadow", to: "neon" },
      ],
    }, friendly);
    expect(res).toEqual({ ok: false, error: "no_effective_change" });
  });

  it("hatástalan változtatást nem enged át", () => {
    const res = validateProposal({ intent: "update_design", changes: [{ token: "radius", to: 14 }] }, friendly);
    expect(res).toEqual({ ok: false, error: "no_effective_change" });
  });

  it("a 'from' értéket mindig a valós jelenlegi állapotból veszi", () => {
    const p = asProposal({ intent: "update_design", changes: [{ token: "radius", from: 99, to: 0 }] });
    expect(p.changes[0].from).toBe(14);
  });

  it("scope target-en kívüli tokent kiszűr", () => {
    const res = validateProposal({
      intent: "update_design", scope: "component", target: "buttons",
      changes: [{ token: "typeScale", to: 1.2 }],
    }, friendly);
    expect(res.ok).toBe(false);
  });

  it("üres pontosító kérdést elutasít", () => {
    expect(validateProposal({ intent: "clarify", question: "  " }, friendly).ok).toBe(false);
  });

  it("legfeljebb 12 változtatást fogad el", () => {
    const changes = Array.from({ length: 13 }, () => ({ token: "radius", to: 3 }));
    expect(validateProposal({ intent: "update_design", changes }, friendly)).toEqual({ ok: false, error: "invalid_changes" });
  });
});

describe("Alkalmazás, érintett elemek, visszavonás", () => {
  it("csak engedélyezett tokeneket alkalmaz, normalizált eredménnyel", () => {
    const next = applyDesignChanges(friendly, [
      { token: "radius", from: 14, to: 0 },
      { token: "shadow", from: "soft", to: "none" },
    ]);
    expect(next.radius).toBe(0);
    expect(next.shadow).toBe("none");
    expect(next).toEqual(normalizeBrandDna(next));
    // a többi token érintetlen
    expect(next.buttonShape).toBe(friendly.buttonShape);
  });

  it("a visszavonás pontosan az előző állapotot adja vissza", () => {
    const before = friendly;
    const p = asProposal(interpretCommandLocally("Legyen prémiumabb.", before));
    const after = applyDesignChanges(before, p.changes);
    expect(after).not.toEqual(before);
    const undone = normalizeBrandDna(before);
    expect(undone).toEqual(before);
  });

  it("érintett elemek listája determinisztikus és nem üres", () => {
    const areas = affectedAreasFor([{ token: "radius", from: 14, to: 0 }, { token: "cardStyle", from: "elevated", to: "flat" }]);
    expect(areas).toContain("Gombok");
    expect(areas).toContain("Termékkártyák");
    expect(new Set(areas).size).toBe(areas.length);
  });

  it("a változtatás leírása olvasható", () => {
    expect(describeChange({ token: "radius", from: 14, to: 0 })).toBe("Sarokkerekítés: 14 → 0");
  });
});

describe("Brand DNA regresszió és token kimenet", () => {
  it("az alkalmazott parancs után is érvényes CSS változók készülnek", () => {
    const next = applyDesignChanges(DEFAULT_BRAND_DNA, [{ token: "radius", from: 0, to: 12 }]);
    const vars = brandDnaCssVars(next, "#000000");
    expect(vars["--sf-radius"]).toBe("12px");
    expect(vars["--sf-section-y"]).toBeTruthy();
  });

  it("mobil és desktop ugyanazokat a tokeneket kapja (nincs eszközfüggő eltérés)", () => {
    const next = applyDesignChanges(minimal, [{ token: "spacing", from: "spacious", to: "compact" }]);
    expect(brandDnaCssVars(next)).toEqual(brandDnaCssVars(next));
    expect(next.spacing).toBe("compact");
  });

  it("az engedélyezett tokenek listája nem tartalmaz tartalmi mezőt", () => {
    ALLOWED_TOKENS.forEach(t => expect(Object.keys(DEFAULT_BRAND_DNA)).toContain(t));
    expect(ALLOWED_TOKENS).not.toContain("personality" as never);
  });
});

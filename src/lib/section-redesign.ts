// Szekciónkénti AI újratervezés — szigorú, whitelistelt mezőmodell.
// Az AI kizárólag az itt felsorolt szöveges mezőkre adhat javaslatot; minden más kimenet elutasításra kerül.
// Semmilyen ár, termék, URL vagy technikai mező nem módosítható innen.

export type RedesignSectionId =
  | "topbar"
  | "hero"
  | "section1"
  | "section2"
  | "featured"
  | "testimonials"
  | "about"
  | "newsletter";

export interface RedesignField {
  key: string;
  label: string;
  maxLength: number;
  /** Több soros szövegmező (pl. bemutatkozás) */
  long?: boolean;
}

export interface RedesignSectionDef {
  id: RedesignSectionId;
  label: string;
  /** Mit csinál a szekció — az AI ezt kapja kontextusként. */
  purpose: string;
  fields: RedesignField[];
}

export const REDESIGN_SECTIONS: RedesignSectionDef[] = [
  {
    id: "topbar",
    label: "Hirdetősáv",
    purpose: "Egysoros, figyelemfelkeltő sáv a bolt tetején (akció, ingyenes szállítás).",
    fields: [{ key: "topbar_text", label: "Sáv szövege", maxLength: 90 }],
  },
  {
    id: "hero",
    label: "Hero (nyitóképernyő)",
    purpose: "A bolt első benyomása: fő üzenet, alcím és cselekvésre hívó gomb.",
    fields: [
      { key: "hero_badge_text", label: "Badge", maxLength: 40 },
      { key: "hero_title", label: "Fő cím", maxLength: 60 },
      { key: "hero_subtitle", label: "Alcím", maxLength: 160 },
      { key: "hero_cta_text", label: "Gomb felirata", maxLength: 28 },
    ],
  },
  {
    id: "section1",
    label: "Szekció 1",
    purpose: "Képes tartalmi blokk: egy előny, történet vagy kategória kiemelése.",
    fields: [
      { key: "section1_title", label: "Cím", maxLength: 60 },
      { key: "section1_subtitle", label: "Szöveg", maxLength: 220, long: true },
      { key: "section1_cta_text", label: "Gomb felirata", maxLength: 28 },
    ],
  },
  {
    id: "section2",
    label: "Szekció 2",
    purpose: "Második képes tartalmi blokk, kiegészítő üzenettel.",
    fields: [
      { key: "section2_title", label: "Cím", maxLength: 60 },
      { key: "section2_subtitle", label: "Szöveg", maxLength: 220, long: true },
      { key: "section2_cta_text", label: "Gomb felirata", maxLength: 28 },
    ],
  },
  {
    id: "featured",
    label: "Kiemelt termékek",
    purpose: "A kiemelt termékblokk címsora.",
    fields: [{ key: "featured_products_title", label: "Blokk címe", maxLength: 60 }],
  },
  {
    id: "testimonials",
    label: "Vélemények",
    purpose: "Vásárlói visszajelzések blokkjának címsora.",
    fields: [{ key: "testimonials_title", label: "Blokk címe", maxLength: 60 }],
  },
  {
    id: "about",
    label: "Rólunk",
    purpose: "Rövid márkabemutatkozás, bizalomépítő szöveg.",
    fields: [{ key: "about_html", label: "Bemutatkozó szöveg", maxLength: 900, long: true }],
  },
  {
    id: "newsletter",
    label: "Hírlevél",
    purpose: "Feliratkozási blokk címe és rövid ösztönző szövege.",
    fields: [
      { key: "newsletter_title", label: "Cím", maxLength: 60 },
      { key: "newsletter_subtitle", label: "Szöveg", maxLength: 180, long: true },
    ],
  },
];

export const getRedesignSection = (id: string): RedesignSectionDef | null =>
  REDESIGN_SECTIONS.find((s) => s.id === id) ?? null;

export interface RedesignChange {
  key: string;
  label: string;
  from: string;
  to: string;
}

export interface RedesignProposal {
  section: RedesignSectionId;
  changes: RedesignChange[];
  rationale: string;
}

const PLACEHOLDER = /(lorem ipsum|ide j[öo]n|placeholder|tbd|xy kft)/i;

const clean = (v: unknown) =>
  String(v ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Az AI nyers kimenetét ellenőrzött javaslattá alakítja.
 * Eldobja az ismeretlen mezőket, a túl hosszú, üres, helyőrző és változatlan értékeket.
 */
export function validateRedesign(
  sectionId: string,
  raw: unknown,
  current: Record<string, unknown>,
): { proposal: RedesignProposal | null; rejected: string[] } {
  const def = getRedesignSection(sectionId);
  const rejected: string[] = [];
  if (!def) return { proposal: null, rejected: ["ismeretlen szekció"] };

  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(obj.changes) ? obj.changes : [];
  const changes: RedesignChange[] = [];

  for (const item of list) {
    const c = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const key = String(c.key ?? "");
    const field = def.fields.find((f) => f.key === key);
    if (!field) { rejected.push(`${key || "ismeretlen mező"}: nem módosítható`); continue; }
    if (changes.some((x) => x.key === key)) { rejected.push(`${key}: duplikált javaslat`); continue; }

    const to = clean(c.to);
    if (!to) { rejected.push(`${field.label}: üres érték`); continue; }
    if (to.length > field.maxLength) { rejected.push(`${field.label}: túl hosszú (${to.length}/${field.maxLength})`); continue; }
    if (PLACEHOLDER.test(to)) { rejected.push(`${field.label}: helyőrző szöveg`); continue; }

    const from = clean(current[key]);
    if (from === to) { rejected.push(`${field.label}: nincs változás`); continue; }

    changes.push({ key, label: field.label, from, to });
  }

  if (changes.length === 0) return { proposal: null, rejected };

  return {
    proposal: {
      section: def.id,
      changes,
      rationale: clean(obj.rationale).slice(0, 400),
    },
    rejected,
  };
}

/** A javaslatból a mentendő mezőket adja vissza (kulcs → új érték). */
export function redesignPatch(proposal: RedesignProposal): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of proposal.changes) out[c.key] = c.to;
  return out;
}

// AI Command Engine — természetes nyelvű parancs → STRUKTURÁLT design token változtatás.
// Az AI soha nem módosítja közvetlenül a webshopot: minden javaslat átmegy ezen a
// determinisztikus séma- és értékvalidáción, és csak jóváhagyás után kerül alkalmazásra.

import {
  type BrandDna,
  normalizeBrandDna,
  DEFAULT_BRAND_DNA,
} from "./brand-dna";

export type TokenKey = Exclude<keyof BrandDna, "personality">;
export type CommandScope = "global" | "section" | "component" | "page";

export interface DesignChange {
  token: TokenKey;
  from: string | number;
  to: string | number;
}

export interface DesignProposal {
  intent: "update_design";
  scope: CommandScope;
  target: string | null;
  changes: DesignChange[];
  affectedAreas: string[];
  explanation: string;
}

export interface ClarificationProposal {
  intent: "clarify";
  question: string;
}

export type ProposalResult =
  | { ok: true; proposal: DesignProposal }
  | { ok: true; clarify: ClarificationProposal }
  | { ok: false; error: string };

/** Csak ezek a tokenek módosíthatók AI parancsból. Új CSS-t az AI nem hozhat létre. */
export const ALLOWED_TOKENS: TokenKey[] = [
  "radius", "spacing", "shadow", "buttonShape", "buttonStyle",
  "cardStyle", "imageStyle", "borderWidth", "headingWeight", "headingTracking", "typeScale",
];

const SCOPES: CommandScope[] = ["global", "section", "component", "page"];

export const TOKEN_LABELS: Record<TokenKey, string> = {
  radius: "Sarokkerekítés",
  spacing: "Térköz",
  shadow: "Árnyék",
  buttonShape: "Gombforma",
  buttonStyle: "Gombstílus",
  cardStyle: "Kártyastílus",
  imageStyle: "Képstílus",
  borderWidth: "Keretvastagság",
  headingWeight: "Címsor vastagság",
  headingTracking: "Betűköz",
  typeScale: "Betűméret skála",
};

const AREA_MAP: Record<TokenKey, string[]> = {
  radius: ["Gombok", "Termékkártyák", "Űrlapmezők", "Képek"],
  spacing: ["Szekciók", "Termékrács"],
  shadow: ["Gombok", "Termékkártyák"],
  buttonShape: ["Gombok"],
  buttonStyle: ["Gombok", "CTA"],
  cardStyle: ["Termékkártyák", "Vélemények"],
  imageStyle: ["Képek", "Termékkártyák"],
  borderWidth: ["Termékkártyák", "Űrlapmezők", "Kereső"],
  headingWeight: ["Címsorok", "Hero"],
  headingTracking: ["Címsorok", "Hero"],
  typeScale: ["Tipográfia"],
};

/** Scope-célok: egy komponens/szekció parancs csak a rá tartozó tokeneket módosíthatja. */
export const TARGET_TOKENS: Record<string, TokenKey[]> = {
  buttons: ["buttonShape", "buttonStyle", "shadow", "radius"],
  cards: ["cardStyle", "radius", "shadow", "borderWidth", "imageStyle"],
  hero: ["headingWeight", "headingTracking", "typeScale", "spacing", "buttonStyle"],
  search: ["radius", "borderWidth"],
  forms: ["radius", "borderWidth"],
  typography: ["headingWeight", "headingTracking", "typeScale"],
  sections: ["spacing"],
  images: ["imageStyle", "radius"],
  checkout: ["radius", "borderWidth", "shadow", "spacing"],
};

export function affectedAreasFor(changes: DesignChange[]): string[] {
  const set = new Set<string>();
  for (const c of changes) (AREA_MAP[c.token] || []).forEach((a) => set.add(a));
  return Array.from(set);
}

function valueIsValid(token: TokenKey, value: unknown, base: BrandDna): boolean {
  if (value === null || value === undefined || typeof value === "object") return false;
  const candidate = normalizeBrandDna({ ...base, [token]: value });
  const numeric = typeof base[token] === "number";
  if (numeric) {
    const n = Number(value);
    if (!Number.isFinite(n)) return false;
    return candidate[token] === n; // a normalizálás nem szoríthatta vissza → érvényes tartomány
  }
  return String(candidate[token]) === String(value);
}

/**
 * AI (vagy helyi) nyers kimenetből érvényes, alkalmazható javaslatot készít.
 * Ismeretlen tokent, érvénytelen értéket és hatástalan változtatást elutasít.
 */
export function validateProposal(raw: unknown, current: BrandDna): ProposalResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "invalid_response" };
  const r = raw as Record<string, unknown>;

  if (r.intent === "clarify") {
    const q = String(r.question ?? "").trim().slice(0, 220);
    if (!q) return { ok: false, error: "invalid_response" };
    return { ok: true, clarify: { intent: "clarify", question: q } };
  }
  if (r.intent !== "update_design") return { ok: false, error: "unsupported_intent" };
  if (!Array.isArray(r.changes) || r.changes.length === 0 || r.changes.length > 12) {
    return { ok: false, error: "invalid_changes" };
  }

  const base = normalizeBrandDna(current);
  const scope: CommandScope = SCOPES.includes(r.scope as CommandScope) ? (r.scope as CommandScope) : "global";
  const target = typeof r.target === "string" && r.target.trim() ? r.target.trim().slice(0, 40) : null;
  const allowedByTarget = target && TARGET_TOKENS[target] ? TARGET_TOKENS[target] : null;

  const changes: DesignChange[] = [];
  const seen = new Set<string>();
  for (const item of r.changes as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    const token = String(c.token ?? "") as TokenKey;
    if (!ALLOWED_TOKENS.includes(token)) continue;
    if (allowedByTarget && !allowedByTarget.includes(token)) continue;
    if (seen.has(token)) continue;
    const to = typeof base[token] === "number" ? Number(c.to) : String(c.to ?? "");
    if (!valueIsValid(token, to, base)) continue;
    if (String(base[token]) === String(to)) continue; // nincs tényleges változás
    seen.add(token);
    changes.push({ token, from: base[token] as string | number, to });
  }

  if (changes.length === 0) return { ok: false, error: "no_effective_change" };

  const explanation = String(r.explanation ?? "").trim().slice(0, 400) || "Design tokenek finomhangolása.";
  return {
    ok: true,
    proposal: { intent: "update_design", scope, target, changes, affectedAreas: affectedAreasFor(changes), explanation },
  };
}

/** A jóváhagyott változtatások alkalmazása — mindig normalizált Brand DNA jön vissza. */
export function applyDesignChanges(current: BrandDna, changes: DesignChange[]): BrandDna {
  const next: Record<string, unknown> = { ...normalizeBrandDna(current) };
  for (const c of changes) {
    if (!ALLOWED_TOKENS.includes(c.token)) continue;
    next[c.token] = c.to;
  }
  return normalizeBrandDna(next);
}

export function describeChange(c: DesignChange): string {
  return `${TOKEN_LABELS[c.token]}: ${c.from} → ${c.to}`;
}

// ---------------------------------------------------------------------------
// Helyi (determinisztikus) értelmező — az AI tartaléka és a tesztek alapja.
// ---------------------------------------------------------------------------

type Rule = {
  match: RegExp;
  scope: CommandScope;
  target: string | null;
  explanation: string;
  tokens: Partial<Record<TokenKey, string | number>>;
};

const RULES: Rule[] = [
  {
    match: /(prémium|premium|elegáns|igényes|luxus)/i,
    scope: "global", target: null,
    explanation: "Prémiumabb megjelenés: visszafogott kerekítés, finomabb árnyék, több levegő.",
    tokens: { radius: 2, shadow: "soft", spacing: "spacious", cardStyle: "elevated", headingTracking: "wide" },
  },
  {
    match: /(kevésbé lekerekít|kevesebb kerekít|szögletes|éles sarok)/i,
    scope: "global", target: null,
    explanation: "Visszavettem a lekerekítést: szögletesebb gombok, kártyák és képek.",
    tokens: { radius: 0, buttonShape: "square", imageStyle: "square" },
  },
  {
    match: /(lekerekítettebb|kerekebb|lágyabb forma)/i,
    scope: "global", target: null,
    explanation: "Lágyabb formák: nagyobb sarokkerekítés a gombokon, kártyákon és képeken.",
    tokens: { radius: 14, imageStyle: "rounded" },
  },
  {
    match: /(modern|letisztult|apple)/i,
    scope: "global", target: null,
    explanation: "Modernebb, letisztultabb arány: több whitespace, finom árnyék, mértéktartó kerekítés.",
    tokens: { spacing: "spacious", shadow: "soft", radius: 4, headingTracking: "normal", borderWidth: 1 },
  },
  {
    match: /(több térköz|levegős|tágasabb|nagyobb térköz)/i,
    scope: "section", target: "sections",
    explanation: "Növeltem a szekciók közötti térközt.",
    tokens: { spacing: "spacious" },
  },
  {
    match: /(kompakt|sűrűbb|kevesebb térköz|szorosabb)/i,
    scope: "section", target: "sections",
    explanation: "Kompaktabb elrendezés: kisebb szekció-térközök.",
    tokens: { spacing: "compact" },
  },
  {
    match: /(gomb).*(hangsúly|erős|feltűnő)|(hangsúly|erős|feltűnő).*(gomb)/i,
    scope: "component", target: "buttons",
    explanation: "Hangsúlyosabb gombok: tömör kitöltés és erősebb kiemelés.",
    tokens: { buttonStyle: "solid", shadow: "elevated" },
  },
  {
    match: /(kártya|termékkártya)/i,
    scope: "component", target: "cards",
    explanation: "Elegánsabb termékkártyák: árnyékolt felület, finomabb keret.",
    tokens: { cardStyle: "elevated", borderWidth: 1, shadow: "soft" },
  },
  {
    match: /(komolyabb|visszafogott|szolidabb)/i,
    scope: "global", target: null,
    explanation: "Komolyabb, visszafogottabb hangvétel: szögletes formák, árnyék nélkül.",
    tokens: { radius: 0, shadow: "none", headingTracking: "wide", headingWeight: 700 },
  },
  {
    match: /(fiatalos|barátságos|játékos|vidám)/i,
    scope: "global", target: null,
    explanation: "Fiatalosabb karakter: pill gombok, lágy árnyékok, kerekített képek.",
    tokens: { radius: 14, buttonShape: "pill", shadow: "soft", imageStyle: "rounded" },
  },
  {
    match: /(hero).*(erős|hangsúly|nagyobb|ütős)|(erős|hangsúly|ütős).*(hero)/i,
    scope: "section", target: "hero",
    explanation: "Erősebb hero: vastagabb címsor, nagyobb tipográfia, több levegő.",
    tokens: { headingWeight: 900, typeScale: 1.1, spacing: "spacious" },
  },
  {
    match: /(checkout|pénztár)/i,
    scope: "page", target: "checkout",
    explanation: "Letisztultabb pénztár: finomabb keretek és visszafogott árnyék.",
    tokens: { borderWidth: 1, shadow: "soft", radius: 2 },
  },
];

const AMBIGUOUS = /(nagyobb|kisebb|jobb legyen|szebb|máshogy)/i;

/** Természetes nyelvű magyar parancs → javaslat, pontosítás vagy null (nem értelmezhető). */
export function interpretCommandLocally(command: string, current: BrandDna = DEFAULT_BRAND_DNA): unknown | null {
  const text = String(command || "").trim();
  if (!text) return null;
  const base = normalizeBrandDna(current);

  const tokens: Partial<Record<TokenKey, string | number>> = {};
  const explanations: string[] = [];
  let scope: CommandScope = "global";
  let target: string | null = null;

  for (const rule of RULES) {
    if (!rule.match.test(text)) continue;
    Object.assign(tokens, rule.tokens);
    explanations.push(rule.explanation);
    if (rule.scope !== "global") { scope = rule.scope; target = rule.target; }
  }

  const entries = Object.entries(tokens) as [TokenKey, string | number][];
  if (entries.length === 0) {
    if (AMBIGUOUS.test(text)) {
      return {
        intent: "clarify",
        question: "Pontosítanád? A méretre, a térközökre vagy a formák kerekítésére gondolsz?",
      };
    }
    return null;
  }

  return {
    intent: "update_design",
    scope,
    target,
    changes: entries.map(([token, to]) => ({ token, from: base[token], to })),
    explanation: explanations.join(" "),
  };
}

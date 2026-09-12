// Partner Webshop Studio — szekciómodell és determinisztikus minőségellenőrzés.
// Semmilyen adatot nem talál ki: kizárólag a storefront konfigurációból és a valós termékekből dolgozik.

export type SectionId =
  | "topbar"
  | "hero"
  | "categories"
  | "section1"
  | "section2"
  | "featured"
  | "products"
  | "testimonials"
  | "about"
  | "newsletter";

export interface SectionDef {
  id: SectionId;
  label: string;
  /** A storefront bool mezője, ami ki/be kapcsolja. null = mindig látszik. */
  toggleField: string | null;
  /** Melyik szerkesztő fülre ugorjon a "szerkesztés". */
  editorTab: string;
  /** Sorrendezhető-e (a fix keretelemek nem). */
  movable: boolean;
}

export const SECTION_DEFS: SectionDef[] = [
  { id: "topbar", label: "Hirdetősáv", toggleField: "topbar_enabled", editorTab: "topbar", movable: false },
  { id: "hero", label: "Hero", toggleField: null, editorTab: "hero", movable: false },
  { id: "categories", label: "Kategóriák", toggleField: null, editorTab: "basics", movable: true },
  { id: "section1", label: "Szekció 1", toggleField: "section1_enabled", editorTab: "sections", movable: true },
  { id: "section2", label: "Szekció 2", toggleField: "section2_enabled", editorTab: "sections", movable: true },
  { id: "featured", label: "Kiemelt termékek", toggleField: "featured_products_enabled", editorTab: "featured", movable: true },
  { id: "products", label: "Összes termék", toggleField: null, editorTab: "featured", movable: true },
  { id: "testimonials", label: "Vélemények", toggleField: "testimonials_enabled", editorTab: "testimonials", movable: true },
  { id: "about", label: "Rólunk", toggleField: null, editorTab: "basics", movable: true },
  { id: "newsletter", label: "Hírlevél", toggleField: "newsletter_enabled", editorTab: "newsletter", movable: true },
];

export const MOVABLE_SECTIONS: SectionId[] = SECTION_DEFS.filter((s) => s.movable).map((s) => s.id);

/** A mentett sorrendet érvényes, hiánytalan listává alakítja (ismeretlen elem kiesik, hiányzó a végére kerül). */
export function normalizeSectionOrder(raw: unknown): SectionId[] {
  const valid = new Set<string>(MOVABLE_SECTIONS);
  const out: SectionId[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const id = String(item) as SectionId;
      if (valid.has(id) && !out.includes(id)) out.push(id);
    }
  }
  for (const id of MOVABLE_SECTIONS) if (!out.includes(id)) out.push(id);
  return out;
}

export function moveSection(order: SectionId[], id: SectionId, direction: -1 | 1): SectionId[] {
  const list = [...order];
  const i = list.indexOf(id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return list;
  [list[i], list[j]] = [list[j], list[i]];
  return list;
}

// ---------------- Minőségellenőrzés ----------------

export type QaSeverity = "error" | "warn";
export type QaArea = "design" | "mobile" | "seo" | "content" | "commerce" | "accessibility";

export interface QaIssue {
  area: QaArea;
  severity: QaSeverity;
  message: string;
  fix: string;
  editorTab: string;
}

export interface QaReport {
  total: number;
  areas: Record<QaArea, number>;
  issues: QaIssue[];
  publishable: boolean;
  checkedAt: string;
}

export const QA_AREA_LABELS: Record<QaArea, string> = {
  design: "Design",
  mobile: "Mobil",
  seo: "SEO",
  content: "Tartalom",
  commerce: "Kereskedelem",
  accessibility: "Akadálymentesség",
};

const PLACEHOLDER = /(lorem ipsum|ide j[öo]n|placeholder|xy kft|t[oö]ltsd ki|tbd)/i;

const hexToRgb = (hex: string): [number, number, number] | null => {
  const h = String(hex || "").replace("#", "").trim();
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};

const luminance = (rgb: [number, number, number]) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrastRatio(a: string, b: string): number | null {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return null;
  const l1 = luminance(ra);
  const l2 = luminance(rb);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export interface QaProduct {
  id: string;
  title?: string | null;
  price_huf?: number | null;
  status?: string | null;
  image_url?: string | null;
  images?: unknown;
}

export interface QaInput {
  storefront: Record<string, unknown> | null;
  products: QaProduct[];
  shippingMethodCount: number;
}

/** Determinisztikus pontozás — ugyanaz a bemenet mindig ugyanazt az eredményt adja. */
export function runShopQa({ storefront, products, shippingMethodCount }: QaInput): QaReport {
  const sf = storefront || {};
  const str = (k: string) => String((sf as Record<string, unknown>)[k] ?? "").trim();
  const issues: QaIssue[] = [];
  const add = (area: QaArea, severity: QaSeverity, message: string, fix: string, editorTab: string) =>
    issues.push({ area, severity, message, fix, editorTab });

  // --- Design ---
  const bg = str("bg_color");
  const text = str("text_color");
  const accent = str("accent_color");
  const textContrast = contrastRatio(bg, text);
  if (textContrast !== null && textContrast < 4.5) {
    add("accessibility", "error", `A szövegszín kontrasztja a háttéren csak ${textContrast.toFixed(1)}:1.`, "Válassz világosabb vagy sötétebb szövegszínt (WCAG AA: 4.5:1).", "design");
  }
  const accentContrast = contrastRatio(bg, accent);
  if (accentContrast !== null && accentContrast < 3) {
    add("design", "warn", "A kiemelő szín alig válik el a háttértől.", "Válassz erősebb kiemelő színt a gombokhoz.", "design");
  }
  if (!str("logo_url")) add("design", "warn", "Nincs feltöltött logó.", "Tölts fel logót a Megjelenés fülön.", "design");
  if (!str("hero_image_url")) add("design", "warn", "A hero szekciónak nincs háttérképe.", "Tölts fel hero képet, vagy generáltass egyet.", "hero");

  // --- Tartalom ---
  if (!str("display_name")) add("content", "error", "Hiányzik a márkanév.", "Add meg a bolt nevét az Alap fülön.", "basics");
  if (!str("hero_title")) add("content", "error", "Üres a hero cím.", "Írj rövid, ütős hero címet.", "hero");
  if (!str("hero_cta_text")) add("content", "warn", "A hero CTA gomb felirata üres.", "Adj meg cselekvő gombfeliratot.", "hero");
  if (!str("about_html")) add("content", "warn", "Nincs bemutatkozó szöveg.", "Írj rövid márkabemutatkozást.", "basics");
  const textFields = ["hero_title", "hero_subtitle", "tagline", "about_html", "section1_title", "section2_title", "footer_text", "topbar_text"];
  if (textFields.some((f) => PLACEHOLDER.test(str(f)))) {
    add("content", "error", "Helyőrző szöveg maradt a boltban.", "Cseréld valódi tartalomra a helyőrzőket.", "basics");
  }

  // --- SEO ---
  const metaTitle = str("meta_title");
  const metaDesc = str("meta_description");
  if (!metaTitle) add("seo", "error", "Hiányzik az SEO oldalcím.", "Adj meg 60 karakternél rövidebb címet.", "seo");
  else if (metaTitle.length > 60) add("seo", "warn", `Az SEO cím túl hosszú (${metaTitle.length} karakter).`, "Rövidítsd 60 karakter alá.", "seo");
  if (!metaDesc) add("seo", "error", "Hiányzik az SEO leírás.", "Adj meg 155 karakternél rövidebb leírást.", "seo");
  else if (metaDesc.length > 155) add("seo", "warn", `Az SEO leírás túl hosszú (${metaDesc.length} karakter).`, "Rövidítsd 155 karakter alá.", "seo");
  if (!str("slug")) add("seo", "error", "Nincs URL slug.", "Adj meg egyedi URL slugot.", "basics");

  // --- Kereskedelem ---
  const active = products.filter((p) => (p.status ?? "active") === "active");
  if (active.length === 0) {
    add("commerce", "error", "Nincs aktív termék a boltban.", "Vegyél fel legalább egy terméket a Termékek fülön.", "featured");
  } else {
    const noPrice = active.filter((p) => !Number(p.price_huf));
    if (noPrice.length) add("commerce", "error", `${noPrice.length} terméknek nincs ára.`, "Állíts be árat minden aktív terméknél.", "featured");
    const noImage = active.filter((p) => !p.image_url && !(Array.isArray(p.images) && p.images.length));
    if (noImage.length) add("commerce", "warn", `${noImage.length} terméknek nincs képe.`, "Tölts fel termékképeket.", "featured");
  }
  if (shippingMethodCount === 0) {
    add("commerce", "error", "Nincs szállítási mód beállítva.", "Hozz létre legalább egy szállítási módot, különben nem lehet rendelni.", "domain");
  }

  // --- Mobil ---
  if (str("hero_title").length > 60) add("mobile", "warn", "A hero cím mobilon túl hosszú.", "Rövidítsd 60 karakter alá.", "hero");
  if (str("topbar_text").length > 90) add("mobile", "warn", "A hirdetősáv szövege mobilon csonkolódhat.", "Rövidítsd a topbar szöveget.", "topbar");
  const overlay = Number((sf as Record<string, unknown>).hero_overlay_opacity ?? 0.5);
  if (str("hero_image_url") && overlay < 0.25) {
    add("mobile", "warn", "A hero kép fölött túl gyenge az átfedés, a szöveg nehezen olvasható.", "Növeld az overlay erősségét 0.35 fölé.", "hero");
  }

  // --- Akadálymentesség ---
  if (!str("tagline") && !str("hero_subtitle")) {
    add("accessibility", "warn", "Nincs leíró alcím a nyitóképernyőn.", "Adj hozzá egy mondatos alcímet.", "hero");
  }

  const areas: Record<QaArea, number> = {
    design: 100, mobile: 100, seo: 100, content: 100, commerce: 100, accessibility: 100,
  };
  for (const i of issues) {
    areas[i.area] = Math.max(0, areas[i.area] - (i.severity === "error" ? 30 : 10));
  }
  const keys = Object.keys(areas) as QaArea[];
  const total = Math.round(keys.reduce((sum, k) => sum + areas[k], 0) / keys.length);

  return {
    total,
    areas,
    issues,
    publishable: !issues.some((i) => i.severity === "error"),
    checkedAt: new Date().toISOString(),
  };
}

export type StudioState = "draft" | "ready" | "published" | "failed";

export function studioStateOf(sf: Record<string, unknown> | null, report: QaReport | null): StudioState {
  if (!sf) return "draft";
  if (sf.is_published) return report && !report.publishable ? "failed" : "published";
  if (report?.publishable) return "ready";
  return "draft";
}

export const STUDIO_STATE_LABELS: Record<StudioState, string> = {
  draft: "Vázlat",
  ready: "Publikálásra kész",
  published: "Élő",
  failed: "Publikálási probléma",
};

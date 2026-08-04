// AI Web Creator Agent — beszélgetős, több-ügynökös webshop/weboldal építő partnereknek
// MINŐSÉGBIZTOSÍTÁSI LÁNC: iparágspecifikus promptok → érdemes QA validáció → minőségi pontszám + jóváhagyás
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { publish } from "../_shared/agent-bus.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const AGENTS: Record<string, string> = {
  architect: "🧠 Architect — oldalstruktúra, szekciók, felépítés",
  designer: "🎨 Designer — színek, tipográfia, UI hangulat, sötét/világos mód",
  frontend: "💻 Frontend — hero, szekciók, elrendezés, mobilbarát beállítások",
  backend: "⚙️ Backend — adat- és jogosultsági beállítások",
  commerce: "🛒 Commerce — kiemelt termékek, kosár, akciók",
  seo: "🤖 SEO — meta cím, leírás, kulcsszavak",
  content: "📝 Content — szövegek, GYIK, vélemények, about",
  media: "🖼️ Media — képek, bannerek, videó beállítások",
  qa: "🧪 QA — ellenőrzés, hiányzó mezők, konzisztencia",
  deploy: "🚀 Deploy — publikálási javaslat",
};

// Csak ezek a storefront mezők írhatók az AI által
const ALLOWED = [
  "display_name", "tagline", "about_html",
  "primary_color", "accent_color", "bg_color", "text_color",
  "font_heading", "font_body", "theme_preset",
  "hero_title", "hero_subtitle", "hero_cta_text", "hero_layout",
  "hero_badge_enabled", "hero_badge_text", "hero_overlay_opacity",
  "topbar_enabled", "topbar_text",
  "section1_enabled", "section1_title", "section1_text",
  "section2_enabled", "section2_title", "section2_text",
  "featured_products_enabled", "featured_products_title",
  "testimonials_enabled", "testimonials_title", "testimonials",
  "newsletter_enabled", "newsletter_title", "newsletter_subtitle",
  "footer_text", "footer_links",
  "meta_title", "meta_description",
];

// ─────────────────────────────────────────────────────────────
// RÉTEG 1: Iparágspecifikus projektsablonok
// Minden projekttípus saját kötelező szekciókkal, Architect/Builder
// útmutatóval és alapértelmezett kezdőértékekkel rendelkezik, hogy a
// generált kimenet iparághű és konzisztens legyen — ne egy generikus
// prompt mindenhova.
// ─────────────────────────────────────────────────────────────

interface ProjectTemplate {
  label: string;
  description: string;
  /** Kötelező storefront mezők (a QA ellenőrzi, hogy a végeredényben vannak-e) */
  required: string[];
  /** Architect útmutató: milyen szekciók/struktúra kell ehhez az iparághoz */
  architectHint: string;
  /** Builder útmutató: iparágra szabott szerkezet, hangnem, kötelező tartalom */
  builderHint: string;
  /** Kezdőértékek új projekt esetén (magas minőségű alap) */
  seed: Record<string, unknown>;
}

const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  webshop: {
    label: "Webshop / online bolt",
    description: "Termékek, kosár, fizetés, szállítás",
    required: ["display_name", "hero_title", "hero_subtitle", "hero_cta_text", "featured_products_enabled", "meta_title", "meta_description"],
    architectHint: "Webshopnál a fókusz: vonzó hero, kiemelt termékek szekció, social proof (értékelések), hírlevél, bizalmat építő lábléc. A kosár és fizetés már beépített.",
    builderHint: "Webshop hangnem: meggyőző, vásárlásra ösztönző, de nem tolakodó. A featured_products szekció KÖTELEZŐ. Hero CTA legyen cselekvésre ösztönző ('Tedd a kosárba', 'Vásárlás indítása'). SEO: márka + fő termékkategória + 'webshop'/'online bolt' kulcsszó.",
    seed: { featured_products_enabled: true, featured_products_title: "Kiemelt termékeink", section1_enabled: true, section1_title: "Miért minket?" },
  },
  corporate: {
    label: "Vállalati weboldal",
    description: "Bemutatkozás, szolgáltatások, referenciák, kapcsolat",
    required: ["display_name", "tagline", "hero_title", "hero_subtitle", "section1_enabled", "section1_title", "footer_text", "meta_title", "meta_description"],
    architectHint: "Vállalati oldalnál: hero bemutatkozás, szolgáltatások szekció (section1), rólunk/referenciák (section2), kapcsolat a láblécben. Nincs 'kosár'.",
    builderHint: "Vállalati hangnem: professzionális, megbízható, hiteles. Két tartalmi szekció KÖTELEZŐ: section1 = szolgáltatások, section2 = rólunk/referenciák. Hero CTA: 'Kapcsolatfelvétel' vagy 'Ajánlatkérés'. SEO: cég neve + szolgáltatás + település.",
    seed: { section1_enabled: true, section1_title: "Szolgáltatásaink", section2_enabled: true, section2_title: "Rólunk" },
  },
  restaurant: {
    label: "Éttermi rendelő rendszer",
    description: "Étlap, rendelés, kiszállítás, nyitvatartás",
    required: ["display_name", "hero_title", "hero_subtitle", "section1_enabled", "section1_title", "section2_enabled", "section2_title", "meta_title", "meta_description"],
    architectHint: "Étteremnél: étlap/kiemelt ételek (section1), nyitvatartás + kiszállítás info (section2), vonzó hero ételképpel. CTA: 'Rendelés' vagy 'Asztalfoglalás'.",
    builderHint: "Éttermi hangnem: étvágygerjesztő, hangulatos, konyhai stílus. section1 = étlap/kiemelt ételek, section2 = nyitvatartás és kiszállítás. Hero CTA: 'Online rendelés' vagy 'Asztalfoglalás'. SEO: étterem neve + konyha + város + 'online rendelés'.",
    seed: { section1_enabled: true, section1_title: "Étlapunk", section2_enabled: true, section2_title: "Nyitvatartás & Kiszállítás", hero_cta_text: "Online rendelés" },
  },
  booking: {
    label: "Időpontfoglaló",
    description: "Szolgáltatások, naptár, foglalás, emlékeztetők",
    required: ["display_name", "hero_title", "hero_subtitle", "section1_enabled", "section1_title", "meta_title", "meta_description"],
    architectHint: "Foglaló rendszernél: szolgáltatások listája (section1), működési idő/gyakori kérdések (section2), hero foglalás CTA-val. A naptár és foglalás már beépített.",
    builderHint: "Foglaló hangnem: segítőkész, világos, időpont-orientált. section1 = szolgáltatások árazással, section2 = információk. Hero CTA: 'Időpont foglalása'. SEO: szolgáltatás + 'időpontfoglaló' + település.",
    seed: { section1_enabled: true, section1_title: "Szolgáltatások", section2_enabled: true, section2_title: "Hasznos információk", hero_cta_text: "Időpont foglalása" },
  },
  crm: {
    label: "CRM",
    description: "Ügyfelek, leadek, pipeline, feladatok",
    required: ["display_name", "hero_title", "hero_subtitle", "section1_enabled", "section1_title", "meta_title", "meta_description"],
    architectHint: "CRM-nél: funkciók/szolgáltatások (section1), előnyök/integrációk (section2), hero regisztrációs CTA-val.",
    builderHint: "CRM hangnem: hatékonyság-orientált, adatvezérelt, B2B. section1 = fő funkciók, section2 = integrációk/előnyök. Hero CTA: 'Ingyenes próba' vagy 'Regisztráció'. SEO: 'CRM szoftver' + szektor.",
    seed: { section1_enabled: true, section1_title: "Funkciók", section2_enabled: true, section2_title: "Integrációk", hero_cta_text: "Ingyenes próba indítása" },
  },
  erp: {
    label: "ERP",
    description: "Készlet, beszerzés, számlázás, riportok",
    required: ["display_name", "hero_title", "hero_subtitle", "section1_enabled", "section1_title", "meta_title", "meta_description"],
    architectHint: "ERP-nél: modulok (section1), előnyök (section2), hero demó CTA-val. Fókusz: készlet, számlázás, riportok.",
    builderHint: "ERP hangnem: stabil, megbízható, üzleti folyamat-orientált. section1 = modulok, section2 = előnyök/riportok. Hero CTA: 'Demó kérése'. SEO: 'ERP rendszer' + iparág.",
    seed: { section1_enabled: true, section1_title: "Modulok", section2_enabled: true, section2_title: "Miért éri meg?", hero_cta_text: "Demó kérése" },
  },
  portal: {
    label: "Partnerportál",
    description: "Belépés, dokumentumok, jutalékok, statisztika",
    required: ["display_name", "hero_title", "hero_subtitle", "section1_enabled", "section1_title", "footer_text", "meta_title", "meta_description"],
    architectHint: "Partnerportálnál: belépés/előnyök (hero), funkciók (section1), információk (section2), bizalmat építő lábléc.",
    builderHint: "Portál hangnem: partnerség-orientált, transzparens. section1 = fő funkciók. Hero CTA: 'Belépés' vagy 'Jelentkezés partnernek'. SEO: 'partnerprogram' + szektor.",
    seed: { section1_enabled: true, section1_title: "A portál funkciói", section2_enabled: true, section2_title: "Hogyan működik?", hero_cta_text: "Belépés" },
  },
  saas: {
    label: "SaaS termékoldal",
    description: "Árazás, funkciók, próbaverzió, onboarding",
    required: ["display_name", "tagline", "hero_title", "hero_subtitle", "section1_enabled", "section1_title", "section2_enabled", "section2_title", "meta_title", "meta_description"],
    architectHint: "SaaS-nál: hero értékajánlat + CTA, funkciók (section1), árazás (section2), social proof. Két tartalmi szekció KÖTELEZŐ.",
    builderHint: "SaaS hangnem: innovatív, világos, konkrét előnyök. section1 = funkciók, section2 = árazás/előnyök. Hero CTA: 'Ingyenes próba' vagy 'Kezdés'. SEO: terméknév + 'szoftver' + fő előny.",
    seed: { section1_enabled: true, section1_title: "Funkciók", section2_enabled: true, section2_title: "Árazás", hero_cta_text: "Ingyenes próba" },
  },
  mobile_backend: {
    label: "Mobilalkalmazás háttér",
    description: "API, adatmodell, jogosultságok",
    required: ["display_name", "hero_title", "hero_subtitle", "section1_enabled", "section1_title", "meta_title", "meta_description"],
    architectHint: "Mobil backend-nél: API képességek (section1), technológia/biztonság (section2), hero fejlesztői CTA-val.",
    builderHint: "Backend hangnem: technikai, de érthető, fejlesztőbarát. section1 = API végpontok/képességek, section2 = biztonság/technológia. Hero CTA: 'Dokumentáció' vagy 'API kulcs kérése'. SEO: 'API' + szektor.",
    seed: { section1_enabled: true, section1_title: "API képességek", section2_enabled: true, section2_title: "Biztonság & Technológia", hero_cta_text: "Dokumentáció megnyitása" },
  },
};

// Támogatott projekt-típusok (a lista a sablonból jön)
const PROJECT_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(PROJECT_TEMPLATES).map(([k, v]) => [k, `${v.label} (${v.description})`]),
);

// ─────────────────────────────────────────────────────────────
// RÉTEG 2: Érdemes QA validáció (színkontraszt, kötelező mezők,
// SEO teljesség, placeholder detektálás, iparági szekciók)
// ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  if (!hex || typeof hex !== "string") return null;
  const h = hex.replace("#", "").trim();
  if (h.length !== 3 && h.length !== 6) return null;
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(fg: string, bg: string): number | null {
  const a = hexToRgb(fg), b = hexToRgb(bg);
  if (!a || !b) return null;
  const la = relLuminance(a), lb = relLuminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const PLACEHOLDER_PATTERNS = /\b(lorem|ipsum|placeholder|példa|pelda|teszt|demo|saját szöveg|sajat szoveg|ide írd|ide ird|xxx)\b/i;

type QaSquad = "design" | "performance" | "security" | "accessibility" | "seo" | "content";

const SQUAD_META: Record<QaSquad, { label: string; icon: string }> = {
  design: { label: "Design QA", icon: "🎨" },
  performance: { label: "Performance QA", icon: "⚡" },
  security: { label: "Security QA", icon: "🔒" },
  accessibility: { label: "Accessibility QA", icon: "♿" },
  seo: { label: "SEO QA", icon: "📈" },
  content: { label: "Content QA", icon: "📝" },
};

// Iparági benchmark (átlagos jó minőségű oldalak pontszámai) — összevetéshez
const BENCHMARKS: Record<QaSquad, number> = {
  design: 90, performance: 92, security: 95, accessibility: 88, seo: 91, content: 89,
};

interface QaCheck {
  name: string;
  squad: QaSquad;
  weight: number;
  severity: "critical" | "high" | "low";
  ok: boolean;
  note: string;
}

interface DeviceResult {
  device: string;
  width: number;
  score: number;
  ok: boolean;
  issues: string[];
}

interface QaResult {
  score: number;
  tier: { key: string; label: string; icon: string; min: number };
  passed: boolean;
  checks: QaCheck[];
  blockers: string[];
  squads: { squad: QaSquad; label: string; icon: string; score: number; benchmark: number; delta: number; failed: number }[];
  devices: DeviceResult[];
  device_score: number;
}

function qualityTier(score: number) {
  if (score >= 95) return { key: "platinum", label: "Platinum AI Quality", icon: "💎", min: 95 };
  if (score >= 85) return { key: "premium", label: "Prémium", icon: "🟩", min: 85 };
  if (score >= 70) return { key: "good", label: "Jó", icon: "🟨", min: 70 };
  return { key: "fix", label: "Javítás szükséges", icon: "🟥", min: 0 };
}

// ── Valódi eszközteszt-szimuláció: a tartalom hosszát/szekciókat a
// tényleges viewport-szélességekre vetítjük (hány sorba tördelődik,
// elfér-e a hero CTA, nem törik-e a navigáció).
function runDeviceTests(cfg: Record<string, unknown>): DeviceResult[] {
  const devices = [
    { device: "iPhone", width: 390, charsPerLine: 26, maxHeroLines: 3, maxSubLines: 4 },
    { device: "Android", width: 412, charsPerLine: 28, maxHeroLines: 3, maxSubLines: 4 },
    { device: "Tablet", width: 768, charsPerLine: 48, maxHeroLines: 3, maxSubLines: 4 },
    { device: "Desktop", width: 1440, charsPerLine: 80, maxHeroLines: 2, maxSubLines: 3 },
  ];
  const s = (k: string) => String(cfg[k] ?? "").trim();
  return devices.map((d) => {
    const issues: string[] = [];
    const heroLines = Math.ceil(s("hero_title").length / d.charsPerLine);
    if (s("hero_title") && heroLines > d.maxHeroLines) issues.push(`Hero cím ${heroLines} sorba törik (${d.width}px)`);
    const subLines = Math.ceil(s("hero_subtitle").length / d.charsPerLine);
    if (s("hero_subtitle") && subLines > d.maxSubLines) issues.push(`Hero alcím túl hosszú (${subLines} sor)`);
    const cta = s("hero_cta_text");
    if (cta.length > (d.width < 500 ? 22 : 40)) issues.push("CTA gomb szövege kilóg a gombból");
    if (d.width < 500) {
      if (s("display_name").length > 24) issues.push("Márkanév túl hosszú a mobil navigációhoz");
      if (s("tagline").length > 70) issues.push("Szlogen mobilon levágódhat");
    }
    const secTitles = ["section1_title", "section2_title", "featured_products_title", "testimonials_title", "newsletter_title"];
    const longSec = secTitles.filter((k) => s(k).length > d.charsPerLine * 1.6);
    if (longSec.length) issues.push(`${longSec.length} szekciócím túl hosszú`);
    const score = Math.max(0, 100 - issues.length * 15);
    return { device: d.device, width: d.width, score, ok: issues.length === 0, issues };
  });
}

function runQualityAssurance(
  cfg: Record<string, unknown>,
  projectType: string,
): QaResult {
  const tmpl = PROJECT_TEMPLATES[projectType];
  const checks: QaCheck[] = [];
  const s = (k: string) => String(cfg[k] ?? "").trim();

  // ── 🎨 DESIGN QA ────────────────────────────────────────────
  const hasName = s("display_name").length >= 2;
  const hasTagline = s("tagline").length >= 3;
  checks.push({
    name: "Márkaidentitás (név + szlogen)", squad: "design",
    weight: 12, severity: "critical",
    ok: hasName && hasTagline,
    note: hasName && hasTagline ? "rendben" : hasName ? "hiányzik a szlogen" : "hiányzik a márkanév",
  });

  const heroComplete = !!s("hero_title") && !!s("hero_subtitle") && !!s("hero_cta_text");
  checks.push({
    name: "Hero szekció (cím + alcím + gomb)", squad: "design",
    weight: 12, severity: "critical",
    ok: heroComplete,
    note: heroComplete ? "teljes" : "hiányzik valamelyik hero mező",
  });

  const palette = ["primary_color", "accent_color", "bg_color", "text_color"].filter((k) => /^#[0-9a-fA-F]{3,6}$/.test(s(k)));
  const paletteOk = palette.length >= 3;
  checks.push({
    name: "Színpaletta konzisztencia (HEX, min. 3 szín)", squad: "design",
    weight: 6, severity: "low",
    ok: paletteOk,
    note: `${palette.length} érvényes HEX szín`,
  });

  const sectionCount = ["section1_enabled", "section2_enabled", "featured_products_enabled", "testimonials_enabled", "newsletter_enabled"]
    .filter((k) => cfg[k] === true).length;
  checks.push({
    name: "Oldalstruktúra (min. 2 aktív szekció)", squad: "design",
    weight: 6, severity: "low",
    ok: sectionCount >= 2,
    note: `${sectionCount} aktív szekció`,
  });

  // ── ♿ ACCESSIBILITY QA ─────────────────────────────────────
  const ratio = contrastRatio(s("text_color"), s("bg_color"));
  const contrastOk = ratio !== null && ratio >= 4.5;
  checks.push({
    name: "Szövegkontraszt (WCAG AA ≥ 4.5:1)", squad: "accessibility",
    weight: 10, severity: "high",
    ok: contrastOk,
    note: ratio === null ? "hiányzik a szín (HEX kell)" : `kontraszt: ${ratio.toFixed(2)}${contrastOk ? " ✓" : " ✗"}`,
  });

  const ctaRatio = contrastRatio(s("bg_color"), s("primary_color"));
  const ctaOk = ctaRatio === null ? false : ctaRatio >= 3;
  checks.push({
    name: "CTA gomb kontraszt (≥ 3:1)", squad: "accessibility",
    weight: 5, severity: "low",
    ok: ctaOk,
    note: ctaRatio === null ? "hiányzó szín" : `kontraszt: ${ctaRatio.toFixed(2)}`,
  });

  const ctaText = s("hero_cta_text");
  const ctaMeaningful = ctaText.length >= 3 && !/^(ide|kattints|klikk|itt)$/i.test(ctaText);
  checks.push({
    name: "Érthető gombfelirat (screen reader)", squad: "accessibility",
    weight: 4, severity: "low",
    ok: ctaMeaningful,
    note: ctaMeaningful ? "rendben" : "túl általános vagy hiányzó CTA szöveg",
  });

  // ── 📈 SEO QA ───────────────────────────────────────────────
  const mt = s("meta_title");
  checks.push({
    name: "SEO meta cím (10–60 karakter)", squad: "seo",
    weight: 8, severity: "high", ok: mt.length >= 10 && mt.length <= 60,
    note: `${mt.length} karakter`,
  });
  const md = s("meta_description");
  checks.push({
    name: "SEO meta leírás (50–160 karakter)", squad: "seo",
    weight: 8, severity: "high", ok: md.length >= 50 && md.length <= 160,
    note: `${md.length} karakter`,
  });
  const brandInTitle = !!mt && !!s("display_name") && mt.toLowerCase().includes(s("display_name").toLowerCase().slice(0, 6));
  checks.push({
    name: "Márkanév a meta címben", squad: "seo",
    weight: 4, severity: "low", ok: brandInTitle,
    note: brandInTitle ? "rendben" : "a meta cím nem tartalmazza a márkanevet",
  });
  const h1Unique = !!s("hero_title") && s("hero_title") !== mt;
  checks.push({
    name: "Egyedi H1 (hero cím ≠ meta cím)", squad: "seo",
    weight: 4, severity: "low", ok: h1Unique,
    note: h1Unique ? "rendben" : "a hero cím megegyezik a meta címmel",
  });

  // ── 📝 CONTENT QA ───────────────────────────────────────────
  const required = tmpl?.required || ["display_name", "hero_title", "meta_title", "meta_description"];
  const missingReq = required.filter((k) => {
    const v = cfg[k];
    if (typeof v === "boolean") return v === false;
    return v === undefined || v === null || v === "";
  });
  checks.push({
    name: `Iparági kötelező mezők (${projectType || "auto"})`, squad: "content",
    weight: 14, severity: "critical",
    ok: missingReq.length === 0,
    note: missingReq.length ? `hiányzik: ${missingReq.slice(0, 5).join(", ")}` : "minden megvan",
  });

  const textFields = ["display_name", "tagline", "hero_title", "hero_subtitle", "section1_title", "section1_text", "section2_title", "section2_text", "footer_text", "meta_description"];
  const foundPlaceholder = textFields.find((f) => PLACEHOLDER_PATTERNS.test(s(f)));
  checks.push({
    name: "Nincs placeholder/teszt szöveg", squad: "content",
    weight: 8, severity: "high",
    ok: !foundPlaceholder,
    note: foundPlaceholder ? `placeholder a '${foundPlaceholder}' mezőben` : "tiszta",
  });

  const hasFooter = s("footer_text").length >= 5;
  checks.push({
    name: "Lábléc jelen", squad: "content",
    weight: 3, severity: "low", ok: hasFooter, note: hasFooter ? "rendben" : "hiányzik",
  });

  // ── ⚡ PERFORMANCE QA ───────────────────────────────────────
  const heavyText = textFields.filter((f) => s(f).length > 600);
  checks.push({
    name: "Tartalom mérete (nincs túl hosszú blokk)", squad: "performance",
    weight: 5, severity: "low",
    ok: heavyText.length === 0,
    note: heavyText.length ? `${heavyText.length} túl hosszú szövegmező` : "optimális",
  });
  const imgFields = ["hero_image_url", "logo_url", "banner_url", "og_image_url"].filter((k) => s(k));
  const badImg = imgFields.filter((k) => /\.(bmp|tiff)$/i.test(s(k)));
  const optimizedImg = imgFields.filter((k) => /(webp|avif|supabase\.co\/storage)/i.test(s(k)));
  checks.push({
    name: "Képek optimalizálva (WebP/AVIF/CDN)", squad: "performance",
    weight: 5, severity: "low",
    ok: imgFields.length === 0 || (badImg.length === 0 && optimizedImg.length > 0),
    note: imgFields.length === 0 ? "nincs kép megadva" : `${optimizedImg.length}/${imgFields.length} optimalizált`,
  });

  // ── 🔒 SECURITY QA ──────────────────────────────────────────
  const urlFields = ALLOWED.filter((k) => /_url$/.test(k)).map((k) => s(k)).filter(Boolean);
  const insecure = urlFields.filter((u) => /^http:\/\//i.test(u));
  checks.push({
    name: "Minden URL HTTPS", squad: "security",
    weight: 6, severity: "high",
    ok: insecure.length === 0,
    note: insecure.length ? `${insecure.length} nem biztonságos (http://) hivatkozás` : "rendben",
  });
  const allText = textFields.map((f) => s(f)).join(" ") + " " + JSON.stringify(cfg.footer_links ?? "");
  const injection = /<script|javascript:|onerror=|onload=/i.test(allText);
  checks.push({
    name: "Nincs beágyazott script / XSS minta", squad: "security",
    weight: 6, severity: "critical",
    ok: !injection,
    note: injection ? "gyanús kód a szövegmezőkben" : "tiszta",
  });
  const secretLeak = /(sk_live|sk_test|api[_-]?key\s*[:=]|Bearer\s+[A-Za-z0-9._-]{20,})/i.test(allText);
  checks.push({
    name: "Nincs kiszivárgott kulcs/titok a tartalomban", squad: "security",
    weight: 6, severity: "critical",
    ok: !secretLeak,
    note: secretLeak ? "lehetséges API kulcs a szövegben" : "tiszta",
  });

  // ── 📱 Eszköztesztek ────────────────────────────────────────
  const devices = runDeviceTests(cfg);
  const deviceScore = Math.round(devices.reduce((a, d) => a + d.score, 0) / devices.length);
  checks.push({
    name: "Reszponzív megjelenés (iPhone/Android/Tablet/Desktop)", squad: "design",
    weight: 8, severity: "high",
    ok: deviceScore >= 85,
    note: devices.filter((d) => !d.ok).length
      ? `${devices.filter((d) => !d.ok).map((d) => d.device).join(", ")} — ${deviceScore}/100`
      : `minden eszközön rendben (${deviceScore}/100)`,
  });

  // ── Pontozás ────────────────────────────────────────────────
  const totalWeight = checks.reduce((s2, c) => s2 + c.weight, 0);
  const earned = checks.reduce((s2, c) => s2 + (c.ok ? c.weight : 0), 0);
  const score = Math.round((earned / totalWeight) * 100);
  const blockers = checks.filter((c) => c.severity === "critical" && !c.ok).map((c) => c.name);
  const passed = score >= 70 && blockers.length === 0;

  const squads = (Object.keys(SQUAD_META) as QaSquad[]).map((sq) => {
    const list = checks.filter((c) => c.squad === sq);
    const w = list.reduce((a, c) => a + c.weight, 0) || 1;
    const e = list.reduce((a, c) => a + (c.ok ? c.weight : 0), 0);
    const sc = Math.round((e / w) * 100);
    return {
      squad: sq, label: SQUAD_META[sq].label, icon: SQUAD_META[sq].icon,
      score: sc, benchmark: BENCHMARKS[sq], delta: sc - BENCHMARKS[sq],
      failed: list.filter((c) => !c.ok).length,
    };
  });

  return { score, tier: qualityTier(score), passed, checks, blockers, squads, devices, device_score: deviceScore };
}


// ─────────────────────────────────────────────────────────────
// Iparágspecifikus system promptok
// ─────────────────────────────────────────────────────────────

function architectSystem(projectType: string): string {
  const tmpl = PROJECT_TEMPLATES[projectType];
  const hint = tmpl?.architectHint ? `\nIparági útmutató (${tmpl.label}): ${tmpl.architectHint}` : "";
  return `Te vagy az 🧠 Architect Agent + AI Projektmenedzser egy AI szoftverfejlesztő platformon. A partner magyarul beszélget veled.
A feladatod: eldönteni MELYIK szakértő ügynökök dolgozzanak a kérésen, milyen sorrendben, és rövid feladatot adni nekik — mint egy projektmenedzser a csapatnak.
Elérhető ügynökök: ${Object.keys(AGENTS).join(", ")}.
Projekt-típusok: ${Object.keys(PROJECT_TYPES).join(", ")}.
Minden lépéshez adj konkrét "target"-et is (pl. módosított oldal/szekció, komponens, adatmező vagy adatbázis-tábla), hogy a partner élőben lássa mi történik.
${hint}
Csak érvényes JSON:
{"project_type":"webshop","plan":[{"agent":"designer","task":"1 mondatos feladat magyarul","target":"pl. hero szekció színek","kind":"design|page|component|data|seo|content|media|test|deploy"}],"intent":"create|modify|question","pm_intro":"1-2 mondat projektmenedzseri bejelentés: mi a terv és ki jön sorban"}`;
}

function builderSystem(projectType: string): string {
  const tmpl = PROJECT_TEMPLATES[projectType];
  const hint = tmpl?.builderHint ? `\nIparági útmutató (${tmpl.label}): ${tmpl.builderHint}` : "";
  const requiredList = tmpl?.required?.join(", ") || "display_name, hero_title, meta_title, meta_description";
  return `Te vagy egy AI fejlesztő ügynök-csapat (Designer, Frontend, Backend, Commerce, SEO, Content, Media, QA, Deploy) egy magyar AI szoftverfejlesztő platformon.
A partner természetes nyelven kér változtatásokat egy MEGLÉVŐ projekt konfiguráción — pontosan úgy, mint egy fejlesztőcsapattal beszélgetve.
Csak azokat a mezőket add vissza a patch-ben, amiket a kérés ténylegesen érint (iteratív módosítás!). Új oldal esetén tölts ki mindent — ekkor MINDEN kötelező mező legyen meg.
Magyar, márkához illő, meggyőző szövegeket írj. Színek HEX-ben (#RRGGBB). A szöveg/háttér kontraszt legyen legalább 4.5:1 (WCAG AA).
SOHA ne használj placeholder/teszt szöveget (lorem, ipsum, "példa", "teszt", "ide írd" stb.) — minden szöveg valós, kész tartalom legyen.
${hint}

KÖTELEZŐ mezők ehhez a projekttípushoz: ${requiredList}. Ha új projektet generálsz, ezek MINDENKEPP legyenek kitöltve.

Az agent_log legyen RÉSZLETES és élő fejlesztőnaplószerű: minden lépésnél írd le mit módosítottál (szekció/komponens/mező/tábla).

Csak érvényes JSON:
{
  "reply": "2-5 mondat magyarul, beszélgetős hangnemben: mit csináltál, mit javasolsz még",
  "pm_summary": "1-2 mondat projektmenedzseri zárás: mi készült el, mi a következő javasolt lépés",
  "patch": { csak érintett storefront mezők },
  "agent_log": [{"agent":"designer","action":"mit csinált 1 mondatban","target":"hero szekció","kind":"design","fields":["primary_color"]}],
  "qa": {"passed": true, "checks": [{"name":"Kötelező mezők","ok":true,"note":"..."}]},
  "brand_memory": { "colors": [...], "audience": "...", "style": "...", "decisions": ["..."] },
  "todo": ["amit a partnernek kézzel kell megtennie, ha van"]
}

Használható storefront mezők: ${ALLOWED.join(", ")}.
A testimonials tömb: [{"name":..,"text":..,"rating":5}], a footer_links: [{"label":..,"url":..}].`;
}

async function chat(apiKey: string, system: string, messages: any[]) {
  const r = await fetch(AI_CHAT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, ...messages],
      response_format: { type: "json_object" },
    }),
  });
  if (r.status === 429) throw Object.assign(new Error("Túl sok kérés, próbáld pár másodperc múlva."), { status: 429 });
  if (r.status === 402) throw Object.assign(new Error("Elfogytak az AI kreditek."), { status: 402 });
  if (!r.ok) throw Object.assign(new Error(`AI hiba (${r.status})`), { status: 502 });
  const d = await r.json();
  const c = d?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(c); } catch { const m = c.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY hiányzik" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Bejelentkezés szükséges" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return json({ error: "Érvénytelen munkamenet" }, 401);

    const body = await req.json().catch(() => ({}));
    const partnerId = String(body?.partner_id || "").trim();
    const sessionId = String(body?.session_id || "").trim();
    const message = String(body?.message || "").trim();
    const autoApply = body?.auto_apply !== false;
    const stage = String(body?.stage || "full"); // "plan" | "build" | "full"
    const projectType = String(body?.project_type || "").trim();
    const incomingPlan = Array.isArray(body?.plan) ? body.plan.slice(0, 10) : null;
    // Ha a kliens QA-visszacsatolást küld (refine), a Builder kapja javításra
    const refineFeedback = body?.refine_feedback || null;
    if (!partnerId || !sessionId) return json({ error: "partner_id és session_id kötelező" }, 400);
    if (message.length < 2 && !refineFeedback) return json({ error: "Írd le mit szeretnél" }, 400);

    // Jogosultság (RLS is véd)
    const { data: partner } = await supabase
      .from("partners").select("id, brand_name").eq("id", partnerId).maybeSingle();
    if (!partner) return json({ error: "Nincs jogosultságod ehhez a partnerhez" }, 403);

    // Kontextus
    const [{ data: sf }, { data: mem }, { data: prods }, { data: history }] = await Promise.all([
      supabase.from("partner_storefronts").select("*").eq("partner_id", partnerId).maybeSingle(),
      supabase.from("partner_brand_memory").select("memory").eq("partner_id", partnerId).maybeSingle(),
      supabase.from("partner_products").select("title, price, category").eq("partner_id", partnerId).limit(15),
      supabase.from("partner_ai_builder_messages").select("role, content")
        .eq("session_id", sessionId).order("created_at", { ascending: true }).limit(30),
    ]);

    const currentConfig: Record<string, unknown> = {};
    for (const k of ALLOWED) if (sf && sf[k] !== undefined && sf[k] !== null && sf[k] !== "") currentConfig[k] = sf[k];

    const convo = (history || []).map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    const typeHint = projectType && PROJECT_TYPES[projectType]
      ? `Projekt-típus: ${projectType} — ${PROJECT_TYPES[projectType]}`
      : "Projekt-típus: automatikusan döntsd el a kérésből.";

    // ── 1) Architect / Projektmenedzser fázis (iparágspecifikus prompt)
    if (stage === "plan" || stage === "full") {
      const plan = await chat(apiKey, architectSystem(projectType), [
        ...convo.slice(-8),
        {
          role: "user",
          content: `Márka: ${partner.brand_name || "-"}\n${typeHint}\nVan már konfiguráció: ${sf ? "igen" : "nem"}\nKérés: ${message}`,
        },
      ]);
      const agentPlan = Array.isArray(plan?.plan) ? plan.plan.slice(0, 10) : [];
      const detectedType = plan?.project_type || projectType || "";

      if (stage === "plan") {
        await supabase.from("partner_ai_builder_messages")
          .insert({ session_id: sessionId, partner_id: partnerId, role: "user", content: message });
        publish(supabase, {
          source: "web-creator-agent",
          eventType: "partner.project.planned",
          severity: "info",
          payload: { partner_id: partnerId, session_id: sessionId, project_type: detectedType, steps: agentPlan.length },
        }).catch(() => {});
        return json({
          ok: true,
          stage: "plan",
          project_type: detectedType || null,
          pm_intro: String(plan?.pm_intro || "Összeállítottam a csapatot, kezdjük."),
          plan: agentPlan,
        });
      }
      (body as any).__plan = agentPlan;
      (body as any).__pm_intro = plan?.pm_intro;
      (body as any).__project_type = detectedType;
    }

    const agentPlan = incomingPlan ?? (body as any).__plan ?? [];
    const pmIntro = String((body as any).__pm_intro || body?.pm_intro || "");
    const effectiveType = String((body as any).__project_type || projectType || "");

    if (stage === "full") {
      await supabase.from("partner_ai_builder_messages")
        .insert({ session_id: sessionId, partner_id: partnerId, role: "user", content: message });
    }

    // ── 2) Ügynök-csapat: elkészíti a konkrét változtatást (iparágspecifikus prompt)
    const buildPrompt = refineFeedback
      ? `A QA validáció elbukott. JAVÍTSD a patch-et a következő hibák alapján, és add vissza a JAVÍTOTT patch-et:
${JSON.stringify(refineFeedback)}

Eredeti kérés: """${message.slice(0, 2000)}"""
Jelenlegi konfiguráció: ${JSON.stringify(currentConfig)}`
      : `Márka: ${partner.brand_name || "-"}
${typeHint}
Márka-memória (korábbi döntések): ${JSON.stringify(mem?.memory ?? {})}
Jelenlegi konfiguráció: ${JSON.stringify(currentConfig)}
Termékek: ${JSON.stringify((prods || []).slice(0, 10))}
Architect terv: ${JSON.stringify(agentPlan)}

A partner kérése: """${message.slice(0, 4000)}"""`;

    const built = await chat(apiKey, builderSystem(effectiveType), [
      ...convo.slice(-12),
      { role: "user", content: buildPrompt },
    ]);

    const rawPatch = built?.patch && typeof built.patch === "object" ? built.patch : {};
    const patch: Record<string, unknown> = {};
    for (const k of ALLOWED) if (rawPatch[k] !== undefined && rawPatch[k] !== null) patch[k] = rawPatch[k];

    // ── 3) RÉTEG 2: Érdemes QA validáció az alkalmazás ELŐTT
    // A QA a teljes végeredményt vizsgálja (jelenlegi + patch együtt).
    const merged: Record<string, unknown> = { ...currentConfig, ...patch };
    let qa: QaResult = runQualityAssurance(merged, effectiveType);

    // Automatikus javítási próbálkozés: ha a QA elbukik, visszacsatoljuk a
    // Builder-nek a hibákat és egyszer újra generálunk (max 1 újrapróbálás).
    if (!qa.passed && !refineFeedback && Object.keys(patch).length > 0) {
      const feedback = {
        score: qa.score,
        blockers: qa.blockers,
        failed_checks: qa.checks.filter((c) => !c.ok).map((c) => ({ name: c.name, squad: c.squad, note: c.note, severity: c.severity })),
        device_issues: qa.devices.filter((d) => !d.ok).map((d) => ({ device: d.device, issues: d.issues })),

      };
      const rebuilt = await chat(apiKey, builderSystem(effectiveType), [
        ...convo.slice(-12),
        { role: "user", content: buildPrompt },
        { role: "assistant", content: JSON.stringify(built) },
        {
          role: "user",
          content: `A QA validáció elbukott (pontszám: ${qa.score}/100). JAVÍTSD a patch-et, hogy minden hiba megoldódjon:
${JSON.stringify(feedback, null, 2)}
Add vissza a JAVÍTOTT teljes JSON-t ugyanazzal a szerkezettel.`,
        },
      ]);
      const rePatch = rebuilt?.patch && typeof rebuilt.patch === "object" ? rebuilt.patch : {};
      const fixedPatch: Record<string, unknown> = {};
      for (const k of ALLOWED) if (rePatch[k] !== undefined && rePatch[k] !== null) fixedPatch[k] = rePatch[k];
      if (Object.keys(fixedPatch).length) {
        for (const k of Object.keys(fixedPatch)) patch[k] = fixedPatch[k];
        const reMerged: Record<string, unknown> = { ...currentConfig, ...patch };
        qa = runQualityAssurance(reMerged, effectiveType);
      }
    }

    // ── 4) Alkalmazás: csak akkor, ha autoApply ÉS a QA passed.
    // Ha a QA elbukik, nem élesítünk — a partner jóváhagyása kell.
    let applied = false;
    const shouldApply = autoApply && Object.keys(patch).length > 0 && qa.passed;
    if (shouldApply) {
      if (sf?.id) {
        const { error } = await supabase.from("partner_storefronts").update(patch).eq("id", sf.id);
        applied = !error;
        if (error) console.warn("[web-agent] update failed:", error.message);
      } else {
        const { error } = await supabase.from("partner_storefronts").insert({ partner_id: partnerId, ...patch });
        applied = !error;
        if (error) console.warn("[web-agent] insert failed:", error.message);
      }
    }

    // 5) Hosszú távú márka-memória frissítése
    if (built?.brand_memory && typeof built.brand_memory === "object") {
      const mergedMem = { ...(mem?.memory ?? {}), ...built.brand_memory, updated_at: new Date().toISOString() };
      await supabase.from("partner_brand_memory")
        .upsert({ partner_id: partnerId, memory: mergedMem, updated_at: new Date().toISOString() }, { onConflict: "partner_id" });
    }

    const reply = String(built?.reply || pmIntro || "Kész.");
    const pmSummary = String(built?.pm_summary || "");
    const agentLog = (Array.isArray(built?.agent_log) ? built.agent_log.slice(0, 14) : agentPlan).map((a: any) => ({
      agent: a?.agent ?? "frontend",
      action: a?.action ?? a?.task ?? "",
      target: a?.target ?? null,
      kind: a?.kind ?? null,
      fields: Array.isArray(a?.fields) ? a.fields.slice(0, 8) : [],
      status: "done",
    }));

    // Élő "fejlesztői" napló: QA lépés is látszódjon
    const devLog = [
      ...agentLog,
      ...(Object.keys(patch).length
        ? [{ agent: "backend", action: `Adatbázis frissítés: partner_storefronts (${Object.keys(patch).length} mező)`, target: "partner_storefronts", kind: "data", fields: Object.keys(patch).slice(0, 8), status: applied ? "done" : "pending" }]
        : []),
      { agent: "qa", action: qa.passed ? `QA validáció: ${qa.score}/100 — átment` : `QA validáció: ${qa.score}/100 — elbukott (${qa.blockers.length} blokkoló)`, target: "QA", kind: "test", fields: qa.checks.filter((c) => !c.ok).map((c) => c.name).slice(0, 6), status: qa.passed ? "done" : "warn" },
      { agent: "deploy", action: applied ? "Változások élesítve a vázlat oldalon" : qa.passed ? "Változások előkészítve, jóváhagyásra vár" : "QA elbukott — javítás szükséges élesítés előtt", target: "storefront", kind: "deploy", fields: [], status: applied ? "done" : "pending" },
    ];

    await supabase.from("partner_ai_builder_messages").insert({
      session_id: sessionId, partner_id: partnerId, role: "assistant",
      content: reply, agent_plan: devLog, patch, applied,
    });
    await supabase.from("partner_ai_builder_sessions")
      .update({ updated_at: new Date().toISOString() }).eq("id", sessionId);

    // 6) Agent Bus értesítés
    publish(supabase, {
      source: "web-creator-agent",
      eventType: applied ? "partner.site.updated" : "partner.site.preview",
      severity: qa.passed ? "info" : "warning",
      payload: { partner_id: partnerId, session_id: sessionId, project_type: effectiveType, fields: Object.keys(patch), applied, quality_score: qa.score, qa_passed: qa.passed, agents: devLog },
    }).catch(() => {});

    return json({
      ok: true,
      stage: "build",
      reply,
      pm_summary: pmSummary,
      patch,
      applied,
      // RÉTEG 3: minőségi pontszám + QA részletek a kliensnek
      quality_score: qa.score,
      quality_passed: qa.passed,
      quality_checks: qa.checks,
      quality_blockers: qa.blockers,
      agent_log: devLog,
      bus_event: applied ? "partner.site.updated" : "partner.site.preview",
      todo: Array.isArray(built?.todo) ? built.todo.slice(0, 6) : [],
    });

  } catch (e) {
    const err = e as Error & { status?: number };
    return json({ error: err.message || "Ismeretlen hiba" }, err.status || 500);
  }
});

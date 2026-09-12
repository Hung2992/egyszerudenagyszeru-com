// AI Webshop Builder — partner szövegből generál teljes, publikálásra kész storefront konfigurációt
// Lánc: 🧠 Architect (pro) → 🧪 QA kritika → ✨ Javítás → ✅ Validáció (kontraszt, hossz, kötelező mezők)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL_BUILD = "google/gemini-3.1-pro-preview";
const MODEL_FAST = "google/gemini-3.8-flash";
const MODEL_IMAGE = "google/gemini-3-pro-image-preview";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Csak valóban létező partner_storefronts oszlopok (a bolt oldal ezeket rendereli)
const ALLOWED = [
  "display_name", "tagline", "about_html",
  "primary_color", "accent_color", "bg_color", "text_color",
  "font_heading", "font_body", "theme_preset",
  "hero_title", "hero_subtitle", "hero_cta_text", "hero_layout",
  "hero_badge_enabled", "hero_badge_text", "hero_overlay_opacity",
  "topbar_enabled", "topbar_text",
  "section1_enabled", "section1_title", "section1_subtitle", "section1_cta_text", "section1_cta_url",
  "section2_enabled", "section2_title", "section2_subtitle", "section2_cta_text", "section2_cta_url",
  "featured_products_enabled", "featured_products_title",
  "testimonials_enabled", "testimonials_title", "testimonials",
  "newsletter_enabled", "newsletter_title", "newsletter_subtitle",
  "footer_text", "footer_links",
  "meta_title", "meta_description", "seo_keywords",
];

const HERO_LAYOUTS = ["fullscreen", "center", "split"];
const THEMES = ["dark_minimal", "light_clean", "street_red"];

const SCHEMA = `{
  "patch": {
    "display_name": string, "tagline": string, "about_html": string (2-3 <p> bekezdés, konkrét márkatörténettel),
    "primary_color": "#xxxxxx", "accent_color": "#xxxxxx", "bg_color": "#xxxxxx", "text_color": "#xxxxxx",
    "font_heading": string (létező Google font neve), "font_body": string,
    "theme_preset": "dark_minimal"|"light_clean"|"street_red",
    "hero_title": string, "hero_subtitle": string, "hero_cta_text": string,
    "hero_layout": "fullscreen"|"center"|"split",
    "hero_badge_enabled": true, "hero_badge_text": string, "hero_overlay_opacity": number (0-1),
    "topbar_enabled": true, "topbar_text": string,
    "section1_enabled": true, "section1_title": string, "section1_subtitle": string,
    "section1_cta_text": string, "section1_cta_url": "#termekek",
    "section2_enabled": true, "section2_title": string, "section2_subtitle": string,
    "section2_cta_text": string, "section2_cta_url": "#termekek",
    "featured_products_enabled": true, "featured_products_title": string,
    "testimonials_enabled": true, "testimonials_title": string,
    "testimonials": [{"name": string, "text": string, "rating": 5}],
    "newsletter_enabled": true, "newsletter_title": string, "newsletter_subtitle": string,
    "footer_text": string, "footer_links": [{"label": string, "url": string}],
    "meta_title": string, "meta_description": string, "seo_keywords": [string]
  },
  "product_ideas": [{"title": string, "description": string, "suggested_price_huf": number}],
  "image_prompts": {
    "hero": string (ANGOL képgenerálási prompt a hero háttérhez, márkához illő, fotórealisztikus, szöveg és logó NÉLKÜL),
    "section1": string (ANGOL prompt a section1 illusztrációhoz),
    "section2": string (ANGOL prompt a section2 illusztrációhoz)
  },
  "explanation": "2-4 mondat magyarul, mit csináltál és miért"
}`;

const SYSTEM = `Te egy magyar, konverzió-orientált webshop-építő art director + copywriter AI vagy.
A felhasználó természetes nyelven leírja milyen boltot szeretne, te pedig KOMPLETT, publikálásra kész storefront konfigurációt adsz vissza.

Minőségi elvárások (prémium szint):
- Copy: minden szöveg magyar, konkrét, előny-fókuszú. TILOS a kitöltendő helyőrző ("Lorem", "XY Kft.", "ide jön a szöveg") és az üres marketing-frázis ("minőségi termékek széles választéka").
- Hero cím max 5 szó, ütős; alcím 1 mondat, konkrét ígérettel; CTA gomb 2-3 szó, cselekvő ige.
- Topbar: 1 rövid, valós előny vagy sürgetés (szállítás, garancia, limitált készlet) — ne ígérj konkrét árat vagy dátumot.
- Section1 és Section2 két KÜLÖNBÖZŐ szögből (pl. termékminőség vs. vásárlási élmény / márkasztori), mindkettő saját CTA-val.
- 3 vásárlói vélemény, magyar keresztnevekkel, eltérő hangvétellel, konkrét részlettel — ne legyen általános dicséret.
- Színek: bg_color és text_color között erős kontraszt (WCAG AA, min. 4.5:1). accent_color a bg-től jól elváló kiemelés. Ne használj klisés lila-indigó gradienst, ha a leírás nem kéri.
- Tipográfia: a márkához illő létező Google font pár (címsor + szövegtörzs), ne Inter+Poppins alapértelmezés, hacsak nem illik.
- SEO: meta_title < 60 karakter kulcsszóval, meta_description < 155 karakter, 5-8 releváns magyar kulcsszó.
- Ne találj ki céges jogi adatot, adószámot, telefonszámot, címet, konkrét árat vagy díjat.
- Ha vannak meglévő termékek, a szövegek RÁJUK utaljanak konkrétan.

Kizárólag érvényes JSON-t adj vissza, semmi mást.

Séma:
${SCHEMA}`;

const QA_SYSTEM = `Te egy szigorú magyar e-commerce QA lektor vagy. Kapsz egy storefront konfigurációt.
Pontozd őszintén, és sorold fel a konkrét hibákat. Csak JSON:
{
  "scores": {"copy": 0-100, "brand_fit": 0-100, "design": 0-100, "conversion": 0-100, "seo": 0-100},
  "total": 0-100,
  "issues": [{"field": string, "severity": "warn"|"error", "message": string, "fix": string}],
  "verdict": string (1-2 mondat magyarul)
}
Pontlevonás: üres frázis, helyőrző, gyenge kontraszt, túl hosszú meta cím, generikus vélemény, ismétlődő szekciók, hiányzó CTA.`;

const FIX_SYSTEM = `Te egy magyar prémium storefront-optimalizáló vagy. Kapsz egy meglévő konfigurációt és a QA jelentést.
KIZÁRÓLAG a kifogásolt részeket javítsd, a jót ne írd át. Ugyanazt a JSON szerkezetet add vissza:
${SCHEMA}`;

async function callAI(apiKey: string, model: string, system: string, user: string) {
  const r = await fetch(AI_CHAT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (r.status === 429) throw new Error("rate_limit");
  if (r.status === 402) throw new Error("credits_exhausted");
  if (!r.ok) throw new Error(`ai_error_${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const content = d?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(content); } catch {
    const m = String(content).match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

// --- kontraszt ellenőrzés (WCAG) ---
const hexToRgb = (hex: string) => {
  const h = String(hex || "").replace("#", "").trim();
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const lum = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function contrast(a: string, b: string): number | null {
  const ra = hexToRgb(a), rb = hexToRgb(b);
  if (!ra || !rb) return null;
  const l1 = lum(ra), l2 = lum(rb);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function normalize(rawPatch: Record<string, any>) {
  const patch: Record<string, unknown> = {};
  for (const k of ALLOWED) if (rawPatch?.[k] !== undefined && rawPatch?.[k] !== null) patch[k] = rawPatch[k];

  if (typeof patch.hero_layout === "string" && !HERO_LAYOUTS.includes(patch.hero_layout as string)) {
    patch.hero_layout = "fullscreen";
  }
  if (typeof patch.theme_preset === "string" && !THEMES.includes(patch.theme_preset as string)) {
    delete patch.theme_preset;
  }
  if (patch.hero_overlay_opacity !== undefined) {
    const n = Number(patch.hero_overlay_opacity);
    patch.hero_overlay_opacity = Number.isFinite(n) ? Math.min(0.95, Math.max(0, n)) : 0.55;
  }
  for (const key of ["primary_color", "accent_color", "bg_color", "text_color"]) {
    if (patch[key] !== undefined && !hexToRgb(String(patch[key]))) delete patch[key];
  }
  if (Array.isArray(patch.testimonials)) {
    patch.testimonials = (patch.testimonials as any[]).slice(0, 6).map((t) => ({
      name: String(t?.name || "").slice(0, 60),
      text: String(t?.text || "").slice(0, 400),
      rating: Math.min(5, Math.max(1, Number(t?.rating) || 5)),
    })).filter((t) => t.name && t.text);
  }
  if (Array.isArray(patch.footer_links)) {
    patch.footer_links = (patch.footer_links as any[]).slice(0, 8).map((l) => ({
      label: String(l?.label || "").slice(0, 40),
      url: String(l?.url || "#").slice(0, 300),
    })).filter((l) => l.label);
  }
  if (Array.isArray(patch.seo_keywords)) {
    patch.seo_keywords = (patch.seo_keywords as any[]).slice(0, 10).map((k) => String(k).slice(0, 40)).filter(Boolean);
  } else {
    delete patch.seo_keywords;
  }
  if (typeof patch.meta_title === "string") patch.meta_title = patch.meta_title.slice(0, 60);
  if (typeof patch.meta_description === "string") patch.meta_description = patch.meta_description.slice(0, 155);

  for (const [k, v] of Object.entries({
    topbar_enabled: true, hero_badge_enabled: true,
    section1_enabled: true, section2_enabled: true,
    featured_products_enabled: true, testimonials_enabled: true, newsletter_enabled: true,
  })) {
    if (patch[k] === undefined) patch[k] = v;
  }
  if (!patch.featured_products_title) patch.featured_products_title = "Kiemelt termékek";
  if (!patch.testimonials_title) patch.testimonials_title = "Vásárlóink mondták";
  if (!patch.newsletter_title) patch.newsletter_title = "Iratkozz fel";

  // Kontraszt-korrekció: ha a szöveg nem olvasható a háttéren, fehér/fekete-re váltunk
  const warnings: string[] = [];
  const bg = String(patch.bg_color || "");
  const text = String(patch.text_color || "");
  const c = contrast(bg, text);
  if (c !== null && c < 4.5) {
    const withWhite = contrast(bg, "#ffffff") ?? 0;
    const withBlack = contrast(bg, "#111111") ?? 0;
    patch.text_color = withWhite >= withBlack ? "#ffffff" : "#111111";
    warnings.push(`A szövegszín nem volt olvasható a háttéren (kontraszt ${c.toFixed(1)}:1), automatikusan javítva.`);
  }
  const ac = contrast(bg, String(patch.accent_color || ""));
  if (ac !== null && ac < 2.5) {
    warnings.push("A kiemelő szín kevéssé válik el a háttértől — érdemes erősebbet választani.");
  }
  return { patch, warnings };
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
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "Érvénytelen munkamenet" }, 401);

    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt || "").trim();
    const partnerId = String(body?.partner_id || "").trim();
    const mode = body?.mode === "refine" ? "refine" : "build";
    const basePatch = body?.base_patch && typeof body.base_patch === "object" ? body.base_patch : null;
    const target = Math.max(60, Math.min(100, Number(body?.target_score) || 90));
    const maxRounds = Math.max(0, Math.min(2, Number(body?.max_rounds) ?? 1));
    if (!prompt || prompt.length < 3) return json({ error: "Adj meg leírást a webshopodról" }, 400);
    if (!partnerId) return json({ error: "partner_id kötelező" }, 400);

    // Jogosultság: a partner a bejelentkezett felhasználóé (RLS is véd)
    const { data: partner, error: partnerErr } = await supabase
      .from("partners").select("id, company_name, full_name, user_id").eq("id", partnerId).maybeSingle();
    if (partnerErr) return json({ error: `Partner lekérés hiba: ${partnerErr.message}` }, 500);
    if (!partner || partner.user_id !== uid) return json({ error: "Nincs jogosultságod ehhez a partnerhez" }, 403);

    const { data: current } = await supabase
      .from("partner_storefronts").select("*").eq("partner_id", partnerId).maybeSingle();

    const { data: prods } = await supabase
      .from("partner_products")
      .select("title, price_huf, category, product_type")
      .eq("partner_id", partnerId).limit(15);

    const brandContext = `Márka: ${partner.company_name || partner.full_name || "(nincs megadva)"}
Jelenlegi beállítások: ${JSON.stringify({
      display_name: current?.display_name, tagline: current?.tagline,
      hero_title: current?.hero_title, theme_preset: current?.theme_preset,
      accent_color: current?.accent_color, bg_color: current?.bg_color,
    })}
Meglévő termékek (${(prods || []).length} db): ${JSON.stringify((prods || []).slice(0, 10))}`;

    const userMsg = mode === "refine" && basePatch
      ? `${brandContext}

Jelenlegi webshop konfiguráció:
${JSON.stringify(basePatch).slice(0, 9000)}

A partner finomítási kérése:
"""${prompt.slice(0, 4000)}"""

Add vissza a TELJES, frissített konfigurációt — csak a kért részeket változtasd meg, a többit tartsd meg.`
      : `${brandContext}

A partner kérése:
"""${prompt.slice(0, 4000)}"""

Készítsd el a TELJES konfigurációt: minden szekció legyen bekapcsolva és kitöltve, publikálásra kész minőségben.`;

    // 1) Építés
    let parsed: any = await callAI(apiKey, MODEL_BUILD, SYSTEM, userMsg);
    let { patch, warnings } = normalize(parsed?.patch || {});

    // 2) QA + célzott javítás (max 1-2 kör)
    let qa: any = null;
    const rounds: any[] = [];
    for (let r = 0; r <= maxRounds; r++) {
      qa = await callAI(apiKey, MODEL_FAST, QA_SYSTEM, `Konfiguráció:\n${JSON.stringify(patch).slice(0, 10000)}`);
      rounds.push({ round: r, total: Number(qa?.total ?? 0), scores: qa?.scores ?? {} });
      if (r === maxRounds || Number(qa?.total ?? 0) >= target) break;

      const improved = await callAI(
        apiKey,
        MODEL_BUILD,
        FIX_SYSTEM,
        `Cél pontszám: ${target}/100. Jelenlegi: ${qa?.total ?? 0}.
QA hibalista: ${JSON.stringify(qa?.issues ?? []).slice(0, 4000)}

Jelenlegi konfiguráció:
${JSON.stringify(patch).slice(0, 9000)}`,
      );
      const merged = normalize({ ...patch, ...(improved?.patch || {}) });
      patch = merged.patch;
      warnings = [...warnings, ...merged.warnings];
      if (improved?.explanation) parsed.explanation = improved.explanation;
      if (Array.isArray(improved?.product_ideas) && improved.product_ideas.length) {
        parsed.product_ideas = improved.product_ideas;
      }
    }

    const textKeys = Object.keys(patch).filter((k) => typeof patch[k] === "string" && String(patch[k]).trim());
    if (textKeys.length < 3) {
      return json({ error: "Az AI nem adott vissza használható konfigurációt. Próbáld részletesebb leírással." }, 502);
    }

    return json({
      ok: true,
      mode,
      patch,
      qa,
      rounds,
      target,
      warnings: [...new Set(warnings)],
      product_ideas: Array.isArray(parsed.product_ideas) ? parsed.product_ideas.slice(0, 8) : [],
      explanation: String(parsed.explanation || "Elkészült a webshop terve."),
    });
  } catch (e) {
    const msg = (e as Error)?.message || "Ismeretlen hiba";
    if (msg === "rate_limit") return json({ error: "Túl sok kérés, próbáld pár másodperc múlva." }, 429);
    if (msg === "credits_exhausted") return json({ error: "Elfogytak az AI kreditek. Töltsd fel a munkaterületen." }, 402);
    return json({ error: msg }, 500);
  }
});

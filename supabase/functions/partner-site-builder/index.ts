// AI Webshop Builder — partner szövegből generál teljes, publikálásra kész storefront konfigurációt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

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

const SYSTEM = `Te egy magyar webshop-építő AI vagy. A felhasználó természetes nyelven leírja milyen webshopot szeretne,
te pedig egy KOMPLETT, publikálásra kész storefront konfigurációt adsz vissza. Minden szöveg magyar, meggyőző, márkához illő,
konkrét — soha ne írj kitöltendő helyőrzőt (pl. "Lorem", "XY Kft.", "ide jön a szöveg").

Minőségi elvárás (a fő webshop színvonala):
- Erős, rövid hero cím (max 5 szó) és egy mondatos alcím.
- Topbar rövid, sürgetést vagy előnyt kommunikáló üzenet.
- Két tartalmi szekció valódi értékajánlattal (pl. minőség, szállítás, garancia, márkatörténet), mindkettőhöz CTA gomb.
- 3 hiteles hangvételű vásárlói vélemény, magyar keresztnevekkel.
- Kiemelt termékek szekció és hírlevél szekció bekapcsolva, saját címekkel.
- Konzisztens színpaletta: bg_color és text_color erős kontraszttal, accent_color kiemelésre.
- SEO: meta_title < 60 karakter, meta_description < 160 karakter, 5-8 kulcsszó.
- Ne találj ki céges jogi adatot, adószámot, telefonszámot vagy címet.

Kizárólag érvényes JSON-t adj vissza, semmi mást.

Séma:
{
  "patch": {
    "display_name": string, "tagline": string, "about_html": string (2-3 <p> bekezdés),
    "primary_color": "#xxxxxx", "accent_color": "#xxxxxx", "bg_color": "#xxxxxx", "text_color": "#xxxxxx",
    "font_heading": string (Google font neve), "font_body": string,
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
  "explanation": "2-4 mondat magyarul, mit csináltál"
}`;

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

    const userMsg = `Márka: ${partner.company_name || partner.full_name || "(nincs megadva)"}
Jelenlegi beállítások: ${JSON.stringify({
      display_name: current?.display_name, tagline: current?.tagline,
      hero_title: current?.hero_title, theme_preset: current?.theme_preset,
      accent_color: current?.accent_color, bg_color: current?.bg_color,
    })}
Meglévő termékek: ${JSON.stringify((prods || []).slice(0, 10))}

A partner kérése:
"""${prompt.slice(0, 4000)}"""

Készítsd el a TELJES konfigurációt: minden szekció legyen bekapcsolva és kitöltve, publikálásra kész minőségben.`;

    const r = await fetch(AI_CHAT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg }],
        response_format: { type: "json_object" },
      }),
    });

    if (r.status === 429) return json({ error: "Túl sok kérés, próbáld pár másodperc múlva." }, 429);
    if (r.status === 402) return json({ error: "Elfogytak az AI kreditek. Töltsd fel a munkaterületen." }, 402);
    if (!r.ok) return json({ error: `AI hiba (${r.status}): ${(await r.text()).slice(0, 300)}` }, 502);

    const d = await r.json();
    const content = d?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); }
    catch { const m = content.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : {}; }

    // Csak engedélyezett mezők + normalizálás
    const rawPatch = parsed.patch && typeof parsed.patch === "object" ? parsed.patch : {};
    const patch: Record<string, unknown> = {};
    for (const k of ALLOWED) if (rawPatch[k] !== undefined && rawPatch[k] !== null) patch[k] = rawPatch[k];

    if (typeof patch.hero_layout === "string" && !HERO_LAYOUTS.includes(patch.hero_layout as string)) {
      patch.hero_layout = "fullscreen";
    }
    if (patch.hero_overlay_opacity !== undefined) {
      const n = Number(patch.hero_overlay_opacity);
      patch.hero_overlay_opacity = Number.isFinite(n) ? Math.min(0.95, Math.max(0, n)) : 0.55;
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
    if (typeof patch.meta_description === "string") patch.meta_description = patch.meta_description.slice(0, 160);

    // Teljes, profi bolt: a fő szekciók alapból bekapcsolva
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

    const textKeys = Object.keys(patch).filter((k) => typeof patch[k] === "string" && String(patch[k]).trim());
    if (textKeys.length < 3) {
      return json({ error: "Az AI nem adott vissza használható konfigurációt. Próbáld részletesebb leírással." }, 502);
    }

    return json({
      ok: true,
      patch,
      product_ideas: Array.isArray(parsed.product_ideas) ? parsed.product_ideas.slice(0, 8) : [],
      explanation: String(parsed.explanation || "Elkészült a webshop terve."),
    });
  } catch (e) {
    return json({ error: (e as Error)?.message || "Ismeretlen hiba" }, 500);
  }
});

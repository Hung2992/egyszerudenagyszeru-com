// AI Webshop Builder — partner szövegből generál teljes storefront konfigurációt
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

const SYSTEM = `Te egy magyar webshop-építő AI vagy. A felhasználó természetes nyelven leírja milyen weboldalt/webshopot szeretne,
te pedig egy KOMPLETT storefront konfigurációt adsz vissza. Magyar szövegeket írj, meggyőző, márkához illő copyval.
Színek HEX formátumban. Kizárólag érvényes JSON-t adj vissza, semmi mást.

Séma:
{
  "patch": {
    "display_name": string, "tagline": string, "about_html": string (rövid HTML <p> bekezdésekkel),
    "primary_color": "#xxxxxx", "accent_color": "#xxxxxx", "bg_color": "#xxxxxx", "text_color": "#xxxxxx",
    "font_heading": string, "font_body": string, "theme_preset": "dark_minimal"|"light_clean"|"street_red",
    "hero_title": string, "hero_subtitle": string, "hero_cta_text": string, "hero_layout": "split"|"center"|"full",
    "hero_badge_enabled": bool, "hero_badge_text": string, "hero_overlay_opacity": number (0-1),
    "topbar_enabled": bool, "topbar_text": string,
    "section1_enabled": bool, "section1_title": string, "section1_text": string,
    "section2_enabled": bool, "section2_title": string, "section2_text": string,
    "featured_products_enabled": bool, "featured_products_title": string,
    "testimonials_enabled": bool, "testimonials_title": string,
    "testimonials": [{"name": string, "text": string, "rating": 5}],
    "newsletter_enabled": bool, "newsletter_title": string, "newsletter_subtitle": string,
    "footer_text": string, "footer_links": [{"label": string, "url": string}],
    "meta_title": string (<60 karakter), "meta_description": string (<160 karakter)
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
    const { data: partner } = await supabase
      .from("partners").select("id, brand_name, user_id").eq("id", partnerId).maybeSingle();
    if (!partner) return json({ error: "Nincs jogosultságod ehhez a partnerhez" }, 403);

    const { data: current } = await supabase
      .from("partner_storefronts").select("*").eq("partner_id", partnerId).maybeSingle();

    const { data: prods } = await supabase
      .from("partner_products").select("title, price, category").eq("partner_id", partnerId).limit(15);

    const userMsg = `Márka: ${partner.brand_name || "(nincs megadva)"}
Jelenlegi beállítások: ${JSON.stringify({
      display_name: current?.display_name, tagline: current?.tagline,
      hero_title: current?.hero_title, theme_preset: current?.theme_preset,
      accent_color: current?.accent_color,
    })}
Meglévő termékek: ${JSON.stringify((prods || []).slice(0, 10))}

A partner kérése:
"""${prompt.slice(0, 4000)}"""

Készítsd el a teljes konfigurációt. Csak a kérésnek megfelelő mezőket töltsd, de legyen komplett és publikálásra kész.`;

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

    // Csak engedélyezett mezők
    const rawPatch = parsed.patch && typeof parsed.patch === "object" ? parsed.patch : {};
    const patch: Record<string, unknown> = {};
    for (const k of ALLOWED) if (rawPatch[k] !== undefined && rawPatch[k] !== null) patch[k] = rawPatch[k];

    if (!Object.keys(patch).length) return json({ error: "Az AI nem adott vissza használható konfigurációt. Próbáld részletesebb leírással." }, 502);

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

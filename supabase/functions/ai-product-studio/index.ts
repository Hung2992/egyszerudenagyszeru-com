// AI Product Studio – szöveg/képgenerálás termékekhez (admin),
// plusz partner webshop/weboldal és aloldal generálás (partner + admin)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_IMG = "https://ai.gateway.lovable.dev/v1/images/generations";

const TEXT_MODEL = "google/gemini-3.1-flash-lite";
const SITE_MODEL = "google/gemini-3.6-flash";
const IMAGE_MODEL = "google/gemini-3.1-flash-image";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Storefront mezők, amiket az AI írhat (csak létező partner_storefronts oszlopok!)
const SITE_ALLOWED = [
  "display_name", "tagline", "about_html",
  "primary_color", "accent_color", "bg_color", "text_color",
  "font_heading", "font_body", "theme_preset",
  "hero_title", "hero_subtitle", "hero_cta_text", "hero_layout",
  "hero_badge_enabled", "hero_badge_text", "hero_overlay_opacity", "hero_image_url",
  "topbar_enabled", "topbar_text",
  "section1_enabled", "section1_title", "section1_subtitle", "section1_cta_text", "section1_cta_url", "section1_image_url",
  "section2_enabled", "section2_title", "section2_subtitle", "section2_cta_text", "section2_cta_url", "section2_image_url",
  "featured_products_enabled", "featured_products_title",
  "testimonials_enabled", "testimonials_title", "testimonials",
  "newsletter_enabled", "newsletter_title", "newsletter_subtitle",
  "footer_text", "footer_links",
  "meta_title", "meta_description", "seo_keywords",
  "instagram_url", "facebook_url", "tiktok_url", "youtube_url",
];

const SITE_SYSTEM = `Te egy magyar webshop- és weboldal-építő AI vagy. A partner természetes nyelven leírja, milyen webshopot/weboldalt szeretne,
te pedig egy KOMPLETT storefront konfigurációt adsz vissza. Magyar szövegeket írj, meggyőző, márkához illő copyval.
Színek HEX formátumban. Kizárólag érvényes JSON-t adj vissza, semmi mást.

Séma (csak ezek a mezők léteznek!):
{
  "patch": {
    "display_name": string, "tagline": string, "about_html": string (rövid HTML <p> bekezdésekkel),
    "primary_color": "#xxxxxx", "accent_color": "#xxxxxx", "bg_color": "#xxxxxx", "text_color": "#xxxxxx",
    "font_heading": string, "font_body": string, "theme_preset": "dark_minimal"|"light_clean"|"street_red",
    "hero_title": string, "hero_subtitle": string, "hero_cta_text": string, "hero_layout": "split"|"center"|"full",
    "hero_badge_enabled": bool, "hero_badge_text": string, "hero_overlay_opacity": number (0-1),
    "topbar_enabled": bool, "topbar_text": string,
    "section1_enabled": bool, "section1_title": string, "section1_subtitle": string, "section1_cta_text": string, "section1_cta_url": string,
    "section2_enabled": bool, "section2_title": string, "section2_subtitle": string, "section2_cta_text": string, "section2_cta_url": string,
    "featured_products_enabled": bool, "featured_products_title": string,
    "testimonials_enabled": bool, "testimonials_title": string,
    "testimonials": [{"name": string, "text": string, "rating": 5}],
    "newsletter_enabled": bool, "newsletter_title": string, "newsletter_subtitle": string,
    "footer_text": string, "footer_links": [{"label": string, "url": string}],
    "meta_title": string (<60 karakter), "meta_description": string (<160 karakter), "seo_keywords": string,
    "instagram_url": string, "facebook_url": string, "tiktok_url": string, "youtube_url": string
  },
  "explanation": "2-4 mondat magyarul, mit építettél"
}`;

const PAGE_SYSTEM = `Te egy magyar weboldal-szerkesztő AI vagy. A partner leírja, milyen aloldalt szeretne a webshopjához
(pl. "Rólunk", "Szállítási infók", "Lookbook", "Akciók", "GYIK"), te pedig egy komplett, publikálásra kész oldalt adsz vissza.
Magyar, természetes, márkához illő szöveg. A content_html mező TISZTA HTML legyen (csak <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>, <a> tagek), inline stílus és script NÉLKÜL.
Kizárólag érvényes JSON-t adj vissza:
{
  "title": "Oldal címe",
  "slug": "url-barat-slug-kisbetu-kotojel",
  "content_html": "<h2>...</h2><p>...</p>...",
  "meta_title": "max 60 karakter",
  "meta_description": "max 160 karakter",
  "explanation": "1-2 mondat magyarul"
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );

    const token = auth.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "text");
    const productId = body?.productId ?? null;

    const PARTNER_ACTIONS = ["site", "page", "service_product"];
    if (!isAdmin && !PARTNER_ACTIONS.includes(action)) {
      return json({ error: "Admin required" }, 403);
    }

    // Partner feloldása partner akciókhoz (admin is megadhat partner_id-t)
    let partner: any = null;
    if (PARTNER_ACTIONS.includes(action)) {
      const requestedPartnerId = String(body?.partner_id || "").trim();
      if (isAdmin && requestedPartnerId) {
        const { data } = await supabase.from("partners").select("id, company_name").eq("id", requestedPartnerId).maybeSingle();
        partner = data;
      } else {
        const { data } = await supabase.from("partners").select("id, company_name").eq("user_id", userId).maybeSingle();
        partner = data;
      }
      if (!partner) return json({ error: "Nincs partner fiókod ehhez a művelethez" }, 403);
    }

    // Egyszerű óránkénti AI rate limit (felhasználónként 30 generálás)
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabase
      .from("ai_product_generations")
      .select("id", { count: "exact", head: true })
      .eq("admin_user_id", userId)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 30) {
      return json({ error: "Túl sok AI kérés. Próbáld újra egy óra múlva." }, 429);
    }

    // ============= TEXT GENERATION (admin) =============
    if (action === "text") {
      const input = body?.input || {};
      const {
        name = "",
        category = "",
        brand = "",
        material = "",
        features = "",
        audience = "18-30 éves férfiak",
        keywords = "",
        tone = "közvetlen, magabiztos, streetwear",
      } = input;

      if (!name) return json({ error: "Terméknév kötelező" }, 400);

      const system =
        "Te egy magyar streetwear webshop SEO copywritere vagy. Válaszod SZIGORÚAN érvényes JSON, minden szöveg magyarul, természetes, nem AI-ízű, konverzió-orientált.";

      const userPrompt = `Termék adatok:
- Név: ${name}
- Kategória: ${category}
- Márka: ${brand}
- Anyag / összetevő: ${material}
- Főbb tulajdonságok: ${features}
- Célközönség: ${audience}
- Kulcsszavak: ${keywords}
- Hangnem: ${tone}

Add vissza pontosan ezt a JSON struktúrát (ne írj mást, csak a JSON-t):
{
  "seo_title": "max 60 karakteres Google-barát cím a márkanévvel",
  "meta_description": "max 155 karakteres meta leírás CTA-val",
  "short_description": "2-3 mondatos vásárlói leírás",
  "long_description": "6-10 mondatos SEO-optimalizált termékleírás, természetes bekezdésekkel",
  "bullet_points": ["4-6 rövid, konkrét előny bullet"],
  "social_posts": {
    "facebook": "1-2 bekezdéses FB poszt emojival és CTA-val",
    "instagram": "IG caption hashtageklel (max 8 hashtag)",
    "ad_headline": "max 40 karakteres reklám headline",
    "ad_cta": "max 25 karakteres CTA gomb szöveg"
  }
}`;

      const res = await fetch(AI_CHAT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return json({ error: `AI hiba (${res.status})`, details: err }, res.status);
      }
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content ?? "{}";
      let parsed: any = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : {};
      }

      const score = seoScore(parsed, keywords);

      await supabase.from("ai_product_generations").insert({
        product_id: productId,
        admin_user_id: userId,
        kind: "text",
        model: TEXT_MODEL,
        prompt: userPrompt,
        input,
        output: parsed,
      });

      return json({ ok: true, content: parsed, score });
    }

    // ============= IMAGE GENERATION (admin) =============
    if (action === "image") {
      const input = body?.input || {};
      const {
        name = "",
        category = "",
        style = "modern, minimalista, sötét háttér",
        audience = "18-30 éves férfiak",
        extra = "",
      } = input;
      if (!name) return json({ error: "Terméknév kötelező" }, 400);

      const prompt =
        `Prémium webshop hero fotó: ${name}. Kategória: ${category}. Stílus: ${style}. Célközönség: ${audience}. ${extra}. Fotórealisztikus, professzionális stúdiófény, éles fókusz, streetwear brand esztétika, ne legyen szöveg a képen.`;

      const res = await fetch(AI_IMG, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return json({ error: `Kép AI hiba (${res.status})`, details: err }, res.status);
      }
      const data = await res.json();
      const b64 =
        data?.data?.[0]?.b64_json ??
        data?.choices?.[0]?.message?.images?.[0]?.image_url?.url?.split(",")?.[1] ??
        null;
      if (!b64) return json({ error: "Nincs kép a válaszban", raw: data }, 500);

      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `ai-studio/${productId || "no-product"}/${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, bytes, { contentType: "image/png", upsert: false });
      if (upErr) return json({ error: `Feltöltés hiba: ${upErr.message}` }, 500);
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      const imageUrl = pub.publicUrl;

      await supabase.from("ai_product_generations").insert({
        product_id: productId,
        admin_user_id: userId,
        kind: "image",
        model: IMAGE_MODEL,
        prompt,
        input,
        output: { path },
        image_url: imageUrl,
      });

      return json({ ok: true, imageUrl, prompt });
    }

    // ============= APPLY (admin, partial) =============
    if (action === "apply") {
      if (!productId) return json({ error: "productId kötelező" }, 400);
      const fields = body?.fields || {};
      const applyKeys = Object.keys(fields);
      if (applyKeys.length === 0) return json({ ok: true, applied: [] });

      const update: Record<string, unknown> = {};
      const allowed = [
        "seo_title",
        "meta_description",
        "short_description",
        "long_description",
        "bullet_points",
        "social_posts",
        "description",
        "teaser_description",
        "ai_hero_image_url",
      ];
      for (const k of applyKeys) if (allowed.includes(k)) update[k] = fields[k];

      const { error } = await supabase
        .from("shop_products")
        .update(update)
        .eq("id", productId);
      if (error) return json({ error: error.message }, 500);

      await supabase.from("ai_product_generations").insert({
        product_id: productId,
        admin_user_id: userId,
        kind: "apply",
        model: null,
        applied: true,
        applied_fields: Object.keys(update),
        output: update,
      });

      return json({ ok: true, applied: Object.keys(update) });
    }

    // ============= SITE GENERATION (partner + admin) =============
    if (action === "site") {
      const prompt = String(body?.input?.prompt || "").trim();
      if (prompt.length < 3) return json({ error: "Írd le, milyen webshopot/weboldalt szeretnél" }, 400);

      const { data: current } = await supabase
        .from("partner_storefronts").select("*").eq("partner_id", partner.id).maybeSingle();

      const userMsg = `Márka: ${partner.company_name || "(nincs megadva)"}
Jelenlegi beállítások: ${JSON.stringify({
        display_name: current?.display_name, tagline: current?.tagline,
        hero_title: current?.hero_title, theme_preset: current?.theme_preset,
      })}

A partner kérése:
"""${prompt.slice(0, 4000)}"""

Készítsd el a teljes konfigurációt, publikálásra készen.`;

      const r = await fetch(AI_CHAT, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: SITE_MODEL,
          messages: [{ role: "system", content: SITE_SYSTEM }, { role: "user", content: userMsg }],
          response_format: { type: "json_object" },
        }),
      });

      if (r.status === 429) return json({ error: "Túl sok kérés, próbáld pár másodperc múlva." }, 429);
      if (r.status === 402) return json({ error: "Elfogytak az AI kreditek." }, 402);
      if (!r.ok) return json({ error: `AI hiba (${r.status})` }, 502);

      const d = await r.json();
      const content = d?.choices?.[0]?.message?.content ?? "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(content); }
      catch { const m = content.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : {}; }

      const rawPatch = parsed.patch && typeof parsed.patch === "object" ? parsed.patch : {};
      const patch: Record<string, unknown> = {};
      for (const k of SITE_ALLOWED) if (rawPatch[k] !== undefined && rawPatch[k] !== null) patch[k] = rawPatch[k];

      // Típusbiztosítás: seo_keywords tömb, featured_product_ids tömb
      if (typeof patch.seo_keywords === "string") {
        patch.seo_keywords = patch.seo_keywords.split(",").map((s) => s.trim()).filter(Boolean);
      }
      if (typeof patch.featured_product_ids === "string") {
        patch.featured_product_ids = patch.featured_product_ids.split(",").map((s) => s.trim()).filter(Boolean);
      }

      if (!Object.keys(patch).length) {
        return json({ error: "Az AI nem adott vissza használható konfigurációt. Próbáld részletesebben." }, 502);
      }

      let applied = false;
      let applyError: string | null = null;
      if (body?.auto_apply !== false) {
        patch.updated_at = new Date().toISOString();

        const slugify = (s: string) =>
          s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
        const insertSlug = current?.id
          ? undefined
          : `${slugify(String(patch.display_name || partner.company_name || "shop")) || "shop"}-${String(partner.id).slice(0, 6)}`;

        // Újrapróbálkozás: ismeretlen oszlop / hibás tömb esetén a problémás mezőt eldobjuk
        for (let attempt = 0; attempt < 4; attempt++) {
          const q = current?.id
            ? supabase.from("partner_storefronts").update(patch).eq("id", current.id)
            : supabase.from("partner_storefronts").insert({ ...patch, partner_id: partner.id, slug: insertSlug });
          const { error: upErr } = await q;
          if (!upErr) { applied = true; applyError = null; break; }
          const msg = upErr.message || "";
          const colMatch = msg.match(/Could not find the '([^']+)' column/);
          if (colMatch && patch[colMatch[1]] !== undefined) { delete patch[colMatch[1]]; continue; }
          const arrMatch = msg.match(/malformed array literal/i);
          if (arrMatch) {
            // dobjuk a nem-szöveg/number/bool mezőket, amelyek gyanúsan rossz formátumúak
            let dropped = false;
            for (const k of Object.keys(patch)) {
              const v = patch[k];
              if (v !== null && typeof v === "object" && k !== "testimonials" && k !== "footer_links") {
                delete patch[k]; dropped = true;
              }
            }
            if (dropped) continue;
          }
          applyError = msg;
          break;
        }
      }

      await supabase.from("ai_product_generations").insert({
        admin_user_id: userId,
        kind: "site",
        model: SITE_MODEL,
        prompt: prompt.slice(0, 4000),
        input: { partner_id: partner.id },
        output: { patch_keys: Object.keys(patch), applied, applyError },
      });

      if (applyError) return json({ error: `Mentési hiba: ${applyError}` }, 500);
      return json({
        ok: true,
        applied,
        patch,
        explanation: String(parsed.explanation || "Elkészült a webshop/weboldal terve."),
      });
    }

    // ============= PAGE GENERATION (partner + admin) =============
    if (action === "page") {
      const prompt = String(body?.input?.prompt || "").trim();
      if (prompt.length < 3) return json({ error: "Írd le, milyen aloldalt szeretnél" }, 400);
      const pageId = body?.page_id ? String(body.page_id) : null;

      const { data: sfRow } = await supabase
        .from("partner_storefronts").select("display_name, tagline").eq("partner_id", partner.id).maybeSingle();

      const userMsg = `Márka: ${sfRow?.display_name || partner.company_name || "(ismeretlen)"}
Mottó: ${sfRow?.tagline || ""}

A partner kérése az aloldalra:
"""${prompt.slice(0, 3000)}"""`;

      const r = await fetch(AI_CHAT, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: SITE_MODEL,
          messages: [{ role: "system", content: PAGE_SYSTEM }, { role: "user", content: userMsg }],
          response_format: { type: "json_object" },
        }),
      });

      if (r.status === 429) return json({ error: "Túl sok kérés, próbáld pár másodperc múlva." }, 429);
      if (r.status === 402) return json({ error: "Elfogytak az AI kreditek." }, 402);
      if (!r.ok) return json({ error: `AI hiba (${r.status})` }, 502);

      const d = await r.json();
      const content = d?.choices?.[0]?.message?.content ?? "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(content); }
      catch { const m = content.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : {}; }

      const title = String(parsed.title || "").trim().slice(0, 120);
      let slug = String(parsed.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
      const contentHtml = String(parsed.content_html || "");
      if (!title || !contentHtml) return json({ error: "Az AI nem adott vissza használható oldalt. Próbáld részletesebben." }, 502);
      if (!slug) slug = title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "oldal";

      const row: Record<string, unknown> = {
        partner_id: partner.id,
        slug,
        title,
        content_html: contentHtml,
        meta_title: String(parsed.meta_title || title).slice(0, 120),
        meta_description: String(parsed.meta_description || "").slice(0, 300),
      };

      let saved: any = null;
      if (pageId) {
        const { data, error } = await supabase.from("partner_pages").update(row).eq("id", pageId).eq("partner_id", partner.id).select().maybeSingle();
        if (error) return json({ error: `Mentési hiba: ${error.message}` }, 500);
        saved = data;
      } else {
        const { data, error } = await supabase.from("partner_pages").upsert(row, { onConflict: "partner_id,slug" }).select().maybeSingle();
        if (error) return json({ error: `Mentési hiba: ${error.message}` }, 500);
        saved = data;
      }

      await supabase.from("ai_product_generations").insert({
        admin_user_id: userId,
        kind: "page",
        model: SITE_MODEL,
        prompt: prompt.slice(0, 3000),
        input: { partner_id: partner.id },
        output: { page_id: saved?.id, slug },
      });

      return json({
        ok: true,
        page: saved,
        explanation: String(parsed.explanation || "Elkészült az aloldal."),
      });
    }

    // ============= SERVICE / DIGITAL / COURSE PRODUCT (partner + admin) =============
    if (action === "service_product") {
      const prompt = String(body?.input?.prompt || "").trim();
      if (prompt.length < 3) return json({ error: "Írd le, milyen terméket vagy szolgáltatást szeretnél" }, 400);
      const wanted = String(body?.input?.product_type || "").trim();
      const allowedTypes = ["digital", "course", "service"];
      const forcedType = allowedTypes.includes(wanted) ? wanted : null;

      const sys = `Te egy magyar e-kereskedelmi termékstratéga vagy. Digitális termékeket, online kurzusokat és szolgáltatásokat állítasz össze eladásra kész módon.
Válaszod SZIGORÚAN érvényes JSON, minden szöveg magyarul, konkrét, nem AI-ízű.
A "product_type" csak "digital", "course" vagy "service" lehet.
Szolgáltatásnál és kurzusnál MINDIG töltsd ki az időpontfoglalási (naptár) beállításokat is.

Add vissza pontosan ezt a struktúrát:
{
  "product_type": "digital|course|service",
  "title": "termék neve, max 80 karakter",
  "slug": "url-barat-slug",
  "short_description": "1-2 mondat",
  "description": "5-8 mondatos eladási leírás",
  "price_huf": 19900,
  "category": "kategória",
  "tags": ["max 6 címke"],
  "attributes": {
    "delivery_method": "file|link|license|email",
    "digital_version": "", "language": "magyar", "file_size": "", "demo_url": "",
    "device_limit": "", "free_updates": true, "commercial_use": false,
    "support_period": "", "refund_policy": "", "requirements": "",
    "license_terms": "",
    "course_mode": "online|live|onsite|hybrid", "course_level": "", "course_duration": "",
    "max_students": "", "instructor": "", "live_schedule": "", "course_platform": "",
    "drip_days": "", "community_access": false, "mentoring": false, "lifetime_access": false,
    "installments": "", "learning_outcomes": "soronként egy eredmény",
    "course_lessons": [{ "title": "", "duration": "", "free_preview": false }],
    "service_duration": "", "service_location": "online|onsite|shop|hybrid",
    "service_includes": "", "cancellation_policy": "", "service_warranty": "",
    "booking_enabled": true,
    "work_days": [1,2,3,4,5],
    "work_from": "09:00", "work_to": "17:00",
    "buffer_min": 15, "min_notice_hours": 24, "max_advance_days": 60,
    "deposit_percent": "", "travel_fee": "", "rush_fee_percent": "",
    "meeting_url": "",
    "service_addons": [{ "name": "", "price": "" }]
  },
  "explanation": "1 mondat: mit készítettél"
}
Csak a választott típushoz tartozó mezőket töltsd értelmes tartalommal, a többit hagyd üresen.`;

      const userMsg = `Márka: ${partner?.company_name || "(ismeretlen)"}
${forcedType ? `Kötelező típus: ${forcedType}` : "Válaszd ki a legjobb típust a kérés alapján."}

A partner kérése:
"""${prompt.slice(0, 3000)}"""`;

      const r = await fetch(AI_CHAT, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: SITE_MODEL,
          messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
          response_format: { type: "json_object" },
        }),
      });

      if (r.status === 429) return json({ error: "Túl sok kérés, próbáld pár másodperc múlva." }, 429);
      if (r.status === 402) return json({ error: "Elfogytak az AI kreditek." }, 402);
      if (!r.ok) return json({ error: `AI hiba (${r.status})` }, 502);

      const d = await r.json();
      const content = d?.choices?.[0]?.message?.content ?? "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(content); }
      catch { const m = content.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : {}; }

      const title = String(parsed.title || "").trim().slice(0, 120);
      if (!title) return json({ error: "Az AI nem adott vissza használható terméket. Próbáld részletesebben." }, 502);

      const productType = allowedTypes.includes(String(parsed.product_type))
        ? String(parsed.product_type)
        : (forcedType || "service");

      let slug = String(parsed.slug || "").trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
      if (!slug) {
        slug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "termek";
      }
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

      const attrs = (parsed.attributes && typeof parsed.attributes === "object") ? parsed.attributes : {};
      if (productType !== "digital" && attrs.booking_enabled === undefined) attrs.booking_enabled = true;
      if (Array.isArray(attrs.work_days)) {
        attrs.work_days = attrs.work_days
          .map((x: unknown) => Number(x))
          .filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 7);
      }

      const price = Number(parsed.price_huf);
      const row: Record<string, unknown> = {
        partner_id: partner.id,
        slug,
        title,
        description: String(parsed.description || parsed.short_description || "").slice(0, 5000),
        price_huf: Number.isFinite(price) && price > 0 ? Math.round(price) : 0,
        category: String(parsed.category || "").slice(0, 80) || null,
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6).map((t: unknown) => String(t).slice(0, 40)) : [],
        product_type: productType,
        fulfillment_type: productType === "digital" ? "digital_download" : (productType === "course" ? "course_access" : "service_booking"),
        attributes: attrs,
        stock_qty: productType === "service" ? 0 : 9999,
        status: "draft",
      };

      const { data: saved, error: saveErr } = await supabase
        .from("partner_products").insert(row).select().maybeSingle();
      if (saveErr) return json({ error: `Mentési hiba: ${saveErr.message}` }, 500);

      await supabase.from("ai_product_generations").insert({
        admin_user_id: userId,
        kind: "service_product",
        model: SITE_MODEL,
        prompt: prompt.slice(0, 3000),
        input: { partner_id: partner.id, product_type: productType },
        output: { product_id: saved?.id, slug, product_type: productType },
      });

      return json({
        ok: true,
        product: saved,
        explanation: String(parsed.explanation || "Elkészült a termék piszkozatként."),
      });
    }

    return json({ error: `Ismeretlen action: ${action}` }, 400);
  } catch (e: any) {
    return json({ error: e?.message || "internal" }, 500);
  }
});

function seoScore(c: any, keywords: string) {
  const kwList = String(keywords || "")
    .toLowerCase()
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const text = [
    c?.seo_title,
    c?.meta_description,
    c?.short_description,
    c?.long_description,
    Array.isArray(c?.bullet_points) ? c.bullet_points.join(" ") : "",
  ]
    .join(" ")
    .toLowerCase();

  let coverage = 0;
  if (kwList.length) {
    const hits = kwList.filter((k) => text.includes(k)).length;
    coverage = Math.round((hits / kwList.length) * 100);
  } else coverage = 70;

  const titleLen = (c?.seo_title || "").length;
  const metaLen = (c?.meta_description || "").length;
  const titleOk = titleLen > 20 && titleLen <= 60 ? 100 : Math.max(0, 100 - Math.abs(50 - titleLen) * 3);
  const metaOk = metaLen > 100 && metaLen <= 160 ? 100 : Math.max(0, 100 - Math.abs(140 - metaLen) * 2);
  const readability = Math.round((titleOk + metaOk) / 2);

  const longLen = (c?.long_description || "").length;
  const bullets = Array.isArray(c?.bullet_points) ? c.bullet_points.length : 0;
  const conversion = Math.min(
    100,
    Math.round((longLen > 300 ? 60 : (longLen / 300) * 60) + Math.min(40, bullets * 10)),
  );

  return {
    keyword_coverage: coverage,
    readability,
    conversion_power: conversion,
    overall: Math.round((coverage + readability + conversion) / 3),
  };
}

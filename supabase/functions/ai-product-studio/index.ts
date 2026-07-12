// AI Product Studio – szöveg és képgenerálás termékekhez (admin only)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_IMG = "https://ai.gateway.lovable.dev/v1/images/generations";

const TEXT_MODEL = "google/gemini-3.1-flash-lite";
const IMAGE_MODEL = "google/gemini-3.1-flash-image";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    if (!isAdmin) return json({ error: "Admin required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "text");
    const productId = body?.productId ?? null;

    // ============= TEXT GENERATION =============
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

      // SEO score
      const score = seoScore(parsed, keywords);

      // audit
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

    // ============= IMAGE GENERATION =============
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

      // Upload to storage as PNG
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

    // ============= APPLY (partial) =============
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

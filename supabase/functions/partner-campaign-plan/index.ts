// AI kampánytervező: cél + célcsoport alapján üzenet, hírlevél és webshop-kampányoldal
// szövegjavaslat. Semmit nem ír az adatbázisba és nem publikál — csak javaslatot ad vissza.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SYSTEM = `Magyar marketing szövegíró vagy egy partner webshop számára.
Feladat: egy konkrét kampány szövegeinek megírása a megadott cél, célcsoport és valódi termékadatok alapján.
Szabályok:
- Kizárólag magyarul írj, közérthetően, konkrétan. Semmi töltelék, semmi placeholder.
- Csak olyan terméket, árat vagy ajánlatot említhetsz, ami a megadott adatokban szerepel.
- Ne találj ki kedvezményt, határidőt, garanciát vagy jogi állítást, ha nem kaptad meg.
- Válaszod KIZÁRÓLAG egyetlen JSON objektum, magyarázat nélkül:
{"name":"","message_headline":"","message_body":"","newsletter_subject":"","newsletter_body":"","page_slug":"","page_headline":"","page_subheadline":"","page_body":"","page_cta_text":""}
Hosszkorlátok: message_headline max 90, newsletter_subject max 60, page_cta_text max 30 karakter.
A page_slug csak kisbetű, szám és kötőjel legyen.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const partnerId = String(body?.partner_id || "");
    const goal = String(body?.goal || "").slice(0, 300).trim();
    const audience = String(body?.audience || "").slice(0, 300).trim();
    const tone = String(body?.tone || "").slice(0, 60).trim();
    if (!partnerId || !goal || !audience) return json({ error: "invalid_input" }, 400);

    const { data: partner } = await supabase
      .from("partners")
      .select("id, company_name, full_name, user_id")
      .eq("id", partnerId)
      .maybeSingle();
    if (!partner || partner.user_id !== user.id) return json({ error: "not_partner" }, 403);

    const { data: sf } = await supabase
      .from("partner_storefronts")
      .select("display_name, slug, hero_title, hero_subtitle, about_html")
      .eq("partner_id", partnerId)
      .maybeSingle();

    const { data: products } = await supabase
      .from("partner_products")
      .select("name, price_huf, short_description, category")
      .eq("partner_id", partnerId)
      .eq("status", "active")
      .limit(12);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "ai_unavailable" }, 503);

    const context = {
      bolt: sf?.display_name || partner.company_name || partner.full_name,
      bolt_slug: sf?.slug || null,
      bolt_fo_uzenet: sf?.hero_title || null,
      bolt_alcim: sf?.hero_subtitle || null,
      termekek: (products || []).map((p: Record<string, unknown>) => ({
        nev: p.name, ar_huf: p.price_huf, leiras: p.short_description, kategoria: p.category,
      })),
      cel: goal,
      celcsoport: audience,
      hangnem: tone || "magabiztos, letisztult",
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: JSON.stringify(context) },
        ],
      }),
    });

    if (res.status === 429) return json({ error: "rate_limited" }, 429);
    if (res.status === 402) return json({ error: "ai_credits" }, 402);
    if (!res.ok) return json({ error: "ai_unavailable" }, 503);

    const data = await res.json();
    const raw = String(data?.choices?.[0]?.message?.content || "");
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: "ai_unavailable" }, 503);

    let plan: unknown;
    try { plan = JSON.parse(match[0]); } catch { return json({ error: "ai_unavailable" }, 503); }

    return json({ plan, context: { products: context.termekek.length } });
  } catch (e) {
    console.error("partner-campaign-plan", e);
    return json({ error: "server_error" }, 500);
  }
});

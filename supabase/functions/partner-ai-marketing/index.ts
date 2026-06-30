// AI marketing generator: posts, captions, A/B variants, insights via Lovable AI Gateway.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function callAI(systemPrompt: string, userPrompt: string, model = "google/gemini-2.5-flash") {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) throw new Error(`ai_error_${res.status}`);
  const j = await res.json();
  const txt = j.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const { action, partner_id, product_id, platform, tone, language, custom_brief } = body;

    // Verify partner ownership
    const { data: partner } = await supabase.from("partners").select("id, company_name, coupon_code").eq("id", partner_id).eq("user_id", user.id).maybeSingle();
    if (!partner) return json({ error: "not_partner" }, 403);

    let product: any = null;
    if (product_id) {
      const { data } = await supabase.from("partner_products").select("title, description, price_huf, brand, category, product_type, tags").eq("id", product_id).maybeSingle();
      product = data;
    }

    const lang = language || "hu";

    if (action === "generate_post") {
      const sys = `Te egy világszínvonalú közösségi média marketing copywriter vagy. Magyarul írsz, fiatalos hangvétellel. Generálj viral posztokat ${platform} platformra. Válasz CSAK JSON-ban: {"title": "...", "body": "...", "hashtags": ["#tag1"], "cta_text": "..."}.`;
      const usr = `Partner: ${partner.company_name}. Kupon: ${partner.coupon_code || "—"}.
Termék: ${product ? `${product.title} — ${product.description?.slice(0, 300) || ""}. Ár: ${product.price_huf} Ft. Márka: ${product.brand || "—"}.` : "Általános brand poszt."}
Tónus: ${tone || "energikus, fiatalos"}. Platform: ${platform}.
${custom_brief ? `Extra kérés: ${custom_brief}` : ""}
A bodyban használj emoji-kat, sortöréseket, hookot az első sorban. Hashtagek a platform szokásai szerint.`;
      const result = await callAI(sys, usr);
      return json(result);
    }

    if (action === "generate_ab_variants") {
      const sys = `Generálj 2 különböző stílusú változatot ${platform}-ra. Válasz CSAK JSON: {"a": {"title":"","body":"","hashtags":[],"cta_text":""}, "b": {"title":"","body":"","hashtags":[],"cta_text":""}, "hypothesis":"miért különböznek"}`;
      const usr = `Termék: ${product?.title || "brand"}. A variáns: érzelmi/sztori. B variáns: racionális/akció-fókusz. Magyar nyelv.`;
      return json(await callAI(sys, usr));
    }

    if (action === "insights") {
      // Aggregate clicks + suggest improvements
      const { data: clicks } = await supabase.from("partner_share_clicks").select("source, device_type, country, clicked_at").eq("partner_id", partner_id).order("clicked_at", { ascending: false }).limit(500);
      const { data: links } = await supabase.from("partner_share_links").select("label, utm_source, click_count, conversion_count").eq("partner_id", partner_id).order("click_count", { ascending: false }).limit(20);

      const stats = {
        total_clicks: clicks?.length || 0,
        by_source: {} as Record<string, number>,
        by_device: {} as Record<string, number>,
        by_hour: Array(24).fill(0),
        top_links: links?.slice(0, 10) || [],
      };
      clicks?.forEach((c) => {
        stats.by_source[c.source || "direct"] = (stats.by_source[c.source || "direct"] || 0) + 1;
        stats.by_device[c.device_type || "unknown"] = (stats.by_device[c.device_type || "unknown"] || 0) + 1;
        const h = new Date(c.clicked_at).getHours();
        stats.by_hour[h]++;
      });

      const bestHour = stats.by_hour.indexOf(Math.max(...stats.by_hour));
      const sys = `Te egy data-driven marketing tanácsadó vagy. Adj 3 konkrét, akcióba ültethető tippet magyarul. JSON formátum: {"tips":[{"title":"","detail":"","priority":"high|medium|low"}], "summary":"egy mondatos összegzés"}`;
      const usr = `Adatok: ${JSON.stringify(stats)}. Legjobb posztolási idő: ${bestHour}:00. Adj konkrét javaslatokat: melyik platformra fókuszáljon, mikor posztoljon, mit változtasson.`;
      const ai = await callAI(sys, usr);
      return json({ stats, best_hour: bestHour, ai });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e: any) {
    if (e.message === "rate_limit") return json({ error: "Túl sok kérés, próbáld újra később." }, 429);
    if (e.message === "credits_exhausted") return json({ error: "AI kredit kimerült." }, 402);
    return json({ error: e.message || "server_error" }, 500);
  }
});

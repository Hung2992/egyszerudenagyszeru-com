// Partner AI üzleti asszisztens: a partner saját adataiból ad napi javaslatokat és válaszol kérdésekre.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function callAI(system: string, user: string, jsonMode: boolean) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) throw new Error(`ai_error_${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
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

    const body = await req.json().catch(() => ({}));
    const partnerId = String(body.partner_id || "");
    const action = body.action === "ask" ? "ask" : "daily_advice";
    const question = String(body.question || "").slice(0, 1000);
    if (!partnerId) return json({ error: "partner_id required" }, 400);

    const { data: partner } = await supabase
      .from("partners").select("id, full_name, company_name, coupon_code, status")
      .eq("id", partnerId).eq("user_id", user.id).maybeSingle();
    if (!partner) return json({ error: "not_partner" }, 403);

    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [ordersRes, productsRes, sfRes] = await Promise.all([
      supabase.from("partner_orders").select("total_huf,partner_payout_huf,status,created_at,items")
        .eq("partner_id", partnerId).gte("created_at", since).limit(500),
      supabase.from("partner_products").select("title,price_huf,compare_price_huf,stock_qty,status,category,brand,product_type,view_count,sales_count")
        .eq("partner_id", partnerId).limit(200),
      supabase.from("partner_storefronts").select("slug,is_published,store_name,tagline,custom_domain,custom_domain_status")
        .eq("partner_id", partnerId).maybeSingle(),
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const sf: any = sfRes.data || null;
    const revenue = orders.reduce((s: number, o: any) => s + Number(o.partner_payout_huf || o.total_huf || 0), 0);
    const views = products.reduce((s: number, p: any) => s + Number(p.view_count || 0), 0);
    const sales = products.reduce((s: number, p: any) => s + Number(p.sales_count || 0), 0);

    const ctx = {
      partner: { name: partner.company_name || partner.full_name, coupon: partner.coupon_code },
      webshop: sf ? {
        nev: sf.store_name, slogen: sf.tagline, publikalt: sf.is_published,
        sajat_domain: sf.custom_domain, domain_status: sf.custom_domain_status,
      } : null,
      utolso_30_nap: {
        bevetel_ft: revenue, rendelesek: orders.length,
        atlag_kosar_ft: orders.length ? Math.round(revenue / orders.length) : 0,
      },
      termekek: {
        osszes: products.length,
        elo: products.filter((p: any) => p.status === "active").length,
        jovahagyasra_var: products.filter((p: any) => p.status === "pending_review").length,
        elfogyott: products.filter((p: any) => Number(p.stock_qty || 0) === 0).length,
        osszes_megtekintes: views,
        osszes_eladas: sales,
        konverzio_pct: views ? Number(((sales / views) * 100).toFixed(2)) : 0,
        top: products
          .sort((a: any, b: any) => Number(b.sales_count || 0) - Number(a.sales_count || 0))
          .slice(0, 10)
          .map((p: any) => ({
            cim: p.title, ar: p.price_huf, keszlet: p.stock_qty,
            eladas: p.sales_count, megtekintes: p.view_count, status: p.status,
          })),
      },
    };

    if (action === "ask") {
      const sys = "Te egy tapasztalt magyar e-kereskedelmi üzleti tanácsadó vagy. A partner saját webshop adatai alapján válaszolsz. Rövid, konkrét, azonnal végrehajtható tanácsokat adsz magyarul, számokkal alátámasztva. Kerüld az általánosságokat.";
      const answer = await callAI(sys, `ADATOK:\n${JSON.stringify(ctx)}\n\nKÉRDÉS: ${question}`, false);
      return json({ answer });
    }

    const sys = `Te egy magyar e-kereskedelmi üzleti tanácsadó vagy, aki egy partner webshopjának adatait elemzi.
Válasz KIZÁRÓLAG JSON-ban:
{"summary":"2-3 mondat magyarul","health_score":0-100 szám,"actions":[{"title":"...","why":"...","impact":"magas|közepes|alacsony","effort":"pl. 10 perc"}],"risks":["..."],"opportunities":["..."]}
Maximum 5 action, 4 risk, 4 opportunity. Minden konkrét legyen és a megadott számokra hivatkozzon.`;
    const raw = await callAI(sys, JSON.stringify(ctx), true);
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { summary: String(raw).slice(0, 500), health_score: 50, actions: [], risks: [], opportunities: [] }; }
    parsed.actions = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 5) : [];
    parsed.risks = Array.isArray(parsed.risks) ? parsed.risks.slice(0, 4) : [];
    parsed.opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, 4) : [];
    parsed.health_score = Math.max(0, Math.min(100, Number(parsed.health_score) || 0));

    return json(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    console.error("[partner-business-advisor]", msg);
    return json({ error: msg }, msg === "rate_limit" ? 429 : msg === "credits_exhausted" ? 402 : 500);
  }
});

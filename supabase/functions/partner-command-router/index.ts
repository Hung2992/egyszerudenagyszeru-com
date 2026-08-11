// Partner AI parancsmező: felismeri a partner szándékát, adatot gyűjt, választ ad és a megfelelő fülre irányít.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function callAI(system: string, user: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) throw new Error(`ai_error_${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

// Melyik fülre navigáljunk az adott szándéknál
const INTENT_TABS: Record<string, string> = {
  build_site: "storefront",
  marketing: "marketing",
  finance: "finance",
  orders: "orders",
  inventory: "inventory",
  analytics: "dashboard",
  automation: "workflows",
  ab_test: "abtests",
  agents: "ai_team",
  products: "products",
  other: "advisor",
};

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
    const prompt = String(body.prompt || "").trim().slice(0, 1500);
    if (!partnerId) return json({ error: "partner_id required" }, 400);
    if (!prompt) return json({ error: "prompt required" }, 400);

    const { data: partner } = await supabase
      .from("partners").select("id, full_name, company_name, coupon_code")
      .eq("id", partnerId).eq("user_id", user.id).maybeSingle();
    if (!partner) return json({ error: "not_partner" }, 403);

    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [ordersRes, productsRes, sfRes] = await Promise.all([
      supabase.from("partner_orders").select("total_huf,partner_payout_huf,status,created_at")
        .eq("partner_id", partnerId).gte("created_at", since).limit(500),
      supabase.from("partner_products").select("title,price_huf,stock_qty,status,view_count,sales_count")
        .eq("partner_id", partnerId).limit(200),
      supabase.from("partner_storefronts").select("store_name,is_published,custom_domain,custom_domain_status")
        .eq("partner_id", partnerId).maybeSingle(),
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const sf: any = sfRes.data || null;
    const revenue = orders.reduce((s: number, o: any) => s + Number(o.partner_payout_huf || o.total_huf || 0), 0);
    const views = products.reduce((s: number, p: any) => s + Number(p.view_count || 0), 0);
    const sales = products.reduce((s: number, p: any) => s + Number(p.sales_count || 0), 0);

    const ctx = {
      partner: partner.company_name || partner.full_name,
      webshop: sf ? { nev: sf.store_name, publikalt: sf.is_published, domain: sf.custom_domain, domain_status: sf.custom_domain_status } : null,
      utolso_30_nap: {
        bevetel_ft: revenue,
        rendelesek: orders.length,
        fuggo_rendelesek: orders.filter((o: any) => ["pending", "new", "processing"].includes(String(o.status))).length,
        atlag_kosar_ft: orders.length ? Math.round(revenue / orders.length) : 0,
      },
      termekek: {
        osszes: products.length,
        elo: products.filter((p: any) => p.status === "active").length,
        elfogyott: products.filter((p: any) => Number(p.stock_qty || 0) === 0).length,
        megtekintes: views, eladas: sales,
        konverzio_pct: views ? Number(((sales / views) * 100).toFixed(2)) : 0,
        top: products.sort((a: any, b: any) => Number(b.sales_count || 0) - Number(a.sales_count || 0)).slice(0, 8)
          .map((p: any) => ({ cim: p.title, ar: p.price_huf, keszlet: p.stock_qty, eladas: p.sales_count })),
      },
    };

    const sys = `Te az "Egyszerű de Nagyszerű" AI üzleti cockpit parancsértelmezője vagy. A partner magyarul mond egy feladatot vagy kérdést.
Ismerd fel a szándékot, válaszolj a saját adatai alapján, és javasolj konkrét következő lépéseket.

Szándék típusok: build_site (weboldal/webshop/landing építés, dizájn módosítás), marketing (kampány, poszt, hirdetés, e-mail, kupon),
finance (bevétel, jutalék, árrés, profit, költség), orders (rendelés, ügyfél, szállítás), inventory (készlet, árazás, beszerzés),
analytics (miért csökkent/nőtt, elemzés, KPI), automation (ha-akkor szabály, workflow), ab_test (A/B teszt, CTR, konverzió teszt),
agents (AI ügynök, csapat, marketplace), products (termékfeltöltés, termékadatok), other (egyéb).

Válasz KIZÁRÓLAG JSON-ban:
{"intent":"...","title":"rövid magyar cím","answer":"2-5 mondat magyarul, konkrét számokkal az adatokból","steps":["konkrét lépés 1","lépés 2","lépés 3"],"agents":["Marketing AI","SEO AI"],"needs_approval":true|false,"cta_label":"pl. Marketing megnyitása"}
Max 5 lépés, max 4 ügynök. needs_approval legyen true, ha valódi üzleti változtatás (publikálás, árváltozás, kampányindítás) következne.`;

    const raw = await callAI(sys, `ADATOK:\n${JSON.stringify(ctx)}\n\nPARTNER KÉRÉSE: ${prompt}`);
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { intent: "other", title: "Válasz", answer: String(raw).slice(0, 800), steps: [], agents: [], needs_approval: false }; }

    const intent = INTENT_TABS[parsed.intent] ? parsed.intent : "other";
    return json({
      intent,
      target_tab: INTENT_TABS[intent],
      title: String(parsed.title || "AI válasz").slice(0, 120),
      answer: String(parsed.answer || "").slice(0, 2000),
      steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 5).map((s: any) => String(s).slice(0, 240)) : [],
      agents: Array.isArray(parsed.agents) ? parsed.agents.slice(0, 4).map((s: any) => String(s).slice(0, 40)) : [],
      needs_approval: Boolean(parsed.needs_approval),
      cta_label: String(parsed.cta_label || "Megnyitom").slice(0, 40),
      context: ctx.utolso_30_nap,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    console.error("[partner-command-router]", msg);
    return json({ error: msg }, msg === "rate_limit" ? 429 : msg === "credits_exhausted" ? 402 : 500);
  }
});

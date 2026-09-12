// Partner OS – Business Pulse: a partner saját adataiból determinisztikus KPI-t,
// üzleti egészséget, prioritásokat és eseményeket állít össze, majd az AI-tól
// CSAK értelmezést kér. Az AI nem számol és nem talál ki üzleti számot.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { aiChat } from "../_shared/ai-router.ts";
import { computeBusinessPulse, type PulseResult } from "../_shared/business-pulse.ts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BRIEFING_SYSTEM = `Te az "Egyszerű de Nagyszerű" Partner OS üzleti elemzője vagy.
KAPSZ egy strukturált, már kiszámolt üzleti adatcsomagot. A feladatod KIZÁRÓLAG az értelmezés magyarul.

SZIGORÚ SZABÁLYOK:
- SOHA ne találj ki számot, százalékot vagy trendet. Csak a kapott adatokban szereplő értékeket használhatod.
- Ha egy adat null vagy hiányzik, írd: "Nincs elegendő adat."
- Rövid, tárgyilagos, üzleti hangnem. Mondatonként max 25 szó.

Válasz KIZÁRÓLAG JSON-ban:
{"summary":"1 mondat az üzlet állapotáról","positive":"1-2 mondat","problem":"1-2 mondat","opportunity":"1-2 mondat","warning":"1-2 mondat","priority":"1 mondat a mai első teendőről"}`;

async function buildBriefing(facts: Record<string, unknown>) {
  try {
    const { content } = await aiChat({
      system: BRIEFING_SYSTEM,
      user: `ÜZLETI ADATOK (elmúlt 30 nap):\n${JSON.stringify(facts)}`,
      jsonMode: true,
      cloudModel: "google/gemini-3.8-flash",
      functionName: "partner-business-pulse",
    });
    const parsed = JSON.parse(content);
    const s = (v: unknown) => String(v ?? "").slice(0, 400);
    return {
      available: true,
      summary: s(parsed.summary),
      positive: s(parsed.positive),
      problem: s(parsed.problem),
      opportunity: s(parsed.opportunity),
      warning: s(parsed.warning),
      priority: s(parsed.priority),
    };
  } catch (e) {
    console.error("[partner-business-pulse] briefing_failed", e instanceof Error ? e.message : "unknown");
    return { available: false, error: "Az AI jelentés most nem érhető el. Az üzleti adatok elérhetők." };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = Date.now();
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
    const withBriefing = body.briefing !== false;
    if (!partnerId || partnerId.length > 64) return json({ error: "partner_id required" }, 400);

    // A frontendből érkező partner_id önmagában nem hiteles: ellenőrizzük a kapcsolatot.
    const { data: partner } = await supabase
      .from("partners").select("id, full_name, company_name")
      .eq("id", partnerId).eq("user_id", user.id).maybeSingle();
    if (!partner) return json({ error: "not_partner" }, 403);

    const since = new Date(Date.now() - 60 * 864e5).toISOString();
    const [ordersRes, productsRes, sfRes, shipRes] = await Promise.all([
      supabase.from("partner_orders")
        .select("total_huf,partner_payout_huf,status,created_at,customer_email")
        .eq("partner_id", partnerId).gte("created_at", since).limit(2000),
      supabase.from("partner_products")
        .select("id,title,price_huf,stock_qty,status,view_count,sales_count")
        .eq("partner_id", partnerId).limit(500),
      supabase.from("partner_storefronts")
        .select("id,store_name,is_published,custom_domain,custom_domain_status,seo_title,seo_description")
        .eq("partner_id", partnerId).maybeSingle(),
      supabase.from("partner_shipping_methods").select("id").eq("partner_id", partnerId).eq("is_active", true),
    ]);

    let customerCount = 0;
    const storefrontId = (sfRes.data as any)?.id;
    if (storefrontId) {
      const { count } = await supabase.from("storefront_customers")
        .select("id", { count: "exact", head: true }).eq("storefront_id", storefrontId);
      customerCount = count || 0;
    }

    const pulse: PulseResult = computeBusinessPulse({
      now: new Date().toISOString(),
      orders: (ordersRes.data as any[]) || [],
      products: (productsRes.data as any[]) || [],
      storefront: (sfRes.data as any) || null,
      customerCount,
      shippingMethodCount: (shipRes.data as any[])?.length || 0,
      paymentProviderActive: Boolean(Deno.env.get("STRIPE_SECRET_KEY")),
    });

    const briefing = withBriefing ? await buildBriefing(pulse.ai_facts) : { available: false, error: "Nincs kérve." };

    return json({
      ...pulse,
      partner: { id: partner.id, name: partner.company_name || partner.full_name },
      briefing,
      execution_ms: Date.now() - startedAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    console.error("[partner-business-pulse]", msg);
    return json({ error: msg }, 500);
  }
});

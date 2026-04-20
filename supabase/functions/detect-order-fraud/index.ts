// AI csalásgyanú felismerő edge function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface RuleSignal {
  type: string;
  description: string;
  weight: number;
}

async function ruleBasedSignals(supabase: any, order: any): Promise<RuleSignal[]> {
  const signals: RuleSignal[] = [];
  const items = Array.isArray(order.items) ? order.items : [];
  const total = Number(order.total_amount || 0);

  // 1. Nagy összeg
  if (total > 200000) signals.push({ type: "high_value", description: `Magas érték: ${total.toLocaleString("hu-HU")} Ft`, weight: 25 });
  if (total > 500000) signals.push({ type: "very_high_value", description: "Rendkívül magas érték", weight: 20 });

  // 2. Sok azonos termék
  for (const it of items) {
    if ((it.quantity || 0) >= 10) signals.push({ type: "bulk_qty", description: `Tömeges mennyiség: ${it.quantity}× ${it.name}`, weight: 15 });
  }

  // 3. Hiányzó adatok
  if (!order.shipping_phone) signals.push({ type: "missing_phone", description: "Nincs telefonszám", weight: 10 });
  if (!order.shipping_zip) signals.push({ type: "missing_zip", description: "Nincs irányítószám", weight: 10 });
  if (!order.shipping_address) signals.push({ type: "missing_address", description: "Nincs cím", weight: 20 });

  // 4. Gyakori e-mail az utóbbi 1 órában (ugyanaz a vásárló többször)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_email", order.customer_email)
    .gte("created_at", oneHourAgo);
  if (recentCount && recentCount >= 3) signals.push({ type: "rapid_orders", description: `${recentCount} rendelés 1 órán belül ugyanattól`, weight: 30 });

  // 5. Gyanús e-mail minta
  if (/^[a-z0-9]{20,}@/.test(order.customer_email || "")) signals.push({ type: "random_email", description: "Random e-mail minta", weight: 15 });
  if (/\+\d+@/.test(order.customer_email || "")) signals.push({ type: "plus_alias", description: "Plus aliasos e-mail", weight: 5 });

  // 6. Készpénzes magas érték
  if (order.payment_method === "cod" && total > 100000) signals.push({ type: "cod_high", description: "Utánvét magas összeggel", weight: 20 });

  return signals;
}

async function aiAnalysis(order: any, signals: RuleSignal[]): Promise<string> {
  if (!LOVABLE_API_KEY) return "AI elemzés nem elérhető";
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Csalásfelismerő szakértő vagy magyar webshopnál. Röviden (max 3 mondat) értékeld a rendelést." },
          { role: "user", content: `Rendelés:\n- E-mail: ${order.customer_email}\n- Összeg: ${order.total_amount} Ft\n- Fizetés: ${order.payment_method}\n- Cím: ${order.shipping_address || "?"}, ${order.shipping_city || "?"}\n- Tételek: ${(order.items || []).length} db\n\nFelismert jelzések:\n${signals.map(s => `- ${s.description} (+${s.weight})`).join("\n") || "Nincs"}` },
        ],
      }),
    });
    if (!resp.ok) return `AI hiba: ${resp.status}`;
    const j = await resp.json();
    return j.choices?.[0]?.message?.content || "Nincs AI vélemény";
  } catch (e) {
    return `AI elemzés hiba: ${e instanceof Error ? e.message : "?"}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body.orderId;

    let orders: any[];
    if (orderId) {
      const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).single();
      if (error || !data) throw new Error("Rendelés nem található");
      orders = [data];
    } else {
      // Az utolsó 24 óra rendelései, amikre még nincs jelzés
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      orders = data || [];
    }

    const results: any[] = [];
    for (const order of orders) {
      // Skip ha már van friss jelzés (utolsó 1 órás)
      const { data: recent } = await supabase
        .from("fraud_signals")
        .select("id")
        .eq("order_id", order.id)
        .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .maybeSingle();
      if (recent && !orderId) continue;

      const signals = await ruleBasedSignals(supabase, order);
      const score = Math.min(100, signals.reduce((s, x) => s + x.weight, 0));
      const level = score >= 70 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";

      let reasoning = "";
      if (score >= 25) {
        reasoning = await aiAnalysis(order, signals);
      }

      const { data: row, error: insErr } = await supabase.from("fraud_signals").insert({
        order_id: order.id,
        risk_score: score,
        risk_level: level,
        signals,
        ai_reasoning: reasoning,
      }).select().single();
      if (insErr) {
        console.error("fraud insert error", insErr);
        continue;
      }

      if (score >= 50) {
        await supabase.from("order_events").insert({
          order_id: order.id,
          event_type: "fraud_flag",
          triggered_by: "ai",
          metadata: { score, level, signal_count: signals.length },
        });
      }

      results.push({ order_id: order.id, score, level, signal_count: signals.length });
    }

    return new Response(JSON.stringify({ ok: true, analyzed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-order-fraud error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "ismeretlen" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

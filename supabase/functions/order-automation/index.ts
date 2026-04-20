// Rendelés automatizáció cron: auto-cancel, emlékeztető, számlagenerálás
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: settings } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
    if (!settings) throw new Error("Nincs store_settings");

    const stats = { reminded: 0, cancelled: 0, invoiced: 0, fraud_blocked: 0, errors: [] as string[] };

    // 1. Emlékeztető küldése: 'pending' rendelések X óra után
    if (settings.order_reminder_enabled) {
      const reminderHours = Number(settings.order_reminder_after_hours || 6);
      const reminderCutoff = new Date(Date.now() - reminderHours * 60 * 60 * 1000).toISOString();

      const { data: pending } = await supabase
        .from("orders")
        .select("id, customer_email, shipping_name, total_amount, created_at")
        .eq("status", "pending")
        .lt("created_at", reminderCutoff)
        .limit(50);

      for (const o of pending || []) {
        // Skip ha már küldtünk emlékeztetőt
        const { data: alreadySent } = await supabase
          .from("order_events")
          .select("id")
          .eq("order_id", o.id)
          .eq("event_type", "reminder_sent")
          .maybeSingle();
        if (alreadySent) continue;

        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "abandoned-cart-reminder",
              recipientEmail: o.customer_email,
              idempotencyKey: `order-reminder-${o.id}`,
              templateData: { name: o.shipping_name || "Vásárló", amount: o.total_amount },
            },
          });
          await supabase.from("order_events").insert({
            order_id: o.id,
            event_type: "reminder_sent",
            triggered_by: "cron",
          });
          stats.reminded++;
        } catch (e) {
          stats.errors.push(`reminder ${o.id}: ${e instanceof Error ? e.message : "?"}`);
        }
      }
    }

    // 2. Auto-cancel: 'pending' rendelések X óra után
    const cancelHours = Number(settings.order_auto_cancel_hours || 48);
    if (cancelHours > 0) {
      const cancelCutoff = new Date(Date.now() - cancelHours * 60 * 60 * 1000).toISOString();
      const { data: stale } = await supabase
        .from("orders")
        .select("id")
        .eq("status", "pending")
        .lt("created_at", cancelCutoff)
        .limit(100);

      for (const o of stale || []) {
        const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", o.id);
        if (error) {
          stats.errors.push(`cancel ${o.id}: ${error.message}`);
          continue;
        }
        await supabase.from("order_events").insert({
          order_id: o.id,
          event_type: "auto_cancelled",
          triggered_by: "cron",
          metadata: { reason: `${cancelHours}h után fizetetlen` },
        });
        stats.cancelled++;
      }
    }

    // 3. Auto-számla: paid/shipped/completed rendelésekhez, ha még nincs
    if (settings.invoice_auto_generate) {
      const { data: needsInvoice } = await supabase
        .from("orders")
        .select("id")
        .in("status", ["paid", "shipped", "completed"])
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(50);

      for (const o of needsInvoice || []) {
        const { data: existing } = await supabase.from("invoices").select("id").eq("order_id", o.id).maybeSingle();
        if (existing) continue;
        try {
          await supabase.functions.invoke("generate-invoice", { body: { orderId: o.id } });
          stats.invoiced++;
        } catch (e) {
          stats.errors.push(`invoice ${o.id}: ${e instanceof Error ? e.message : "?"}`);
        }
      }
    }

    // 4. Auto-block magas kockázatú rendelések
    if (settings.fraud_detection_enabled) {
      const threshold = Number(settings.fraud_auto_block_threshold || 80);
      const { data: highRisk } = await supabase
        .from("fraud_signals")
        .select("order_id, risk_score, reviewed")
        .gte("risk_score", threshold)
        .eq("reviewed", false)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      for (const fs of highRisk || []) {
        const { data: ord } = await supabase.from("orders").select("status").eq("id", fs.order_id).maybeSingle();
        if (!ord || ord.status === "cancelled") continue;
        await supabase.from("orders").update({ status: "cancelled", notes: `[AUTO-BLOKK] Csalásgyanú pontszám: ${fs.risk_score}` }).eq("id", fs.order_id);
        await supabase.from("order_events").insert({
          order_id: fs.order_id,
          event_type: "fraud_blocked",
          triggered_by: "ai",
          metadata: { score: fs.risk_score },
        });
        stats.fraud_blocked++;
      }
    }

    // 5. Új rendelések fraud-elemzése
    if (settings.fraud_detection_enabled) {
      try {
        await supabase.functions.invoke("detect-order-fraud", { body: {} });
      } catch (e) {
        stats.errors.push(`fraud: ${e instanceof Error ? e.message : "?"}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, stats, ts: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("order-automation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "?" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

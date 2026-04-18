import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { product_name, quantity, stock, threshold, supplier, address, procurement_order_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("store_settings")
      .select("auto_procurement_notify_email, auto_procurement_notify_enabled, contact_email, store_name")
      .limit(1)
      .maybeSingle();

    if (!settings?.auto_procurement_notify_enabled) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipient = settings.auto_procurement_notify_email || settings.contact_email;
    if (!recipient) {
      return new Response(JSON.stringify({ error: "No recipient configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <h2>🛒 Automatikus beszerzés készült</h2>
      <p><strong>Termék:</strong> ${product_name}</p>
      <p><strong>Mennyiség:</strong> ${quantity} db</p>
      <p><strong>Aktuális készlet:</strong> ${stock} db (küszöb: ${threshold})</p>
      <p><strong>Beszállító:</strong> ${supplier}</p>
      <p><strong>Szállítási cím:</strong> ${address}</p>
      <p><strong>Beszerzési azonosító:</strong> ${procurement_order_id}</p>
      <p>Kérjük, hagyd jóvá az adminisztrációs felületen.</p>
    `;

    await supabase.functions.invoke("send-transactional-email", {
      body: {
        to: recipient,
        subject: `🛒 Auto-rendelés: ${product_name} (${quantity} db)`,
        html,
        template_name: "auto-procurement-notification",
        idempotency_key: `auto-proc-${procurement_order_id}`,
        purpose: "transactional",
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-auto-procurement error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

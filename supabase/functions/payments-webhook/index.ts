import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const env = url.searchParams.get("env") || "sandbox";
    
    const webhookSecretName = env === "live" 
      ? "PAYMENTS_LIVE_WEBHOOK_SECRET" 
      : "PAYMENTS_SANDBOX_WEBHOOK_SECRET";
    
    const webhookSecret = Deno.env.get(webhookSecretName);
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    if (!webhookSecret || !signature) {
      console.error("Missing webhook secret or signature");
      return new Response("Unauthorized", { status: 401 });
    }

    // Import Stripe for verification
    const Stripe = (await import("https://esm.sh/stripe@17.7.0?target=deno&no-check")).default;
    const stripe = new Stripe(webhookSecret, { apiVersion: "2025-03-31.basil" });
    
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await supabase.from("orders").update({
            status: "confirmed",
            payment_method: "card",
          }).eq("id", orderId);
          console.log(`Order ${orderId} confirmed via Stripe`);
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await supabase.from("orders").update({
            status: "cancelled",
          }).eq("id", orderId);
          console.log(`Order ${orderId} cancelled - payment expired`);
        }
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    return new Response("Webhook handler failed", { status: 500 });
  }
});

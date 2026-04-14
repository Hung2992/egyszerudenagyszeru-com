import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("Received event:", event.type, "env:", env);

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
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";
import { getOrderItemCount, sendOrderConfirmationEmail } from "../_shared/send-order-confirmation.ts";

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
          const { data: existingOrder, error: orderLookupError } = await supabase
            .from("orders")
            .select("id, status, total_amount, shipping_name, items, customer_email")
            .eq("id", orderId)
            .maybeSingle();

          if (orderLookupError) {
            console.error(`Failed to load order ${orderId}:`, orderLookupError);
            break;
          }

          if (!existingOrder) {
            console.error(`Order ${orderId} not found for Stripe confirmation`);
            break;
          }

          if (existingOrder.status !== "confirmed") {
            await supabase.from("orders").update({
              status: "confirmed",
              payment_method: "card",
            }).eq("id", orderId);

            const recipientEmail =
              session.customer_details?.email ||
              session.customer_email ||
              session.metadata?.customer_email ||
              existingOrder.customer_email ||
              null;

            try {
              await sendOrderConfirmationEmail({
                supabaseUrl: Deno.env.get("SUPABASE_URL")!,
                functionAuthKey: Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
                recipientEmail,
                orderId,
                customerName: existingOrder.shipping_name,
                totalAmount: existingOrder.total_amount,
                itemCount: getOrderItemCount(existingOrder.items),
              });
            } catch (emailError) {
              console.error(`Order confirmation email failed for ${orderId}:`, emailError);
            }
          }

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

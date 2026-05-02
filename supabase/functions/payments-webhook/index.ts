import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";
import { getOrderItemCount, sendOrderConfirmationEmail } from "../_shared/send-order-confirmation.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function sendPaymentConfirmationEmail({
  recipientEmail,
  orderId,
  customerName,
  totalAmount,
}: {
  recipientEmail: string | null;
  orderId: string;
  customerName?: string | null;
  totalAmount?: number | null;
}) {
  if (!recipientEmail) return;

  const formattedTotal = Number.isFinite(Number(totalAmount))
    ? Number(totalAmount).toLocaleString("hu-HU")
    : undefined;

  const { data, error } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "payment-confirmation",
      recipientEmail,
      idempotencyKey: `payment-confirm-${orderId}`,
      templateData: {
        name: customerName ?? undefined,
        totalAmount: formattedTotal,
        paymentMethod: "Bankkártya",
      },
    },
  });

  if (error) throw new Error(error.message || "Payment confirmation invoke failed");
  if (data?.error) throw new Error(data.error);
  if (data?.success === false && data?.reason !== "email_suppressed") {
    throw new Error(data?.reason || "Payment confirmation failed");
  }
}

async function notifyAdminNewOrder(orderId: string, totalAmount: number, customerName: string | null) {
  try {
    // Insert admin notification
    await supabase.from("admin_notifications" as any).insert({
      type: "new_order",
      title: `Új rendelés: #${orderId.slice(0, 8)}`,
      message: `${customerName || "Vendég"} — ${totalAmount.toLocaleString()} Ft`,
      data: { order_id: orderId, total_amount: totalAmount },
      is_read: false,
    });
  } catch (e) {
    console.error("Admin notification insert failed:", e);
  }
}

async function notifyAdminPaymentIssue(orderId: string, reason: string) {
  try {
    await supabase.from("admin_notifications" as any).insert({
      type: "payment_issue",
      title: `Fizetési probléma: #${orderId.slice(0, 8)}`,
      message: reason,
      data: { order_id: orderId, failure_reason: reason },
      is_read: false,
    });
  } catch (e) {
    console.error("Admin payment issue notification failed:", e);
  }
}

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

          // Only update if webhook confirms - this IS the security gate
          if (existingOrder.status !== "confirmed") {
            await supabase.from("orders").update({
              status: "confirmed",
              payment_method: "card",
              payment_verified_at: new Date().toISOString(),
              stripe_session_id: session.id,
            }).eq("id", orderId);

            // Notify admin about new confirmed order
            await notifyAdminNewOrder(orderId, existingOrder.total_amount, existingOrder.shipping_name);

            const recipientEmail =
              session.customer_details?.email ||
              session.customer_email ||
              session.metadata?.customer_email ||
              existingOrder.customer_email ||
              null;

            try {
              await sendOrderConfirmationEmail({
                supabaseUrl: Deno.env.get("SUPABASE_URL")!,
                supabaseServiceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                recipientEmail,
                orderId,
                customerName: existingOrder.shipping_name,
                totalAmount: existingOrder.total_amount,
                itemCount: getOrderItemCount(existingOrder.items),
              });
            } catch (emailError) {
              console.error(`Order confirmation email failed for ${orderId}:`, emailError);
            }

            try {
              await sendPaymentConfirmationEmail({
                recipientEmail,
                orderId,
                customerName: existingOrder.shipping_name,
                totalAmount: existingOrder.total_amount,
              });
            } catch (emailError) {
              console.error(`Payment confirmation email failed for ${orderId}:`, emailError);
            }
          }

          console.log(`Order ${orderId} confirmed via Stripe webhook`);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await supabase.from("orders").update({
            status: "cancelled",
            failure_reason: "Fizetési munkamenet lejárt",
          }).eq("id", orderId);

          await notifyAdminPaymentIssue(orderId, "Fizetési munkamenet lejárt — a vásárló nem fejezte be a fizetést");
          console.log(`Order ${orderId} cancelled - payment expired`);
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          const failureMsg = session.payment_intent?.last_payment_error?.message || "Fizetés sikertelen";
          await supabase.from("orders").update({
            status: "awaiting_payment",
            failure_reason: failureMsg,
          }).eq("id", orderId);

          await notifyAdminPaymentIssue(orderId, failureMsg);
          console.log(`Order ${orderId} payment failed: ${failureMsg}`);
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object;
        const reason = dispute.reason || "Visszaterhelés";
        await notifyAdminPaymentIssue(
          dispute.metadata?.order_id || dispute.payment_intent || "unknown",
          `Visszaterhelés (dispute): ${reason} — ${(dispute.amount / 100).toLocaleString()} ${dispute.currency?.toUpperCase()}`
        );
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check — only admins
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader);
    if (authErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) return jsonResponse({ error: "Admin access required" }, 403);

    const { orderId, amount, reason, environment } = await req.json();

    if (!orderId || typeof orderId !== "string") {
      return jsonResponse({ error: "orderId is required" }, 400);
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return jsonResponse({ error: "Valid positive amount is required" }, 400);
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    // Find Stripe checkout session by order_id metadata
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    // Search for session with matching order_id in metadata
    let paymentIntentId: string | null = null;
    let totalPaidCents = 0;

    // Try searching sessions - Stripe search may not be available via gateway,
    // so we also check the order for any stored payment info
    for (const session of sessions.data) {
      if (session.metadata?.order_id === orderId && session.payment_intent) {
        paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id;
        totalPaidCents = session.amount_total || 0;
        break;
      }
    }

    // If not found in recent sessions, try expanding the search
    if (!paymentIntentId) {
      // Try with more sessions
      const moreSessions = await stripe.checkout.sessions.list({ limit: 100 });
      for (const session of moreSessions.data) {
        if (session.metadata?.order_id === orderId && session.payment_intent) {
          paymentIntentId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id;
          totalPaidCents = session.amount_total || 0;
          break;
        }
      }
    }

    if (!paymentIntentId) {
      return jsonResponse({
        error: "Nem található Stripe fizetés ehhez a rendeléshez. Lehet, hogy nem kártyával fizettek.",
        stripe_not_found: true,
      }, 404);
    }

    // Convert HUF amount to Stripe cents (HUF uses *100 in Stripe)
    const refundAmountCents = Math.round(amount * 100);

    // Check existing refunds on this payment intent
    const existingRefunds = await stripe.refunds.list({
      payment_intent: paymentIntentId,
      limit: 100,
    });
    const alreadyRefundedCents = existingRefunds.data
      .filter(r => r.status === "succeeded" || r.status === "pending")
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    if (alreadyRefundedCents + refundAmountCents > totalPaidCents) {
      return jsonResponse({
        error: `Túl magas visszatérítés! Fizetve: ${(totalPaidCents / 100).toLocaleString()} Ft, már visszatérítve: ${(alreadyRefundedCents / 100).toLocaleString()} Ft`,
        already_refunded: alreadyRefundedCents / 100,
        total_paid: totalPaidCents / 100,
      }, 400);
    }

    // Process the actual Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmountCents,
      reason: "requested_by_customer",
      metadata: {
        order_id: orderId,
        admin_user_id: user.id,
        reason: reason || "Visszatérítés",
      },
    });

    console.log(`Stripe refund created: ${refund.id} for order ${orderId}, amount: ${amount} HUF, status: ${refund.status}`);

    return jsonResponse({
      success: true,
      refund_id: refund.id,
      status: refund.status,
      amount: amount,
      currency: "HUF",
      payment_intent_id: paymentIntentId,
      already_refunded_total: (alreadyRefundedCents + refundAmountCents) / 100,
      total_paid: totalPaidCents / 100,
    });
  } catch (error: unknown) {
    console.error("Stripe refund error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});

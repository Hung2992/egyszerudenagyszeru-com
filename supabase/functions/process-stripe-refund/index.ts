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

    const body = await req.json();
    const { action } = body;

    // Route to different actions
    if (action === "check_payment") {
      return await handleCheckPayment(body, supabase);
    }
    if (action === "check_refund_status") {
      return await handleCheckRefundStatus(body);
    }
    if (action === "batch_refund") {
      return await handleBatchRefund(body, supabase, user.id);
    }

    // Default: process single refund
    return await handleSingleRefund(body, supabase, user.id);
  } catch (error: unknown) {
    console.error("Stripe refund error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});

// ====== CHECK PAYMENT — Fetch Stripe payment info for an order ======
async function handleCheckPayment(body: any, supabase: any) {
  const { orderId, environment } = body;
  if (!orderId) return jsonResponse({ error: "orderId is required" }, 400);

  const env = (environment || "sandbox") as StripeEnv;
  const stripe = createStripeClient(env);

  const result = await findPaymentIntent(stripe, orderId);
  if (!result) {
    return jsonResponse({
      found: false,
      message: "Nem található Stripe fizetés ehhez a rendeléshez.",
    });
  }

  // Get existing refunds
  const existingRefunds = await stripe.refunds.list({
    payment_intent: result.paymentIntentId,
    limit: 100,
  });

  const refundsList = existingRefunds.data.map((r: any) => ({
    id: r.id,
    amount: (r.amount || 0) / 100,
    status: r.status,
    created: r.created ? new Date(r.created * 1000).toISOString() : null,
    reason: r.reason,
  }));

  const totalRefundedCents = existingRefunds.data
    .filter((r: any) => r.status === "succeeded" || r.status === "pending")
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  return jsonResponse({
    found: true,
    payment_intent_id: result.paymentIntentId,
    total_paid: result.totalPaidCents / 100,
    total_refunded: totalRefundedCents / 100,
    remaining: (result.totalPaidCents - totalRefundedCents) / 100,
    currency: "HUF",
    refunds: refundsList,
    refund_count: refundsList.length,
  });
}

// ====== CHECK REFUND STATUS ======
async function handleCheckRefundStatus(body: any) {
  const { refundId, environment } = body;
  if (!refundId) return jsonResponse({ error: "refundId is required" }, 400);

  const env = (environment || "sandbox") as StripeEnv;
  const stripe = createStripeClient(env);

  const refund = await stripe.refunds.retrieve(refundId);
  return jsonResponse({
    id: refund.id,
    status: refund.status,
    amount: (refund.amount || 0) / 100,
    currency: refund.currency,
    created: refund.created ? new Date(refund.created * 1000).toISOString() : null,
    reason: refund.reason,
    failure_reason: (refund as any).failure_reason || null,
  });
}

// ====== BATCH REFUND ======
async function handleBatchRefund(body: any, supabase: any, adminUserId: string) {
  const { orders, environment } = body;
  if (!Array.isArray(orders) || orders.length === 0) {
    return jsonResponse({ error: "orders array is required" }, 400);
  }
  if (orders.length > 20) {
    return jsonResponse({ error: "Maximum 20 rendelés egyszerre" }, 400);
  }

  const env = (environment || "sandbox") as StripeEnv;
  const stripe = createStripeClient(env);
  const results: any[] = [];

  for (const order of orders) {
    const { orderId, amount, reason } = order;
    try {
      const result = await findPaymentIntent(stripe, orderId);
      if (!result) {
        results.push({ orderId, success: false, error: "Stripe fizetés nem található" });
        continue;
      }

      const refundAmountCents = Math.round(amount * 100);

      // Check existing refunds
      const existingRefunds = await stripe.refunds.list({
        payment_intent: result.paymentIntentId,
        limit: 100,
      });
      const alreadyRefundedCents = existingRefunds.data
        .filter((r: any) => r.status === "succeeded" || r.status === "pending")
        .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

      if (alreadyRefundedCents + refundAmountCents > result.totalPaidCents) {
        results.push({
          orderId,
          success: false,
          error: `Túl magas: fizetve ${result.totalPaidCents / 100} Ft, már visszatérítve ${alreadyRefundedCents / 100} Ft`,
        });
        continue;
      }

      const refund = await stripe.refunds.create({
        payment_intent: result.paymentIntentId,
        amount: refundAmountCents,
        reason: "requested_by_customer",
        metadata: {
          order_id: orderId,
          admin_user_id: adminUserId,
          reason: reason || "Visszatérítés",
          batch: "true",
        },
      });

      results.push({
        orderId,
        success: true,
        refund_id: refund.id,
        status: refund.status,
        amount,
      });

      console.log(`Batch refund: ${refund.id} for ${orderId}, ${amount} HUF`);
    } catch (err: any) {
      results.push({ orderId, success: false, error: err.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return jsonResponse({
    success: true,
    total: orders.length,
    succeeded: successCount,
    failed: failCount,
    results,
  });
}

// ====== SINGLE REFUND ======
async function handleSingleRefund(body: any, supabase: any, adminUserId: string) {
  const { orderId, amount, reason, environment } = body;

  if (!orderId || typeof orderId !== "string") {
    return jsonResponse({ error: "orderId is required" }, 400);
  }
  if (!amount || typeof amount !== "number" || amount <= 0) {
    return jsonResponse({ error: "Valid positive amount is required" }, 400);
  }

  const env = (environment || "sandbox") as StripeEnv;
  const stripe = createStripeClient(env);

  const result = await findPaymentIntent(stripe, orderId);
  if (!result) {
    return jsonResponse({
      error: "Nem található Stripe fizetés ehhez a rendeléshez. Lehet, hogy nem kártyával fizettek.",
      stripe_not_found: true,
    }, 404);
  }

  const refundAmountCents = Math.round(amount * 100);

  // Check existing refunds
  const existingRefunds = await stripe.refunds.list({
    payment_intent: result.paymentIntentId,
    limit: 100,
  });
  const alreadyRefundedCents = existingRefunds.data
    .filter((r: any) => r.status === "succeeded" || r.status === "pending")
    .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

  if (alreadyRefundedCents + refundAmountCents > result.totalPaidCents) {
    return jsonResponse({
      error: `Túl magas visszatérítés! Fizetve: ${(result.totalPaidCents / 100).toLocaleString()} Ft, már visszatérítve: ${(alreadyRefundedCents / 100).toLocaleString()} Ft`,
      already_refunded: alreadyRefundedCents / 100,
      total_paid: result.totalPaidCents / 100,
    }, 400);
  }

  const refund = await stripe.refunds.create({
    payment_intent: result.paymentIntentId,
    amount: refundAmountCents,
    reason: "requested_by_customer",
    metadata: {
      order_id: orderId,
      admin_user_id: adminUserId,
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
    payment_intent_id: result.paymentIntentId,
    already_refunded_total: (alreadyRefundedCents + refundAmountCents) / 100,
    total_paid: result.totalPaidCents / 100,
    remaining: (result.totalPaidCents - alreadyRefundedCents - refundAmountCents) / 100,
  });
}

// ====== HELPER: Find payment intent by order_id ======
async function findPaymentIntent(stripe: any, orderId: string): Promise<{ paymentIntentId: string; totalPaidCents: number } | null> {
  // Search in recent sessions first
  for (const limit of [10, 100]) {
    const sessions = await stripe.checkout.sessions.list({ limit });
    for (const session of sessions.data) {
      if (session.metadata?.order_id === orderId && session.payment_intent) {
        return {
          paymentIntentId: typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id,
          totalPaidCents: session.amount_total || 0,
        };
      }
    }
    if (limit === 10) continue; // try again with more
    break;
  }
  return null;
}

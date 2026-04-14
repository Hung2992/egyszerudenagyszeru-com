import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
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
    const { orderData, returnUrl, environment } = await req.json();

    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create order first
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      user_id: orderData.user_id || null,
      status: "awaiting_payment",
      total_amount: orderData.total_amount,
      shipping_name: orderData.shipping_name,
      shipping_phone: orderData.shipping_phone,
      shipping_zip: orderData.shipping_zip,
      shipping_city: orderData.shipping_city,
      shipping_address: orderData.shipping_address,
      payment_method: "card",
      coupon_code: orderData.coupon_code || null,
      discount_amount: orderData.discount_amount || null,
      items: orderData.items,
    }).select("id").single();

    if (orderError) {
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    // Stripe treats HUF as 2-decimal currency (fillér) in newer API versions.
    // Prices in DB are in whole HUF, so multiply by 100 for Stripe.
    const toStripeAmount = (huf: number) => Math.round(huf * 100);

    // Build line items for Stripe
    const lineItems = orderData.items.map((item: any) => ({
      price_data: {
        currency: "huf",
        product_data: {
          name: item.name,
          description: [item.size, item.color].filter(Boolean).join(" / ") || undefined,
        },
        unit_amount: toStripeAmount(item.price),
      },
      quantity: item.quantity,
    }));

    // Add gift wrap if present
    if (orderData.gift_wrap_price && orderData.gift_wrap_price > 0) {
      lineItems.push({
        price_data: {
          currency: "huf",
          product_data: { name: "Ajándékcsomagolás" },
          unit_amount: toStripeAmount(orderData.gift_wrap_price),
        },
        quantity: 1,
      });
    }

    // Calculate total in HUF before discount
    const totalHuf = orderData.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
      + (orderData.gift_wrap_price || 0);
    const discountHuf = orderData.discount_amount && orderData.discount_amount > 0 ? orderData.discount_amount : 0;
    const netTotalHuf = totalHuf - discountHuf;

    // Stripe minimum for HUF is 175
    if (netTotalHuf < 175) {
      await supabase.from("orders").delete().eq("id", order.id);
      return new Response(JSON.stringify({ error: "A rendelés összege legalább 175 Ft kell legyen." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add discount as a coupon if present
    const discounts: any[] = [];
    if (discountHuf > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: toStripeAmount(discountHuf),
        currency: "huf",
        duration: "once",
        name: orderData.coupon_code || "Kedvezmény",
      });
      discounts.push({ coupon: coupon.id });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded",
      line_items: lineItems,
      discounts: discounts.length > 0 ? discounts : undefined,
      return_url: `${returnUrl}/checkout/return?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      metadata: {
        order_id: order.id,
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret, order_id: order.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Checkout session error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

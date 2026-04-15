import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  size?: string;
  color?: string;
  quantity: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderData, returnUrl, environment } = await req.json();

    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return jsonResponse({ error: "No items provided", fallback: false }, 400);
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── 1. Validate product prices from DB ──────────────────────────
    const productIds = [...new Set((orderData.items as OrderItem[]).map((i: OrderItem) => i.productId))];
    const { data: products, error: prodErr } = await supabase
      .from("shop_products")
      .select("id, price, stock, is_active")
      .in("id", productIds);

    if (prodErr || !products) {
      return jsonResponse({ error: "Nem sikerült lekérni a termékadatokat.", fallback: true }, 500);
    }

    const priceMap = new Map(products.map((p: any) => [p.id, p]));

    let serverTotal = 0;
    const validatedItems: OrderItem[] = [];
    for (const item of orderData.items as OrderItem[]) {
      const product = priceMap.get(item.productId);
      if (!product) return jsonResponse({ error: `Ismeretlen termék: ${item.name}`, fallback: false }, 400);
      if (!product.is_active) return jsonResponse({ error: `Nem elérhető termék: ${item.name}`, fallback: false }, 400);
      if (product.stock < item.quantity) {
        return jsonResponse({ error: `Nincs elegendő készlet: ${item.name}`, fallback: false }, 400);
      }
      serverTotal += product.price * item.quantity;
      validatedItems.push({ ...item, price: product.price });
    }

    // ── 2. Validate coupon server-side ──────────────────────────────
    let discountHuf = 0;
    let validatedCouponCode: string | null = null;

    if (orderData.coupon_code) {
      const code = orderData.coupon_code.toUpperCase();

      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (coupon) {
        if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
          return jsonResponse({ error: "Ez a kupon lejárt.", fallback: false }, 400);
        }
        if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
          return jsonResponse({ error: "Ez a kupon elfogyott.", fallback: false }, 400);
        }

        if (coupon.discount_percent) {
          discountHuf = Math.round(serverTotal * (coupon.discount_percent / 100));
        } else if (coupon.discount_amount) {
          discountHuf = coupon.discount_amount;
        }
        discountHuf = Math.min(discountHuf, serverTotal);
        validatedCouponCode = coupon.code;

        // Atomic increment with optimistic lock
        const { data: updated, error: updErr } = await supabase
          .from("coupons")
          .update({ used_count: coupon.used_count + 1 })
          .eq("id", coupon.id)
          .eq("used_count", coupon.used_count)
          .select("id")
          .maybeSingle();

        if (updErr || !updated) {
          return jsonResponse({ error: "Kupon érvényesítési hiba, próbáld újra.", fallback: false }, 409);
        }
      } else {
        return jsonResponse({ error: "Érvénytelen kuponkód.", fallback: false }, 400);
      }
    }

    // ── 3. Calculate server-side total ───────────────────────────────
    const giftWrapPrice = typeof orderData.gift_wrap_price === "number" && orderData.gift_wrap_price > 0
      ? orderData.gift_wrap_price : 0;
    const netTotalHuf = serverTotal - discountHuf + giftWrapPrice;

    // Stripe minimum for HUF is 175
    if (netTotalHuf < 175) {
      return jsonResponse({ error: "A rendelés összege legalább 175 Ft kell legyen.", fallback: false }, 200);
    }

    // ── 4. Create order with server-validated amounts ────────────────
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      user_id: orderData.user_id || null,
      status: "awaiting_payment",
      total_amount: netTotalHuf,
      shipping_name: orderData.shipping_name,
      shipping_phone: orderData.shipping_phone,
      shipping_zip: orderData.shipping_zip,
      shipping_city: orderData.shipping_city,
      shipping_address: orderData.shipping_address,
      payment_method: "card",
      coupon_code: validatedCouponCode,
      discount_amount: discountHuf > 0 ? discountHuf : null,
      items: validatedItems,
    }).select("id").single();

    if (orderError) {
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    // ── 5. Build Stripe line items from validated prices ────────────
    const toStripeAmount = (huf: number) => Math.round(huf * 100);

    const lineItems = validatedItems.map((item: OrderItem) => ({
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

    if (giftWrapPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "huf",
          product_data: { name: "Ajándékcsomagolás", description: undefined },
          unit_amount: toStripeAmount(giftWrapPrice),
        },
        quantity: 1,
      });
    }

    const discounts: any[] = [];
    if (discountHuf > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: toStripeAmount(discountHuf),
        currency: "huf",
        duration: "once",
        name: validatedCouponCode || "Kedvezmény",
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

    return jsonResponse({ clientSecret: session.client_secret, order_id: order.id });
  } catch (error: unknown) {
    console.error("Checkout session error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message, fallback: true }, 200);
  }
});

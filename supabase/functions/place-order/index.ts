import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      user_id,
      items,
      coupon_code,
      shipping_name,
      shipping_phone,
      shipping_zip,
      shipping_city,
      shipping_address,
      payment_method,
      notes,
      gift_wrap_price,
    } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return json({ error: "Nincsenek tételek a rendelésben." }, 400);
    }
    if (!shipping_name || !shipping_phone || !shipping_zip || !shipping_city || !shipping_address) {
      return json({ error: "Hiányzó szállítási adatok." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 1. Look up real prices from DB ──────────────────────────────
    const productIds = [...new Set((items as OrderItem[]).map((i) => i.productId))];
    const { data: products, error: prodErr } = await supabase
      .from("shop_products")
      .select("id, price, stock, is_active")
      .in("id", productIds);

    if (prodErr || !products) {
      return json({ error: "Nem sikerült lekérni a termékadatokat." }, 500);
    }

    const priceMap = new Map(products.map((p: any) => [p.id, p]));

    // Validate each item
    let serverTotal = 0;
    const validatedItems: OrderItem[] = [];
    for (const item of items as OrderItem[]) {
      const product = priceMap.get(item.productId);
      if (!product) return json({ error: `Ismeretlen termék: ${item.name}` }, 400);
      if (!product.is_active) return json({ error: `Nem elérhető termék: ${item.name}` }, 400);
      if (product.stock < item.quantity) {
        return json({ error: `Nincs elegendő készlet: ${item.name}` }, 400);
      }
      // Use the DB price, not the client-supplied price
      serverTotal += product.price * item.quantity;
      validatedItems.push({ ...item, price: product.price });
    }

    // ── 2. Validate coupon server-side ──────────────────────────────
    let discountAmount = 0;
    let validatedCouponCode: string | null = null;

    if (coupon_code) {
      const code = coupon_code.toUpperCase();

      // Try coupons table
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (coupon) {
        if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
          return json({ error: "Ez a kupon lejárt." }, 400);
        }
        if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
          return json({ error: "Ez a kupon elfogyott." }, 400);
        }

        if (coupon.discount_percent) {
          discountAmount = Math.round(serverTotal * (coupon.discount_percent / 100));
        } else if (coupon.discount_amount) {
          discountAmount = coupon.discount_amount;
        }
        discountAmount = Math.min(discountAmount, serverTotal);
        validatedCouponCode = coupon.code;

        // Atomically increment used_count with a conditional update
        const { data: updated, error: updErr } = await supabase
          .from("coupons")
          .update({ used_count: coupon.used_count + 1 })
          .eq("id", coupon.id)
          .eq("used_count", coupon.used_count) // optimistic lock
          .select("id")
          .maybeSingle();

        if (updErr || !updated) {
          return json({ error: "Kupon érvényesítési hiba, próbáld újra." }, 409);
        }
      } else {
        return json({ error: "Érvénytelen kuponkód." }, 400);
      }
    }

    // ── 3. Calculate final total ────────────────────────────────────
    const giftWrap = typeof gift_wrap_price === "number" && gift_wrap_price > 0 ? gift_wrap_price : 0;
    const finalTotal = serverTotal - discountAmount + giftWrap;

    if (finalTotal < 0) {
      return json({ error: "Érvénytelen végösszeg." }, 400);
    }

    // ── 4. Insert order ─────────────────────────────────────────────
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user_id || null,
        status: "pending",
        total_amount: finalTotal,
        shipping_name,
        shipping_phone,
        shipping_zip,
        shipping_city,
        shipping_address,
        payment_method: payment_method || "cod",
        coupon_code: validatedCouponCode,
        discount_amount: discountAmount > 0 ? discountAmount : null,
        notes: notes || null,
        items: validatedItems,
      })
      .select("id")
      .single();

    if (orderErr) {
      return json({ error: `Rendelés létrehozási hiba: ${orderErr.message}` }, 500);
    }

    return json({ order_id: order.id, total_amount: finalTotal });
  } catch (err: unknown) {
    console.error("place-order error:", err);
    const msg = err instanceof Error ? err.message : "Ismeretlen hiba";
    return json({ error: msg }, 500);
  }
});

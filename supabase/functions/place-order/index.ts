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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEM_QTY = 99;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── 0. Authenticate caller from JWT ─────────────────────────────
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (authHeader?.startsWith("Bearer ")) {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: authUser }, error: authErr } = await anonClient.auth.getUser();
      if (!authErr && authUser?.id) {
        userId = authUser.id;
      }
    }

    // Service-role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      items,
      coupon_code,
      shipping_name,
      shipping_phone,
      shipping_zip,
      shipping_city,
      shipping_address,
      payment_method,
      notes,
      gift_wrap_id,
    } = await req.json();

    // ── 1. Input validation ─────────────────────────────────────────
    if (!items || !Array.isArray(items) || items.length === 0) {
      return json({ error: "Nincsenek tételek a rendelésben." }, 400);
    }
    if (items.length > 50) {
      return json({ error: "Túl sok tétel a rendelésben." }, 400);
    }
    if (!shipping_name || !shipping_phone || !shipping_zip || !shipping_city || !shipping_address) {
      return json({ error: "Hiányzó szállítási adatok." }, 400);
    }

    // ── 2. Look up real prices from DB ──────────────────────────────
    const productIds = [...new Set((items as OrderItem[]).map((i) => i.productId))];
    for (const pid of productIds) {
      if (!UUID_RE.test(pid)) return json({ error: "Érvénytelen termékazonosító." }, 400);
    }

    const { data: products, error: prodErr } = await supabase
      .from("shop_products")
      .select("id, price, stock, is_active")
      .in("id", productIds);

    if (prodErr || !products) {
      return json({ error: "Nem sikerült lekérni a termékadatokat." }, 500);
    }

    const priceMap = new Map(products.map((p: any) => [p.id, p]));

    let serverTotal = 0;
    const validatedItems: OrderItem[] = [];
    for (const item of items as OrderItem[]) {
      const product = priceMap.get(item.productId);
      if (!product) return json({ error: `Ismeretlen termék: ${item.name}` }, 400);
      if (!product.is_active) return json({ error: `Nem elérhető termék: ${item.name}` }, 400);
      const qty = Math.max(1, Math.min(Math.floor(Number(item.quantity) || 1), MAX_ITEM_QTY));
      if (product.stock < qty) {
        return json({ error: `Nincs elegendő készlet: ${item.name}` }, 400);
      }
      serverTotal += product.price * qty;
      validatedItems.push({ ...item, price: product.price, quantity: qty });
    }

    // ── 3. Validate gift wrap from DB (not from client price) ───────
    let giftWrapPrice = 0;
    if (gift_wrap_id && typeof gift_wrap_id === "string" && UUID_RE.test(gift_wrap_id)) {
      const { data: gw } = await supabase
        .from("gift_wrap_options")
        .select("price")
        .eq("id", gift_wrap_id)
        .eq("is_active", true)
        .maybeSingle();
      if (gw) {
        giftWrapPrice = gw.price;
      }
    }

    // ── 4. Validate coupon server-side ──────────────────────────────
    let discountAmount = 0;
    let validatedCouponCode: string | null = null;

    if (coupon_code && typeof coupon_code === "string") {
      const code = coupon_code.toUpperCase().slice(0, 50);

      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (!coupon) {
        return json({ error: "Érvénytelen kuponkód." }, 400);
      }
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        return json({ error: "Ez a kupon lejárt." }, 400);
      }
      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        return json({ error: "Ez a kupon elfogyott." }, 400);
      }

      if (coupon.discount_percent) {
        discountAmount = Math.round(serverTotal * (coupon.discount_percent / 100));
      } else if (coupon.discount_amount) {
        discountAmount = coupon.discount_amount;
      }
      discountAmount = Math.min(discountAmount, serverTotal);
      validatedCouponCode = coupon.code;

      // Atomically increment used_count with optimistic lock
      const { data: updated, error: updErr } = await supabase
        .from("coupons")
        .update({ used_count: coupon.used_count + 1 })
        .eq("id", coupon.id)
        .eq("used_count", coupon.used_count)
        .select("id")
        .maybeSingle();

      if (updErr || !updated) {
        return json({ error: "Kupon érvényesítési hiba, próbáld újra." }, 409);
      }
    }

    // ── 5. Calculate final total ────────────────────────────────────
    const finalTotal = serverTotal - discountAmount + giftWrapPrice;

    if (finalTotal < 0) {
      return json({ error: "Érvénytelen végösszeg." }, 400);
    }

    // ── 6. Insert order (service role — bypasses RLS) ───────────────
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
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
        notes: typeof notes === "string" ? notes.slice(0, 1000) : null,
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

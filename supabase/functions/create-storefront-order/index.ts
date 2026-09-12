// Nyilvános rendelésleadás partner webshopban.
// Szerver oldalon validál (ár, készlet, termékek), rögzíti a partner_orders sort.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { rateLimitDb } from "../_shared/internal-auth.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PLATFORM_FEE_PCT = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const limited = await rateLimitDb(req, { limit: 10, windowSeconds: 600, key: "storefront-order" });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "invalid_body" }, 400);

  const storeSlug = String(body.store_slug ?? "").trim().slice(0, 120);
  const name = String(body.customer_name ?? "").trim().slice(0, 120);
  const email = String(body.customer_email ?? "").trim().toLowerCase().slice(0, 160);
  const phone = String(body.customer_phone ?? "").trim().slice(0, 40);
  const notes = String(body.notes ?? "").trim().slice(0, 600);
  const paymentMethod = String(body.payment_method ?? "cod").trim().slice(0, 30);
  const addr = (body.shipping_address && typeof body.shipping_address === "object")
    ? body.shipping_address as Record<string, unknown>
    : {};
  const shipping = {
    street: String(addr.street ?? "").trim().slice(0, 200),
    city: String(addr.city ?? "").trim().slice(0, 120),
    zip: String(addr.zip ?? "").trim().slice(0, 20),
    country: String(addr.country ?? "Magyarország").trim().slice(0, 80),
  };
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (!storeSlug) return json({ error: "missing_store" }, 400);
  if (name.length < 2) return json({ error: "invalid_name" }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400);
  if (!rawItems.length || rawItems.length > 30) return json({ error: "invalid_items" }, 400);
  if (!["cod", "transfer", "card"].includes(paymentMethod)) return json({ error: "invalid_payment_method" }, 400);
  const shippingMethodId = String(body.shipping_method_id ?? "").trim();

  const wanted = new Map<string, number>();
  for (const it of rawItems) {
    if (!it || typeof it !== "object") return json({ error: "invalid_items" }, 400);
    const id = String((it as any).product_id ?? "").trim();
    const qty = Math.floor(Number((it as any).qty ?? 0));
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "invalid_items" }, 400);
    if (!Number.isFinite(qty) || qty < 1 || qty > 20) return json({ error: "invalid_quantity" }, 400);
    wanted.set(id, Math.min(20, (wanted.get(id) || 0) + qty));
  }

  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: store } = await svc.from("partner_storefronts")
    .select("partner_id, slug, display_name, is_published")
    .eq("slug", storeSlug).eq("is_published", true).maybeSingle();
  if (!store) return json({ error: "store_not_found" }, 404);

  const { data: products } = await svc.from("partner_products")
    .select("id, title, price_huf, stock_qty, product_type, fulfillment_type, attributes, status, partner_id")
    .eq("partner_id", store.partner_id).eq("status", "active")
    .in("id", [...wanted.keys()]);

  if (!products || products.length !== wanted.size) return json({ error: "product_unavailable" }, 400);

  let subtotal = 0;
  let shippingFee = 0;
  let freeOver: number | null = null;
  let needsAddress = false;
  const items: Record<string, unknown>[] = [];

  for (const p of products) {
    const qty = wanted.get(p.id)!;
    const attrs = (p.attributes && typeof p.attributes === "object" ? p.attributes : {}) as Record<string, unknown>;
    const ptype = String(p.product_type || "");
    const physical = !(ptype.startsWith("digital") || ptype.startsWith("course") || ptype.startsWith("service")
      || ["digital", "course", "service"].includes(String(p.fulfillment_type || "")));
    if (physical) {
      needsAddress = true;
      if (Number(p.stock_qty) < qty) return json({ error: "out_of_stock", product: p.title }, 409);
      const fee = Number(attrs.shipping_fee_huf);
      if (Number.isFinite(fee)) shippingFee = Math.max(shippingFee, Math.max(0, Math.round(fee)));
      const fo = Number(attrs.free_shipping_over_huf);
      if (Number.isFinite(fo) && fo > 0) freeOver = freeOver === null ? fo : Math.min(freeOver, fo);
    }
    const price = Math.max(0, Math.round(Number(p.price_huf) || 0));
    subtotal += price * qty;
    items.push({ product_id: p.id, title: p.title, qty, unit_price_huf: price, line_total_huf: price * qty, physical });
  }

  // Partner saját szállítási módjai (ha vannak, ezek felülírják a termékszintű díjat)
  let shippingMethod: Record<string, unknown> | null = null;
  if (needsAddress) {
    const { data: methods } = await svc.from("partner_shipping_methods")
      .select("id, name, method_type, fee_huf, free_over_huf, requires_address")
      .eq("partner_id", store.partner_id).eq("is_active", true).order("sort_order");

    if (methods && methods.length) {
      const chosen = methods.find((m) => m.id === shippingMethodId);
      if (!chosen) return json({ error: "invalid_shipping_method" }, 400);
      shippingMethod = chosen;
      shippingFee = Math.max(0, Math.round(Number(chosen.fee_huf) || 0));
      const fo = Number(chosen.free_over_huf);
      freeOver = Number.isFinite(fo) && fo > 0 ? fo : null;
      if (chosen.requires_address === false) {
        // személyes átvétel: nem kell cím
        needsAddress = false;
      }
    }
  }

  if (needsAddress && (!shipping.street || !shipping.city || !shipping.zip)) {
    return json({ error: "invalid_address" }, 400);
  }
  if (freeOver !== null && subtotal >= freeOver) shippingFee = 0;
  if (!needsAddress && !shippingMethod) shippingFee = 0;

  const total = subtotal + shippingFee;
  const platformFee = Math.round(total * (PLATFORM_FEE_PCT / 100));

  // bejelentkezett vásárló hozzákötése
  let customerUserId: string | null = null;
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (jwt && jwt !== Deno.env.get("SUPABASE_ANON_KEY")) {
    try {
      const { data: u } = await svc.auth.getUser(jwt);
      if (u?.user?.id) customerUserId = u.user.id;
    } catch { /* vendég rendelés */ }
  }

  const orderNumber = `${store.slug.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const { data: order, error: insErr } = await svc.from("partner_orders").insert({
    partner_id: store.partner_id,
    order_number: orderNumber,
    customer_user_id: customerUserId,
    customer_email: email,
    customer_name: name,
    customer_phone: phone || null,
    shipping_address: needsAddress ? shipping : {},
    items,
    subtotal_huf: subtotal,
    shipping_huf: shippingFee,
    total_huf: total,
    platform_fee_pct: PLATFORM_FEE_PCT,
    platform_fee_huf: platformFee,
    partner_payout_huf: total - platformFee,
    status: "pending",
    payment_method: paymentMethod,
    payment_status: "pending",
    notes: [
      notes || null,
      shippingMethod ? `Szállítási mód: ${shippingMethod.name}` : null,
    ].filter(Boolean).join("\n") || null,
  }).select("id, order_number, total_huf").single();

  if (insErr) return json({ error: "order_failed" }, 502);

  // készlet levonás (fizikai tételek)
  for (const it of items) {
    if (!it.physical) continue;
    const p = products.find((x) => x.id === it.product_id);
    if (!p) continue;
    await svc.from("partner_products")
      .update({ stock_qty: Math.max(0, Number(p.stock_qty) - Number(it.qty)) })
      .eq("id", p.id);
  }

  // Értesítő e-mailek (nem blokkolják a rendelést)
  try {
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`;
    const huf = (n: number) => n.toLocaleString("hu-HU");
    const payMap: Record<string, string> = { cod: "Utánvét", transfer: "Banki átutalás", card: "Bankkártya" };
    const itemsText = items.map((i) => `${i.qty} × ${i.title}`).join(", ");
    const addressText = needsAddress
      ? `${shipping.zip || ""} ${shipping.city || ""}, ${shipping.street || ""}`.trim()
      : "";

    const send = (templateName: string, to: string, data: Record<string, unknown>) =>
      fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
        body: JSON.stringify({ templateName, to, data }),
      }).catch(() => null);

    const { data: partner } = await svc.from("partners").select("email").eq("id", store.partner_id).maybeSingle();

    const tasks: Promise<unknown>[] = [];
    if (partner?.email) {
      tasks.push(send("partner-new-order", partner.email, {
        storeName: store.display_name,
        orderNumber,
        customerName: name,
        customerEmail: email,
        customerPhone: phone || "",
        itemsText,
        subtotal: huf(subtotal),
        shipping: huf(shippingFee),
        total: huf(total),
        shippingMethod: shippingMethod ? String(shippingMethod.name) : "",
        address: addressText,
        paymentMethod: payMap[paymentMethod] || paymentMethod,
      }) as Promise<unknown>);
    }
    tasks.push(send("order-confirmation", email, {
      name,
      totalAmount: huf(total),
      itemCount: items.reduce((s, i) => s + Number(i.qty), 0),
      orderId: orderNumber,
    }) as Promise<unknown>);
    await Promise.allSettled(tasks);
  } catch (_e) { /* az értesítés hibája nem befolyásolja a rendelést */ }

  return json({
    success: true,
    order_id: order.id,
    order_number: order.order_number,
    total_huf: order.total_huf,
    shipping_huf: shippingFee,
    subtotal_huf: subtotal,
  });
});

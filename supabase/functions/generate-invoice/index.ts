// PDF számla generátor edge function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  product_id?: string;
}

function fmtMoney(n: number, currency = "HUF"): string {
  return new Intl.NumberFormat("hu-HU").format(Math.round(n)) + " " + currency;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function buildPdf(opts: {
  invoiceNumber: string;
  store: any;
  order: any;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  issuedAt: Date;
}): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = 210;
  let y = 18;

  // Fejléc
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("SZAMLA", 14, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Szamlaszam: ${opts.invoiceNumber}`, pw - 14, y - 6, { align: "right" });
  doc.text(`Kelt: ${fmtDate(opts.issuedAt)}`, pw - 14, y - 1, { align: "right" });
  doc.text(`Teljesites: ${fmtDate(opts.issuedAt)}`, pw - 14, y + 4, { align: "right" });
  doc.text(`Fizetesi mod: ${opts.order.payment_method || "n/a"}`, pw - 14, y + 9, { align: "right" });

  y += 16;
  doc.setDrawColor(200);
  doc.line(14, y, pw - 14, y);
  y += 6;

  // Eladó
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Eladó:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 5;
  doc.text(opts.store.invoice_company_name || opts.store.store_name || "Egyszerű de Nagyszerű", 14, y);
  if (opts.store.invoice_address) { y += 4; doc.text(String(opts.store.invoice_address), 14, y); }
  if (opts.store.invoice_tax_number) { y += 4; doc.text(`Adószám: ${opts.store.invoice_tax_number}`, 14, y); }
  if (opts.store.invoice_bank_account) { y += 4; doc.text(`Bankszámla: ${opts.store.invoice_bank_account}`, 14, y); }
  if (opts.store.contact_email) { y += 4; doc.text(`E-mail: ${opts.store.contact_email}`, 14, y); }

  // Vevő (jobb oldal)
  let yr = y - 5 - (opts.store.invoice_address ? 4 : 0) - (opts.store.invoice_tax_number ? 4 : 0) - (opts.store.invoice_bank_account ? 4 : 0) - (opts.store.contact_email ? 4 : 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Vevő:", 110, yr);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  yr += 5;
  doc.text(opts.order.shipping_name || "n/a", 110, yr);
  yr += 4;
  doc.text(opts.order.customer_email, 110, yr);
  if (opts.order.shipping_address) { yr += 4; doc.text(String(opts.order.shipping_address), 110, yr); }
  if (opts.order.shipping_zip || opts.order.shipping_city) { yr += 4; doc.text(`${opts.order.shipping_zip || ""} ${opts.order.shipping_city || ""}`.trim(), 110, yr); }
  if (opts.order.shipping_phone) { yr += 4; doc.text(`Tel: ${opts.order.shipping_phone}`, 110, yr); }

  y = Math.max(y, yr) + 10;

  // Tételek táblázat
  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, pw - 28, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Megnevezés", 16, y + 5);
  doc.text("Menny.", 110, y + 5, { align: "right" });
  doc.text("Egységár", 140, y + 5, { align: "right" });
  doc.text("Összesen", pw - 16, y + 5, { align: "right" });
  y += 9;

  doc.setFont("helvetica", "normal");
  for (const it of opts.items) {
    if (y > 260) { doc.addPage(); y = 20; }
    const lineTotal = (it.price || 0) * (it.quantity || 0);
    const nameLines = doc.splitTextToSize(it.name || "Termék", 90);
    doc.text(nameLines, 16, y);
    doc.text(String(it.quantity || 0), 110, y, { align: "right" });
    doc.text(fmtMoney(it.price || 0, opts.currency), 140, y, { align: "right" });
    doc.text(fmtMoney(lineTotal, opts.currency), pw - 16, y, { align: "right" });
    y += Math.max(5, nameLines.length * 4) + 1;
  }

  y += 4;
  doc.setDrawColor(180);
  doc.line(110, y, pw - 14, y);
  y += 6;

  // Összegzés
  doc.setFontSize(10);
  doc.text("Részösszeg:", 110, y);
  doc.text(fmtMoney(opts.subtotal, opts.currency), pw - 16, y, { align: "right" });
  y += 5;
  if (opts.discount > 0) {
    doc.text("Kedvezmény:", 110, y);
    doc.text("-" + fmtMoney(opts.discount, opts.currency), pw - 16, y, { align: "right" });
    y += 5;
  }
  doc.text("Szállítás:", 110, y);
  doc.text(fmtMoney(opts.shipping, opts.currency), pw - 16, y, { align: "right" });
  y += 5;
  doc.text(`ÁFA (${opts.taxRate}%):`, 110, y);
  doc.text(fmtMoney(opts.taxAmount, opts.currency), pw - 16, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("FIZETENDŐ:", 110, y);
  doc.text(fmtMoney(opts.total, opts.currency), pw - 16, y, { align: "right" });

  // Lábléc
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  const footer = opts.store.invoice_footer_text || "Köszönjük a vásárlást!";
  doc.text(String(footer), 105, 285, { align: "center" });
  doc.text("Ez a számla nem NAV-bejelentett bizonylat.", 105, 290, { align: "center" });

  return new Uint8Array(doc.output("arraybuffer"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    let authorized = token && token === SERVICE_KEY;
    let requesterUserId: string | null = null;
    if (!authorized && token) {
      const { data: u } = await supabase.auth.getUser(token);
      if (u?.user) {
        requesterUserId = u.user.id;
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
        authorized = (roles || []).some((r: any) => r.role === "admin");
      }
    }
    const { orderId, force } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Allow non-admin authenticated user only if it's their own order
    if (!authorized && requesterUserId) {
      const { data: ownCheck } = await supabase.from("orders").select("user_id").eq("id", orderId).maybeSingle();
      if (ownCheck?.user_id === requesterUserId) authorized = true;
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ha már van számla és nem force, visszaadjuk
    const { data: existing } = await supabase.from("invoices").select("*").eq("order_id", orderId).maybeSingle();
    if (existing && !force) {
      return new Response(JSON.stringify({ ok: true, invoice: existing, reused: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Order + store settings
    const { data: order, error: orderErr } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (orderErr || !order) throw new Error("Rendelés nem található");

    const { data: store } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
    const taxRate = Number(store?.invoice_default_tax_rate ?? 27);
    const currency = store?.currency || "HUF";

    const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
    const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
    const discount = Number(order.discount_amount || 0);
    const total = Number(order.total_amount || 0);
    const shipping = Math.max(0, total + discount - subtotal); // visszaszámolt szállítás
    const netTotal = total / (1 + taxRate / 100);
    const taxAmount = total - netTotal;

    // Számlaszám generálás
    const { data: invNumData, error: invNumErr } = await supabase.rpc("generate_invoice_number");
    if (invNumErr) throw invNumErr;
    const invoiceNumber = String(invNumData);

    // PDF
    const pdfBytes = buildPdf({
      invoiceNumber,
      store: store || {},
      order,
      items,
      subtotal,
      shipping,
      discount,
      taxRate,
      taxAmount,
      total,
      currency,
      issuedAt: new Date(),
    });

    // Feltöltés
    const safeEmail = (order.customer_email || "unknown").toLowerCase().trim();
    const path = `${safeEmail}/${invoiceNumber}.pdf`;
    const { error: upErr } = await supabase.storage.from("invoices").upload(path, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: signed } = await supabase.storage.from("invoices").createSignedUrl(path, 60 * 60 * 24 * 365);

    // Mentés az invoices táblába
    const { data: invRow, error: invErr } = await supabase.from("invoices").upsert({
      id: existing?.id,
      order_id: orderId,
      invoice_number: invoiceNumber,
      customer_name: order.shipping_name || order.customer_email,
      customer_email: order.customer_email,
      customer_address: order.shipping_address,
      customer_city: order.shipping_city,
      customer_zip: order.shipping_zip,
      items,
      subtotal,
      shipping_amount: shipping,
      discount_amount: discount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: total,
      currency,
      payment_method: order.payment_method,
      paid_at: order.status === "paid" || order.status === "shipped" || order.status === "completed" ? new Date().toISOString() : null,
      pdf_url: path,
      status: "issued",
      updated_at: new Date().toISOString(),
    }, { onConflict: "order_id" }).select().single();
    if (invErr) throw invErr;

    await supabase.from("order_events").insert({
      order_id: orderId,
      event_type: "invoice_generated",
      triggered_by: "system",
      metadata: { invoice_number: invoiceNumber },
    });

    return new Response(JSON.stringify({
      ok: true,
      invoice: invRow,
      pdf_url: signed?.signedUrl,
      invoice_number: invoiceNumber,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-invoice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "ismeretlen hiba" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

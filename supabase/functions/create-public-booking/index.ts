// Nyilvános időpontfoglalás partner szolgáltatás-termékre.
// Validál, szerver oldalon rögzít (partner_appointments), és visszaigazoló e-mailt küld.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { rateLimitDb } from "../_shared/internal-auth.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const limited = await rateLimitDb(req, { limit: 8, windowSeconds: 600, key: "public-booking" });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "invalid_body" }, 400);

  const storeSlug = String(body.store_slug ?? "").trim().slice(0, 120);
  const productSlug = String(body.product_slug ?? "").trim().slice(0, 160);
  const name = String(body.customer_name ?? "").trim().slice(0, 120);
  const email = String(body.customer_email ?? "").trim().toLowerCase().slice(0, 160);
  const phone = String(body.customer_phone ?? "").trim().slice(0, 40);
  const notes = String(body.notes ?? "").trim().slice(0, 600);
  const startsAtRaw = String(body.starts_at ?? "").trim();

  if (!storeSlug || !productSlug) return json({ error: "missing_product" }, 400);
  if (name.length < 2) return json({ error: "invalid_name" }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400);

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) return json({ error: "invalid_date" }, 400);
  const now = Date.now();
  if (startsAt.getTime() < now + 30 * 60 * 1000) return json({ error: "too_soon" }, 400);
  if (startsAt.getTime() > now + 365 * 24 * 3600 * 1000) return json({ error: "too_far" }, 400);

  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: store } = await svc.from("partner_storefronts")
    .select("partner_id, slug, display_name, is_published, company_email, company_phone")
    .eq("slug", storeSlug).eq("is_published", true).maybeSingle();
  if (!store) return json({ error: "store_not_found" }, 404);

  const { data: product } = await svc.from("partner_products")
    .select("id, partner_id, title, product_type, fulfillment_type, attributes, status")
    .eq("partner_id", store.partner_id).eq("slug", productSlug).eq("status", "active").maybeSingle();
  if (!product) return json({ error: "product_not_found" }, 404);

  const attrs = (product.attributes && typeof product.attributes === "object" ? product.attributes : {}) as Record<string, unknown>;
  const ptype = String(product.product_type || "");
  const isService = ptype.startsWith("service") || product.fulfillment_type === "service";
  const isCourse = ptype.startsWith("course") || product.fulfillment_type === "course";
  const bookable = attrs.booking_enabled !== false && (isService || (isCourse && !!attrs.live_schedule));
  if (!bookable) return json({ error: "not_bookable" }, 400);

  // nyitvatartási nap ellenőrzés
  const workDays = Array.isArray(attrs.work_days) && attrs.work_days.length
    ? (attrs.work_days as unknown[]).map(Number)
    : [1, 2, 3, 4, 5];
  const jsDay = startsAt.getUTCDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;
  if (!workDays.includes(isoDay)) return json({ error: "closed_day" }, 400);

  const duration = Number(attrs.service_duration_min) > 0 ? Number(attrs.service_duration_min) : 60;

  // Duplikátum védelem: ugyanaz az e-mail + időpont + termék
  const { data: dup } = await svc.from("partner_appointments")
    .select("id").eq("product_id", product.id).eq("customer_email", email)
    .eq("starts_at", startsAt.toISOString()).maybeSingle();
  if (dup) return json({ success: true, appointment_id: dup.id, duplicate: true });

  const { data: appt, error: insErr } = await svc.from("partner_appointments").insert({
    partner_id: store.partner_id,
    product_id: product.id,
    customer_email: email,
    customer_name: name,
    starts_at: startsAt.toISOString(),
    duration_min: duration,
    location: String(attrs.service_location ?? "") || null,
    status: "pending",
    notes: notes || null,
    metadata: { source: "public_storefront", phone: phone || null, store_slug: storeSlug },
  }).select("id").single();

  if (insErr) return json({ error: "booking_failed" }, 502);

  // Visszaigazoló e-mail (nem blokkolja a foglalást)
  let emailStatus = "skipped";
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        templateName: "appointment-confirmation",
        recipientEmail: email,
        idempotencyKey: `appointment-confirmation:${appt.id}`,
        templateData: {
          customer_name: name,
          brand_name: store.display_name,
          service_title: product.title,
          date_label: startsAt.toISOString().slice(0, 10),
          time_label: startsAt.toISOString().slice(11, 16),
          duration_min: duration,
          location: String(attrs.service_location ?? "") || undefined,
          notes: notes || undefined,
          contact_email: store.company_email || undefined,
          contact_phone: store.company_phone || undefined,
        },
      }),
    });
    emailStatus = res.ok ? "queued" : `failed_${res.status}`;
  } catch (_e) {
    emailStatus = "failed";
  }

  return json({ success: true, appointment_id: appt.id, duration_min: duration, email: emailStatus });
});

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internal-auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// CRM szinkron: meglévő felhasználók, rendelők és partnerek beemelése a marketing_contacts táblába
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const guard = await requireInternalOrAdmin(req);
  if (!guard.ok) return guard.response;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  let upserted = 0;

  const upsert = async (rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return;
    const { error } = await admin
      .from("marketing_contacts")
      .upsert(rows, { onConflict: "email", ignoreDuplicates: true });
    if (!error) upserted += rows.length;
  };

  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, email, display_name, phone")
    .not("email", "is", null)
    .limit(20000);
  await upsert(
    (profiles || [])
      .filter((p) => p.email)
      .map((p) => ({
        email: String(p.email).toLowerCase(),
        name: p.display_name,
        phone: p.phone,
        source: "signup",
        user_id: p.user_id,
      })),
  );

  const { data: orders } = await admin
    .from("orders")
    .select("user_id, customer_email, shipping_name, shipping_phone")
    .not("customer_email", "is", null)
    .limit(20000);
  await upsert(
    (orders || [])
      .filter((o) => o.customer_email)
      .map((o) => ({
        email: String(o.customer_email).toLowerCase(),
        name: o.shipping_name,
        phone: o.shipping_phone,
        source: "purchase",
        user_id: o.user_id,
      })),
  );

  const { data: partners } = await admin
    .from("partners")
    .select("id, email, full_name, company_name")
    .not("email", "is", null)
    .limit(5000);
  await upsert(
    (partners || [])
      .filter((p) => p.email)
      .map((p) => ({
        email: String(p.email).toLowerCase(),
        name: p.full_name || p.company_name,
        source: "partner",
        partner_id: p.id,
      })),
  );

  const { count } = await admin
    .from("marketing_contacts")
    .select("id", { count: "exact", head: true });

  return json({ ok: true, upserted, total: count ?? 0 });
});

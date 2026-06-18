import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user || !user.email) return json({ ok: false, error: "Nincs bejelentkezve" }, 401);

    const admin = createClient(url, serviceKey);
    const email = user.email.toLowerCase();

    // Already a partner?
    const { data: existingPartner } = await admin.from("partners").select("id,status").eq("user_id", user.id).maybeSingle();
    if (existingPartner) {
      return json({ ok: true, partner_id: existingPartner.id, status: existingPartner.status, claimed: false });
    }

    // Find unexpired, unclaimed invite
    const { data: invite } = await admin.from("pending_partner_invites")
      .select("*")
      .eq("email", email)
      .is("claimed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invite) {
      // Fallback: ha a usernek van aláírt (vagy ellenjegyzésre váró) szerződése, abból hozzuk létre a partner sort.
      const { data: contract } = await admin.from("partner_contracts")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["signed", "pending_admin_countersign"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!contract) return json({ ok: false, error: "Nincs aktív meghívó vagy aláírt szerződés ehhez a fiókhoz" }, 404);

      const { data: contractPartner, error: cpErr } = await admin.from("partners").insert({
        user_id: user.id,
        partner_type: "person",
        full_name: contract.partner_full_name || user.email,
        email,
        status: "active",
        commission_per_order_amount: 0,
        tax_number: contract.partner_tax_id || null,
        address: contract.partner_address || null,
        phone: contract.partner_phone || null,
        is_active: true,
      }).select("id").single();
      if (cpErr) return json({ ok: false, error: cpErr.message }, 500);

      await admin.from("user_roles").upsert({ user_id: user.id, role: "partner" }, { onConflict: "user_id,role" });
      return json({ ok: true, partner_id: contractPartner.id, status: "active", claimed: true, source: "contract" });
    }

    const { data: newPartner, error: pErr } = await admin.from("partners").insert({
      user_id: user.id,
      partner_type: invite.partner_type || "person",
      full_name: invite.full_name,
      company_name: invite.company_name,
      email,
      status: "active",
      commission_per_order_amount: invite.commission_per_order_amount || 0,
      coupon_id: invite.coupon_id,
      is_active: true,
    }).select("id").single();
    if (pErr) return json({ ok: false, error: pErr.message }, 500);

    await admin.from("user_roles").upsert({ user_id: user.id, role: "partner" }, { onConflict: "user_id,role" });
    await admin.from("pending_partner_invites").update({ claimed_at: new Date().toISOString() }).eq("id", invite.id);

    // Welcome email
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "partner-welcome",
          recipientEmail: email,
          idempotencyKey: `partner-welcome-${user.id}`,
          templateData: { full_name: invite.full_name, coupon_code: invite.coupon_code, portal_url: `${req.headers.get("origin") || ""}/partner` },
        },
      });
    } catch (_) { /* ignore */ }

    return json({ ok: true, partner_id: newPartner.id, status: "active", claimed: true, coupon_code: invite.coupon_code });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

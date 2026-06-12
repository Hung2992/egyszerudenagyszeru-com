// Admin-only: WELCOME20 kupon küldése minden megerősített, regisztrált felhasználónak.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Admin jogosultság ellenőrzés
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const dryRun = !!body?.dry_run;
    const couponCode = (body?.coupon_code as string) || "WELCOME20";
    const discountText = (body?.discount_text as string) || "20% kedvezmény";

    // Összes megerősített user
    const recipients: { email: string; name: string }[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await supa.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      for (const u of data.users) {
        if (!u.email) continue;
        if (!u.email_confirmed_at && !u.confirmed_at) continue;
        const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || (u.email.split("@")[0]);
        recipients.push({ email: u.email, name });
      }
      if (data.users.length < perPage) break;
      page++;
      if (page > 50) break; // safety
    }

    // Duplikátum szűrés
    const uniq = Array.from(new Map(recipients.map((r) => [r.email.toLowerCase(), r])).values());

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, recipient_count: uniq.length, sample: uniq.slice(0, 5) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0, failed = 0;
    const errors: any[] = [];
    for (const r of uniq) {
      try {
        const { error } = await supa.functions.invoke("send-transactional-email", {
          body: {
            templateName: "coupon-notification",
            recipientEmail: r.email,
            idempotencyKey: `welcome20-blast-${couponCode}-${r.email.toLowerCase()}`,
            templateData: { name: r.name, couponCode, discountText },
          },
        });
        if (error) { failed++; errors.push({ email: r.email, error: error.message }); }
        else sent++;
      } catch (e) {
        failed++; errors.push({ email: r.email, error: String(e) });
      }
    }

    await supa.from("admin_notifications").insert({
      title: `WELCOME20 kupon kiküldve`,
      message: `${sent} sikeres / ${failed} sikertelen küldés (összesen ${uniq.length} címzett).`,
      type: "info",
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({ ok: true, recipient_count: uniq.length, sent, failed, errors: errors.slice(0, 20) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

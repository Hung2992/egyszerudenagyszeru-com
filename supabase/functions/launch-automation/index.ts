// Launch automation: státuszváltás, early access kódgenerálás + email,
// FOMO frissítés. Fut 5 percenként pg_cron-on keresztül.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function genCode(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

async function sendEmail(supa: any, recipient: string, subject: string, html: string, template: string) {
  try {
    await supa.functions.invoke("send-transactional-email", {
      body: { to: recipient, subject, html, template_name: template },
    });
  } catch (e) {
    console.error("email_fail", recipient, e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date();
  const results: any[] = [];

  // 1) Early access fázis: launch_date - early_access_hours-on belül vagyunk
  const { data: eaCandidates } = await supa
    .from("shop_products")
    .select("*")
    .eq("auto_launch_enabled", true)
    .eq("early_access_enabled", true)
    .neq("launch_status", "live")
    .not("launch_date", "is", null);

  for (const p of eaCandidates || []) {
    const launch = new Date(p.launch_date).getTime();
    const eaStart = launch - (p.early_access_hours || 24) * 3600_000;
    if (now.getTime() < eaStart || now.getTime() >= launch) continue;

    // Megnézzük, küldtünk-e már early access emailt erre a termékre
    const { count: alreadySent } = await supa
      .from("early_access_codes")
      .select("id", { count: "exact", head: true })
      .eq("product_id", p.id);
    if ((alreadySent || 0) > 0) continue;

    // Top N várólistás (boost_position figyelembe vételével)
    const { data: top } = await supa
      .from("product_waitlist")
      .select("id, email, name, position, boost_position")
      .eq("product_id", p.id)
      .order("position", { ascending: true })
      .limit(p.early_access_top_n || 50);

    const validUntil = new Date(launch + 24 * 3600_000).toISOString();
    for (const w of top || []) {
      const code = genCode("EA");
      await supa.from("early_access_codes").insert({
        product_id: p.id, email: w.email, code,
        discount_percent: p.early_access_discount_percent || 10,
        valid_until: validUntil,
      });
      await sendEmail(supa, w.email,
        `🔓 Korai hozzáférés: ${p.name}`,
        `<h2>Te vagy az első körben!</h2>
         <p>Mivel a várólistán vagy, ${p.early_access_hours || 24} órával a többiek előtt vásárolhatsz a <strong>${p.name}</strong> termékből.</p>
         <p>Egyedi kódod: <strong style="font-size:20px">${code}</strong></p>
         <p>Kedvezmény: <strong>${p.early_access_discount_percent || 10}%</strong></p>
         <p>Érvényes: ${new Date(validUntil).toLocaleString("hu-HU")}-ig</p>
         <p><a href="https://egyszerudenagyszeru.com/launch">Megnyitom a launch oldalt</a></p>`,
        "early_access");
    }
    await supa.from("launch_events").insert({
      product_id: p.id, event_type: "early_access_sent",
      metadata: { count: (top || []).length, code_count: (top || []).length },
    });
    results.push({ product: p.name, action: "early_access_sent", count: (top || []).length });
  }

  // 2) Élesítés: launch_date elérte
  const { data: launchCandidates } = await supa
    .from("shop_products")
    .select("*")
    .eq("auto_launch_enabled", true)
    .neq("launch_status", "live")
    .not("launch_date", "is", null)
    .lte("launch_date", now.toISOString());

  for (const p of launchCandidates || []) {
    await supa.from("shop_products").update({
      launch_status: "live",
      launched_at: now.toISOString(),
    }).eq("id", p.id);

    // Várólistásoknak értesítés (akik még nem kaptak early access-t — vagy mindenki, ha nem volt EA)
    const { data: waitlist } = await supa
      .from("product_waitlist")
      .select("email, name")
      .eq("product_id", p.id)
      .is("notified_at", null);

    for (const w of waitlist || []) {
      await sendEmail(supa, w.email,
        `🚀 ÉLESBEN: ${p.name} elérhető!`,
        `<h2>Most már megvásárolható!</h2>
         <p>A <strong>${p.name}</strong> elindult a webshopban. Várólistán voltál, ezért elsőként szólunk.</p>
         <p><a href="https://egyszerudenagyszeru.com/launch">Vásárlás</a></p>`,
        "launch_live");
    }
    if ((waitlist || []).length > 0) {
      await supa.from("product_waitlist")
        .update({ notified_at: now.toISOString() })
        .eq("product_id", p.id)
        .is("notified_at", null);
    }

    // Általános launch_subscribers értesítés
    const { data: subs } = await supa
      .from("launch_subscribers")
      .select("email")
      .or(`interested_product_id.eq.${p.id},interested_product_id.is.null`)
      .is("notified_at", null);

    for (const s of subs || []) {
      await sendEmail(supa, s.email,
        `🔥 Új drop: ${p.name}`,
        `<h2>Új termék érkezett!</h2>
         <p><strong>${p.name}</strong> – ${p.teaser_description || "Frissen érkezett kollekció"}</p>
         <p><a href="https://egyszerudenagyszeru.com/launch">Megnézem</a></p>`,
        "launch_announcement");
    }
    if ((subs || []).length > 0) {
      await supa.from("launch_subscribers")
        .update({ notified_at: now.toISOString() })
        .or(`interested_product_id.eq.${p.id},interested_product_id.is.null`)
        .is("notified_at", null);
    }

    // Előrendelőknek fennmaradó összeg értesítés
    const { data: preorders } = await supa
      .from("product_preorders")
      .select("customer_email, customer_name, quantity, deposit_amount, total_amount")
      .eq("product_id", p.id)
      .eq("status", "pending");

    for (const po of preorders || []) {
      const remaining = Number(po.total_amount) - Number(po.deposit_amount);
      await sendEmail(supa, po.customer_email,
        `📦 Előrendelésed kész: ${p.name}`,
        `<h2>Köszönjük az előrendelést!</h2>
         <p>A <strong>${p.name}</strong> elérhető. Még fennmaradó összeg: <strong>${remaining.toLocaleString()} Ft</strong></p>
         <p>Mennyiség: ${po.quantity}, foglaló befizetve: ${Number(po.deposit_amount).toLocaleString()} Ft</p>
         <p><a href="https://egyszerudenagyszeru.com/orders">Befejezem a fizetést</a></p>`,
        "preorder_ready");
    }

    await supa.from("launch_events").insert({
      product_id: p.id, event_type: "launched",
      metadata: { waitlist: (waitlist || []).length, subs: (subs || []).length, preorders: (preorders || []).length },
    });
    results.push({ product: p.name, action: "launched" });
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

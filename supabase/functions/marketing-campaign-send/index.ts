import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internal-auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const guard = await requireInternalOrAdmin(req);
  if (!guard.ok) return guard.response;

  let payload: { campaignId?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Érvénytelen kérés" }, 400);
  }
  const campaignId = payload?.campaignId;
  if (!campaignId || typeof campaignId !== "string") {
    return json({ error: "campaignId szükséges" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: campaign } = await admin
    .from("marketing_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return json({ error: "Kampány nem található" }, 404);
  if (campaign.status === "sent") return json({ error: "A kampány már elküldve" }, 409);

  // címzettek: feliratkozott CRM kontaktok
  const { data: contacts } = await admin
    .from("marketing_contacts")
    .select("id, email, name")
    .eq("status", "subscribed")
    .limit(10000);

  const recipients = (contacts || []).filter((c) => c.email);
  if (recipients.length === 0) return json({ error: "Nincs feliratkozott címzett" }, 400);

  // nyilvántartás létrehozása (idempotens)
  const rows = recipients.map((c) => ({
    campaign_id: campaignId,
    contact_id: c.id,
    email: c.email,
    status: "pending_provider",
  }));
  await admin
    .from("marketing_campaign_sends")
    .upsert(rows, { onConflict: "campaign_id,email", ignoreDuplicates: true });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const BREVO_CONNECTION_KEY = Deno.env.get("BREVO_API_KEY");

  if (!LOVABLE_API_KEY || !BREVO_CONNECTION_KEY) {
    await admin
      .from("marketing_campaigns")
      .update({ status: "ready", provider_status: "provider_required" })
      .eq("id", campaignId);
    return json({
      ok: false,
      provider_required: true,
      recipients: recipients.length,
      message:
        "A kampány előkészítve, de a tömeges küldéshez hírlevél-szolgáltató (Brevo) csatlakozás szükséges. A címzettlista rögzítve.",
    });
  }

  await admin.from("marketing_campaigns").update({ status: "sending" }).eq("id", campaignId);

  let sent = 0;
  let failed = 0;
  for (const c of recipients) {
    try {
      const res = await fetch(`${GATEWAY_URL}/smtp/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": BREVO_CONNECTION_KEY,
        },
        body: JSON.stringify({
          sender: { name: "Egyszerű de Nagyszerű", email: "hello@egyszerudenagyszeru.com" },
          to: [{ email: c.email, name: c.name || undefined }],
          subject: campaign.subject,
          htmlContent: campaign.body_html,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${res.status}: ${body.slice(0, 300)}`);
      }
      await admin
        .from("marketing_campaign_sends")
        .update({ status: "sent", provider: "brevo", sent_at: new Date().toISOString() })
        .eq("campaign_id", campaignId)
        .eq("email", c.email);
      sent++;
    } catch (e) {
      failed++;
      await admin
        .from("marketing_campaign_sends")
        .update({ status: "failed", provider: "brevo", error: String(e).slice(0, 500) })
        .eq("campaign_id", campaignId)
        .eq("email", c.email);
    }
  }

  await admin
    .from("marketing_campaigns")
    .update({
      status: failed === recipients.length ? "failed" : "sent",
      sent_at: new Date().toISOString(),
      provider_status: `brevo: ${sent} küldve, ${failed} sikertelen`,
    })
    .eq("id", campaignId);

  return json({ ok: true, sent, failed, recipients: recipients.length });
});

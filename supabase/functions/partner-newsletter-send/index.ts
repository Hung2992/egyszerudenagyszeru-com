import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Hitelesítés szükséges" }, 401);

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: userData } = await db.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: "Hitelesítés szükséges" }, 401);

  let payload: { blastId?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Érvénytelen kérés" }, 400);
  }
  const blastId = payload?.blastId;
  if (!blastId || !/^[0-9a-f-]{36}$/i.test(blastId)) return json({ error: "blastId szükséges" }, 400);

  const { data: blast } = await db
    .from("partner_email_blasts")
    .select("*")
    .eq("id", blastId)
    .maybeSingle();
  if (!blast) return json({ error: "Hírlevél nem található" }, 404);

  const { data: partner } = await db
    .from("partners")
    .select("id, user_id, company_name, full_name")
    .eq("id", blast.partner_id)
    .maybeSingle();
  const { data: isAdmin } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!partner || (partner.user_id !== user.id && !isAdmin)) return json({ error: "Nincs jogosultság" }, 403);

  if (blast.status === "sent") return json({ error: "Ez a hírlevél már ki lett küldve" }, 409);

  const { data: subs } = await db
    .from("partner_email_subscribers")
    .select("email, name")
    .eq("partner_id", partner.id)
    .is("unsubscribed_at", null)
    .limit(5000);

  const recipients = (subs || []).filter((s) => s.email);
  if (recipients.length === 0) return json({ error: "Nincs feliratkozott címzett" }, 400);

  await db
    .from("partner_email_blasts")
    .update({ status: "sending", recipient_count: recipients.length })
    .eq("id", blastId);

  const { data: sf } = await db
    .from("partner_storefronts")
    .select("slug")
    .eq("partner_id", partner.id)
    .maybeSingle();
  const brand = partner.company_name || partner.full_name || "Partnerünk";
  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateName: "newsletter",
          recipientEmail: r.email,
          idempotencyKey: `blast-${blastId}-${r.email}`,
          templateData: {
            subject: blast.subject,
            brand_name: brand,
            heading: blast.subject,
            intro: blast.excerpt || undefined,
            items: [{ text: String(blast.body_html || "").replace(/<[^>]+>/g, " ").slice(0, 1500) }],
            cta_url: blast.slug && blast.published_on_site && sf?.slug
              ? `https://egyszerudenagyszeru.com/b/${sf.slug}/hirek/${blast.slug}`
              : undefined,
            cta_label: "ELOLVASOM",
          },
        }),
      });
      if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
      sent++;
    } catch (e) {
      failed++;
      console.error("newsletter send failed", String(e).slice(0, 200));
    }
  }

  await db
    .from("partner_email_blasts")
    .update({
      status: failed === recipients.length ? "failed" : "sent",
      sent_count: sent,
      sent_at: new Date().toISOString(),
    })
    .eq("id", blastId);

  return json({ ok: sent > 0, recipients: recipients.length, sent, failed });
});

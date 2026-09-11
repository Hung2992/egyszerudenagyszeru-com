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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const guard = await requireInternalOrAdmin(req);
  if (!guard.ok) return guard.response;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: due, error } = await admin
    .from("marketing_automation_queue")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .order("send_at", { ascending: true })
    .limit(50);

  if (error) return json({ error: "Lekérdezési hiba" }, 500);
  if (!due || due.length === 0) return json({ processed: 0 });

  let sent = 0;
  let failed = 0;

  for (const item of due) {
    // atomikus zárolás: csak egy feldolgozó veheti fel
    const { data: claimed } = await admin
      .from("marketing_automation_queue")
      .update({ status: "processing" })
      .eq("id", item.id)
      .eq("status", "pending")
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          templateName: item.template_name,
          recipientEmail: item.recipient_email,
          idempotencyKey: item.idempotency_key,
          templateData: item.template_data,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`send ${res.status}: ${body.slice(0, 300)}`);
      }
      await admin
        .from("marketing_automation_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", item.id);
      sent++;
    } catch (e) {
      failed++;
      await admin
        .from("marketing_automation_queue")
        .update({ status: "failed", error: String(e).slice(0, 500) })
        .eq("id", item.id);
    }
  }

  return json({ processed: due.length, sent, failed });
});

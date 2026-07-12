// Publikus webhook végpont futároknak (GLS/Foxpost/Packeta).
// URL: /functions/v1/shipment-webhook?carrier=gls
// A futár dashboardjában ezt kell beállítani. Opcionális aláírás ellenőrzés a *_WEBHOOK_SECRET
// környezeti változóval; ha nincs, a hívást elfogadjuk (tracking szám alapján találjuk meg a shipmentet).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

function pickField(o: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const parts = k.split(".");
    let v: any = o;
    for (const p of parts) v = v?.[p];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return undefined;
}

function normalizeStatus(raw: string): string {
  const s = (raw || "").toLowerCase();
  if (/deliver(ed)?|kézbesít|kezbesit/.test(s)) return "delivered";
  if (/out.?for.?deliv|kiszáll|kiszall/.test(s)) return "out_for_delivery";
  if (/transit|úton|uton|depó|depo|hub/.test(s)) return "in_transit";
  if (/pick(ed)?.?up|átvéve|atveve/.test(s)) return "picked_up";
  if (/return|visszaküld|visszakuld/.test(s)) return "returned";
  if (/fail|sikertelen|refus/.test(s)) return "failed";
  return "in_transit";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const carrier = (url.searchParams.get("carrier") || "").toLowerCase();
    if (!carrier) {
      return new Response(JSON.stringify({ error: "Missing carrier query param" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const secret = Deno.env.get(`${carrier.toUpperCase()}_WEBHOOK_SECRET`);
    if (secret) {
      const signature = req.headers.get("x-signature") || req.headers.get("x-hub-signature-256") || "";
      const expected = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret + rawBody))))
        .map((b) => b.toString(16).padStart(2, "0")).join("");
      if (!signature.includes(expected)) {
        console.warn("Webhook signature mismatch for", carrier);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let payload: any = {};
    try { payload = JSON.parse(rawBody); } catch { payload = { raw: rawBody }; }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const tracking = pickField(payload, [
      "tracking_number", "trackingNumber", "parcelNumber", "ParcelNumber",
      "parcel.number", "shipment.tracking_number", "id",
    ]);
    if (!tracking) {
      console.warn(`${carrier} webhook: no tracking number`, payload);
      return new Response(JSON.stringify({ ok: true, ignored: "no tracking" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawStatus = pickField(payload, ["status", "StatusCode", "Description", "event", "eventType"]) || "in_transit";
    const status = normalizeStatus(rawStatus);
    const message = pickField(payload, ["message", "Description", "note", "description"]) || rawStatus;
    const location = pickField(payload, ["location", "DepotCity", "city", "hub"]) || null;
    const time = pickField(payload, ["event_time", "StatusDate", "timestamp", "time"]) || new Date().toISOString();

    const { data: shipment } = await supabase
      .from("shipments").select("id,status,shipped_at").eq("tracking_number", tracking).eq("carrier_code", carrier).maybeSingle();

    if (!shipment) {
      console.warn(`${carrier} webhook: shipment not found for ${tracking}`);
      return new Response(JSON.stringify({ ok: true, ignored: "shipment not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("shipment_events").insert({
      shipment_id: shipment.id,
      status, message, location, event_time: time, raw: payload,
    });

    const patch: Record<string, unknown> = { status, last_status_check: new Date().toISOString() };
    if (status === "picked_up" && !shipment.shipped_at) patch.shipped_at = time;
    if (status === "delivered") patch.delivered_at = time;
    await supabase.from("shipments").update(patch).eq("id", shipment.id);

    return new Response(JSON.stringify({ ok: true, shipment_id: shipment.id, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("shipment-webhook error", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

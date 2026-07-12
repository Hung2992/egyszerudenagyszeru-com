// Csomag státusz lekérdezés futár API-król és shipment_events frissítés.
// GLS: MyGLS REST végpont (ha be van állítva credentials); egyébként mock progresszió.
// Meghívható: adminként (JWT), egy adott shipment_id-vel, vagy pg_cron-ból (X-Cron-Secret) mind aktív csomagra.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

type Shipment = {
  id: string;
  carrier_code: string;
  tracking_number: string | null;
  status: string;
  external_id: string | null;
  shipped_at: string | null;
  created_at: string;
};

const ACTIVE_STATUSES = ["label_created", "picked_up", "in_transit", "out_for_delivery"];

// Egységes státusz mapping.
function normalizeStatus(carrier: string, raw: string): string {
  const s = (raw || "").toLowerCase();
  if (/deliver(ed)?|kézbesít|kezbesit/.test(s)) return "delivered";
  if (/out.?for.?deliv|kiszáll|kiszall/.test(s)) return "out_for_delivery";
  if (/transit|úton|uton|depó|depo|hub/.test(s)) return "in_transit";
  if (/pick(ed)?.?up|átvéve|atveve/.test(s)) return "picked_up";
  if (/return|visszaküld|visszakuld/.test(s)) return "returned";
  if (/fail|sikertelen|refus/.test(s)) return "failed";
  return "in_transit";
}

async function pollGls(tracking: string): Promise<Array<{ status: string; message: string; time: string; location?: string; raw: unknown }>> {
  const user = Deno.env.get("GLS_USERNAME");
  const pass = Deno.env.get("GLS_PASSWORD");
  const client = Deno.env.get("GLS_CLIENT_NUMBER");
  if (!user || !pass || !client) return [];

  try {
    // MyGLS ParcelService – GetParcelStatuses
    const body = {
      Username: user,
      Password: Array.from(new Uint8Array(await crypto.subtle.digest("SHA-512", new TextEncoder().encode(pass)))),
      ParcelNumber: Number(tracking),
      ReturnPOD: false,
    };
    const r = await fetch("https://api.mygls.hu/ParcelService.svc/json/GetParcelStatuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      console.warn("GLS API error", r.status, await r.text().catch(() => ""));
      return [];
    }
    const data = await r.json();
    const list = data?.ParcelStatusList || data?.parcelStatusList || [];
    return list.map((s: any) => ({
      status: normalizeStatus("gls", s.StatusCode || s.Code || s.Description || ""),
      message: s.Description || s.StatusDescription || "",
      time: s.StatusDate || s.Date || new Date().toISOString(),
      location: s.DepotCity || s.Location || undefined,
      raw: s,
    }));
  } catch (e) {
    console.warn("GLS poll error", e);
    return [];
  }
}

// Mock progresszió: idő függvényében léptet a label_created -> in_transit -> delivered útvonalon.
function mockProgress(shipment: Shipment): { status: string; message: string; time: string } | null {
  const ageMin = (Date.now() - new Date(shipment.created_at).getTime()) / 60000;
  const next: Array<[number, string, string]> = [
    [5, "picked_up", "Futár átvette a csomagot"],
    [30, "in_transit", "Úton a depó felé"],
    [120, "out_for_delivery", "Kiszállítás alatt"],
    [240, "delivered", "Kézbesítve a címzettnek"],
  ];
  for (let i = next.length - 1; i >= 0; i--) {
    const [min, st] = next[i];
    if (ageMin >= min && shipment.status !== st && ACTIVE_STATUSES.indexOf(shipment.status) < ["label_created", ...next.map(n => n[1])].indexOf(st)) {
      return { status: st, message: next[i][2], time: new Date().toISOString() };
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cronSecret = req.headers.get("x-cron-secret");
    let isCron = false;
    if (cronSecret) {
      const { data: cfg } = await supabase.from("internal_cron_config").select("value").eq("key", "shipment_cron_secret").maybeSingle();
      if (cfg?.value && cfg.value === cronSecret) isCron = true;
    }

    let shipmentId: string | null = null;
    if (req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      shipmentId = b?.shipment_id ?? null;
    }

    if (!isCron) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const userSb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: u } = await userSb.auth.getUser();
      if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (!(roles || []).some((r: any) => r.role === "admin")) return new Response(JSON.stringify({ error: "Admin required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let query = supabase.from("shipments").select("id,carrier_code,tracking_number,status,external_id,shipped_at,created_at");
    if (shipmentId) query = query.eq("id", shipmentId);
    else query = query.in("status", ACTIVE_STATUSES).limit(100);
    const { data: shipments, error } = await query;
    if (error) throw error;

    const summary: any[] = [];

    for (const s of (shipments || []) as Shipment[]) {
      const events: Array<{ status: string; message: string; time: string; location?: string; raw?: unknown }> = [];

      if (s.tracking_number && s.carrier_code === "gls") {
        const glsEvents = await pollGls(s.tracking_number);
        events.push(...glsEvents);
      }

      // Ha nincs valós esemény, mock progresszió teszt módban.
      if (events.length === 0) {
        const p = mockProgress(s);
        if (p) events.push({ ...p, raw: { mock: true } });
      }

      if (events.length === 0) { summary.push({ id: s.id, changed: false }); continue; }

      // Csak új eseményeket adjunk hozzá (idő alapján dedup).
      const { data: existing } = await supabase
        .from("shipment_events").select("event_time,status")
        .eq("shipment_id", s.id).order("event_time", { ascending: false }).limit(20);
      const seen = new Set((existing || []).map((e: any) => `${e.status}@${e.event_time}`));

      const toInsert = events
        .filter((e) => !seen.has(`${e.status}@${e.time}`))
        .map((e) => ({
          shipment_id: s.id,
          status: e.status,
          message: e.message,
          location: e.location || null,
          event_time: e.time,
          raw: e.raw ?? null,
        }));

      if (toInsert.length > 0) {
        await supabase.from("shipment_events").insert(toInsert);
      }

      const latest = events[events.length - 1];
      const patch: Record<string, unknown> = {
        status: latest.status,
        last_status_check: new Date().toISOString(),
      };
      if (latest.status === "picked_up" && !s.shipped_at) patch.shipped_at = latest.time;
      if (latest.status === "delivered") patch.delivered_at = latest.time;

      await supabase.from("shipments").update(patch).eq("id", s.id);
      summary.push({ id: s.id, changed: true, status: latest.status, new_events: toInsert.length });
    }

    return new Response(JSON.stringify({ ok: true, processed: summary.length, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("poll-shipment-status error", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

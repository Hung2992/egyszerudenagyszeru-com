// Publikus futár átvevőpont-adatbázisok szinkronizálása a pickup_points táblába.
// Foxpost + GLS ParcelShop publikus végpontokat használ (nem kell kulcs).
// Packeta csak akkor, ha PACKETA_API_KEY be van állítva.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

type Row = {
  carrier_code: string;
  code: string;
  name: string;
  address: string;
  city?: string | null;
  zip?: string | null;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  opening_hours?: unknown;
  raw?: unknown;
  active?: boolean;
};

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${url} -> ${r.status} ${await r.text().catch(() => "")}`);
  return r.json();
}

async function syncFoxpost(): Promise<Row[]> {
  // Publikus APM lista
  const data = await fetchJson("https://cdn.foxpost.hu/apms.json").catch(() => null);
  if (!Array.isArray(data)) return [];
  return data
    .filter((p: any) => p?.place_id && (p?.status === "active" || !p?.status))
    .map((p: any): Row => ({
      carrier_code: "foxpost",
      code: String(p.place_id),
      name: p.name || p.place_id,
      address: [p.street, p.house_number].filter(Boolean).join(" ") || p.address || "",
      city: p.city || null,
      zip: p.zip || null,
      country: "HU",
      latitude: p.geolat ? Number(p.geolat) : null,
      longitude: p.geolng ? Number(p.geolng) : null,
      opening_hours: p.opening_hours ?? null,
      raw: p,
      active: true,
    }));
}

async function syncGls(): Promise<Row[]> {
  const data = await fetchJson("https://map.gls-hungary.com/data/parcelshops").catch(() => null);
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return items
    .filter((p: any) => p?.id || p?.pclshopid)
    .map((p: any): Row => ({
      carrier_code: "gls",
      code: String(p.id ?? p.pclshopid),
      name: p.name || p.shopname || "GLS ParcelShop",
      address: p.address || [p.street, p.houseNumber].filter(Boolean).join(" "),
      city: p.city || p.town || null,
      zip: p.zipCode || p.postalCode || p.zip || null,
      country: p.country || "HU",
      latitude: p.latitude ? Number(p.latitude) : null,
      longitude: p.longitude ? Number(p.longitude) : null,
      opening_hours: p.openingHours ?? p.opening_hours ?? null,
      raw: p,
      active: true,
    }));
}

async function syncPacketa(): Promise<Row[]> {
  const key = Deno.env.get("PACKETA_API_KEY");
  if (!key) return [];
  const data = await fetchJson(
    `https://pickup-point.api.packeta.com/v5/${key}/branch.json?lang=hu`
  ).catch(() => null);
  const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return list.map((p: any): Row => ({
    carrier_code: "packeta",
    code: String(p.id),
    name: p.name || p.nameStreet || `Packeta ${p.id}`,
    address: p.street || p.nameStreet || "",
    city: p.city || null,
    zip: p.zip || null,
    country: p.country || "HU",
    latitude: p.latitude ? Number(p.latitude) : null,
    longitude: p.longitude ? Number(p.longitude) : null,
    opening_hours: p.openingHours ?? null,
    raw: p,
    active: p.status?.statusId === 1 || p.status === undefined,
  }));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Elfogadja: admin JWT-t vagy X-Cron-Secret-et.
    const cronSecret = req.headers.get("x-cron-secret");
    const isCron = cronSecret && cronSecret === Deno.env.get("SHIPMENT_CRON_SECRET");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!isCron) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userSb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: u } = await userSb.auth.getUser();
      if (!u?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (!(roles || []).some((r: any) => r.role === "admin")) {
        return new Response(JSON.stringify({ error: "Admin required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const results: Record<string, { count: number; error?: string }> = {};
    for (const [name, fn] of [
      ["foxpost", syncFoxpost],
      ["gls", syncGls],
      ["packeta", syncPacketa],
    ] as const) {
      try {
        const rows = await fn();
        let saved = 0;
        for (const batch of chunk(rows, 500)) {
          const { error } = await supabase.from("pickup_points").upsert(
            batch.map((r) => ({ ...r, synced_at: new Date().toISOString() })),
            { onConflict: "carrier_code,code" }
          );
          if (error) throw error;
          saved += batch.length;
        }
        results[name] = { count: saved };
      } catch (e: any) {
        results[name] = { count: 0, error: e.message };
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-pickup-points error", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

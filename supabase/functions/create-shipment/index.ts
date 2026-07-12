// Csomagfeladás - valódi GLS integráció (ha GLS_USERNAME/PASSWORD/CLIENT_NUMBER be van állítva),
// egyébként mock tracking. Foxpost/Packeta/MPL/DPD még mock-ot használ (webhook figyeli).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  order_id: z.string().uuid(),
  carrier_code: z.enum(["gls", "foxpost", "mpl", "packeta", "dpd"]),
  service_type: z.enum(["home", "pickup"]).default("home"),
  pickup_point_code: z.string().optional(),
  weight_kg: z.number().positive().default(1),
  cod_amount: z.number().nonnegative().optional(),
});

function mockTracking(code: string) {
  const prefix = code.toUpperCase().slice(0, 2);
  return `${prefix}${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 1000)}`;
}

function trackingUrl(template: string | null, tracking: string): string | null {
  if (!template) return null;
  return template.replace("{tracking}", tracking).replace("{tracking_number}", tracking);
}

async function sha512Bytes(s: string): Promise<number[]> {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-512", new TextEncoder().encode(s))));
}

// MyGLS PrintLabels valódi feladás.
async function createGlsShipment(order: any, body: any): Promise<{ tracking: string; label_pdf_base64?: string; raw: any } | null> {
  const user = Deno.env.get("GLS_USERNAME");
  const pass = Deno.env.get("GLS_PASSWORD");
  const client = Deno.env.get("GLS_CLIENT_NUMBER");
  if (!user || !pass || !client) return null;

  const addr = (order.shipping_address as any) || {};
  const req = {
    Username: user,
    Password: await sha512Bytes(pass),
    ParcelList: [{
      ClientNumber: Number(client),
      ClientReference: order.id,
      CODAmount: body.cod_amount || 0,
      CODReference: body.cod_amount ? order.id : undefined,
      Content: "Rendelés",
      Count: 1,
      DeliveryAddress: {
        Name: order.customer_name || "N/A",
        Street: addr.street || addr.line1 || "",
        HouseNumber: addr.house_number || "",
        City: addr.city || "",
        ZipCode: addr.zip || addr.postal_code || "",
        CountryIsoCode: addr.country || "HU",
        ContactName: order.customer_name || "",
        ContactPhone: order.customer_phone || "",
        ContactEmail: order.customer_email || "",
      },
      PickupDate: `/Date(${Date.now()})/`,
      ServiceList: body.service_type === "pickup" && body.pickup_point_code
        ? [{ Code: "PSD", PSDParameter: { StringValue: body.pickup_point_code } }]
        : [],
    }],
  };

  try {
    const r = await fetch("https://api.mygls.hu/ParcelService.svc/json/PrintLabels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const data = await r.json();
    if (!r.ok || data?.PrintLabelsErrorList?.length) {
      console.warn("GLS PrintLabels error", r.status, JSON.stringify(data));
      return null;
    }
    const parcelInfo = data?.PrintLabelsInfoList?.[0];
    const tracking = String(parcelInfo?.ParcelNumber || "");
    const labelBytes = data?.Labels; // byte array
    const label_pdf_base64 = Array.isArray(labelBytes)
      ? btoa(String.fromCharCode(...labelBytes.slice(0, 500000)))
      : undefined;
    return { tracking, label_pdf_base64, raw: data };
  } catch (e) {
    console.warn("GLS API call failed:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await userSupabase.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    if (!(roles || []).some((r: any) => r.role === "admin"))
      return new Response(JSON.stringify({ error: "Admin required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success)
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const body = parsed.data;

    const [{ data: carrier }, { data: order }] = await Promise.all([
      supabase.from("shipping_carriers").select("*").eq("code", body.carrier_code).maybeSingle(),
      supabase.from("orders").select("*").eq("id", body.order_id).maybeSingle(),
    ]);
    if (!carrier) return new Response(JSON.stringify({ error: "Carrier not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let tracking = "";
    let labelUrl: string | null = null;
    let rawResponse: any = { mock: true, carrier: carrier.code };
    let usedRealApi = false;

    if (body.carrier_code === "gls") {
      const gls = await createGlsShipment(order, body);
      if (gls) {
        tracking = gls.tracking;
        rawResponse = { real: true, carrier: "gls", api: "MyGLS", meta: gls.raw?.PrintLabelsInfoList?.[0] || null };
        if (gls.label_pdf_base64) labelUrl = `data:application/pdf;base64,${gls.label_pdf_base64}`;
        usedRealApi = true;
      }
    }

    if (!tracking) {
      tracking = mockTracking(body.carrier_code);
    }

    const tUrl = trackingUrl(carrier.tracking_url_template, tracking);
    if (!labelUrl) {
      labelUrl = `data:text/plain;base64,${btoa(`Csomagcimke\nRendeles: ${order.id}\nFutar: ${carrier.name}\nTracking: ${tracking}`)}`;
    }

    // Pickup point név lookup
    let pickup_point_name: string | null = null;
    if (body.service_type === "pickup" && body.pickup_point_code) {
      const { data: pp } = await supabase.from("pickup_points")
        .select("name").eq("carrier_code", body.carrier_code).eq("code", body.pickup_point_code).maybeSingle();
      pickup_point_name = pp?.name || null;
    }

    const shipmentRow = {
      order_id: order.id,
      carrier_id: carrier.id,
      carrier_code: carrier.code,
      tracking_number: tracking,
      tracking_url: tUrl,
      label_url: labelUrl,
      status: "label_created",
      service_type: body.service_type,
      pickup_point_code: body.pickup_point_code,
      pickup_point_name,
      weight_kg: body.weight_kg,
      cod_amount: body.cod_amount,
      recipient_name: (order as any).customer_name || null,
      recipient_email: (order as any).customer_email || null,
      recipient_phone: (order as any).customer_phone || null,
      recipient_address: (order as any).shipping_address || null,
      created_by: userData.user.id,
      raw_response: rawResponse,
    };

    const { data: shipment, error: sErr } = await supabase.from("shipments").insert(shipmentRow).select().single();
    if (sErr) throw sErr;

    await supabase.from("shipment_events").insert({
      shipment_id: shipment.id,
      status: "label_created",
      message: usedRealApi ? `Címke létrehozva (valódi API) – ${carrier.name}` : `Címke létrehozva (teszt) – ${carrier.name}`,
      event_time: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ shipment, used_real_api: usedRealApi }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-shipment error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

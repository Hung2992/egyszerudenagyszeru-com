// Egységes csomagfeladás - GLS / Foxpost / MPL / Packeta / DPD
// Ha nincs API kulcs a futárhoz, mock tracking számot generál (dev/teszt mód).
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
  return template.replace("{tracking}", tracking);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await userSupabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin check
    const { data: roles } = await supabase.from("user_roles")
      .select("role").eq("user_id", userData.user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = parsed.data;

    // Load carrier + order
    const [{ data: carrier }, { data: order }] = await Promise.all([
      supabase.from("shipping_carriers").select("*").eq("code", body.carrier_code).maybeSingle(),
      supabase.from("orders").select("*").eq("id", body.order_id).maybeSingle(),
    ]);
    if (!carrier) {
      return new Response(JSON.stringify({ error: "Carrier not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: valódi API integráció ha carrier.api_credentials tartalmazza a kulcsot.
    // Egyelőre mock tracking (fejlesztési / teszt).
    const tracking = mockTracking(body.carrier_code);
    const tUrl = trackingUrl(carrier.tracking_url_template, tracking);
    const labelUrl = `data:text/plain;base64,${btoa(`Csomagcimke\nRendeles: ${order.id}\nFutar: ${carrier.name}\nTracking: ${tracking}`)}`;

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
      weight_kg: body.weight_kg,
      cod_amount: body.cod_amount,
      recipient_name: (order as any).customer_name || null,
      recipient_email: (order as any).customer_email || null,
      recipient_phone: (order as any).customer_phone || null,
      recipient_address: (order as any).shipping_address || null,
      created_by: userData.user.id,
      raw_response: { mock: true, carrier: carrier.code },
    };

    const { data: shipment, error: sErr } = await supabase
      .from("shipments").insert(shipmentRow).select().single();
    if (sErr) throw sErr;

    await supabase.from("shipment_events").insert({
      shipment_id: shipment.id,
      status: "label_created",
      message: `Címke létrehozva – ${carrier.name}`,
      event_time: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ shipment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-shipment error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

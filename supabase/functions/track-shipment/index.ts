// Publikus csomagkövetés - tracking szám vagy rendelés ID + email alapján
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Q = z.object({
  tracking: z.string().trim().min(3).optional(),
  order_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
}).refine(v => v.tracking || (v.order_id && v.email), {
  message: "tracking VAGY (order_id + email) szükséges",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse({
      tracking: url.searchParams.get("tracking") || undefined,
      order_id: url.searchParams.get("order_id") || undefined,
      email: url.searchParams.get("email") || undefined,
    });
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { tracking, order_id, email } = parsed.data;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let shipment: any = null;
    if (tracking) {
      const { data } = await supabase.from("shipments").select("*").eq("tracking_number", tracking).maybeSingle();
      shipment = data;
    } else if (order_id && email) {
      const { data: order } = await supabase.from("orders").select("id, customer_email").eq("id", order_id).maybeSingle();
      if (!order || (order.customer_email || "").toLowerCase() !== email.toLowerCase()) {
        return new Response(JSON.stringify({ error: "Nem található rendelés ezzel az emaillel" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data } = await supabase.from("shipments").select("*").eq("order_id", order_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      shipment = data;
    }

    if (!shipment) {
      return new Response(JSON.stringify({ error: "Nincs csomag" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: events } = await supabase
      .from("shipment_events").select("status, message, event_time, location")
      .eq("shipment_id", shipment.id).order("event_time", { ascending: true });

    // Csak nem érzékeny mezők
    const safe = {
      tracking_number: shipment.tracking_number,
      tracking_url: shipment.tracking_url,
      carrier_code: shipment.carrier_code,
      status: shipment.status,
      service_type: shipment.service_type,
      recipient_name: shipment.recipient_name?.split(" ")[0] ?? null, // csak keresztnév
      created_at: shipment.created_at,
      estimated_delivery: shipment.estimated_delivery ?? null,
    };

    return new Response(JSON.stringify({ shipment: safe, events: events || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("track-shipment error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Csomagcímke letöltés – ha van tárolt label_url (data URI vagy https), újraszolgáltatja PDF-ként.
// Egyszerű PDF-generáló, ha nincs label_url tárolt: minimalista címkét készít a tracking számmal.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Minimál PDF egyetlen szöveggel (nem függ külső libtől).
function makeSimplePdf(lines: string[]): Uint8Array {
  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const content =
    `BT /F1 14 Tf 40 780 Td\n` +
    lines.map((l, i) => `${i === 0 ? "" : "0 -20 Td "}(${escape(l)}) Tj`).join("\n") +
    `\nET`;
  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
  ];
  let pdf = `%PDF-1.4\n`;
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += `${String(off).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400, headers: corsHeaders });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: u } = await userSb.auth.getUser();
    if (!u?.user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles || []).some((r: any) => r.role === "admin"))
      return new Response("Admin required", { status: 403, headers: corsHeaders });

    const { data: shipment } = await supabase
      .from("shipments")
      .select("id,carrier_code,tracking_number,label_url,recipient_name,recipient_address,order_id")
      .eq("id", id).maybeSingle();
    if (!shipment) return new Response("Not found", { status: 404, headers: corsHeaders });

    // Ha van external label_url (https), redirekt.
    if (shipment.label_url && /^https?:\/\//.test(shipment.label_url)) {
      return Response.redirect(shipment.label_url, 302);
    }

    const addr = (shipment.recipient_address as any) || {};
    const pdf = makeSimplePdf([
      `Cimke - ${shipment.carrier_code.toUpperCase()}`,
      `Tracking: ${shipment.tracking_number || "-"}`,
      `Rendeles: ${shipment.order_id}`,
      `Cimzett: ${shipment.recipient_name || "-"}`,
      `Cim: ${[addr.zip, addr.city, addr.street].filter(Boolean).join(", ")}`,
    ]);

    return new Response(pdf, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cimke-${shipment.tracking_number || shipment.id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("shipment-label error", err);
    return new Response(err.message || "Internal error", { status: 500, headers: corsHeaders });
  }
});

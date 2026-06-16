// Generates a PDF for a signed partner_contract, uploads it to the
// private `partner-contracts` bucket, stores the path on the row, and
// returns a short-lived signed URL.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "missing_token" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);

    const { contract_id } = await req.json().catch(() => ({}));
    if (!contract_id) return json({ error: "missing_contract_id" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // RLS-aware fetch (partner can only read own; admin can read all)
    const { data: contract, error } = await userClient
      .from("partner_contracts")
      .select("*")
      .eq("id", contract_id)
      .maybeSingle();
    if (error || !contract) return json({ error: "not_found" }, 404);

    // Generate (or regenerate) only when both signed or admin requests
    const path = `${contract.user_id}/${contract.id}.pdf`;

    const pdfBytes = await buildPdf(contract);
    const { error: upErr } = await admin.storage
      .from("partner-contracts")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) return json({ error: "upload_failed", details: upErr.message }, 500);

    if (contract.contract_pdf_path !== path) {
      await admin.from("partner_contracts").update({ contract_pdf_path: path }).eq("id", contract.id);
    }

    const { data: signed } = await admin.storage
      .from("partner-contracts")
      .createSignedUrl(path, 300);

    return json({ ok: true, url: signed?.signedUrl, path });
  } catch (e) {
    return json({ error: "internal", message: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function buildPdf(c: any): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageW = 595;
  const pageH = 842;
  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  const write = (text: string, opts: { size?: number; bold?: boolean } = {}) => {
    const size = opts.size ?? 10;
    const f = opts.bold ? bold : font;
    const lines = wrap(text, f, size, pageW - margin * 2);
    for (const ln of lines) {
      if (y < margin + 40) {
        page = pdf.addPage([pageW, pageH]);
        y = pageH - margin;
      }
      page.drawText(ln, { x: margin, y, size, font: f, color: rgb(0, 0, 0) });
      y -= size + 4;
    }
  };

  write(`Partneri szerződés`, { size: 16, bold: true });
  write(`Szerződésszám: ${c.contract_number}`, { size: 9 });
  write(`Verzió: ${c.contract_version}  •  Cégadatok v${c.owner_profile_version ?? "-"}`, { size: 9 });
  write(`Státusz: ${c.status}`, { size: 9 });
  if (c.contract_hash) write(`SHA-256: ${c.contract_hash}`, { size: 8 });
  y -= 6;

  for (const line of (c.contract_body || "").replace(/[^\x00-\xff]/g, "?").split("\n")) {
    write(line || " ");
  }

  y -= 10;
  write("Aláírások", { size: 12, bold: true });
  write(
    `Partner: ${c.partner_signature_name ?? "—"}  •  ${c.partner_signed_at ? new Date(c.partner_signed_at).toISOString() : "—"}  •  IP: ${c.partner_signature_ip ?? "—"}`,
  );
  write(
    `Üzemeltető: ${c.owner_signature_name ?? "—"}  •  ${c.owner_signed_at ? new Date(c.owner_signed_at).toISOString() : "—"}  •  IP: ${c.owner_signature_ip ?? "—"}`,
  );

  return await pdf.save();
}

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const safe = (text ?? "").replace(/[^\x00-\xff]/g, "?");
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

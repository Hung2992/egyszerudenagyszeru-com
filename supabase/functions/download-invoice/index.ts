import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check using anon client + JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = (userData.user.email || "").toLowerCase().trim();

    const body = await req.json().catch(() => ({}));
    const invoiceId: string | undefined = body.invoice_id;
    if (!invoiceId || typeof invoiceId !== "string") {
      return new Response(JSON.stringify({ error: "invoice_id_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client to bypass RLS for ownership check + signed URL generation
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select("id, user_id, customer_email, pdf_url, invoice_number")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin role check
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    const ownsByUserId = invoice.user_id && invoice.user_id === userId;
    const ownsByEmail =
      invoice.customer_email &&
      invoice.customer_email.toLowerCase().trim() === userEmail;

    if (!isAdmin && !ownsByUserId && !ownsByEmail) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!invoice.pdf_url) {
      return new Response(JSON.stringify({ error: "no_pdf" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from("invoices")
      .createSignedUrl(invoice.pdf_url, 60 * 5); // 5 perc

    if (signErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: "sign_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        url: signed.signedUrl,
        invoice_number: invoice.invoice_number,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("download-invoice error", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const getUserAndClient = async (req: Request) => {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return { error: "Bejelentkezés szükséges", status: 401 };
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!data.user) return { error: "Érvénytelen munkamenet", status: 401 };
  return { user: data.user, supabase };
};

const getPartnerId = async (supabase: any, userId: string) => {
  const { data } = await supabase.from("partners").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
};

const isAdmin = async (supabase: any, userId: string) => {
  try {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    return !!data;
  } catch { return false; }
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { user, supabase, error, status } = await getUserAndClient(req);
  if (error) return json({ error }, status);

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "").trim();

  if (action === "list") {
    const { data: agents } = await supabase
      .from("ai_agent_marketplace")
      .select("*")
      .eq("status", "approved")
      .eq("is_public", true)
      .order("install_count", { ascending: false });
    const partnerId = body?.partner_id ? String(body.partner_id) : await getPartnerId(supabase, user.id);
    let installs: any[] = [];
    if (partnerId) {
      const { data: ins } = await supabase
        .from("ai_agent_installs")
        .select("*,marketplace_agent:marketplace_agent_id(*)")
        .eq("partner_id", partnerId);
      installs = ins || [];
    }
    return json({ agents: agents || [], installs: installs || [] });
  }

  const partnerId = body?.partner_id ? String(body.partner_id) : await getPartnerId(supabase, user.id);
  if (!partnerId) return json({ error: "Nincs partner fiók a művelethez" }, 403);

  if (action === "install") {
    const agentId = String(body?.agentId || "").trim();
    if (!agentId) return json({ error: "agentId kötelező" }, 400);
    const { data: existing } = await supabase
      .from("ai_agent_installs")
      .select("id")
      .eq("partner_id", partnerId)
      .eq("marketplace_agent_id", agentId)
      .maybeSingle();
    if (existing) return json({ error: "Ez az ügynök már telepítve van" }, 409);
    const { data: ins, error: insErr } = await supabase
      .from("ai_agent_installs")
      .insert({ partner_id: partnerId, marketplace_agent_id: agentId, settings: body?.settings ?? {} })
      .select("*,marketplace_agent:marketplace_agent_id(*)")
      .single();
    if (insErr) return json({ error: insErr.message }, 500);
    // Telepítésszám növelése service_role-klienssel (RLS-t kikerüli)
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: agent } = await adminClient.from("ai_agent_marketplace").select("install_count").eq("id", agentId).maybeSingle();
    await adminClient.from("ai_agent_marketplace").update({ install_count: (agent?.install_count || 0) + 1 }).eq("id", agentId);
    return json({ install: ins });
  }

  if (action === "uninstall") {
    const installId = String(body?.installId || "").trim();
    if (!installId) return json({ error: "installId kötelező" }, 400);
    const { data: before } = await supabase.from("ai_agent_installs").select("marketplace_agent_id").eq("id", installId).eq("partner_id", partnerId).maybeSingle();
    const { error: delErr } = await supabase.from("ai_agent_installs").delete().eq("id", installId).eq("partner_id", partnerId);
    if (delErr) return json({ error: delErr.message }, 500);
    if (before?.marketplace_agent_id) {
      const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: agent } = await adminClient.from("ai_agent_marketplace").select("install_count").eq("id", before.marketplace_agent_id).maybeSingle();
      await adminClient.from("ai_agent_marketplace").update({ install_count: Math.max(0, (agent?.install_count || 0) - 1) }).eq("id", before.marketplace_agent_id);
    }
    return json({ ok: true });
  }

  if (action === "toggle") {
    const installId = String(body?.installId || "").trim();
    const enabled = typeof body?.enabled === "boolean" ? body.enabled : null;
    if (!installId || enabled === null) return json({ error: "installId és enabled kötelező" }, 400);
    const { data, error: updErr } = await supabase
      .from("ai_agent_installs")
      .update({ is_enabled: enabled })
      .eq("id", installId)
      .eq("partner_id", partnerId)
      .select("*,marketplace_agent:marketplace_agent_id(*)")
      .single();
    if (updErr) return json({ error: updErr.message }, 500);
    return json({ install: data });
  }

  if (action === "submit") {
    const { name, role, description, system_prompt, category, industry, model, capabilities } = body;
    if (!name || !role || !system_prompt) return json({ error: "Név, szerepkör és system prompt kötelező" }, 400);
    const slug = `${slugify(String(name))}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error: insErr } = await supabase
      .from("ai_agent_marketplace")
      .insert({
        slug,
        name: String(name),
        role: String(role),
        description: description ? String(description) : null,
        system_prompt: String(system_prompt),
        category: category ? String(category) : "agent",
        industry: industry ? String(industry) : null,
        model: model ? String(model) : "google/gemini-3.6-flash",
        capabilities: Array.isArray(capabilities) ? capabilities : [],
        author_partner_id: partnerId,
        status: "pending_review",
        is_public: false,
      })
      .select()
      .single();
    if (insErr) return json({ error: insErr.message }, 500);
    return json({ agent: data });
  }

  if (action === "approve" || action === "reject") {
    const admin = await isAdmin(supabase, user.id);
    if (!admin) return json({ error: "Csak admin végezheti ezt a műveletet" }, 403);
    const agentId = String(body?.agentId || "").trim();
    if (!agentId) return json({ error: "agentId kötelező" }, 400);
    const { data, error: updErr } = await supabase
      .from("ai_agent_marketplace")
      .update({ status: action === "approve" ? "approved" : "rejected", is_public: action === "approve" })
      .eq("id", agentId)
      .select()
      .single();
    if (updErr) return json({ error: updErr.message }, 500);
    return json({ agent: data });
  }

  return json({ error: "Ismeretlen művelet" }, 400);
});

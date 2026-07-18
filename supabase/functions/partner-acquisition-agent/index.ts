// Partner Acquisition Engine — AI dispatcher
// Actions:
//   generate_strategy   -> AI generálja a kampány stratégiát
//   discover_leads      -> AI potenciális partnereket javasol
//   analyze_lead        -> AI pontozás + jegyzet egy leadre
//   generate_outreach   -> személyre szabott üzenet
//   compute_insights    -> aggregált learning loop
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function callAI(system: string, user: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) throw new Error(`ai_${res.status}:${await res.text()}`);
  const j = await res.json();
  const txt = j.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(txt); } catch {
    const m = txt.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "admin_required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "generate_strategy") {
      const { campaign_id } = body;
      const { data: c } = await supabase.from("partner_campaigns").select("*").eq("id", campaign_id).maybeSingle();
      if (!c) return json({ error: "campaign_not_found" }, 404);
      const sys = `Te egy top-tier B2B partnership stratéga vagy. Válasz CSAK JSON:
{"ideal_profile":{"description":"","must_haves":[],"nice_to_haves":[],"red_flags":[]},
 "strategy":{"summary":"","phases":[{"name":"","days":0,"actions":[""]}],"channels_priority":[""],"messaging_pillars":[""]},
 "kpis":{"target_leads":0,"target_response_rate":0,"target_partners":0}}`;
      const usr = `Kampány: ${c.name}
Kategóriák: ${(c.target_categories || []).join(", ") || "nincs megadva"}
Országok: ${(c.target_countries || []).join(", ") || "HU"}
Nyelvek: ${(c.target_languages || []).join(", ") || "hu"}
Partner típus: ${c.partner_type || "brand"}
Csatornák: ${(c.channels || []).join(", ")}
Ajánlat: ${JSON.stringify(c.offer || {})}
Cél: ${c.goal || "több partner szerzése"}
Napi cél: ${c.daily_target}`;
      const out = await callAI(sys, usr);
      await supabase.from("partner_campaigns").update({
        strategy: out.strategy || {},
        ideal_profile: out.ideal_profile || {},
        metrics: { ...(c.metrics || {}), kpis: out.kpis || {} },
      }).eq("id", campaign_id);
      return json({ ok: true, ...out });
    }

    if (action === "discover_leads") {
      const { campaign_id, count = 10 } = body;
      const { data: c } = await supabase.from("partner_campaigns").select("*").eq("id", campaign_id).maybeSingle();
      if (!c) return json({ error: "campaign_not_found" }, 404);
      const sys = `Te egy piackutató AI vagy. Adj vissza reális, létező típusú magyar / EU cégeket, akiket megkereshetnénk partnerségre. Válasz CSAK JSON: {"leads":[{"company_name":"","website":"","category":"","country":"","language":"","instagram_handle":"","reason":"miért jó lead","ai_score":0-100}]}`;
      const usr = `Kampány: ${c.name}. Kategóriák: ${(c.target_categories || []).join(", ")}. Országok: ${(c.target_countries || []).join(", ") || "HU"}. Partner típus: ${c.partner_type}. Ideális profil: ${JSON.stringify(c.ideal_profile || {})}. Adj vissza ${count} db reális jelöltet. NE találj ki nem létező brandet — közepes / kisebb ismert magyar (vagy EU) márkákat javasolj a kategóriában.`;
      const out = await callAI(sys, usr);
      const leads = Array.isArray(out.leads) ? out.leads : [];
      const inserted: any[] = [];
      for (const l of leads) {
        if (!l.company_name) continue;
        const { data: ins } = await supabase.from("partner_leads").insert({
          campaign_id,
          company_name: l.company_name,
          website: l.website || null,
          category: l.category || null,
          country: l.country || (c.target_countries?.[0] ?? null),
          language: l.language || (c.target_languages?.[0] ?? "hu"),
          instagram_handle: l.instagram_handle || null,
          discovered_via: "ai_search",
          ai_score: Math.max(0, Math.min(100, Number(l.ai_score) || 50)),
          ai_notes: l.reason || null,
          status: "found",
        }).select().maybeSingle();
        if (ins) inserted.push(ins);
      }
      return json({ ok: true, count: inserted.length, leads: inserted });
    }

    if (action === "analyze_lead") {
      const { lead_id } = body;
      const { data: lead } = await supabase.from("partner_leads").select("*").eq("id", lead_id).maybeSingle();
      if (!lead) return json({ error: "lead_not_found" }, 404);
      const sys = `Elemezd ezt a potenciális partnert. Válasz CSAK JSON: {"ai_score":0-100,"fit_summary":"","strengths":[],"concerns":[],"recommended_channel":"email|instagram|linkedin|tiktok","recommended_variant":"aggressive|premium|tech|startup","talking_points":[]}`;
      const usr = `Cég: ${lead.company_name}. Web: ${lead.website || "—"}. Kategória: ${lead.category || "—"}. Ország: ${lead.country || "—"}. IG: ${lead.instagram_handle || "—"}. Jegyzet: ${lead.ai_notes || "—"}.`;
      const out = await callAI(sys, usr);
      await supabase.from("partner_leads").update({
        ai_score: Math.max(0, Math.min(100, Number(out.ai_score) || lead.ai_score)),
        ai_analysis: out,
        status: lead.status === "found" ? "analyzed" : lead.status,
      }).eq("id", lead_id);
      return json({ ok: true, analysis: out });
    }

    if (action === "generate_outreach") {
      const { lead_id, channel = "email", variant = "premium" } = body;
      const { data: lead } = await supabase.from("partner_leads").select("*, partner_campaigns(*)").eq("id", lead_id).maybeSingle();
      if (!lead) return json({ error: "lead_not_found" }, 404);
      const c = lead.partner_campaigns || {};
      const sys = `Te egy elit B2B partnerségi copywriter vagy. Írj EGYEDI, személyre szabott megkeresést — SEMMI generikus spam. Válasz CSAK JSON: {"subject":"","message":"","cta":""}. A message legyen ${channel === "email" ? "300-500" : "150-250"} karakter, ${lead.language || "hu"} nyelven, ${variant} stílusban.`;
      const usr = `Célcég: ${lead.company_name} (${lead.category || "—"}, ${lead.country || "HU"}).
Web: ${lead.website || "—"}. AI elemzés: ${JSON.stringify(lead.ai_analysis || {})}.
Csatorna: ${channel}. Ajánlat: ${JSON.stringify(c.offer || {})}. Platformunk: Egyszerű de Nagyszerű — AI-vezérelt webshop platform 0 Ft havidíjjal, saját domain, AI marketing, virtual try-on.`;
      const out = await callAI(sys, usr);
      const { data: ins } = await supabase.from("partner_outreach").insert({
        lead_id,
        campaign_id: lead.campaign_id,
        channel,
        subject: out.subject || null,
        message: out.message || "",
        variant,
        status: "draft",
        ai_generated: true,
        ai_model: MODEL,
        metadata: { cta: out.cta },
        created_by: uid,
      }).select().maybeSingle();
      return json({ ok: true, outreach: ins, generated: out });
    }

    if (action === "compute_insights") {
      const { campaign_id } = body;
      const filter = campaign_id ? { campaign_id } : {};
      const q1 = supabase.from("partner_outreach").select("channel,status,variant");
      const { data: outs } = campaign_id ? await q1.eq("campaign_id", campaign_id) : await q1;
      const byChannel: Record<string, { sent: number; replied: number }> = {};
      const byVariant: Record<string, { sent: number; replied: number }> = {};
      (outs || []).forEach((o: any) => {
        const ch = o.channel || "unknown";
        byChannel[ch] = byChannel[ch] || { sent: 0, replied: 0 };
        if (["sent", "delivered", "opened", "replied"].includes(o.status)) byChannel[ch].sent++;
        if (o.status === "replied") byChannel[ch].replied++;
        const v = o.variant || "unknown";
        byVariant[v] = byVariant[v] || { sent: 0, replied: 0 };
        if (["sent", "delivered", "opened", "replied"].includes(o.status)) byVariant[v].sent++;
        if (o.status === "replied") byVariant[v].replied++;
      });
      const insights: any[] = [];
      for (const [ch, s] of Object.entries(byChannel)) {
        if (s.sent < 3) continue;
        insights.push({
          campaign_id: campaign_id ?? null,
          scope: "channel",
          scope_key: ch,
          metric: "response_rate",
          value: s.replied / s.sent,
          sample_size: s.sent,
          recommendation: s.replied / s.sent > 0.15 ? `A "${ch}" csatorna jól teljesít — fókuszálj erre.` : `A "${ch}" csatorna gyengén teljesít — próbálj másikat.`,
          confidence: Math.min(0.95, s.sent / 50),
        });
      }
      for (const [v, s] of Object.entries(byVariant)) {
        if (s.sent < 3) continue;
        insights.push({
          campaign_id: campaign_id ?? null,
          scope: "message_variant",
          scope_key: v,
          metric: "response_rate",
          value: s.replied / s.sent,
          sample_size: s.sent,
          recommendation: `A "${v}" variáns ${(s.replied / s.sent * 100).toFixed(1)}% válaszaránnyal.`,
          confidence: Math.min(0.95, s.sent / 50),
        });
      }
      if (insights.length) await supabase.from("partner_ai_insights").insert(insights);
      return json({ ok: true, insights });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e: any) {
    if (e.message === "rate_limit") return json({ error: "Túl sok AI kérés." }, 429);
    if (e.message === "credits_exhausted") return json({ error: "AI kredit kimerült." }, 402);
    console.error(e);
    return json({ error: e.message || "server_error" }, 500);
  }
});

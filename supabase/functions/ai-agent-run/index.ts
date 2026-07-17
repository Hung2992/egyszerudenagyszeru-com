// AI Agent Runner — dispatch bármely agent futtatásához
// Aggresszív mód: minden agent automatán fut, mindent naplóz.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface AgentContext {
  supabase: ReturnType<typeof createClient>;
  apiKey: string;
  agent: any;
  runId: string;
}

// ---------- AI helper ----------
async function chat(apiKey: string, system: string, user: string, jsonMode = true): Promise<any> {
  const r = await fetch(AI_CHAT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const d = await r.json();
  const c = d?.choices?.[0]?.message?.content ?? "{}";
  if (!jsonMode) return c;
  try { return JSON.parse(c); } catch { const m = c.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {}; }
}

async function createTask(ctx: AgentContext, task: {
  task_type: string; title: string; description?: string;
  input?: any; output?: any; status?: string; auto_executed?: boolean;
}): Promise<void> {
  await ctx.supabase.from("ai_agent_tasks").insert({
    agent_slug: ctx.agent.slug,
    assigned_by: "ceo",
    task_type: task.task_type,
    title: task.title,
    description: task.description,
    input: task.input ?? {},
    output: task.output,
    status: task.status ?? "completed",
    auto_executed: task.auto_executed ?? true,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });
}

// ---------- CEO Orchestrator ----------
async function runCeo(ctx: AgentContext) {
  // Gyűjts adatokat az egész boltról
  const { data: recentOrders } = await ctx.supabase.from("orders")
    .select("total_amount, status, created_at").gte("created_at", new Date(Date.now() - 86400000).toISOString());
  const { data: recentTasks } = await ctx.supabase.from("ai_agent_tasks")
    .select("agent_slug, status, title").gte("created_at", new Date(Date.now() - 86400000).toISOString()).limit(50);
  const { data: pendingApprovals } = await ctx.supabase.from("ai_agent_tasks")
    .select("id", { count: "exact", head: true }).eq("status", "needs_approval");

  const orderCount = recentOrders?.length ?? 0;
  const revenue = (recentOrders ?? []).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);

  const brief = await chat(ctx.apiKey,
    "Te vagy az AI CEO egy magyar streetwear webshop élén. Rövid, konkrét, akcióorientált vagy. Csak érvényes JSON.",
    `24 órás adatok:
- Rendelések: ${orderCount}
- Bevétel: ${revenue.toFixed(0)} Ft
- Ügynökök feladatai: ${(recentTasks || []).length}
- Jóváhagyásra váró: ${pendingApprovals ?? 0}

Készíts reggeli briefinget magyarul JSON-ben:
{
  "headline": "1 mondatos főcím",
  "summary": "3-4 mondatos áttekintés",
  "highlights": ["✅ 3-5 konkrét eredmény pontokba"],
  "priorities": ["🎯 3 prioritás mára"]
}`);

  await ctx.supabase.from("ai_agent_briefings").insert({
    headline: brief.headline || "Napi brief",
    summary: brief.summary || "",
    highlights: brief.highlights || [],
    metrics: { orders: orderCount, revenue, pending_approvals: pendingApprovals ?? 0 },
    pending_approvals: pendingApprovals ?? 0,
  });

  await createTask(ctx, {
    task_type: "morning_brief",
    title: brief.headline || "Reggeli briefing",
    description: brief.summary,
    output: brief,
  });

  return { tasks: 1, summary: brief.headline };
}

// ---------- Marketing Agent ----------
async function runMarketing(ctx: AgentContext) {
  const { data: topProducts } = await ctx.supabase.from("shop_products")
    .select("name, price, category").eq("is_active", true).limit(10);

  const result = await chat(ctx.apiKey,
    "Te vagy egy magyar közösségi média copywriter. Streetwear webshop. Csak érvényes JSON.",
    `Termékek: ${JSON.stringify((topProducts || []).slice(0, 5))}

Generálj 3 posztot (FB/IG/TikTok) magyarul:
{"posts":[{"platform":"facebook","hook":"...","body":"...","hashtags":["#tag"],"cta":"..."}]}`);

  for (const p of (result.posts || []).slice(0, 3)) {
    await createTask(ctx, {
      task_type: "social_post",
      title: `${p.platform}: ${p.hook?.slice(0, 60)}`,
      description: p.body,
      input: { platform: p.platform },
      output: p,
    });
  }
  return { tasks: (result.posts || []).length, summary: `${(result.posts || []).length} social poszt generálva` };
}

// ---------- Partner Agent ----------
async function runPartner(ctx: AgentContext) {
  const result = await chat(ctx.apiKey,
    "Te egy magyar B2B partnerszerző AI vagy. Célod: magyar KKV-kat találj és megkereső leveleket írj. Csak JSON.",
    `Generálj 5 hipotetikus magyar KKV partner-jelöltet (streetwear/divat/kézműves) és személyre szabott megkereső e-mailt hozzájuk:
{"prospects":[{"company":"...","industry":"...","reason":"miért jó jelölt","email_subject":"...","email_body":"200 szó személyre szabott megkereső"}]}`);

  for (const p of (result.prospects || []).slice(0, 5)) {
    await createTask(ctx, {
      task_type: "partner_outreach",
      title: `Megkereső: ${p.company}`,
      description: p.reason,
      input: { company: p.company, industry: p.industry },
      output: p,
    });
  }
  return { tasks: (result.prospects || []).length, summary: `${(result.prospects || []).length} partner jelölt + megkereső levél` };
}

// ---------- Sales Agent ----------
async function runSales(ctx: AgentContext) {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: orders } = await ctx.supabase.from("orders")
    .select("status, total_amount, items").gte("created_at", since).limit(200);
  const abandoned = (orders || []).filter((o: any) => ["pending", "cart"].includes(o.status)).length;
  const completed = (orders || []).filter((o: any) => o.status === "completed" || o.status === "paid").length;
  const conv = orders && orders.length > 0 ? (completed / orders.length) * 100 : 0;

  const result = await chat(ctx.apiKey,
    "Te AI Sales elemző vagy. Konkrét javaslatokat adsz magyar streetwear webshop számára. Csak JSON.",
    `24 órás adatok:
- Rendelések: ${orders?.length ?? 0}
- Elhagyott kosarak: ${abandoned}
- Konverzió: ${conv.toFixed(1)}%

Javaslatok? {"actions":[{"title":"...","description":"...","expected_impact":"..."}]}`);

  await createTask(ctx, {
    task_type: "sales_analysis",
    title: `Sales elemzés: ${conv.toFixed(1)}% konv., ${abandoned} elhagyott`,
    description: `${orders?.length ?? 0} rendelés, ${completed} sikeres`,
    output: { metrics: { orders: orders?.length ?? 0, abandoned, conversion: conv }, ...result },
  });
  return { tasks: 1, summary: `Konverzió: ${conv.toFixed(1)}% • ${abandoned} elhagyott` };
}

// ---------- Inventory Agent ----------
async function runInventory(ctx: AgentContext) {
  const { data: products } = await ctx.supabase.from("shop_products")
    .select("id, name, stock_quantity, category").eq("is_active", true).limit(100);
  const lowStock = (products || []).filter((p: any) => (p.stock_quantity ?? 0) < 5);
  const deadStock = (products || []).filter((p: any) => (p.stock_quantity ?? 0) > 50);

  await createTask(ctx, {
    task_type: "inventory_report",
    title: `Készlet: ${lowStock.length} alacsony, ${deadStock.length} sok`,
    description: `Alacsony készlet: ${lowStock.map((p: any) => p.name).slice(0, 5).join(", ")}`,
    output: {
      low_stock: lowStock.slice(0, 20),
      dead_stock: deadStock.slice(0, 10),
      total_products: products?.length ?? 0,
    },
  });

  if (lowStock.length > 0) {
    await ctx.supabase.from("ai_agent_events").insert({
      from_agent: "inventory",
      to_agent: "finance",
      event_type: "reorder_needed",
      payload: { count: lowStock.length, products: lowStock.slice(0, 5).map((p: any) => p.name) },
    });
  }
  return { tasks: 1, summary: `${lowStock.length} alacsony készletű termék` };
}

// ---------- Finance Agent ----------
async function runFinance(ctx: AgentContext) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: orders } = await ctx.supabase.from("orders")
    .select("total_amount, status, created_at").gte("created_at", since);
  const paid = (orders || []).filter((o: any) => ["paid", "completed", "shipped", "delivered"].includes(o.status));
  const revenue = paid.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
  const avgOrder = paid.length ? revenue / paid.length : 0;

  const result = await chat(ctx.apiKey,
    "Te AI pénzügyi elemző vagy magyar webshop számára. Konkrét, KKV-barát nyelven. Csak JSON.",
    `7 nap: ${paid.length} fizetett rendelés, ${revenue.toFixed(0)} Ft bevétel, átlag rendelés: ${avgOrder.toFixed(0)} Ft.
Elemzés + 30 nap előrejelzés? {"analysis":"...","forecast_30d":number,"risks":["..."],"recommendations":["..."]}`);

  await createTask(ctx, {
    task_type: "finance_report",
    title: `Heti pénzügyi: ${Math.round(revenue).toLocaleString("hu-HU")} Ft`,
    description: result.analysis,
    output: { metrics: { orders: paid.length, revenue, avg_order: avgOrder }, ...result },
  });
  return { tasks: 1, summary: `${Math.round(revenue).toLocaleString("hu-HU")} Ft bevétel (7 nap)` };
}

// ---------- Security Agent ----------
async function runSecurity(ctx: AgentContext) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data: signals } = await ctx.supabase.from("fraud_signals")
    .select("*").gte("created_at", since).limit(50);
  const highRisk = (signals || []).filter((s: any) => (s.risk_score ?? 0) > 70);

  await createTask(ctx, {
    task_type: "security_scan",
    title: `Biztonsági scan: ${highRisk.length} magas kockázat`,
    description: `${signals?.length ?? 0} jelzés elemezve az elmúlt órában`,
    output: { total: signals?.length ?? 0, high_risk: highRisk.length },
  });
  return { tasks: 1, summary: `${highRisk.length} magas kockázatú esemény` };
}

// ---------- Support Agent ----------
async function runSupport(ctx: AgentContext) {
  const { data: msgs } = await ctx.supabase.from("contact_messages")
    .select("id, subject, message, status").eq("status", "new").limit(20);

  if (!msgs || msgs.length === 0) {
    await createTask(ctx, {
      task_type: "support_check",
      title: "Nincs új ügyfélszolgálati üzenet",
      output: { new_tickets: 0 },
    });
    return { tasks: 1, summary: "0 új ticket" };
  }

  const result = await chat(ctx.apiKey,
    "Te AI ügyfélszolgálati triage vagy. Sürgősség szerint priorizálod a tiketeket. Csak JSON.",
    `Tiketek: ${JSON.stringify(msgs.map((m: any) => ({ id: m.id, subject: m.subject, message: (m.message || "").slice(0, 200) })))}
{"triage":[{"id":"...","priority":"high|med|low","suggested_action":"..."}]}`);

  await createTask(ctx, {
    task_type: "support_triage",
    title: `${msgs.length} új ticket triage-elve`,
    description: `${result.triage?.filter((t: any) => t.priority === "high").length ?? 0} sürgős`,
    output: result,
  });
  return { tasks: 1, summary: `${msgs.length} ticket triage` };
}

const RUNNERS: Record<string, (ctx: AgentContext) => Promise<{ tasks: number; summary: string }>> = {
  ceo: runCeo,
  marketing: runMarketing,
  partner: runPartner,
  sales: runSales,
  inventory: runInventory,
  finance: runFinance,
  security: runSecurity,
  support: runSupport,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const auth = req.headers.get("Authorization") || "";
    const isCron = req.headers.get("x-cron-secret") === Deno.env.get("CRON_SECRET");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      auth ? { global: { headers: { Authorization: auth } } } : undefined,
    );

    if (!isCron) {
      if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (!isAdmin) return json({ error: "Admin required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const slug = String(body?.agent_slug || "").toLowerCase();
    const action = String(body?.action || "run");

    if (action === "run_all") {
      const results: any[] = [];
      for (const s of Object.keys(RUNNERS)) {
        try {
          const r = await runOne(supabase, apiKey, s);
          results.push({ agent: s, ...r });
        } catch (e: any) {
          results.push({ agent: s, error: e?.message });
        }
      }
      return json({ ok: true, results });
    }

    if (!slug || !RUNNERS[slug]) return json({ error: "unknown agent_slug" }, 400);
    const r = await runOne(supabase, apiKey, slug);
    return json({ ok: true, ...r });
  } catch (e: any) {
    return json({ error: e?.message || "internal" }, 500);
  }
});

async function runOne(supabase: any, apiKey: string, slug: string) {
  const { data: agent } = await supabase.from("ai_agents").select("*").eq("slug", slug).maybeSingle();
  if (!agent) throw new Error(`Agent not found: ${slug}`);
  if (!agent.is_active) return { skipped: true, reason: "agent inactive" };

  const t0 = Date.now();
  const { data: run } = await supabase.from("ai_agent_runs")
    .insert({ agent_slug: slug, status: "running", trigger: "manual" }).select().single();

  try {
    const result = await RUNNERS[slug]({ supabase, apiKey, agent, runId: run.id });
    const duration = Date.now() - t0;
    await supabase.from("ai_agent_runs").update({
      status: "completed",
      tasks_created: result.tasks,
      tasks_completed: result.tasks,
      duration_ms: duration,
      summary: result.summary,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    await supabase.from("ai_agents").update({
      last_run_at: new Date().toISOString(),
      last_run_status: "completed",
      total_runs: (agent.total_runs ?? 0) + 1,
      total_tasks_completed: (agent.total_tasks_completed ?? 0) + result.tasks,
    }).eq("slug", slug);
    return { agent: slug, tasks: result.tasks, summary: result.summary, duration_ms: duration };
  } catch (e: any) {
    await supabase.from("ai_agent_runs").update({
      status: "failed",
      error_message: e?.message || String(e),
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    await supabase.from("ai_agents").update({
      last_run_at: new Date().toISOString(),
      last_run_status: "failed",
    }).eq("slug", slug);
    throw e;
  }
}

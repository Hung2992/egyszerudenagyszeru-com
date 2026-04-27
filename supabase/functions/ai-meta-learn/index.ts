// Meta-tanulási réteg: a rendszer felfedezi a saját mintázatait és új elveket alkot
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function callAI(messages: any[], tools?: any[]) {
  const body: any = { model: "google/gemini-2.5-pro", messages };
  if (tools) {
    body.tools = tools;
    body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
  }
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { lookback = 100, auto_apply = false } = await req.json().catch(() => ({}));

    // 1. Statisztikai elemzés futtatása
    const { data: analysis, error: aErr } = await admin.rpc("run_meta_learning_analysis", {
      _lookback: lookback,
    });
    if (aErr) throw aErr;

    const runId = (analysis as any).run_id;

    // 2. AI által vezérelt mintázat-felismerés és elv-generálás
    const tool = {
      type: "function",
      function: {
        name: "submit_meta_insights",
        description: "Adj vissza magas szintű mintázatokat és új elveket a statisztikák alapján.",
        parameters: {
          type: "object",
          properties: {
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string", description: "Felfedezett mintázat egy mondatban" },
                  evidence: { type: "string", description: "Mire alapozva" },
                  severity: { type: "string", enum: ["low", "medium", "high"] },
                },
                required: ["pattern", "evidence", "severity"],
              },
            },
            new_principles: {
              type: "array",
              description: "Új, magas szintű viselkedési elvek (max 3). Konkrétak, akcionálhatók, magyarul.",
              items: {
                type: "object",
                properties: {
                  principle: { type: "string", description: "Az elv egy mondatban, parancs formában." },
                  context: { type: "string", description: "Mely kontextusra érvényes (general ha mindenre)." },
                  weight: { type: "number", description: "0-1 fontossági súly" },
                },
                required: ["principle", "context", "weight"],
              },
            },
            executive_summary: {
              type: "string",
              description: "2-3 mondatos vezetői összefoglaló magyarul: mit tanult ma a rendszer önmagáról.",
            },
          },
          required: ["patterns", "new_principles", "executive_summary"],
          additionalProperties: false,
        },
      },
    };

    const ctx = `STATISZTIKA (utolsó ${lookback} reflexió):
- Reflexiók: ${(analysis as any).reflections}
- Feedback: ${(analysis as any).feedback}
- Gyenge stratégiák: ${JSON.stringify((analysis as any).weak_strategies)}
- Gyenge kontextusok: ${JSON.stringify((analysis as any).weak_contexts)}
- Top gyengeség címkék: ${JSON.stringify((analysis as any).top_tags)}
- Önámítás-pontszám (0-1, magas=AI túlbecsüli magát): ${(analysis as any).self_deception}
- Algoritmikus ajánlások: ${JSON.stringify((analysis as any).recommendations)}`;

    const resp = await callAI(
      [
        {
          role: "system",
          content:
            "Te vagy az AI rendszer meta-tanulási elemzője. Feladatod: a statisztikákból absztrakt mintázatokat ismerj fel, és új viselkedési elveket fogalmazz meg, amelyek a jövőben jobbá teszik a rendszert. Magyarul válaszolj. Légy szigorú, konkrét és önkritikus.",
        },
        { role: "user", content: ctx },
      ],
      [tool],
    );

    const tc = resp.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) throw new Error("no insights tool_call");
    const insights = JSON.parse(tc.function.arguments);

    // 3. Futás kiegészítése AI insightokkal
    await admin
      .from("ai_meta_learning_runs")
      .update({
        patterns_found: insights.patterns ?? [],
        summary: insights.executive_summary ?? null,
      })
      .eq("id", runId);

    // 4. Új elvek mentése (vagy meglévő erősítése)
    const principlesAdded: string[] = [];
    for (const p of insights.new_principles ?? []) {
      const principleText = String(p.principle || "").slice(0, 500);
      if (principleText.length < 10) continue;

      const ctxName = String(p.context || "general").slice(0, 50);
      const weight = Math.max(0, Math.min(1, Number(p.weight) || 0.5));

      // Meglévő hasonló elv keresése (egyszerű exact match)
      const { data: existing } = await admin
        .from("ai_meta_principles")
        .select("id, weight, reinforcement_count")
        .eq("principle", principleText)
        .eq("context", ctxName)
        .maybeSingle();

      if (existing) {
        await admin
          .from("ai_meta_principles")
          .update({
            reinforcement_count: existing.reinforcement_count + 1,
            weight: Math.min(1, existing.weight + 0.1),
            last_reinforced_at: new Date().toISOString(),
            is_active: true,
          })
          .eq("id", existing.id);
      } else {
        await admin.from("ai_meta_principles").insert({
          principle: principleText,
          context: ctxName,
          source: "meta_learning",
          weight,
        });
        principlesAdded.push(principleText);
      }
    }

    // 5. Recommendation alapján meta-akciók generálása (pending státuszban)
    const actionsCreated: any[] = [];
    for (const rec of (analysis as any).recommendations ?? []) {
      if (rec.type === "reduce_strategy_usage") {
        for (const t of rec.targets ?? []) {
          const { data: act } = await admin
            .from("ai_meta_actions")
            .insert({
              run_id: runId,
              action_type: "deactivate_strategy",
              target_table: "ai_response_strategies",
              target_id: t.id,
              description: `Stratégia kikapcsolása: ${t.name} (win_rate ${t.win_rate})`,
              payload: { name: t.name, win_rate: t.win_rate },
              auto_applied: false,
            })
            .select("id, description")
            .single();
          if (act) actionsCreated.push(act);
        }
      }
      if (rec.type === "add_context_rule") {
        for (const t of rec.targets ?? []) {
          const { data: act } = await admin
            .from("ai_meta_actions")
            .insert({
              run_id: runId,
              action_type: "add_context_rule",
              description: `Hard-rule a(z) ${t.context} kontextushoz (átlag ${t.avg_score})`,
              payload: {
                context_name: `auto_${t.context}_${Date.now()}`,
                keywords: [t.context],
                forced_strategy_name: "analytical_deep",
                disable_exploration: true,
              },
            })
            .select("id, description")
            .single();
          if (act) actionsCreated.push(act);
        }
      }
    }

    return new Response(
      JSON.stringify({
        run_id: runId,
        analysis,
        insights,
        principles_added: principlesAdded,
        actions_created: actionsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-meta-learn error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

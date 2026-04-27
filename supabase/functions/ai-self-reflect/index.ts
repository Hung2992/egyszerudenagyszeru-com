// Reflexív önfejlesztés: az AI kiértékeli saját válaszát és tanul belőle
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function callAI(messages: any[], tools?: any[]) {
  const body: any = {
    model: "google/gemini-2.5-flash",
    messages,
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
  }
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`AI error ${r.status}: ${await r.text()}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      user_question,
      ai_response,
      conversation_id,
      used_knowledge_ids = [],
      used_domains = [],
      strategy_id,
      question_context,
    } = await req.json();

    if (!user_question || !ai_response) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. AI önértékelés strukturált tool-callal — KIBŐVÍTETT mezők:
    // weakness_tags (címkék), improvement_suggestion (konkrét, akcionálható)
    const ALLOWED_TAGS = [
      "tul_hosszu", "tul_rovid", "pontatlan", "hianyos",
      "rossz_hangnem", "rossz_celkozonseg", "homalyos", "felesleges_ismetles",
      "nincs_konkret_pelda", "nincs_kovetkezo_lepes",
    ];
    const ALLOWED_CONTEXTS = [
      "legal_financial", "quick_lookup", "coaching", "casual_chat",
      "marketing", "technical", "general",
    ];

    const tool = {
      type: "function",
      function: {
        name: "submit_reflection",
        description: "Értékeld ki a saját AI választ a kérdés tükrében.",
        parameters: {
          type: "object",
          properties: {
            self_correctness: { type: "number", description: "0-1: mennyire pontos és hibamentes" },
            self_completeness: { type: "number", description: "0-1: mennyire teljes körű" },
            self_tone: { type: "number", description: "0-1: mennyire megfelelő hangnem és stílus" },
            identified_gaps: { type: "string", description: "Mi hiányzik vagy hibás (max 300 karakter)" },
            suggested_strategy: { type: "string", description: "Általános stratégia jövőre (max 300 karakter)" },
            improvement_suggestion: {
              type: "string",
              description: "KONKRÉT, akcionálható javítás a következő hasonló kérdéshez. Pl.: 'Adj 3 mondatos választ konkrét árazási példával.' Max 300 karakter.",
            },
            weakness_tags: {
              type: "array",
              items: { type: "string", enum: ALLOWED_TAGS },
              description: "0-4 db legjellemzőbb gyengeség címke a megadott listából.",
            },
            question_context: {
              type: "string",
              enum: ALLOWED_CONTEXTS,
              description: "A kérdés besorolt kontextusa.",
            },
          },
          required: [
            "self_correctness", "self_completeness", "self_tone",
            "identified_gaps", "suggested_strategy",
            "improvement_suggestion", "weakness_tags", "question_context",
          ],
          additionalProperties: false,
        },
      },
    };

    const reflectPrompt = `KÉRDÉS:\n${user_question}\n\nADOTT AI VÁLASZ:\n${ai_response}\n\nÉrtékeld ki őszintén és kritikusan a saját válaszodat. Légy szigorú: ha valami homályos vagy hiányos, jelezd. Add meg a konkrét javítási javaslatot is — ne általánosságokban, hanem konkrétan, mint utasítás.`;

    const reflResp = await callAI(
      [
        { role: "system", content: "Te egy szigorú AI minőség-ellenőr vagy. Magyarul értékelsz." },
        { role: "user", content: reflectPrompt },
      ],
      [tool],
    );

    const toolCall = reflResp.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("no reflection tool_call");
    const parsed = JSON.parse(toolCall.function.arguments);

    const clamp = (n: number) => Math.max(0, Math.min(1, Number(n) || 0));
    const safeTags: string[] = Array.isArray(parsed.weakness_tags)
      ? parsed.weakness_tags.filter((t: any) => ALLOWED_TAGS.includes(String(t))).slice(0, 4)
      : [];
    const safeCtx = ALLOWED_CONTEXTS.includes(String(question_context))
      ? String(question_context)
      : (ALLOWED_CONTEXTS.includes(String(parsed.question_context)) ? String(parsed.question_context) : "general");

    // 2. Reflexió mentése
    const { data: reflection, error: refErr } = await admin
      .from("ai_response_reflections")
      .insert({
        conversation_id: conversation_id ?? null,
        user_question: String(user_question).slice(0, 4000),
        ai_response: String(ai_response).slice(0, 8000),
        used_knowledge_ids,
        used_domains,
        self_correctness: clamp(parsed.self_correctness),
        self_completeness: clamp(parsed.self_completeness),
        self_tone: clamp(parsed.self_tone),
        identified_gaps: String(parsed.identified_gaps || "").slice(0, 500),
        suggested_strategy: String(parsed.suggested_strategy || "").slice(0, 500),
        improvement_suggestion: String(parsed.improvement_suggestion || "").slice(0, 500),
        weakness_tags: safeTags,
        question_context: safeCtx,
        strategy_id: strategy_id ?? null,
      })
      .select("id, overall_score")
      .single();

    if (refErr) throw refErr;

    // 3. Ha gyenge a válasz (< 0.6) ÉS van konkrét javítás, mentsük tudásként —
    //    DE KÖTELEZŐEN pending_review-ban (csak admin jóváhagyás után aktív).
    let learnedAsKnowledge = false;
    const improvement = String(parsed.improvement_suggestion || parsed.suggested_strategy || "");
    if (reflection.overall_score < 0.6 && improvement.length > 30) {
      const learnContent = `[Önreflexiós tanulság — admin jóváhagyásra vár]\nKérdéstípus: ${String(user_question).slice(0, 200)}\nKontextus: ${safeCtx}\nGyengeségek: ${safeTags.join(", ") || "—"}\nFelismert hiba: ${parsed.identified_gaps}\nKonkrét jövőbeli javítás: ${improvement}`;

      const { data: doc } = await admin
        .from("ai_knowledge_documents")
        .insert({
          title: `Önreflexió: ${String(user_question).slice(0, 80)}`,
          source_type: "self_reflection",
          domain: safeCtx,
          status: "ready",
          summary: improvement.slice(0, 200),
          raw_text: learnContent,
          chunk_count: 1,
          confidence: 0.55,
          source_count: 1,
          review_status: "pending_review",
          quality_score: 0.8,
        })
        .select("id")
        .single();

      if (doc) {
        await admin.from("ai_knowledge_chunks").insert({
          document_id: doc.id,
          chunk_index: 0,
          content: learnContent,
        });
        learnedAsKnowledge = true;
        await admin
          .from("ai_response_reflections")
          .update({ applied_to_learning: true })
          .eq("id", reflection.id);
      }
    }

    // 🧬 Stratégia statisztika v2: kontextusonkénti, ÖNÉRTÉKELÉS súlya kicsi (önámítás védelem)
    if (strategy_id) {
      admin
        .rpc("update_strategy_stats_v2", {
          _strategy_id: strategy_id,
          _context: safeCtx,
          _user_rating: null,
          _self_score: clamp(reflection.overall_score ?? 0.7),
          _is_admin: false,
        })
        .then(() => {}, () => {});
    }

    return new Response(
      JSON.stringify({
        reflection_id: reflection.id,
        overall_score: reflection.overall_score,
        learned_as_knowledge: learnedAsKnowledge,
        reflection: parsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-self-reflect error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

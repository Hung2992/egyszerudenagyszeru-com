// AI Self-Learning: extracts durable knowledge from conversations and stores in RAG
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";

async function embedOne(text: string): Promise<number[] | null> {
  try {
    const resp = await fetch(`${AI_GATEWAY}/embeddings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/text-embedding-004", input: text }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.data?.[0]?.embedding ?? null;
  } catch { return null; }
}

async function extractKnowledge(userMsg: string, assistantMsg: string): Promise<{ keep: boolean; title: string; facts: string[] }> {
  const resp = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `Te egy tudásmenedzser vagy. Egy admin-AI beszélgetésből kell kinyerned a TARTÓS, ÚJRAHASZNOSÍTHATÓ tudást.

SZABÁLYOK:
- Csak akkor tarts meg, ha a beszélgetésben TÉNY, DÖNTÉS, PREFERENCIA, SZABÁLY, vagy üzleti INFO van
- Ne tarts meg: small talk, köszönések, jelenlegi pillanatnyi adatok (pl. "ma 5 rendelés")
- Ha tényt találsz, írd át 3. személyben általános formára (pl. "A tulajdonos preferálja az AliExpress beszállítót")
- Max 5 tény, mindegyik max 2 mondat
- Magyarul

Válaszolj CSAK ezzel a JSON formátummal:
{"keep": true|false, "title": "rövid cím", "facts": ["tény 1", "tény 2"]}` },
        { role: "user", content: `FELHASZNÁLÓ:\n${userMsg.slice(0, 2000)}\n\nAI VÁLASZ:\n${assistantMsg.slice(0, 3000)}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) return { keep: false, title: "", facts: [] };
  const data = await resp.json();
  try {
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    return { keep: !!parsed.keep, title: String(parsed.title || ""), facts: Array.isArray(parsed.facts) ? parsed.facts.slice(0, 5) : [] };
  } catch { return { keep: false, title: "", facts: [] }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const userMsg = String(body?.userMessage || "").trim();
    const assistantMsg = String(body?.assistantMessage || "").trim();
    if (userMsg.length < 10 || assistantMsg.length < 30) {
      return new Response(JSON.stringify({ skipped: true, reason: "too_short" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const extracted = await extractKnowledge(userMsg, assistantMsg);
    if (!extracted.keep || extracted.facts.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_durable_knowledge" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const title = `🧠 Tanulás: ${extracted.title || userMsg.slice(0, 60)}`;
    const fullText = extracted.facts.map((f, i) => `${i + 1}. ${f}`).join("\n");

    const { data: doc, error: docErr } = await admin.from("ai_knowledge_documents").insert({
      title, source_type: "self_learning", raw_text: fullText, summary: extracted.title || null,
      status: "ready", chunk_count: extracted.facts.length, created_by: userId,
    }).select().single();
    if (docErr || !doc) throw new Error(docErr?.message || "doc insert failed");

    // Embed each fact as its own chunk for precise retrieval
    const chunks = await Promise.all(extracted.facts.map(async (fact, idx) => {
      const vec = await embedOne(fact);
      return { document_id: doc.id, chunk_index: idx, content: fact, embedding: vec, token_count: Math.ceil(fact.length / 4) };
    }));
    const valid = chunks.filter(c => c.embedding);
    if (valid.length > 0) await admin.from("ai_knowledge_chunks").insert(valid);

    return new Response(JSON.stringify({ learned: true, factCount: valid.length, title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("self-learn error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

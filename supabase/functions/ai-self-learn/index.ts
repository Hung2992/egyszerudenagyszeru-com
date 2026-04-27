// AI Self-Learning v2: with confidence, domain classification, daily quota, review queue
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

type ExtractedFact = { fact: string; domain: string; confidence: number };

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

async function extractKnowledge(userMsg: string, assistantMsg: string): Promise<{ keep: boolean; title: string; facts: ExtractedFact[] }> {
  const resp = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `Te egy szigorú tudásmenedzser vagy. Egy admin-AI beszélgetésből kell kinyerned a TARTÓS, ÚJRAHASZNOSÍTHATÓ tudást.

KEMÉNY SZABÁLYOK:
- Csak akkor tarts meg, ha TÉNY, DÖNTÉS, PREFERENCIA, SZABÁLY vagy üzleti INFO van
- TILOS megtartani: small talk, köszönések, pillanatnyi adatok, érzelmek, vélemények
- Ha bizonytalan vagy → INKÁBB DOBD KI
- Írd át 3. személyben általános formára
- Max 3 tény (kevesebb jobb!), mindegyik max 2 mondat
- Magyarul

MINDEN ténynél KÖTELEZŐEN add meg:
- "domain": "product" | "marketing" | "customer" | "operations" | "general"
- "confidence": 0.0–1.0 (mennyire vagy biztos benne, hogy ez tartós igazság)

Válaszolj CSAK ezzel a JSON formátummal:
{"keep": true|false, "title": "rövid cím", "facts": [{"fact": "...", "domain": "product", "confidence": 0.85}]}` },
        { role: "user", content: `FELHASZNÁLÓ:\n${userMsg.slice(0, 2000)}\n\nAI VÁLASZ:\n${assistantMsg.slice(0, 3000)}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) return { keep: false, title: "", facts: [] };
  const data = await resp.json();
  try {
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    const rawFacts = Array.isArray(parsed.facts) ? parsed.facts : [];
    const validDomains = ["product", "marketing", "customer", "operations", "general"];
    const facts: ExtractedFact[] = rawFacts.slice(0, 3).map((f: any) => ({
      fact: String(f.fact || "").trim(),
      domain: validDomains.includes(f.domain) ? f.domain : "general",
      confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0.5)),
    })).filter((f: ExtractedFact) => f.fact.length >= 10);
    return { keep: !!parsed.keep, title: String(parsed.title || ""), facts };
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

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 🚦 NAPI KVÓTA ELLENŐRZÉS
    const { data: quotaOk } = await admin.rpc("check_and_bump_learn_quota", { _kind: "fact" });
    if (!quotaOk) {
      return new Response(JSON.stringify({ skipped: true, reason: "daily_quota_exceeded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = await extractKnowledge(userMsg, assistantMsg);
    if (!extracted.keep || extracted.facts.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_durable_knowledge" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 🔍 DUPLIKÁCIÓ + ALACSONY CONFIDENCE SZŰRÉS
    const validFacts: { fact: ExtractedFact; embedding: number[] }[] = [];
    let duplicateCount = 0;
    let lowConfidenceCount = 0;

    for (const f of extracted.facts) {
      // Confidence threshold: alatta nem mentjük el
      if (f.confidence < 0.55) { lowConfidenceCount++; continue; }

      const vec = await embedOne(f.fact);
      if (!vec) continue;

      const { data: matches } = await admin.rpc("match_ai_knowledge", {
        query_embedding: vec, match_count: 1, similarity_threshold: 0.92,
      });
      if (Array.isArray(matches) && matches.length > 0) {
        duplicateCount++;
        continue;
      }
      validFacts.push({ fact: f, embedding: vec });
    }

    if (validFacts.length === 0) {
      return new Response(JSON.stringify({
        skipped: true, reason: "all_filtered",
        duplicates: duplicateCount, lowConfidence: lowConfidenceCount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Domain szerint csoportosítás
    const byDomain = new Map<string, typeof validFacts>();
    for (const vf of validFacts) {
      const d = vf.fact.domain;
      if (!byDomain.has(d)) byDomain.set(d, []);
      byDomain.get(d)!.push(vf);
    }

    const createdDocs: { id: string; title: string; domain: string; review: string }[] = [];

    for (const [domain, facts] of byDomain) {
      const avgConfidence = facts.reduce((s, f) => s + f.fact.confidence, 0) / facts.length;
      // Alacsony confidence single-source tény → review queue
      const reviewStatus = avgConfidence < 0.75 ? "pending_review" : "auto_approved";
      const status = reviewStatus === "pending_review" ? "pending" : "ready";

      const title = `🧠 [${domain}] ${extracted.title || userMsg.slice(0, 60)}`;
      const fullText = facts.map((f, i) => `${i + 1}. ${f.fact.fact}`).join("\n");

      const { data: doc, error: docErr } = await admin.from("ai_knowledge_documents").insert({
        title, source_type: "self_learning", raw_text: fullText, summary: extracted.title || null,
        status, chunk_count: facts.length, created_by: userId,
        confidence: avgConfidence, source_count: facts.length, domain,
        review_status: reviewStatus, version: 1,
      }).select().single();
      if (docErr || !doc) continue;

      const chunks = facts.map((vf, idx) => ({
        document_id: doc.id, chunk_index: idx, content: vf.fact.fact,
        embedding: vf.embedding, token_count: Math.ceil(vf.fact.fact.length / 4),
      }));
      await admin.from("ai_knowledge_chunks").insert(chunks);

      createdDocs.push({ id: doc.id, title, domain, review: reviewStatus });
    }

    return new Response(JSON.stringify({
      learned: createdDocs.length > 0,
      docs: createdDocs,
      duplicates: duplicateCount,
      lowConfidence: lowConfidenceCount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("self-learn error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Cron-callable variant of knowledge consolidation: no auth, runs as service role
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

function clusterFacts(items: { id: string; content: string; embedding: number[] }[], threshold = 0.78) {
  const clusters: typeof items[] = [];
  const used = new Set<string>();
  for (const item of items) {
    if (used.has(item.id)) continue;
    const cluster = [item];
    used.add(item.id);
    for (const other of items) {
      if (used.has(other.id)) continue;
      if (cosine(item.embedding, other.embedding) >= threshold) {
        cluster.push(other); used.add(other.id);
      }
    }
    if (cluster.length >= 2) clusters.push(cluster);
  }
  return clusters;
}

async function synthesizeMeta(facts: string[]) {
  const resp = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `Te egy meta-tudás szintetizáló vagy. Több kapcsolódó tényt sűríts össze egyetlen, magasabb szintű szabállyá vagy mintázattá. 2-4 mondat, magyarul, 3. személyben. Válasz JSON: {"title":"...","summary":"..."}` },
        { role: "user", content: `TÉNYEK:\n${facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  try {
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    if (!parsed.title || !parsed.summary) return null;
    return { title: String(parsed.title), summary: String(parsed.summary) };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Decay first (defensive — cron also calls SQL decay directly)
    await admin.rpc("decay_ai_knowledge_quality");

    const { data: docs } = await admin
      .from("ai_knowledge_documents")
      .select("id")
      .eq("source_type", "self_learning")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(80);

    if (!docs || docs.length < 2) {
      return new Response(JSON.stringify({ ok: true, reason: "not_enough_knowledge" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: chunks } = await admin
      .from("ai_knowledge_chunks")
      .select("id, content, embedding")
      .in("document_id", docs.map((d) => d.id))
      .limit(400);

    if (!chunks || chunks.length < 3) {
      return new Response(JSON.stringify({ ok: true, reason: "too_few_chunks" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = chunks.map((c: any) => {
      let emb: number[] | null = null;
      if (Array.isArray(c.embedding)) emb = c.embedding;
      else if (typeof c.embedding === "string") { try { emb = JSON.parse(c.embedding); } catch { /**/ } }
      return emb ? { id: c.id, content: c.content, embedding: emb } : null;
    }).filter((x): x is { id: string; content: string; embedding: number[] } => x !== null);

    const clusters = clusterFacts(items, 0.78);
    let metaCreated = 0;

    for (const cluster of clusters.slice(0, 10)) {
      const facts = cluster.map((c) => c.content);
      const meta = await synthesizeMeta(facts);
      if (!meta) continue;

      const metaVec = await embedOne(meta.summary);
      if (!metaVec) continue;

      const { data: existing } = await admin.rpc("match_ai_knowledge", {
        query_embedding: metaVec, match_count: 1, similarity_threshold: 0.93,
      });
      if (Array.isArray(existing) && existing.length > 0) continue;

      const { data: doc } = await admin.from("ai_knowledge_documents").insert({
        title: `🌌 Meta-tudás: ${meta.title}`,
        source_type: "meta_consolidation",
        raw_text: `${meta.summary}\n\n--- Forrás tények ---\n${facts.join("\n")}`,
        summary: meta.title, status: "ready", chunk_count: 1,
        quality_score: 2.0, // meta starts with higher score
      }).select().single();
      if (!doc) continue;

      await admin.from("ai_knowledge_chunks").insert({
        document_id: doc.id, chunk_index: 0, content: meta.summary,
        embedding: metaVec, token_count: Math.ceil(meta.summary.length / 4),
      });
      metaCreated++;
    }

    return new Response(JSON.stringify({
      ok: true, analyzedChunks: items.length, clustersFound: clusters.length, metaCreated,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("consolidate-cron error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

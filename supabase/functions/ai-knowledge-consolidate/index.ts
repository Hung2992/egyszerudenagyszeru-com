// AI Knowledge Consolidation: meta-learning layer
// Reviews self-learned facts, clusters related ones, merges into higher-level meta-knowledge
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

// Cosine similarity for clustering
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

// Greedy clustering by similarity threshold
function clusterFacts(items: { id: string; content: string; embedding: number[] }[], threshold = 0.78): typeof items[] {
  const clusters: typeof items[] = [];
  const used = new Set<string>();
  for (const item of items) {
    if (used.has(item.id)) continue;
    const cluster = [item];
    used.add(item.id);
    for (const other of items) {
      if (used.has(other.id)) continue;
      if (cosine(item.embedding, other.embedding) >= threshold) {
        cluster.push(other);
        used.add(other.id);
      }
    }
    if (cluster.length >= 2) clusters.push(cluster);
  }
  return clusters;
}

async function synthesizeMeta(facts: string[]): Promise<{ title: string; summary: string } | null> {
  const resp = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `Te egy meta-tudás szintetizáló vagy. Több kapcsolódó tényt kell egyetlen, magasabb szintű, általánosabb szabállyá vagy összefoglaló tudássá sűrítened.

SZABÁLYOK:
- Az új meta-tény legyen ÁLTALÁNOSABB és HASZNÁLHATÓBB, mint az eredetiek
- Ne ismételd, hanem szintetizálj (mintázatot, szabályt, preferenciát keresve)
- 2-4 mondat maximum
- Magyarul, 3. személyben

Válaszolj CSAK ezzel a JSON formátummal:
{"title": "rövid cím (max 80 karakter)", "summary": "a szintetizált meta-tudás"}` },
        { role: "user", content: `KAPCSOLÓDÓ TÉNYEK:\n${facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}` },
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

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch self-learned chunks (limit to recent / non-meta to avoid recursion)
    const { data: docs } = await admin
      .from("ai_knowledge_documents")
      .select("id")
      .eq("source_type", "self_learning")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(60);

    if (!docs || docs.length < 2) {
      return new Response(JSON.stringify({ ok: true, reason: "not_enough_knowledge", clusters: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docIds = docs.map((d) => d.id);
    const { data: chunks } = await admin
      .from("ai_knowledge_chunks")
      .select("id, document_id, content, embedding")
      .in("document_id", docIds)
      .limit(300);

    if (!chunks || chunks.length < 3) {
      return new Response(JSON.stringify({ ok: true, reason: "too_few_chunks", clusters: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse embeddings (stored as string in pgvector)
    const items = chunks
      .map((c: any) => {
        let emb: number[] | null = null;
        if (Array.isArray(c.embedding)) emb = c.embedding;
        else if (typeof c.embedding === "string") {
          try { emb = JSON.parse(c.embedding); } catch { emb = null; }
        }
        return emb && emb.length > 0 ? { id: c.id, content: c.content, embedding: emb } : null;
      })
      .filter((x): x is { id: string; content: string; embedding: number[] } => x !== null);

    const clusters = clusterFacts(items, 0.78);
    let metaCreated = 0;

    for (const cluster of clusters.slice(0, 8)) { // max 8 meta per run
      const facts = cluster.map((c) => c.content);
      const meta = await synthesizeMeta(facts);
      if (!meta) continue;

      // Check duplicate against existing knowledge
      const metaVec = await embedOne(meta.summary);
      if (!metaVec) continue;

      const { data: existing } = await admin.rpc("match_ai_knowledge", {
        query_embedding: metaVec, match_count: 1, similarity_threshold: 0.93,
      });
      if (Array.isArray(existing) && existing.length > 0) continue;

      const { data: doc, error: docErr } = await admin.from("ai_knowledge_documents").insert({
        title: `🌌 Meta-tudás: ${meta.title}`,
        source_type: "meta_consolidation",
        raw_text: `${meta.summary}\n\n--- Forrás tények ---\n${facts.join("\n")}`,
        summary: meta.title,
        status: "ready",
        chunk_count: 1,
        created_by: userId,
      }).select().single();
      if (docErr || !doc) continue;

      await admin.from("ai_knowledge_chunks").insert({
        document_id: doc.id,
        chunk_index: 0,
        content: meta.summary,
        embedding: metaVec,
        token_count: Math.ceil(meta.summary.length / 4),
      });
      metaCreated++;
    }

    return new Response(JSON.stringify({
      ok: true,
      analyzedChunks: items.length,
      clustersFound: clusters.length,
      metaCreated,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("consolidate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// AI Knowledge Processor: extracts text, chunks it, embeds with Gemini, stores in pgvector
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

function chunkText(text: string, maxChars = 1200, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return [clean];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + maxChars, clean.length);
    let slice = clean.slice(i, end);
    // try to break on sentence boundary
    if (end < clean.length) {
      const lastDot = slice.lastIndexOf(". ");
      if (lastDot > maxChars * 0.5) slice = slice.slice(0, lastDot + 1);
    }
    chunks.push(slice.trim());
    i += slice.length - overlap;
    if (i < 0) i = slice.length;
  }
  return chunks.filter((c) => c.length > 20);
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  // Gemini embedding via Lovable AI Gateway
  const out: number[][] = [];
  for (const text of texts) {
    const resp = await fetch(`${AI_GATEWAY}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/text-embedding-004",
        input: text,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Embedding failed [${resp.status}]: ${errText}`);
    }
    const data = await resp.json();
    const vec = data?.data?.[0]?.embedding;
    if (!Array.isArray(vec)) throw new Error("No embedding returned");
    out.push(vec);
  }
  return out;
}

async function summarize(text: string): Promise<string> {
  const truncated = text.slice(0, 8000);
  const resp = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Készíts max 3 mondatos magyar nyelvű összefoglalót a szövegről. Csak a lényeg." },
        { role: "user", content: truncated },
      ],
    }),
  });
  if (!resp.ok) return "";
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: roleCheck } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: doc, error: docErr } = await admin
      .from("ai_knowledge_documents").select("*").eq("id", document_id).single();
    if (docErr || !doc) throw new Error("Document not found");

    await admin.from("ai_knowledge_documents").update({ status: "processing", error_message: null }).eq("id", document_id);

    if (!doc.raw_text || doc.raw_text.trim().length < 10) {
      await admin.from("ai_knowledge_documents").update({
        status: "error",
        error_message: "Nincs feldolgozható szöveg. Töltsd fel kivonatolva (TXT/MD) vagy másold be a szöveget.",
      }).eq("id", document_id);
      return new Response(JSON.stringify({ error: "no text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete previous chunks (re-process)
    await admin.from("ai_knowledge_chunks").delete().eq("document_id", document_id);

    const chunks = chunkText(doc.raw_text);
    const summary = await summarize(doc.raw_text);

    // Embed in batches
    const BATCH = 8;
    let totalInserted = 0;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const vectors = await embedBatch(slice);
      const rows = slice.map((content, j) => ({
        document_id,
        chunk_index: i + j,
        content,
        embedding: vectors[j] as any,
        token_count: Math.ceil(content.length / 4),
      }));
      const { error: insErr } = await admin.from("ai_knowledge_chunks").insert(rows);
      if (insErr) throw new Error(`Insert chunks failed: ${insErr.message}`);
      totalInserted += rows.length;
    }

    await admin.from("ai_knowledge_documents").update({
      status: "ready", chunk_count: totalInserted, summary,
    }).eq("id", document_id);

    return new Response(JSON.stringify({ ok: true, chunks: totalInserted, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-knowledge-process error:", e);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.document_id) {
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await admin.from("ai_knowledge_documents").update({
          status: "error", error_message: e.message || "Ismeretlen hiba",
        }).eq("id", body.document_id);
      }
    } catch {}
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// AI Bulk Ingest: JSON / URL list / ZIP -> structured article -> embedding-ready knowledge docs
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { unzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MAX_SOURCES_PER_JOB = 200;
const MAX_HTML_CHARS = 200_000;
const FETCH_CONCURRENCY = 4;

type Source = { title?: string; url?: string; text?: string };

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string, fallback: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return (m?.[1]?.trim() || fallback).slice(0, 240);
}

async function fetchUrl(url: string): Promise<{ title: string; text: string }> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 LovableAIBulkIngest/1.0" },
    redirect: "follow",
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const ct = resp.headers.get("content-type") || "";
  const raw = await resp.text();
  if (ct.includes("application/json")) {
    return { title: url, text: raw.slice(0, MAX_HTML_CHARS) };
  }
  if (ct.includes("text/html") || raw.trim().startsWith("<")) {
    const html = raw.slice(0, MAX_HTML_CHARS);
    return { title: extractTitle(html, url), text: stripHtml(html) };
  }
  return { title: url, text: raw.slice(0, MAX_HTML_CHARS) };
}

async function structureWithAI(rawText: string, sourceLabel: string): Promise<{
  title: string; category: string; summary: string; article_md: string; tags: string[];
}> {
  const truncated = rawText.slice(0, 12000);
  const resp = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "Magyar nyelvű tudásbázis-szerkesztő vagy. A nyers szövegből strukturált, tömör cikket írsz a webshop AI tanításához. Mindig a legfontosabb tényekre koncentrálj, kerüld a marketing-szöveget. Csak a tool-ot hívd meg, semmi mást ne válaszolj.",
        },
        {
          role: "user",
          content: `Forrás: ${sourceLabel}\n\nNyers tartalom:\n${truncated}`,
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "save_article",
          description: "Strukturált tudás-cikk mentése",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Rövid, tömör cím (max 120 karakter)" },
              category: { type: "string", description: "Egyetlen kategória pl. 'termék', 'szállítás', 'jogi', 'marketing', 'technológia', 'streetwear', 'általános'" },
              summary: { type: "string", description: "3-5 mondatos magyar összefoglaló" },
              article_md: { type: "string", description: "Teljes strukturált cikk Markdownban: ## Lényeg, ## Kulcspontok (bullets), ## Idézetek (max 3), ## Mit tanuljunk belőle" },
              tags: { type: "array", items: { type: "string" }, description: "3-7 kulcsszó címke" },
            },
            required: ["title", "category", "summary", "article_md", "tags"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "save_article" } },
    }),
  });
  if (!resp.ok) throw new Error(`AI structuring failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call returned");
  const parsed = JSON.parse(args);
  return {
    title: String(parsed.title || sourceLabel).slice(0, 240),
    category: String(parsed.category || "általános").toLowerCase().slice(0, 60),
    summary: String(parsed.summary || ""),
    article_md: String(parsed.article_md || ""),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: any) => String(t).slice(0, 40)).slice(0, 10) : [],
  };
}

function isTextLikeFilename(name: string): boolean {
  return /\.(txt|md|markdown|json|html?|csv|log)$/i.test(name);
}

function detectMediaType(name: string): "video" | "audio" | "image" | null {
  if (/\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(name)) return "video";
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name)) return "audio";
  if (/\.(jpe?g|png|webp|gif|heic)$/i.test(name)) return "image";
  return null;
}

function detectMimeType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska",
    avi: "video/x-msvideo", m4v: "video/x-m4v",
    mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", flac: "audio/flac",
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic",
  };
  return map[ext] || "application/octet-stream";
}

type MediaEntry = {
  filename: string;
  mediaType: "video" | "audio" | "image";
  bytes: Uint8Array;
  mime: string;
};

function decodeZipEntries(zipBytes: Uint8Array): { sources: Source[]; media: MediaEntry[] } {
  const entries = unzipSync(zipBytes);
  const sources: Source[] = [];
  const media: MediaEntry[] = [];
  for (const [name, bytes] of Object.entries(entries)) {
    if (name.endsWith("/")) continue;
    const mediaType = detectMediaType(name);
    if (mediaType) {
      // limit individual media to 200 MB to be safe
      if (bytes.length > 200_000_000) continue;
      media.push({
        filename: name.split("/").pop() || name,
        mediaType,
        bytes,
        mime: detectMimeType(name),
      });
      continue;
    }
    if (!isTextLikeFilename(name)) continue;
    if (bytes.length > 2_000_000) continue;
    let text = "";
    try { text = strFromU8(bytes); } catch { continue; }
    if (/\.html?$/i.test(name)) text = stripHtml(text);
    text = text.trim();
    if (text.length < 30) continue;
    sources.push({ title: name.split("/").pop() || name, text: text.slice(0, MAX_HTML_CHARS) });
  }
  return { sources, media };
}

function normalizeSources(payload: any): Source[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.map((it) => typeof it === "string" ? { url: it } : { title: it?.title, url: it?.url, text: it?.text });
  }
  if (Array.isArray(payload.urls)) {
    return payload.urls.map((u: string) => ({ url: u }));
  }
  if (Array.isArray(payload.items)) {
    return payload.items.map((it: any) => ({ title: it?.title, url: it?.url, text: it?.text }));
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleCheck } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const jobType: string = body.job_type || (body.zip_storage_path ? "zip" : "json");
    const zipPath: string | undefined = body.zip_storage_path;
    let sources: Source[] = normalizeSources(body.payload);
    let mediaEntries: MediaEntry[] = [];

    // ZIP letöltés és bontás
    if (zipPath) {
      const { data: blob, error: dlErr } = await admin.storage.from("ai-bulk-uploads").download(zipPath);
      if (dlErr || !blob) throw new Error(`ZIP letöltés sikertelen: ${dlErr?.message}`);
      const buf = new Uint8Array(await blob.arrayBuffer());
      const decoded = decodeZipEntries(buf);
      sources = sources.concat(decoded.sources);
      mediaEntries = decoded.media;
    }

    sources = sources.filter((s) => s.url || (s.text && s.text.trim().length > 30));
    if (sources.length === 0 && mediaEntries.length === 0) {
      return new Response(JSON.stringify({ error: "No valid sources or media in payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (sources.length > MAX_SOURCES_PER_JOB) sources = sources.slice(0, MAX_SOURCES_PER_JOB);

    // Job létrehozás
    const { data: job, error: jobErr } = await admin.from("ai_bulk_ingest_jobs").insert({
      job_type: jobType,
      status: "running",
      source_payload: { count: sources.length, media_count: mediaEntries.length, sample: sources.slice(0, 3) },
      zip_storage_path: zipPath || null,
      total_sources: sources.length + mediaEntries.length,
      created_by: u.user.id,
      started_at: new Date().toISOString(),
    }).select().single();
    if (jobErr || !job) throw new Error(`Job create failed: ${jobErr?.message}`);

    // Média fájlok feltöltése Storage-ba + queue beírás (NEM elemez most, csak tárol)
    let mediaQueued = 0, mediaFailed = 0;
    for (const m of mediaEntries) {
      try {
        const safeName = m.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `media/${job.id}/${crypto.randomUUID()}_${safeName}`;
        const { error: upErr } = await admin.storage.from("ai-bulk-uploads").upload(storagePath, m.bytes, {
          contentType: m.mime, upsert: false,
        });
        if (upErr) throw upErr;
        await admin.from("ai_video_processing_queue").insert({
          bulk_job_id: job.id,
          storage_path: storagePath,
          original_filename: m.filename,
          mime_type: m.mime,
          file_size_bytes: m.bytes.length,
          media_type: m.mediaType,
          status: "pending",
        });
        mediaQueued++;
      } catch (e: any) {
        mediaFailed++;
        console.error("media upload fail", m.filename, e?.message);
      }
    }

    // (Job már létrejött a média blokk előtt — nincs második insert)

    const errors: any[] = [];
    let succeeded = 0, failed = 0, duplicates = 0;
    const createdDocIds: string[] = [];

    // Párhuzamos feldolgozás
    let cursor = 0;
    const workers = Array.from({ length: Math.min(FETCH_CONCURRENCY, sources.length) }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= sources.length) return;
        const src = sources[i];
        const label = src.url || src.title || `forrás_${i + 1}`;
        try {
          let text = src.text?.trim() || "";
          let title = src.title || label;
          if (!text && src.url) {
            const fetched = await fetchUrl(src.url);
            text = fetched.text;
            title = src.title || fetched.title;
          }
          if (!text || text.length < 30) throw new Error("Üres / túl rövid tartalom");

          // Duplikátum-szűrés source_hash alapján
          const hash = await sha256Hex((src.url || "") + "|" + text.slice(0, 4000));
          const { data: existing } = await admin.from("ai_knowledge_documents").select("id").eq("source_hash", hash).maybeSingle();
          if (existing) { duplicates++; continue; }

          // Strukturált cikk az AI-tól
          const article = await structureWithAI(text, label);

          // Beillesztés a tudásbázisba
          const { data: doc, error: insErr } = await admin.from("ai_knowledge_documents").insert({
            title: article.title,
            source_type: src.url ? "bulk_url" : "bulk_text",
            source_url: src.url || null,
            source_hash: hash,
            category: article.category,
            article_md: article.article_md,
            summary: article.summary,
            tags: article.tags,
            raw_text: `${article.summary}\n\n${article.article_md}\n\n--- NYERS ---\n${text.slice(0, 50000)}`,
            status: "pending",
            domain: article.category || "general",
            review_status: "auto_approved",
            bulk_job_id: job.id,
            created_by: u.user.id,
          }).select("id").single();
          if (insErr || !doc) throw new Error(`Insert failed: ${insErr?.message}`);
          createdDocIds.push(doc.id);
          succeeded++;
        } catch (e: any) {
          failed++;
          errors.push({ source: label, error: e.message || String(e) });
        }
      }
    });
    await Promise.all(workers);

    // Háttérben embeddel — fire-and-forget az ai-knowledge-process-szel
    EdgeRuntime.waitUntil((async () => {
      for (const docId of createdDocIds) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/ai-knowledge-process`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ document_id: docId }),
          });
        } catch (e) { console.error("embed trigger fail", docId, e); }
      }
    })());

    const finalStatus = failed === 0 ? "completed" : (succeeded === 0 ? "failed" : "partial");
    await admin.from("ai_bulk_ingest_jobs").update({
      status: finalStatus,
      processed_sources: sources.length,
      succeeded_count: succeeded,
      failed_count: failed,
      duplicate_count: duplicates,
      errors: errors.slice(0, 50),
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);

    return new Response(JSON.stringify({
      ok: true,
      job_id: job.id,
      total: sources.length,
      succeeded, failed, duplicates,
      doc_ids: createdDocIds,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("ai-bulk-ingest error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

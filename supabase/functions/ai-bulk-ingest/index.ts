// AI Bulk Ingest: JSON / URL list / ZIP -> structured article -> embedding-ready knowledge docs
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Unzip, UnzipInflate, strFromU8 } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MAX_SOURCES_PER_JOB = 200;
const MAX_HTML_CHARS = 200_000;
const MAX_TEXT_ENTRY_BYTES = 80_000_000;
const MAX_STREAMED_TEXT_BYTES = 4_000_000;
const MAX_STREAMED_MEDIA_BYTES = 25_000_000;
const MAX_REMOTE_MEDIA_PER_JOB = 250;
const MAX_REMOTE_MEDIA_DOWNLOADS_PER_CALL = 12;
const RAW_ONLY_THRESHOLD_CHARS = 80_000;
const ZIP_CHUNK_CHARS = 24_000;
const MAX_CHUNKS_PER_TEXT_ENTRY = 120;
const MAX_EXTRACTED_JSON_LINES = 30_000;
const FETCH_CONCURRENCY = 4;

type Source = { title?: string; url?: string; text?: string; rawOnly?: boolean; category?: string };

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

function structureRawKnowledge(rawText: string, sourceLabel: string, category = "tiktok_export"): {
  title: string; category: string; summary: string; article_md: string; tags: string[];
} {
  const compact = rawText.replace(/\s+/g, " ").trim();
  const excerpt = compact.slice(0, 900);
  return {
    title: String(sourceLabel || "TikTok export részlet").slice(0, 120),
    category,
    summary: excerpt ? `Automatikusan mentett TikTok export részlet. Rövid kivonat: ${excerpt}` : "Automatikusan mentett TikTok export részlet.",
    article_md: `## Lényeg\nEz a tudáselem a feltöltött TikTok exportból lett biztonságosan feldarabolva és eltárolva.\n\n## Kulcspontok\n- Forrás: ${sourceLabel}\n- Feldolgozás: nyers tudás mentése, AI-elemzés nélkül\n- Cél: saját rendszer tanítása ingyenes módban\n\n## Nyers részlet\n\n${rawText.slice(0, 12000)}`,
    tags: ["tiktok", "export", "sajat-rendszer", "bulk-import"],
  };
}

function isTextLikeFilename(name: string): boolean {
  return /\.(txt|md|markdown|json|html?|csv|tsv|xml|log)$/i.test(name);
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

function isProbablyTextBytes(bytes: Uint8Array): boolean {
  const sample = bytes.slice(0, Math.min(bytes.length, 4096));
  if (sample.length === 0) return false;
  let printable = 0;
  for (const b of sample) {
    if (b === 0) return false;
    if (b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126) || b >= 128) printable++;
  }
  return printable / sample.length > 0.88;
}

type MediaEntry = {
  filename: string;
  mediaType: "video" | "audio" | "image";
  bytes?: Uint8Array;
  mime: string;
  sourceUrl?: string;
  sourcePath?: string;
};

function chunkTextEntry(name: string, text: string, rawOnly: boolean, category = "tiktok_export"): Source[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (clean.length < 30) return [];
  const baseTitle = name.split("/").pop() || name;
  if (!rawOnly && clean.length <= RAW_ONLY_THRESHOLD_CHARS) {
    return [{ title: baseTitle, text: clean.slice(0, MAX_HTML_CHARS), category }];
  }

  const chunks: Source[] = [];
  for (let start = 0; start < clean.length && chunks.length < MAX_CHUNKS_PER_TEXT_ENTRY; start += ZIP_CHUNK_CHARS) {
    const part = clean.slice(start, start + ZIP_CHUNK_CHARS).trim();
    if (part.length >= 30) {
      chunks.push({
        title: `${baseTitle} #${chunks.length + 1}`,
        text: part,
        rawOnly: true,
        category,
      });
    }
  }
  return chunks;
}

function collectJsonLines(value: any, path: string, out: string[]) {
  if (out.length >= MAX_EXTRACTED_JSON_LINES || value === null || value === undefined) return;
  if (typeof value === "string") {
    const clean = value.replace(/\s+/g, " ").trim();
    if (clean.length >= 2 && !/^[\d\s:.,_\-/]+$/.test(clean)) out.push(`${path}: ${clean.slice(0, 1200)}`);
    return;
  }
  if (typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length && out.length < MAX_EXTRACTED_JSON_LINES; i++) collectJsonLines(value[i], `${path}[${i + 1}]`, out);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (out.length >= MAX_EXTRACTED_JSON_LINES) return;
    collectJsonLines(child, path ? `${path}.${key}` : key, out);
  }
}

function textSourcesFromZipEntry(name: string, bytes: Uint8Array): Source[] {
  if (bytes.length > MAX_TEXT_ENTRY_BYTES) {
    console.warn("[bulk-ingest] text entry too large, skipped:", name, bytes.length);
    return [];
  }
  let text = "";
  try { text = strFromU8(bytes); } catch { return []; }
  if (/\.html?$/i.test(name)) text = stripHtml(text);
  text = text.trim();
  if (text.length < 30) return [];

  if (/\.json$/i.test(name)) {
    try {
      const lines: string[] = [];
      collectJsonLines(JSON.parse(text), "", lines);
      const extracted = lines.join("\n");
      if (extracted.length >= 30) return chunkTextEntry(name, extracted, true, "tiktok_export");
    } catch (e: any) {
      console.warn("[bulk-ingest] json parse fallback:", name, e?.message || e);
    }
  }

  return chunkTextEntry(name, text, text.length > RAW_ONLY_THRESHOLD_CHARS, "tiktok_export");
}

async function decodeZipEntries(zipBytes: Uint8Array): Promise<{ sources: Source[]; media: MediaEntry[] }> {
  const sources: Source[] = [];
  const media: MediaEntry[] = [];
  const sampleNames: string[] = [];
  let textEntries = 0;
  let unsupportedEntries = 0;
  let totalEntries = 0;
  const fileReads: Promise<void>[] = [];

  const unzipper = new Unzip((file) => {
    if (file.name.endsWith("/")) return;
    totalEntries++;
    if (sampleNames.length < 20) sampleNames.push(file.name);
    const mediaType = detectMediaType(file.name);
    const shouldReadMedia = Boolean(mediaType) && (file.originalSize ?? 0) <= MAX_STREAMED_MEDIA_BYTES && media.length < 250;
    const shouldReadText = !mediaType && isTextLikeFilename(file.name) && (file.originalSize ?? 0) <= MAX_STREAMED_TEXT_BYTES && sources.length < MAX_SOURCES_PER_JOB;

    if (!shouldReadMedia && !shouldReadText) {
      unsupportedEntries++;
      file.terminate();
      return;
    }

    fileReads.push(new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      let total = 0;
      const maxBytes = shouldReadMedia ? MAX_STREAMED_MEDIA_BYTES : MAX_STREAMED_TEXT_BYTES;
      let finished = false;

      const finishWithBytes = () => {
        if (finished) return;
        finished = true;
        const bytes = new Uint8Array(total);
        let offset = 0;
        for (const part of chunks) { bytes.set(part, offset); offset += part.length; }

        if (mediaType && shouldReadMedia) {
          media.push({ filename: file.name.split("/").pop() || file.name, mediaType, bytes, mime: detectMimeType(file.name) });
        } else if (shouldReadText) {
          textEntries++;
          sources.push(...textSourcesFromZipEntry(file.name, bytes));
        }
        resolve();
      };

      file.ondata = (err, chunk, final) => {
        if (err) { reject(err); return; }
        const remaining = maxBytes - total;
        if (remaining <= 0) {
          file.terminate();
          finishWithBytes();
          return;
        }
        const accepted = chunk.length > remaining ? chunk.slice(0, remaining) : chunk;
        chunks.push(accepted);
        total += accepted.length;
        if (chunk.length > remaining) {
          file.terminate();
          finishWithBytes();
          return;
        }
        if (!final) return;
        finishWithBytes();
      };

      try { file.start(); } catch (e) { reject(e); }
    }));
  });

  unzipper.register(UnzipInflate);
  unzipper.push(zipBytes, true);
  await Promise.all(fileReads);
  console.log("[bulk-ingest] zip entries:", totalEntries, "text entries:", textEntries, "unsupported/skipped:", unsupportedEntries, "samples:", sampleNames.join(" | "));
  return { sources: sources.slice(0, MAX_SOURCES_PER_JOB), media };
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
      console.log("[bulk-ingest] downloading zip:", zipPath);
      const { data: blob, error: dlErr } = await admin.storage.from("ai-bulk-uploads").download(zipPath);
      if (dlErr || !blob) throw new Error(`ZIP letöltés sikertelen: ${dlErr?.message || "no blob"}`);
      const buf = new Uint8Array(await blob.arrayBuffer());
      console.log("[bulk-ingest] zip size:", buf.length);
      let decoded: { sources: Source[]; media: MediaEntry[] };
      try {
        decoded = await decodeZipEntries(buf);
      } catch (zipErr: any) {
        throw new Error(`ZIP bontás sikertelen: ${zipErr?.message || zipErr}`);
      }
      console.log("[bulk-ingest] decoded - text sources:", decoded.sources.length, "media:", decoded.media.length);
      sources = sources.concat(decoded.sources);
      mediaEntries = decoded.media;
    }

    sources = sources.filter((s) => s.url || (s.text && s.text.trim().length > 30));
    console.log("[bulk-ingest] total sources after filter:", sources.length, "media:", mediaEntries.length);
    if (sources.length === 0 && mediaEntries.length === 0) {
      return new Response(JSON.stringify({ error: "Nincs feldolgozható tartalom a ZIP-ben (se szöveges fájl, se média). Támogatott: .txt, .md, .json, .html, .mp4, .mp3, .jpg, .png" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (sources.length > MAX_SOURCES_PER_JOB) sources = sources.slice(0, MAX_SOURCES_PER_JOB);

    // Job létrehozás (errors NOT NULL → üres tömböt adunk)
    const { data: job, error: jobErr } = await admin.from("ai_bulk_ingest_jobs").insert({
      job_type: jobType,
      status: "running",
      source_payload: { count: sources.length, media_count: mediaEntries.length, sample: sources.slice(0, 3) },
      zip_storage_path: zipPath || null,
      total_sources: sources.length + mediaEntries.length,
      processed_sources: 0,
      succeeded_count: 0,
      failed_count: 0,
      duplicate_count: 0,
      errors: [],
      created_by: u.user.id,
      started_at: new Date().toISOString(),
    }).select().single();
    if (jobErr || !job) throw new Error(`Job create failed: ${jobErr?.message || JSON.stringify(jobErr)}`);

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

          // Nagy TikTok export részeknél ingyenes / stabil raw mentés, kisebb szövegnél AI-strukturálás
          const article = src.rawOnly
            ? structureRawKnowledge(text, label, src.category)
            : await structureWithAI(text, label);

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

    const totalFailures = failed + mediaFailed;
    const totalSuccesses = succeeded + mediaQueued + duplicates;
    const finalStatus = totalFailures === 0 ? "completed" : (totalSuccesses === 0 ? "failed" : "partial");
    await admin.from("ai_bulk_ingest_jobs").update({
      status: finalStatus,
      processed_sources: sources.length + mediaQueued,
      succeeded_count: succeeded,
      failed_count: totalFailures,
      duplicate_count: duplicates,
      errors: errors.slice(0, 50),
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);

    return new Response(JSON.stringify({
      ok: true,
      job_id: job.id,
      total_text: sources.length,
      total_media: mediaEntries.length,
      succeeded, failed, duplicates,
      media_queued: mediaQueued,
      media_failed: mediaFailed,
      doc_ids: createdDocIds,
      message: mediaQueued > 0
        ? `${succeeded} szöveges cikk + ${mediaQueued} média fájl elmentve. A média elemzés alapból KIKAPCSOLVA (nem fogyaszt creditet). Az admin felületen kapcsolható be.`
        : `${succeeded} szöveges cikk elmentve.`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("ai-bulk-ingest error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

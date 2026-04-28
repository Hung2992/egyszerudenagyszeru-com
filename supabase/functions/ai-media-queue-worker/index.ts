import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MAX_BATCH = 250;
const MAX_DOWNLOAD_BYTES = 25_000_000;
const REMOTE_FETCH_TIMEOUT_MS = 15_000;

type QueueRow = {
  id: string;
  bulk_job_id: string | null;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  media_type: string;
  status: string;
  attempts: number;
  metadata: Record<string, any>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "media_file";
}

function isDirectMediaUrl(url: string) {
  return /\.(mp4|mov|webm|m4v|mp3|m4a|wav|aac|ogg|jpe?g|png|webp|gif)(\?|$)/i.test(url)
    || /mime_type=(video|audio|image)/i.test(url)
    || /tiktokcdn|byteoversea|ibyteimg/i.test(url);
}

function makeArticle(row: QueueRow, storagePath: string, mode: "stored_file" | "remote_link", warning?: string) {
  const remoteUrl = row.metadata?.remote_url || (row.status === "pending_remote" ? row.storage_path : null);
  const title = `Média import: ${row.original_filename}`.slice(0, 240);
  const lines = [
    "## Lényeg",
    `Automatikusan feldolgozott ${row.media_type} média elem a tömeges importból.`,
    "",
    "## Állapot",
    `- Feldolgozás módja: ${mode === "stored_file" ? "eltárolt fájl" : "távoli link regisztrálva"}`,
    `- Fájlnév: ${row.original_filename}`,
    `- Típus: ${row.media_type}`,
    `- MIME: ${row.mime_type || "ismeretlen"}`,
    row.file_size_bytes ? `- Méret: ${row.file_size_bytes} byte` : "- Méret: nincs letöltött fájlméret",
    remoteUrl ? `- Forrás link: ${remoteUrl}` : `- Storage útvonal: ${storagePath}`,
    warning ? `- Figyelmeztetés: ${warning}` : "",
    "",
    "## Mit tanuljon belőle a rendszer",
    "- Ez a média a saját TikTok/export adatcsomag része.",
    "- A rekord visszakereshető fájlnév, típus és forrás alapján.",
    "- Ha a link nem közvetlen MP4/MP3/kép fájl, a rendszer linkként menti, nem tölti le erőltetve.",
  ].filter(Boolean);

  return {
    title,
    source_type: mode === "stored_file" ? "bulk_media" : "bulk_media_link",
    source_url: remoteUrl,
    category: "media_import",
    article_md: lines.join("\n"),
    summary: `${row.media_type} média importálva: ${row.original_filename}. ${warning || "Feldolgozás rögzítve."}`,
    tags: ["media", row.media_type, "bulk-import", mode === "stored_file" ? "stored-file" : "remote-link"],
    raw_text: lines.join("\n"),
    domain: "media_import",
  };
}

async function createKnowledgeDoc(admin: any, row: QueueRow, storagePath: string, mode: "stored_file" | "remote_link", warning?: string) {
  const article = makeArticle(row, storagePath, mode, warning);
  const hash = await sha256Hex(`${row.id}|${storagePath}|${article.source_url || ""}`);
  const { data: existing } = await admin.from("ai_knowledge_documents").select("id").eq("source_hash", hash).maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await admin.from("ai_knowledge_documents").insert({
    ...article,
    source_hash: hash,
    status: "pending",
    review_status: "auto_approved",
    bulk_job_id: row.bulk_job_id,
  }).select("id").single();
  if (error || !data) throw new Error(`Tudás dokumentum mentés sikertelen: ${error?.message || "nincs adat"}`);
  return data.id;
}

async function collectStats(admin: any) {
  const pageSize = 1000;
  let from = 0;
  const stats = {
    total: 0,
    video: 0,
    audio: 0,
    image: 0,
    pending: 0,
    localPending: 0,
    remotePending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    downloaded: 0,
    linkRegistered: 0,
    storedBytes: 0,
  };

  while (true) {
    const { data, error } = await admin
      .from("ai_video_processing_queue")
      .select("status, media_type, file_size_bytes, metadata")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Stats query failed: ${error.message}`);
    const rows = data || [];
    for (const row of rows) {
      stats.total++;
      if (row.media_type === "video") stats.video++;
      if (row.media_type === "audio") stats.audio++;
      if (row.media_type === "image") stats.image++;
      if (row.status === "pending") stats.localPending++;
      if (row.status === "pending_remote") stats.remotePending++;
      if (row.status === "processing") stats.processing++;
      if (row.status === "completed") stats.completed++;
      if (row.status === "failed") stats.failed++;
      if (String(row.status || "").startsWith("skipped")) stats.skipped++;
      const size = Number(row.file_size_bytes || 0);
      if (size > 0) stats.storedBytes += size;
      if (row.metadata?.download_status === "downloaded" || (row.status === "completed" && size > 0)) stats.downloaded++;
      if (row.metadata?.download_status === "link_registered") stats.linkRegistered++;
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  stats.pending = stats.localPending + stats.remotePending;
  return stats;
}

async function processRemote(admin: any, row: QueueRow) {
  const remoteUrl = row.metadata?.remote_url || row.storage_path;
  let finalStoragePath = row.storage_path;
  let warning = "Távoli link elmentve; nem közvetlen médiafájl vagy nem letölthető jelenleg.";

  if (remoteUrl && /^https?:\/\//i.test(remoteUrl) && isDirectMediaUrl(remoteUrl)) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), REMOTE_FETCH_TIMEOUT_MS);
    try {
      const resp = await fetch(remoteUrl, {
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 LovableMediaWorker/1.0" },
      });
      const contentType = resp.headers.get("content-type") || row.mime_type || "application/octet-stream";
      const len = Number(resp.headers.get("content-length") || "0");
      const directMedia = /^(video|audio|image)\//i.test(contentType);
      if (resp.ok && directMedia && len <= MAX_DOWNLOAD_BYTES) {
        const bytes = new Uint8Array(await resp.arrayBuffer());
        if (bytes.length <= MAX_DOWNLOAD_BYTES) {
          finalStoragePath = `media/${row.bulk_job_id || "manual"}/${crypto.randomUUID()}_${safeName(row.original_filename)}`;
          const { error: upErr } = await admin.storage.from("ai-bulk-uploads").upload(finalStoragePath, bytes, {
            contentType,
            upsert: false,
          });
          if (upErr) throw upErr;
          await admin.from("ai_video_processing_queue").update({
            storage_path: finalStoragePath,
            mime_type: contentType,
            file_size_bytes: bytes.length,
            metadata: { ...row.metadata, remote_url: remoteUrl, download_status: "downloaded", downloaded_at: new Date().toISOString() },
          }).eq("id", row.id);
          warning = "Távoli média letöltve és eltárolva.";
          const docId = await createKnowledgeDoc(admin, { ...row, mime_type: contentType, file_size_bytes: bytes.length }, finalStoragePath, "stored_file", warning);
          return { docId, finalStoragePath, warning, downloaded: true, linkRegistered: false, bytesDownloaded: bytes.length };
        }
      }
      warning = !resp.ok
        ? `Távoli letöltés HTTP ${resp.status}; linkként mentve.`
        : directMedia
          ? `Távoli média túl nagy vagy méret nélkül túl kockázatos; linkként mentve.`
          : `A link nem közvetlen média (${contentType}); linkként mentve.`;
    } catch (e: any) {
      warning = `Távoli letöltés sikertelen (${e?.name === "AbortError" ? "időtúllépés" : e?.message || e}); linkként mentve.`;
    } finally {
      clearTimeout(timeout);
    }
  } else if (remoteUrl && /^https?:\/\//i.test(remoteUrl)) {
    warning = "Nem közvetlen MP4/MP3/kép URL (TikTok megosztási oldal), ezért gyorsan linkként mentve.";
  }

  const docId = await createKnowledgeDoc(admin, row, finalStoragePath, "remote_link", warning);
  await admin.from("ai_video_processing_queue").update({
    metadata: { ...row.metadata, remote_url: remoteUrl, download_status: "link_registered", warning, processed_at: new Date().toISOString() },
  }).eq("id", row.id);
  return { docId, finalStoragePath, warning, downloaded: false, linkRegistered: true, bytesDownloaded: 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleCheck } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    if (body.stats_only) {
      const stats = await collectStats(admin);
      const doneForPercent = stats.completed + stats.failed + stats.skipped;
      return json({
        ok: true,
        stats,
        percent: stats.total ? Math.round((doneForPercent / stats.total) * 1000) / 10 : 0,
        memory: {
          max_batch: MAX_BATCH,
          max_download_mb_per_file: Math.round(MAX_DOWNLOAD_BYTES / 1024 / 1024),
          remote_timeout_ms: REMOTE_FETCH_TIMEOUT_MS,
          safe_mode: "batch feldolgozás, nem egyszerre 10000 videó",
        },
      });
    }
    const limit = Math.max(1, Math.min(Number(body.limit || 50), MAX_BATCH));
    const statuses = Array.isArray(body.statuses) && body.statuses.length ? body.statuses : ["pending_remote", "pending"];

    const { data: rows, error: qErr } = await admin
      .from("ai_video_processing_queue")
      .select("id, bulk_job_id, storage_path, original_filename, mime_type, file_size_bytes, media_type, status, attempts, metadata")
      .in("status", statuses)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (qErr) throw new Error(qErr.message);

    let completed = 0;
    let failed = 0;
    let downloaded = 0;
    let linkRegistered = 0;
    let bytesDownloaded = 0;
    const errors: any[] = [];

    for (const row of (rows || []) as QueueRow[]) {
      await admin.from("ai_video_processing_queue").update({
        status: "processing",
        attempts: (row.attempts || 0) + 1,
        started_at: new Date().toISOString(),
        error_message: null,
      }).eq("id", row.id);

      try {
        const result = row.status === "pending_remote"
          ? await processRemote(admin, row)
          : { docId: await createKnowledgeDoc(admin, row, row.storage_path, "stored_file", "Helyi média fájl rögzítve."), finalStoragePath: row.storage_path, warning: "Helyi média fájl rögzítve.", downloaded: true, linkRegistered: false, bytesDownloaded: row.file_size_bytes || 0 };

        await admin.from("ai_video_processing_queue").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          knowledge_document_id: result.docId,
          visual_description: result.warning,
          error_message: null,
        }).eq("id", row.id);
        completed++;
        if (result.downloaded) downloaded++;
        if (result.linkRegistered) linkRegistered++;
        bytesDownloaded += result.bytesDownloaded || 0;
      } catch (e: any) {
        const message = e?.message || String(e);
        await admin.from("ai_video_processing_queue").update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: message,
          metadata: { ...row.metadata, worker_error_at: new Date().toISOString() },
        }).eq("id", row.id);
        errors.push({ id: row.id, file: row.original_filename, error: message });
        failed++;
      }
    }

    const { count: remaining } = await admin
      .from("ai_video_processing_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending_remote", "pending"]);

    return json({
      ok: true,
      picked: rows?.length || 0,
      completed,
      failed,
      downloaded,
      link_registered: linkRegistered,
      bytes_downloaded: bytesDownloaded,
      remaining: remaining || 0,
      memory: {
        max_batch: MAX_BATCH,
        max_download_mb_per_file: Math.round(MAX_DOWNLOAD_BYTES / 1024 / 1024),
        remote_timeout_ms: REMOTE_FETCH_TIMEOUT_MS,
      },
      errors: errors.slice(0, 20),
    });
  } catch (e: any) {
    console.error("ai-media-queue-worker error:", e);
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Loader2, FileJson, FileArchive, Globe, RefreshCw, CheckCircle2, AlertCircle, Layers, Film, Mic, Image as ImageIcon, AlertTriangle, PlayCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/untyped-client";

interface BulkJob {
  id: string;
  job_type: string;
  status: string;
  total_sources: number;
  processed_sources: number;
  succeeded_count: number;
  failed_count: number;
  duplicate_count: number;
  errors: any;
  created_at: string;
  completed_at: string | null;
}

interface MediaItem {
  id: string;
  media_type: string;
  original_filename: string;
  status: string;
  file_size_bytes: number | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
}

interface MediaStatsRow {
  status: string;
  media_type: string;
  count: number;
}

interface IngestSettings {
  video_analysis_enabled: boolean;
  max_videos_per_job: number;
  daily_budget_usd: number;
  spent_today_usd: number;
  paused: boolean;
}

interface MediaCounts {
  total: number;
  video: number;
  audio: number;
  image: number;
  pending: number;
  localPending: number;
  remotePending: number;
  processing: number;
  completed: number;
  failed: number;
  skipped: number;
}

const EMPTY_MEDIA_COUNTS: MediaCounts = {
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
};

const getFunctionErrorMessage = async (error: any) => {
  const context = error?.context;
  if (context instanceof Response) {
    try {
      const json = await context.clone().json();
      if (json?.error) return String(json.error);
    } catch {
      try {
        const text = await context.clone().text();
        if (text) return text;
      } catch {}
    }
  }
  return error?.message || "Ismeretlen hiba";
};

const SAMPLE_JSON = `{
  "urls": [
    "https://example.com/cikk-1",
    "https://example.com/cikk-2"
  ],
  "items": [
    { "title": "Saját jegyzet", "text": "Itt jön a beszúrt nyers szöveg..." },
    { "title": "Streetwear trend 2026", "url": "https://hypebeast.com/..." }
  ]
}`;

export default function AdminAiBulkIngestPanel() {
  const [jsonText, setJsonText] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaStats, setMediaStats] = useState<MediaStatsRow[]>([]);
  const [mediaCountsExact, setMediaCountsExact] = useState<MediaCounts>(EMPTY_MEDIA_COUNTS);
  const [settings, setSettings] = useState<IngestSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingQueue, setProcessingQueue] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchJobs = async () => {
    const { data } = await supabase
      .from("ai_bulk_ingest_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setJobs(data as any);
    setLoading(false);
  };

  const fetchMedia = async () => {
    const { data } = await supabase
      .from("ai_video_processing_queue")
      .select("id, media_type, original_filename, status, file_size_bytes, error_message, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setMedia(data as any);

    const countRows = async (apply: (q: any) => any) => {
      const { count } = await apply(supabase.from("ai_video_processing_queue").select("id", { count: "exact", head: true }));
      return count || 0;
    };
    const [total, video, audio, image, localPending, remotePending, processing, completed, failed, skipped] = await Promise.all([
      countRows((q) => q),
      countRows((q) => q.eq("media_type", "video")),
      countRows((q) => q.eq("media_type", "audio")),
      countRows((q) => q.eq("media_type", "image")),
      countRows((q) => q.eq("status", "pending")),
      countRows((q) => q.eq("status", "pending_remote")),
      countRows((q) => q.eq("status", "processing")),
      countRows((q) => q.eq("status", "completed")),
      countRows((q) => q.eq("status", "failed")),
      countRows((q) => q.like("status", "skipped%")),
    ]);
    setMediaCountsExact({ total, video, audio, image, pending: localPending + remotePending, localPending, remotePending, processing, completed, failed, skipped });

    const { data: statRows } = await supabase
      .from("ai_video_processing_queue")
      .select("status, media_type");
    if (statRows) {
      const grouped = new Map<string, MediaStatsRow>();
      (statRows as any[]).forEach((row) => {
        const key = `${row.status}|${row.media_type}`;
        const current = grouped.get(key) || { status: row.status, media_type: row.media_type, count: 0 };
        current.count += 1;
        grouped.set(key, current);
      });
      setMediaStats(Array.from(grouped.values()));
      const rows = statRows as any[];
      setMediaCountsExact({
        total: rows.length,
        video: rows.filter((m) => m.media_type === "video").length,
        audio: rows.filter((m) => m.media_type === "audio").length,
        image: rows.filter((m) => m.media_type === "image").length,
        pending: rows.filter((m) => m.status === "pending" || m.status === "pending_remote").length,
        localPending: rows.filter((m) => m.status === "pending").length,
        remotePending: rows.filter((m) => m.status === "pending_remote").length,
        processing: rows.filter((m) => m.status === "processing").length,
        completed: rows.filter((m) => m.status === "completed").length,
        failed: rows.filter((m) => m.status === "failed").length,
        skipped: rows.filter((m) => String(m.status || "").startsWith("skipped")).length,
      });
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("ai_bulk_ingest_settings")
      .select("video_analysis_enabled, max_videos_per_job, daily_budget_usd, spent_today_usd, paused")
      .eq("id", 1)
      .maybeSingle();
    if (data) setSettings(data as any);
  };

  const toggleVideoAnalysis = async (enabled: boolean) => {
    const { error } = await supabase
      .from("ai_bulk_ingest_settings")
      .update({ video_analysis_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
      return;
    }
    setSettings((s) => s ? { ...s, video_analysis_enabled: enabled } : s);
    toast({
      title: enabled ? "Videó-elemzés BEKAPCSOLVA" : "Videó-elemzés KIKAPCSOLVA",
      description: enabled
        ? "Az új videók AI-elemzése Lovable AI kreditet fogyaszt."
        : "Az új videók csak tárolódnak, AI nem elemzi őket. 0 költség.",
    });
  };

  useEffect(() => {
    fetchJobs();
    fetchMedia();
    fetchSettings();
    const ch = supabase
      .channel("bulk-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_bulk_ingest_jobs" }, () => fetchJobs())
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_video_processing_queue" }, () => fetchMedia())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const submitJson = async () => {
    let payload: any;
    try {
      payload = JSON.parse(jsonText);
    } catch {
      toast({ title: "Hibás JSON", description: "Ellenőrizd a formátumot.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-bulk-ingest", {
        body: { job_type: "json", payload },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));
      toast({
        title: "Tömeges import elindult",
        description: `${data.succeeded} sikeres, ${data.duplicates} duplikátum, ${data.failed} hiba.`,
      });
      setJsonText("");
      fetchJobs();
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message || "Ismeretlen hiba", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const submitZip = async () => {
    if (!zipFile) return;
    setSubmitting(true);
    try {
      const path = `${Date.now()}_${zipFile.name.replace(/[^a-z0-9._-]/gi, "_")}`;
      const { error: upErr } = await supabase.storage.from("ai-bulk-uploads").upload(path, zipFile, {
        contentType: "application/zip",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data, error } = await supabase.functions.invoke("ai-bulk-ingest", {
        body: { job_type: "zip", zip_storage_path: path },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));
      toast({
        title: "ZIP feldolgozva",
        description: data.message || `${data.succeeded} szöveg, ${data.media_queued || 0} média, ${data.duplicates} duplikátum, ${data.failed + (data.media_failed || 0)} hiba.`,
      });
      setZipFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchJobs();
      fetchMedia();
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message || "Ismeretlen hiba", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; className: string }> = {
      completed: { label: "Kész", className: "bg-primary text-primary-foreground" },
      partial: { label: "Részleges", className: "bg-yellow-500 text-black" },
      failed: { label: "Hiba", className: "bg-destructive text-destructive-foreground" },
      running: { label: "Fut", className: "bg-blue-500 text-white" },
      pending: { label: "Vár", className: "bg-muted" },
    };
    const m = map[s] || { label: s, className: "bg-muted" };
    return <Badge className={m.className}>{m.label}</Badge>;
  };

  const mediaIcon = (t: string) => {
    if (t === "video") return <Film className="w-3 h-3" />;
    if (t === "audio") return <Mic className="w-3 h-3" />;
    return <ImageIcon className="w-3 h-3" />;
  };

  const mediaCounts = {
    total: mediaStats.reduce((sum, row) => sum + row.count, 0),
    video: mediaStats.filter((m) => m.media_type === "video").reduce((sum, row) => sum + row.count, 0),
    audio: mediaStats.filter((m) => m.media_type === "audio").reduce((sum, row) => sum + row.count, 0),
    image: mediaStats.filter((m) => m.media_type === "image").reduce((sum, row) => sum + row.count, 0),
    pending: mediaStats.filter((m) => m.status === "pending" || m.status === "pending_remote").reduce((sum, row) => sum + row.count, 0),
    localPending: mediaStats.filter((m) => m.status === "pending").reduce((sum, row) => sum + row.count, 0),
    remotePending: mediaStats.filter((m) => m.status === "pending_remote").reduce((sum, row) => sum + row.count, 0),
    processing: mediaStats.filter((m) => m.status === "processing").reduce((sum, row) => sum + row.count, 0),
    completed: mediaStats.filter((m) => m.status === "completed").reduce((sum, row) => sum + row.count, 0),
    failed: mediaStats.filter((m) => m.status === "failed").reduce((sum, row) => sum + row.count, 0),
    skipped: mediaStats.filter((m) => m.status.startsWith("skipped")).reduce((sum, row) => sum + row.count, 0),
  };

  const latestErrors = media.filter((m) => m.status === "failed" || m.error_message).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5" />
        <h2 className="font-bold text-lg">Tömeges AI Tudás-import</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Tölts fel JSON-t, URL listát vagy ZIP archívumot (TikTok export is). A szöveges tartalmakból az AI strukturált cikket ír. A ZIP-ben lévő MP4 / MP3 / kép fájlok eltárolódnak; AI-elemzésük csak akkor indul, ha bekapcsolod (kreditet fogyaszt).
      </p>

      {/* Settings card */}
      <Card className="p-4 border-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4" />
            <h3 className="font-bold">Videó / audio / kép AI-elemzés</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {settings?.video_analysis_enabled ? "BE" : "KI (ingyenes mód)"}
            </span>
            <Switch
              checked={settings?.video_analysis_enabled ?? false}
              onCheckedChange={toggleVideoAnalysis}
              disabled={!settings}
            />
          </div>
        </div>
        {!settings?.video_analysis_enabled ? (
          <div className="flex items-start gap-2 text-xs bg-muted/50 p-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Ingyenes mód aktív</p>
              <p className="text-muted-foreground mt-1">
                A média fájlok eltárolódnak Storage-ban (ingyenes), de AI nem elemzi őket — semmi credit nem fogy.
                Csak a szöveges tartalmakból (JSON, TXT, HTML) tanul az AI.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-xs bg-yellow-500/10 border border-yellow-500/30 p-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">AI-elemzés aktív — Lovable AI kredit fogy!</p>
              <p className="text-muted-foreground mt-1">
                Becsült költség: ~$0.02-0.05 / videó. Mai elköltött keret: ${settings?.spent_today_usd?.toFixed(2) ?? "0.00"}.
                Max {settings?.max_videos_per_job} videó / job.
              </p>
            </div>
          </div>
        )}
      </Card>



      <Tabs defaultValue="json">
        <TabsList>
          <TabsTrigger value="json"><FileJson className="w-4 h-4 mr-1" />JSON / URL lista</TabsTrigger>
          <TabsTrigger value="zip"><FileArchive className="w-4 h-4 mr-1" />ZIP archívum</TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="space-y-3">
          <Label>JSON tartalom</Label>
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={SAMPLE_JSON}
            rows={12}
            className="font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button onClick={submitJson} disabled={submitting || !jsonText.trim()}>
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Globe className="w-4 h-4 mr-1" />}
              Tömeges import indítása
            </Button>
            <Button variant="outline" onClick={() => setJsonText(SAMPLE_JSON)}>Példa beillesztése</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Támogatott: <code>{`{"urls":[...]}`}</code>, <code>{`{"items":[{title,url|text}]}`}</code>, vagy egyszerű tömb. Max 200 forrás / job.
          </p>
        </TabsContent>

        <TabsContent value="zip" className="space-y-3">
          <Label>ZIP fájl (TXT, MD, JSON, HTML + TikTok videó/audio/kép linkek)</Label>
          <input
            ref={fileRef}
            type="file"
            accept=".zip"
            onChange={(e) => setZipFile(e.target.files?.[0] || null)}
            className="block text-sm"
          />
          {zipFile && <p className="text-xs">Kiválasztva: {zipFile.name} ({(zipFile.size / 1024).toFixed(1)} KB)</p>}
          <Button onClick={submitZip} disabled={submitting || !zipFile}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            ZIP feltöltés és feldolgozás
          </Button>
        </TabsContent>
      </Tabs>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Korábbi importok</h3>
          <Button variant="ghost" size="sm" onClick={fetchJobs}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Betöltés...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Még nincs import.</p>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {jobs.map((j) => (
                <div key={j.id} className="border p-3 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono">{j.job_type.toUpperCase()}</span>
                    {statusBadge(j.status)}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" />{j.succeeded_count} sikeres</span>
                    <span>{j.duplicate_count} duplikátum</span>
                    <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-destructive" />{j.failed_count} hiba</span>
                    <span className="text-muted-foreground">{j.processed_sources}/{j.total_sources}</span>
                  </div>
                  <div className="text-muted-foreground">{new Date(j.created_at).toLocaleString("hu")}</div>
                  {Array.isArray(j.errors) && j.errors.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-destructive">Hibák ({j.errors.length})</summary>
                      <ul className="mt-1 list-disc pl-4">
                        {j.errors.slice(0, 10).map((er: any, i: number) => (
                          <li key={i}><span className="font-mono">{er.source}</span>: {er.error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Media queue */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold flex items-center gap-2">
            <Film className="w-4 h-4" /> Média fájlok ({mediaCounts.total})
          </h3>
          <Button variant="ghost" size="sm" onClick={fetchMedia}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
          <div className="border p-2"><div className="text-muted-foreground">Videó</div><div className="font-bold text-lg">{mediaCounts.video}</div></div>
          <div className="border p-2"><div className="text-muted-foreground">Hang</div><div className="font-bold text-lg">{mediaCounts.audio}</div></div>
          <div className="border p-2"><div className="text-muted-foreground">Kép</div><div className="font-bold text-lg">{mediaCounts.image}</div></div>
          <div className="border p-2"><div className="text-muted-foreground">Hiba</div><div className="font-bold text-lg text-destructive">{mediaCounts.failed}</div></div>
        </div>
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          <Badge variant="outline">{mediaCounts.pending} vár</Badge>
          <Badge variant="outline">{mediaCounts.localPending} fájl</Badge>
          <Badge variant="outline">{mediaCounts.remotePending} link</Badge>
          <Badge variant="outline" className="bg-blue-500/10">{mediaCounts.processing} fut</Badge>
          <Badge variant="outline" className="bg-green-500/10">{mediaCounts.completed} kész</Badge>
          <Badge variant="outline" className="bg-destructive/10">{mediaCounts.failed} hiba</Badge>
          <Badge variant="outline" className="bg-muted">{mediaCounts.skipped} kihagyva</Badge>
        </div>
        {latestErrors.length > 0 && (
          <details className="mb-3 border border-destructive/40 p-2 text-xs">
            <summary className="cursor-pointer font-semibold text-destructive">Legutóbbi média hibák ({latestErrors.length})</summary>
            <ul className="mt-2 space-y-1 list-disc pl-4">
              {latestErrors.map((m) => (
                <li key={m.id}>
                  <span className="font-mono">{m.original_filename}</span>: {m.error_message || m.status}
                </li>
              ))}
            </ul>
          </details>
        )}
        {media.length === 0 ? (
          <p className="text-xs text-muted-foreground">Még nincs média fájl. Tölts fel egy ZIP-et MP4 / MP3 / képpel.</p>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="space-y-1">
              {media.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-xs border-b py-1">
                  {mediaIcon(m.media_type)}
                  <span className="font-mono truncate flex-1">{m.original_filename}</span>
                  <span className="text-muted-foreground">
                    {m.file_size_bytes ? `${(m.file_size_bytes / 1024 / 1024).toFixed(1)}MB` : m.metadata?.remote_url ? "link" : ""}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}

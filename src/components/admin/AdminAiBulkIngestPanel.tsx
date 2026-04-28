import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Loader2, FileJson, FileArchive, Globe, RefreshCw, CheckCircle2, AlertCircle, Layers } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchJobs();
    const ch = supabase
      .channel("bulk-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_bulk_ingest_jobs" }, () => fetchJobs())
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
      if (error) throw error;
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
      if (error) throw error;
      toast({
        title: "ZIP feldolgozva",
        description: `${data.succeeded} sikeres, ${data.duplicates} duplikátum, ${data.failed} hiba.`,
      });
      setZipFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchJobs();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5" />
        <h2 className="font-bold text-lg">Tömeges AI Tudás-import</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Tömegesen tölts fel forrásokat JSON-ban (URL listával vagy nyers szöveggel) vagy egy ZIP archívumban.
        Az AI letölti, kivonatolja a lényeget, strukturált cikket ír, automatikusan kategorizálja és kiszűri a duplikátumokat.
      </p>

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
          <Label>ZIP fájl (TXT, MD, JSON, HTML tartalmazhat)</Label>
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
    </div>
  );
}

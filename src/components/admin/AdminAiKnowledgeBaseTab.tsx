import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Brain, Upload, Trash2, RefreshCw, FileText, Loader2, Sparkles, User,
  CheckCircle2, AlertCircle, Clock, Plus, Database, MessageSquare, Send, Bot
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/untyped-client";
import ReactMarkdown from "react-markdown";
import AdminAiBulkIngestPanel from "./AdminAiBulkIngestPanel";

type DocStatus = "pending" | "processing" | "ready" | "error";

interface KnowledgeDoc {
  id: string;
  title: string;
  source_type: string;
  status: DocStatus;
  error_message: string | null;
  chunk_count: number;
  summary: string | null;
  file_size_bytes: number | null;
  created_at: string;
  file_path?: string;
}

interface OwnerProfile {
  id?: string;
  full_name?: string;
  business_name?: string;
  role?: string;
  bio?: string;
  goals?: string;
  tone_of_voice?: string;
  writing_style?: string;
  target_audience?: string;
  expertise_areas?: string;
  preferences?: string;
  custom_instructions?: string;
}

interface ChatMsg { role: "user" | "assistant"; content: string }

const PROCESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-knowledge-process`;

const STATUS_META: Record<DocStatus, { label: string; icon: any; color: string }> = {
  pending: { label: "Várakozik", icon: Clock, color: "text-muted-foreground" },
  processing: { label: "Tanul…", icon: Loader2, color: "text-primary" },
  ready: { label: "Kész", icon: CheckCircle2, color: "text-green-600" },
  error: { label: "Hiba", icon: AlertCircle, color: "text-destructive" },
};

// Párhuzamosan futtat egy aszinkron feladatot adott korláttal
async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T, idx: number) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try { await worker(items[i], i); } catch (e) { console.error(e); }
    }
  });
  await Promise.all(runners);
}

// PDF szöveg kinyerés a böngészőben
async function extractPdfText(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  // worker URL beállítása
  try {
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    pages.push(content.items.map((it: any) => it.str).join(" "));
  }
  return pages.join("\n\n");
}

// DOCX szöveg kinyerés
async function extractDocxText(file: File): Promise<string> {
  const mammoth: any = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value || "";
}

const AdminAiKnowledgeBaseTab = () => {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [profile, setProfile] = useState<OwnerProfile>({});
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [submittingText, setSubmittingText] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadDocs = async () => {
    const { data, error } = await supabase
      .from("ai_knowledge_documents")
      .select("id,title,source_type,status,error_message,chunk_count,summary,file_size_bytes,created_at,file_path")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      setDocs((data || []) as KnowledgeDoc[]);
    }
  };

  const loadProfile = async () => {
    const { data } = await supabase.from("ai_owner_profile").select("*").limit(1).maybeSingle();
    if (data) setProfile(data as OwnerProfile);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadDocs(), loadProfile()]);
      setLoading(false);
    })();
    const iv = setInterval(loadDocs, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs, chatLoading]);

  const triggerProcess = async (documentId: string): Promise<boolean> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return false;
    try {
      const resp = await fetch(PROCESS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ document_id: documentId }),
      });
      return resp.ok;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  };

  const submitText = async () => {
    if (!textTitle.trim() || !textBody.trim()) {
      toast({ title: "Hiányzó adat", description: "Cím és szöveg kell.", variant: "destructive" });
      return;
    }
    setSubmittingText(true);
    const { data, error } = await supabase
      .from("ai_knowledge_documents")
      .insert({ title: textTitle.trim(), source_type: "text", raw_text: textBody, status: "pending" })
      .select("id").single();
    if (error || !data) {
      toast({ title: "Hiba", description: error?.message, variant: "destructive" });
      setSubmittingText(false);
      return;
    }
    setTextTitle(""); setTextBody("");
    await loadDocs();
    triggerProcess(data.id);
    setSubmittingText(false);
    toast({ title: "Hozzáadva", description: "Az AI tanul belőle." });
  };

  // Egy fájl feldolgozása
  const processFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let raw_text = "";
    let source_type = "text";
    let needsProcessing = false;

    try {
      if (["txt", "md", "csv", "json", "html", "xml"].includes(ext)) {
        raw_text = await file.text();
        source_type = ext === "md" ? "text" : ext;
        needsProcessing = true;
      } else if (ext === "pdf") {
        source_type = "pdf";
        raw_text = await extractPdfText(file);
        needsProcessing = raw_text.length > 30;
      } else if (["docx", "doc"].includes(ext)) {
        source_type = "docx";
        if (ext === "docx") {
          raw_text = await extractDocxText(file);
          needsProcessing = raw_text.length > 30;
        }
      } else if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) {
        source_type = "video";
      } else if (["mp3", "wav", "m4a", "ogg"].includes(ext)) {
        source_type = "audio";
      } else if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
        source_type = "image";
      }

      // Storage feltöltés (kisebb fájloknál)
      let file_path: string | null = null;
      if (file.size < 50 * 1024 * 1024) { // 50MB limit storage upload-ra
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("ai-knowledge").upload(path, file);
        if (!upErr) file_path = path;
      }

      const { data: doc, error: insErr } = await supabase
        .from("ai_knowledge_documents")
        .insert({
          title: file.name,
          source_type,
          file_path,
          file_size_bytes: file.size,
          mime_type: file.type,
          raw_text: raw_text || null,
          status: needsProcessing ? "pending" : "ready",
        })
        .select("id").single();
      if (insErr) throw insErr;
      if (needsProcessing && doc) await triggerProcess(doc.id);
    } catch (e: any) {
      // Hibásan feldolgozott fájl is bekerül error státusszal
      await supabase.from("ai_knowledge_documents").insert({
        title: file.name,
        source_type: source_type || "unknown",
        file_size_bytes: file.size,
        mime_type: file.type,
        status: "error",
        error_message: e.message?.slice(0, 500) || "Feldolgozási hiba",
      });
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setBulkProgress({ done: 0, total: list.length, current: list[0].name });
    let done = 0;

    // 5 fájl párhuzamosan
    await runWithConcurrency(list, 5, async (file) => {
      setBulkProgress((p) => p ? { ...p, current: file.name } : p);
      await processFile(file);
      done++;
      setBulkProgress({ done, total: list.length, current: file.name });
    });

    setBulkProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await loadDocs();
    toast({
      title: "Feltöltés kész",
      description: `${list.length} fájl feldolgozás alatt. Az AI hamarosan használja őket.`,
    });
  };

  const deleteDoc = async (id: string, file_path?: string) => {
    if (!confirm("Biztosan törlöd?")) return;
    if (file_path) await supabase.storage.from("ai-knowledge").remove([file_path]).catch(() => {});
    await supabase.from("ai_knowledge_documents").delete().eq("id", id);
    await loadDocs();
    toast({ title: "Törölve" });
  };

  const reprocess = async (id: string) => {
    await triggerProcess(id);
    toast({ title: "Újra-feldolgozás indítva" });
  };

  const deleteAllDocs = async () => {
    if (!confirm(`Biztosan törlöd MIND a ${docs.length} dokumentumot?`)) return;
    const paths = docs.map(d => d.file_path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("ai-knowledge").remove(paths).catch(() => {});
    await supabase.from("ai_knowledge_documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await loadDocs();
    toast({ title: "Összes törölve" });
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    const payload = { ...profile };
    if (profile.id) {
      const { error } = await supabase.from("ai_owner_profile").update(payload).eq("id", profile.id);
      if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
      else toast({ title: "Profil mentve" });
    } else {
      const { data, error } = await supabase.from("ai_owner_profile").insert(payload).select().single();
      if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
      else { setProfile(data as OwnerProfile); toast({ title: "Profil létrehozva" }); }
    }
    setSavingProfile(false);
  };

  // === CHAT ===
  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg: ChatMsg = { role: "user", content: text };
    const newMsgs = [...chatMsgs, userMsg];
    setChatMsgs(newMsgs);
    setChatInput("");
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-assistant", {
        body: { messages: newMsgs },
      });
      if (error) throw error;
      const reply: string =
        data?.choices?.[0]?.message?.content ||
        data?.message ||
        data?.reply ||
        (typeof data === "string" ? data : "Nincs válasz.");
      setChatMsgs((prev) => [...prev, { role: "assistant", content: reply }]);

      // 🧠 ÖNTANULÁS: háttérben kinyerjük a tartós tudást
      if (reply && reply.length > 50) {
        supabase.functions.invoke("ai-self-learn", {
          body: { userMessage: text, assistantMessage: reply },
        }).catch(() => { /* csendben */ });
      }
    } catch (e: any) {
      toast({ title: "AI hiba", description: e.message || "Ismeretlen", variant: "destructive" });
      setChatMsgs((prev) => [...prev, { role: "assistant", content: "Hiba történt: " + (e.message || "ismeretlen") }]);
    } finally {
      setChatLoading(false);
    }
  };

  const readyCount = docs.filter(d => d.status === "ready").length;
  const totalChunks = docs.reduce((s, d) => s + (d.chunk_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" /> AI Tudásbázis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tölts fel akár 1000+ fájlt egyszerre. Az AI azonnal megtanulja és minden válaszába beépíti.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-xs"><Database className="w-3 h-3 mr-1" />{readyCount}/{docs.length} kész</Badge>
          <Badge variant="secondary" className="text-xs"><Sparkles className="w-3 h-3 mr-1" />{totalChunks} memória</Badge>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="chat"><MessageSquare className="w-4 h-4 mr-2" />Chat az AI-jal</TabsTrigger>
          <TabsTrigger value="upload"><Upload className="w-4 h-4 mr-2" />Tömeges feltöltés</TabsTrigger>
          <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Szöveg</TabsTrigger>
          <TabsTrigger value="profile"><User className="w-4 h-4 mr-2" />Profil</TabsTrigger>
          <TabsTrigger value="library"><Database className="w-4 h-4 mr-2" />Könyvtár ({docs.length})</TabsTrigger>
          <TabsTrigger value="bulk"><Sparkles className="w-4 h-4 mr-2" />Tömeges JSON/URL/ZIP</TabsTrigger>
        </TabsList>

        {/* === CHAT TAB === */}
        <TabsContent value="chat">
          <Card className="p-0 overflow-hidden flex flex-col h-[70vh]">
            <div className="border-b border-border p-3 flex items-center justify-between bg-accent/20">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">AI Asszisztens</p>
                  <p className="text-[10px] text-muted-foreground">{readyCount} dokumentumból tanult • profil betöltve</p>
                </div>
              </div>
              {chatMsgs.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setChatMsgs([])}>Új beszélgetés</Button>
              )}
            </div>

            <ScrollArea className="flex-1 p-4">
              {chatMsgs.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Bot className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Beszélgess velem bármiről — tudom, ki vagy és mindent ismerek, amit feltöltöttél.</p>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2 max-w-xl mx-auto text-left">
                    {[
                      "Milyen termékeim fogynak legjobban?",
                      "Írj egy Instagram posztot az új kollekcióhoz",
                      "Mit rendeljek újra most?",
                      "Foglald össze a mai üzletet",
                    ].map(q => (
                      <button key={q} onClick={() => setChatInput(q)}
                        className="text-xs border border-border rounded p-2 hover:bg-accent text-left">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMsgs.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}>
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="border-t border-border p-3 flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                placeholder="Írj üzenetet… (Enter = küldés, Shift+Enter = új sor)"
                rows={2}
                className="resize-none"
              />
              <Button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} size="icon" className="h-auto">
                {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* === UPLOAD TAB === */}
        <TabsContent value="upload">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Tömeges fájl-feltöltés (akár 1000+ egyszerre)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              <b>Automatikusan kinyert szöveg:</b> TXT, MD, CSV, JSON, HTML, XML, <b>PDF, DOCX</b>.
              <br />
              <b>Tárolva (manuális leírás kell):</b> videó (MP4, MOV…), audio, képek.
              <br />
              5 fájl párhuzamosan feldolgozva — gyors tanulás.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              accept=".txt,.md,.csv,.json,.html,.xml,.pdf,.doc,.docx,.mp4,.mov,.webm,.mp3,.wav,.m4a,.jpg,.jpeg,.png,.webp,.gif"
            />
            <div
              onClick={() => !bulkProgress && fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); if (!bulkProgress) handleFiles(e.dataTransfer.files); }}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed border-border p-12 text-center transition-colors ${
                bulkProgress ? "opacity-60" : "cursor-pointer hover:bg-accent/30"
              }`}
            >
              {bulkProgress ? (
                <>
                  <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-primary" />
                  <p className="font-medium">{bulkProgress.done} / {bulkProgress.total} fájl feldolgozva</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">Aktuális: {bulkProgress.current}</p>
                  <Progress value={(bulkProgress.done / bulkProgress.total) * 100} className="mt-3 max-w-md mx-auto" />
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium">Húzd ide a fájlokat vagy kattints</p>
                  <p className="text-xs text-muted-foreground mt-1">Több száz fájl egyszerre is — PDF/DOCX automatikus szöveg kinyerés</p>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* === TEXT TAB === */}
        <TabsContent value="text">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Szöveges tudás hozzáadása</h3>
            <p className="text-xs text-muted-foreground">
              Másolj be bármilyen szöveget — chat üzeneteket, üzleti tervet, videó leiratot, könyv részletet.
              Az AI azonnal megtanulja és használni fogja.
            </p>
            <div>
              <Label>Cím</Label>
              <Input value={textTitle} onChange={(e) => setTextTitle(e.target.value)} placeholder="pl. Marketing stratégia 2026" />
            </div>
            <div>
              <Label>Szöveg</Label>
              <Textarea
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                placeholder="Másold be a tartalmat..."
                rows={12}
              />
              <p className="text-xs text-muted-foreground mt-1">{textBody.length.toLocaleString()} karakter</p>
            </div>
            <Button onClick={submitText} disabled={submittingText}>
              {submittingText ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Hozzáadás és tanítás
            </Button>
          </Card>
        </TabsContent>

        {/* === PROFILE TAB === */}
        <TabsContent value="profile">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Tulajdonos profil — "Ki vagy te?"</h3>
            <p className="text-xs text-muted-foreground">
              Az AI <b>minden válaszánál</b> figyelembe veszi.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Teljes név</Label>
                <Input value={profile.full_name || ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Vállalkozás neve</Label>
                <Input value={profile.business_name || ""} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} />
              </div>
              <div>
                <Label>Szerep / pozíció</Label>
                <Input value={profile.role || ""} onChange={(e) => setProfile({ ...profile, role: e.target.value })} placeholder="pl. Alapító, CEO" />
              </div>
              <div>
                <Label>Célközönség</Label>
                <Input value={profile.target_audience || ""} onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })} placeholder="pl. 18-35 éves streetwear rajongók" />
              </div>
            </div>
            <div>
              <Label>Bemutatkozás</Label>
              <Textarea value={profile.bio || ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Célok</Label>
              <Textarea value={profile.goals || ""} onChange={(e) => setProfile({ ...profile, goals: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Hangnem</Label>
                <Input value={profile.tone_of_voice || ""} onChange={(e) => setProfile({ ...profile, tone_of_voice: e.target.value })} placeholder="pl. baráti, profi" />
              </div>
              <div>
                <Label>Írásstílus</Label>
                <Input value={profile.writing_style || ""} onChange={(e) => setProfile({ ...profile, writing_style: e.target.value })} placeholder="pl. tömör, sztorizós" />
              </div>
            </div>
            <div>
              <Label>Szakterületek</Label>
              <Textarea value={profile.expertise_areas || ""} onChange={(e) => setProfile({ ...profile, expertise_areas: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Preferenciák</Label>
              <Textarea value={profile.preferences || ""} onChange={(e) => setProfile({ ...profile, preferences: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Egyedi utasítások</Label>
              <Textarea value={profile.custom_instructions || ""} onChange={(e) => setProfile({ ...profile, custom_instructions: e.target.value })} rows={3} />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Profil mentése
            </Button>
          </Card>
        </TabsContent>

        {/* === LIBRARY TAB === */}
        <TabsContent value="library">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground">
                {docs.length} dokumentum, {totalChunks} memóriadarab
              </p>
              {docs.length > 0 && (
                <Button variant="outline" size="sm" onClick={deleteAllDocs} className="text-destructive">
                  <Trash2 className="w-3 h-3 mr-1" /> Mind törlése
                </Button>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Még nincs tudásanyag. Kezdd a feltöltéssel.</p>
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2 pr-3">
                  {docs.map((d) => {
                    const meta = STATUS_META[d.status];
                    const Icon = meta.icon;
                    return (
                      <div key={d.id} className="border border-border p-3 flex items-start gap-3 hover:bg-accent/30 transition-colors">
                        <FileText className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{d.title}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">{d.source_type}</Badge>
                            <span className={`text-xs flex items-center gap-1 ${meta.color}`}>
                              <Icon className={`w-3 h-3 ${d.status === "processing" ? "animate-spin" : ""}`} />
                              {meta.label}
                            </span>
                            {d.chunk_count > 0 && (
                              <span className="text-xs text-muted-foreground">{d.chunk_count} darab</span>
                            )}
                          </div>
                          {d.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.summary}</p>}
                          {d.error_message && <p className="text-xs text-destructive mt-1">{d.error_message}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => reprocess(d.id)} title="Újra">
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteDoc(d.id, d.file_path)} title="Törlés">
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAiKnowledgeBaseTab;

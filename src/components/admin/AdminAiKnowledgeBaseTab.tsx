import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Brain, Upload, Trash2, RefreshCw, FileText, Loader2, Sparkles, User, CheckCircle2, AlertCircle, Clock, Plus, Database } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/untyped-client";

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

const PROCESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-knowledge-process`;

const STATUS_META: Record<DocStatus, { label: string; icon: any; color: string }> = {
  pending: { label: "Várakozik", icon: Clock, color: "text-muted-foreground" },
  processing: { label: "Feldolgozás", icon: Loader2, color: "text-primary" },
  ready: { label: "Kész", icon: CheckCircle2, color: "text-green-600" },
  error: { label: "Hiba", icon: AlertCircle, color: "text-destructive" },
};

const AdminAiKnowledgeBaseTab = () => {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [profile, setProfile] = useState<OwnerProfile>({});
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [submittingText, setSubmittingText] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = async () => {
    const { data, error } = await supabase
      .from("ai_knowledge_documents")
      .select("id,title,source_type,status,error_message,chunk_count,summary,file_size_bytes,created_at")
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
    // Poll every 5s for processing status
    const iv = setInterval(loadDocs, 5000);
    return () => clearInterval(iv);
  }, []);

  const triggerProcess = async (documentId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;
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
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast({ title: "Feldolgozási hiba", description: err.error || "Ismeretlen", variant: "destructive" });
      }
      await loadDocs();
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
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
    await triggerProcess(data.id);
    setSubmittingText(false);
    toast({ title: "Hozzáadva", description: "Az AI tanul belőle." });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    for (const file of Array.from(files)) {
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const isText = ["txt", "md", "csv", "json", "html", "xml"].includes(ext);
        let raw_text = "";
        let source_type = "text";

        if (isText) {
          raw_text = await file.text();
          source_type = ext === "md" ? "text" : ext;
        } else if (ext === "pdf") {
          source_type = "pdf";
          // PDF szöveges réteg kinyerése böngészőben nem támogatott biztosan;
          // jelezzük, hogy másold be a szöveget vagy konvertáld TXT-re
          toast({
            title: "PDF figyelmeztetés",
            description: `${file.name}: a PDF feltöltve, de szövegkivonatoláshoz másold be a tartalmat is "Szöveg hozzáadása" fülön.`,
          });
        } else if (["docx", "doc"].includes(ext)) {
          source_type = "docx";
          toast({
            title: "DOCX figyelmeztetés",
            description: `${file.name}: másold be a szöveget a "Szöveg hozzáadása" fülön a tanításhoz.`,
          });
        } else if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) {
          source_type = "video";
          toast({
            title: "Videó megjegyzés",
            description: `${file.name}: tárolva. Az AI tanításához írd le röviden a tartalmát szövegként.`,
          });
        } else if (["mp3", "wav", "m4a", "ogg"].includes(ext)) {
          source_type = "audio";
        } else if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
          source_type = "image";
        }

        // Upload binary to storage
        const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("ai-knowledge").upload(path, file);
        if (upErr) throw upErr;

        const { data: doc, error: insErr } = await supabase
          .from("ai_knowledge_documents")
          .insert({
            title: file.name,
            source_type,
            file_path: path,
            file_size_bytes: file.size,
            mime_type: file.type,
            raw_text: raw_text || null,
            status: raw_text ? "pending" : "ready", // ha nincs szöveg, csak tárolva
          })
          .select("id").single();
        if (insErr) throw insErr;
        if (raw_text && doc) await triggerProcess(doc.id);
      } catch (e: any) {
        toast({ title: `${file.name} hiba`, description: e.message, variant: "destructive" });
      }
    }
    setUploadingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await loadDocs();
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

  const saveProfile = async () => {
    setSavingProfile(true);
    const payload = { ...profile };
    if (profile.id) {
      const { error } = await supabase.from("ai_owner_profile").update(payload).eq("id", profile.id);
      if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
      else toast({ title: "Profil mentve", description: "Az AI ezt mindig figyelembe veszi." });
    } else {
      const { data, error } = await supabase.from("ai_owner_profile").insert(payload).select().single();
      if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
      else { setProfile(data as OwnerProfile); toast({ title: "Profil létrehozva" }); }
    }
    setSavingProfile(false);
  };

  const readyCount = docs.filter(d => d.status === "ready").length;
  const totalChunks = docs.reduce((s, d) => s + (d.chunk_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" /> AI Tudásbázis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tölts fel anyagokat → az AI megtanulja és minden válaszába beépíti.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-xs"><Database className="w-3 h-3 mr-1" />{readyCount} kész dokumentum</Badge>
          <Badge variant="secondary" className="text-xs"><Sparkles className="w-3 h-3 mr-1" />{totalChunks} memória darab</Badge>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload"><Upload className="w-4 h-4 mr-2" />Feltöltés</TabsTrigger>
          <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Szöveg hozzáadása</TabsTrigger>
          <TabsTrigger value="profile"><User className="w-4 h-4 mr-2" />Tulajdonos profil</TabsTrigger>
          <TabsTrigger value="library"><Database className="w-4 h-4 mr-2" />Könyvtár ({docs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Fájlok feltöltése</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Támogatott szövegként: <b>TXT, MD, CSV, JSON</b>. Egyéb fájlok (PDF, DOCX, MP4, MP3, képek) tárolódnak,
              de a tanításhoz másold be a szöveges tartalmat a "Szöveg hozzáadása" fülön.
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
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border p-12 text-center cursor-pointer hover:bg-accent/30 transition-colors"
            >
              {uploadingFiles ? (
                <Loader2 className="w-12 h-12 mx-auto mb-2 animate-spin text-primary" />
              ) : (
                <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="font-medium">Húzd ide a fájlokat vagy kattints a tallózáshoz</p>
              <p className="text-xs text-muted-foreground mt-1">Több fájl egyszerre is</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="text">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Szöveges tudás hozzáadása</h3>
            <p className="text-xs text-muted-foreground">
              Másolj be bármilyen szöveget — chat üzeneteket, üzleti tervet, videó leiratot, könyv részletet, jegyzeteket.
              Az AI azonnal megtanulja és használni fogja a válaszaiban.
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

        <TabsContent value="profile">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Tulajdonos profil — "Ki vagy te?"</h3>
            <p className="text-xs text-muted-foreground">
              Ezt az AI <b>minden válaszánál</b> figyelembe veszi. Minél részletesebben írod le, annál jobban
              fog hozzád igazodni a hangnem és a javaslatok.
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
                <Input value={profile.role || ""} onChange={(e) => setProfile({ ...profile, role: e.target.value })} placeholder="pl. Alapító, CEO, marketingvezető" />
              </div>
              <div>
                <Label>Célközönség</Label>
                <Input value={profile.target_audience || ""} onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })} placeholder="pl. 18-35 éves streetwear rajongók" />
              </div>
            </div>
            <div>
              <Label>Bemutatkozás</Label>
              <Textarea value={profile.bio || ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} placeholder="Pár mondat magadról és arról, mit csinálsz..." />
            </div>
            <div>
              <Label>Célok</Label>
              <Textarea value={profile.goals || ""} onChange={(e) => setProfile({ ...profile, goals: e.target.value })} rows={3} placeholder="Mit szeretnél elérni rövid és hosszú távon?" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Hangnem</Label>
                <Input value={profile.tone_of_voice || ""} onChange={(e) => setProfile({ ...profile, tone_of_voice: e.target.value })} placeholder="pl. baráti, profi, energikus" />
              </div>
              <div>
                <Label>Írásstílus</Label>
                <Input value={profile.writing_style || ""} onChange={(e) => setProfile({ ...profile, writing_style: e.target.value })} placeholder="pl. tömör, érzelmes, sztorizós" />
              </div>
            </div>
            <div>
              <Label>Szakterületek</Label>
              <Textarea value={profile.expertise_areas || ""} onChange={(e) => setProfile({ ...profile, expertise_areas: e.target.value })} rows={2} placeholder="pl. e-commerce, social media marketing, beszerzés AliExpressről" />
            </div>
            <div>
              <Label>Preferenciák</Label>
              <Textarea value={profile.preferences || ""} onChange={(e) => setProfile({ ...profile, preferences: e.target.value })} rows={2} placeholder="Mit szeretsz és mit nem? Pl. nem szeretem az emojikat, mindig adj konkrét számokat..." />
            </div>
            <div>
              <Label>Egyedi utasítások az AI-nak</Label>
              <Textarea value={profile.custom_instructions || ""} onChange={(e) => setProfile({ ...profile, custom_instructions: e.target.value })} rows={3} placeholder="Bármilyen extra szabály vagy elvárás..." />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Profil mentése
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="library">
          <Card className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Még nincs tudásanyag. Kezdd a feltöltéssel vagy szöveg hozzáadásával.</p>
              </div>
            ) : (
              <div className="space-y-2">
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
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => reprocess(d.id)} title="Újra feldolgoz">
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteDoc(d.id, (d as any).file_path)} title="Törlés">
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAiKnowledgeBaseTab;

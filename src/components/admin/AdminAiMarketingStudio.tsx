import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Sparkles, Play, Trash2, RefreshCw } from "lucide-react";

interface Voice {
  id: string;
  name: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  source_video_path: string | null;
  background_type: string;
  background_prompt: string | null;
  background_asset_path: string | null;
  voice_id: string | null;
  voice_text: string | null;
  matting_mode: string;
  upscale_enabled: boolean;
  target_resolution: string;
  max_duration_seconds: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Render {
  id: string;
  project_id: string;
  status: string;
  current_step: string | null;
  output_video_path: string | null;
  subject_storage_path: string | null;
  background_storage_path: string | null;
  background_is_video: boolean | null;
  voice_storage_path: string | null;
  error_message: string | null;
  logs: any;
  created_at: string;
}

export default function AdminAiMarketingStudio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [renders, setRenders] = useState<Render[]>([]);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state for new project
  const [newName, setNewName] = useState("");

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (selected) void loadRenders(selected.id);
  }, [selected?.id]);

  async function loadAll() {
    setLoading(true);
    const [{ data: ps }, { data: vs }] = await Promise.all([
      supabase.from("ai_studio_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("ai_studio_voices").select("id, name, status").eq("status", "ready"),
    ]);
    setProjects((ps as Project[]) || []);
    setVoices((vs as Voice[]) || []);
    setLoading(false);
  }

  async function loadRenders(projectId: string) {
    const { data } = await supabase
      .from("ai_studio_renders")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(10);
    setRenders((data as Render[]) || []);
  }

  async function createProject() {
    if (!newName.trim()) {
      toast({ title: "Adj meg nevet", variant: "destructive" });
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase
      .from("ai_studio_projects")
      .insert({
        name: newName.trim(),
        background_type: "ai_text",
        matting_mode: "fast",
        upscale_enabled: true,
        target_resolution: "4k",
        max_duration_seconds: 180,
        status: "draft",
        created_by: u.user.id,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
      return;
    }
    setNewName("");
    await loadAll();
    setSelected(data as Project);
    toast({ title: "Projekt létrehozva" });
  }

  async function updateProject(patch: Partial<Project>) {
    if (!selected) return;
    const { data, error } = await supabase
      .from("ai_studio_projects")
      .update(patch)
      .eq("id", selected.id)
      .select()
      .single();
    if (error) {
      toast({ title: "Mentés hiba", description: error.message, variant: "destructive" });
      return;
    }
    setSelected(data as Project);
    setProjects((prev) => prev.map((p) => (p.id === data.id ? (data as Project) : p)));
  }

  async function deleteProject(id: string) {
    if (!confirm("Biztosan törlöd a projektet?")) return;
    const { error } = await supabase.from("ai_studio_projects").delete().eq("id", id);
    if (error) {
      toast({ title: "Törlés hiba", description: error.message, variant: "destructive" });
      return;
    }
    if (selected?.id === id) setSelected(null);
    await loadAll();
  }

  async function uploadAsset(file: File, kind: "source" | "image" | "video") {
    if (!selected) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `projects/${selected.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ai-studio-projects").upload(path, file, {
        contentType: file.type || undefined,
        upsert: true,
      });
      if (error) throw error;
      if (kind === "source") {
        await updateProject({ source_video_path: path });
      } else {
        await updateProject({ background_asset_path: path, background_type: kind === "video" ? "video" : "image" });
      }
      toast({ title: "Feltöltve" });
    } catch (e) {
      toast({ title: "Feltöltés hiba", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function startRender() {
    if (!selected) return;
    if (rendering || selected.status === "rendering") {
      toast({ title: "Már fut egy render", description: "Várd meg amíg befejeződik." });
      return;
    }
    if (!selected.source_video_path) {
      toast({ title: "Először tölts fel forrás videót", variant: "destructive" });
      return;
    }
    if (selected.background_type === "ai_text" && !selected.background_prompt?.trim()) {
      toast({ title: "Add meg a háttér leírását", variant: "destructive" });
      return;
    }
    if (selected.background_type === "ai_video" && !selected.background_asset_path) {
      toast({ title: "Generáld le először az AI videó hátteret", variant: "destructive" });
      return;
    }
    if ((selected.background_type === "image" || selected.background_type === "video") && !selected.background_asset_path) {
      toast({ title: "Tölts fel háttér képet/videót", variant: "destructive" });
      return;
    }
    setRendering(true);
    try {
      // Biztos mentés mielőtt rendert indítunk (ha a textarea még nem blur-elt)
      await updateProject({
        background_prompt: selected.background_prompt,
        voice_text: selected.voice_text,
      });
      const { data, error } = await supabase.functions.invoke("ai-studio-render", {
        body: { project_id: selected.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Nyersanyagok készen ✅",
        description:
          "Háttér + mattolt videó + klónozott hang elkészült és Storage-ba mentve. A végső 4K kompozíciót a Stúdió fő felületén (AI Stúdió → Klip) tudod összeállítani.",
      });
      await loadRenders(selected.id);
      const { data: refreshed } = await supabase
        .from("ai_studio_projects")
        .select("*")
        .eq("id", selected.id)
        .single();
      if (refreshed) setSelected(refreshed as Project);
    } catch (e) {
      toast({ title: "Render hiba", description: (e as Error).message, variant: "destructive" });
    } finally {
      setRendering(false);
    }
  }

  async function downloadRender(path: string) {
    const { data } = await supabase.storage.from("ai-studio-projects").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">🎬 AI Marketing Stúdió</h2>
        <p className="text-sm text-muted-foreground">
          Saját videó + AI háttér + klónozott hang → 4K marketing klip egy felületen.
        </p>
      </div>

      {/* Create new project */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Új projekt</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Klip neve (pl. Tavaszi launch reel)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createProject()}
          />
          <Button onClick={createProject} disabled={loading}>
            <Sparkles className="w-4 h-4 mr-2" />
            Létrehoz
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Project list */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Projektek</CardTitle>
            <Button size="sm" variant="ghost" onClick={loadAll}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground">Még nincs projekt.</p>
            )}
            {projects.map((p) => (
              <div
                key={p.id}
                className={`p-3 border cursor-pointer transition ${
                  selected?.id === p.id ? "border-primary bg-muted" : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setSelected(p)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{p.name}</span>
                  <Badge variant={p.status === "ready" ? "default" : p.status === "error" ? "destructive" : "secondary"}>
                    {p.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("hu-HU")}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteProject(p.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {selected ? `Szerkesztés: ${selected.name}` : "Válassz projektet"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Bal oldalon válassz vagy hozz létre projektet.</p>
            ) : (
              <>
                {/* Source video */}
                <section className="space-y-2">
                  <Label>1. Saját videó (ember a klipben)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadAsset(f, "source");
                      }}
                      disabled={uploading}
                    />
                    {selected.source_video_path && (
                      <Badge variant="outline">✓ feltöltve</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bármilyen háttérből kivágjuk — nem kell zöld háttér. Max 3 perc, mp4/mov.
                  </p>
                </section>

                {/* Matting mode */}
                <section className="space-y-2">
                  <Label>2. Háttér eltávolítás módja</Label>
                  <Select
                    value={selected.matting_mode}
                    onValueChange={(v) => updateProject({ matting_mode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">⚡ Gyors (csak ha eredeti videód már zöld hátterű)</SelectItem>
                      <SelectItem value="premium">🥇 Prémium — bármilyen háttér (Robust Video Matting, hajszálas) ⭐ AJÁNLOTT</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Bármilyen háttérből (utca, szoba, természet) → válaszd a Prémium módot. Ez vágja ki tisztán a személyt.
                  </p>
                </section>

                {/* Background source */}
                <section className="space-y-2">
                  <Label>3. Háttér</Label>
                  <Select
                    value={selected.background_type}
                    onValueChange={(v) => updateProject({ background_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai_text">📝 Szövegből AI kép háttér (4K, Nano Banana Pro)</SelectItem>
                      <SelectItem value="ai_video">🎬 Szövegből AI videó háttér (LTX-Video, mozgó)</SelectItem>
                      <SelectItem value="image">🖼️ Saját kép háttér (feltöltés)</SelectItem>
                      <SelectItem value="video">🎞️ Saját videó háttér (mp4 feltöltés)</SelectItem>
                    </SelectContent>
                  </Select>

                  {(selected.background_type === "ai_text" || selected.background_type === "ai_video") && (
                    <>
                      <Textarea
                        placeholder={
                          selected.background_type === "ai_video"
                            ? "Írd le milyen mozgó háttér kell (pl.: 'Lassan mozgó neon városi utca éjszaka, esőcseppek, cinematic, golden hour')"
                            : "Írd le milyen háttér kell (pl.: 'Modern minimalista streetwear stúdió, fekete-arany, neon visszfények, cinematic lighting, 4K')"
                        }
                        value={selected.background_prompt || ""}
                        onChange={(e) => setSelected({ ...selected, background_prompt: e.target.value })}
                        onBlur={() => updateProject({ background_prompt: selected.background_prompt })}
                        rows={3}
                      />
                      {selected.background_type === "ai_video" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={uploading || !selected.background_prompt}
                          onClick={async () => {
                            if (!selected.background_prompt) return;
                            setUploading(true);
                            try {
                              const { data, error } = await supabase.functions.invoke(
                                "ai-studio-generate-bg-video",
                                { body: { prompt: selected.background_prompt, project_id: selected.id } },
                              );
                              if (error) throw error;
                              if (data?.error) throw new Error(data.error);
                              toast({ title: "AI videó háttér kész", description: "Készen áll a renderhez." });
                              const { data: refreshed } = await supabase
                                .from("ai_studio_projects").select("*").eq("id", selected.id).single();
                              if (refreshed) setSelected(refreshed as Project);
                            } catch (e) {
                              toast({ title: "Generálás hiba", description: (e as Error).message, variant: "destructive" });
                            } finally {
                              setUploading(false);
                            }
                          }}
                        >
                          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          AI videó háttér generálása (~1-3 perc)
                        </Button>
                      )}
                      {selected.background_type === "ai_video" && selected.background_asset_path && (
                        <Badge variant="outline">✓ AI videó háttér mentve</Badge>
                      )}
                    </>
                  )}

                  {(selected.background_type === "image" || selected.background_type === "video") && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept={selected.background_type === "video" ? "video/*" : "image/*"}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadAsset(f, selected.background_type as "image" | "video");
                        }}
                        disabled={uploading}
                      />
                      {selected.background_asset_path && <Badge variant="outline">✓ feltöltve</Badge>}
                    </div>
                  )}
                </section>

                {/* Voice */}
                <section className="space-y-2">
                  <Label>4. Klónozott hang (opcionális)</Label>
                  <Select
                    value={selected.voice_id || "none"}
                    onValueChange={(v) => updateProject({ voice_id: v === "none" ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz hangot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nincs (eredeti hang marad) —</SelectItem>
                      {voices.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          🗣️ {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selected.voice_id && (
                    <Textarea
                      placeholder="Mit mondjon a klónozott hang? (pl. 'Tavaszi kollekció érkezett — nézd meg most a webshopban!')"
                      value={selected.voice_text || ""}
                      onChange={(e) => setSelected({ ...selected, voice_text: e.target.value })}
                      onBlur={() => updateProject({ voice_text: selected.voice_text })}
                      rows={3}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Hangokat a "Saját hang" fülön tudsz feltölteni és klónozni.
                  </p>
                </section>

                {/* Quality */}
                <section className="space-y-3 p-3 border border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label>4K AI upscale (Real-ESRGAN)</Label>
                    <Switch
                      checked={selected.upscale_enabled}
                      onCheckedChange={(v) => updateProject({ upscale_enabled: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Cél felbontás</Label>
                    <Select
                      value={selected.target_resolution}
                      onValueChange={(v) => updateProject({ target_resolution: v })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1080p">1080p</SelectItem>
                        <SelectItem value="4k">4K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label>Max hossz: {selected.max_duration_seconds}s</Label>
                    </div>
                    <Slider
                      value={[selected.max_duration_seconds]}
                      min={10}
                      max={180}
                      step={5}
                      onValueChange={(v) =>
                        setSelected({ ...selected, max_duration_seconds: v[0] })
                      }
                      onValueCommit={(v) => updateProject({ max_duration_seconds: v[0] })}
                    />
                  </div>
                </section>

                {/* Render button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={startRender}
                  disabled={rendering || !selected.source_video_path}
                >
                  {rendering ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Render fut... (akár 5-10 perc)
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      🚀 Marketing klip renderelése
                    </>
                  )}
                </Button>

                {selected.error_message && (
                  <div className="p-3 border border-destructive text-destructive text-sm">
                    ❌ {selected.error_message}
                  </div>
                )}

                {/* Renders */}
                {renders.length > 0 && (
                  <section className="space-y-2 pt-4 border-t border-border">
                    <Label>Render előzmények</Label>
                    {renders.map((r) => (
                      <div key={r.id} className="p-2 border border-border flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">
                            {new Date(r.created_at).toLocaleString("hu-HU")}{" "}
                            <Badge variant={
                              r.status === "ready" || r.status === "assets_ready" ? "default"
                              : r.status === "error" ? "destructive" : "secondary"
                            }>
                              {r.status}
                            </Badge>
                          </div>
                          {r.current_step && (
                            <div className="text-xs text-muted-foreground">Lépés: {r.current_step}</div>
                          )}
                          {r.status === "assets_ready" && !r.output_video_path && (
                            <div className="text-xs text-muted-foreground mt-1">
                              ✅ Nyersanyagok készen — töltsd le és állítsd össze a végső klipet bármilyen szerkesztőben (CapCut, Premiere, DaVinci):
                            </div>
                          )}
                          {r.error_message && (
                            <div className="text-xs text-destructive mt-1">{r.error_message}</div>
                          )}
                          {r.status === "assets_ready" && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {r.background_storage_path && (
                                <Button size="sm" variant="outline" onClick={() => downloadRender(r.background_storage_path!)}>
                                  🖼️ Háttér {r.background_is_video ? "(videó)" : "(kép)"}
                                </Button>
                              )}
                              {r.subject_storage_path && (
                                <Button size="sm" variant="outline" onClick={() => downloadRender(r.subject_storage_path!)}>
                                  🎬 Mattolt alany (zöld háttér)
                                </Button>
                              )}
                              {r.voice_storage_path && (
                                <Button size="sm" variant="outline" onClick={() => downloadRender(r.voice_storage_path!)}>
                                  🎤 Klónozott hang (mp3)
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        {r.output_video_path && (
                          <Button size="sm" variant="outline" onClick={() => downloadRender(r.output_video_path!)}>
                            <Upload className="w-3 h-3 mr-1 rotate-180" />
                            Kész klip letöltése
                          </Button>
                        )}
                      </div>
                    ))}
                  </section>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Copy, Megaphone, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Asset {
  id: string;
  title: string;
  description: string | null;
  asset_type: "banner" | "logo" | "photo" | "video" | "link_template" | "caption_template";
  asset_url: string | null;
  text_content: string | null;
  active: boolean;
  display_order: number;
}

const typeLabel: Record<Asset["asset_type"], string> = {
  banner: "Banner", logo: "Logó", photo: "Fotó", video: "Videó",
  link_template: "Link sablon", caption_template: "Caption sablon",
};

const AdminPartnerMarketingAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assetType, setAssetType] = useState<Asset["asset_type"]>("banner");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partner_marketing_assets")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else setAssets((data ?? []) as Asset[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isTextType = assetType === "link_template" || assetType === "caption_template";

  const reset = () => { setTitle(""); setDescription(""); setTextContent(""); setFile(null); setAssetType("banner"); };

  const save = async () => {
    if (!title) { toast({ title: "Cím kötelező", variant: "destructive" }); return; }
    if (!isTextType && !file) { toast({ title: "Fájl kötelező", variant: "destructive" }); return; }
    if (isTextType && !textContent) { toast({ title: "Szöveg kötelező", variant: "destructive" }); return; }

    setUploading(true);
    let asset_url: string | null = null;

    if (file && !isTextType) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${assetType}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("partner-assets").upload(path, file, { upsert: false });
      if (upErr) { toast({ title: "Feltöltési hiba", description: upErr.message, variant: "destructive" }); setUploading(false); return; }
      asset_url = path; // store path, signed URL on read
    }

    const { error } = await supabase.from("partner_marketing_assets").insert({
      title, description: description || null, asset_type: assetType,
      asset_url, text_content: isTextType ? textContent : null,
      active: true, display_order: assets.length,
    });
    setUploading(false);
    if (error) toast({ title: "Mentési hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Hozzáadva" }); reset(); load(); }
  };

  const remove = async (a: Asset) => {
    if (!confirm(`Törlöd: ${a.title}?`)) return;
    if (a.asset_url) {
      await supabase.storage.from("partner-assets").remove([a.asset_url]);
    }
    const { error } = await supabase.from("partner_marketing_assets").delete().eq("id", a.id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Törölve" }); load(); }
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("partner_marketing_assets").update({ active: v }).eq("id", id);
    load();
  };

  const copyUrl = async (a: Asset) => {
    if (a.text_content) { navigator.clipboard.writeText(a.text_content); toast({ title: "Sablon másolva" }); return; }
    if (!a.asset_url) return;
    const { data, error } = await supabase.storage.from("partner-assets").createSignedUrl(a.asset_url, 60 * 60 * 24 * 7);
    if (error || !data?.signedUrl) { toast({ title: "URL hiba", variant: "destructive" }); return; }
    navigator.clipboard.writeText(data.signedUrl);
    toast({ title: "Aláírt URL másolva (7 nap)" });
  };

  return (
    <div className="border bg-card">
      <div className="border-b p-4 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-accent" />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest">Marketing anyagok</h3>
          <p className="text-[10px] text-muted-foreground">Bannerek, logók, caption sablonok partnereknek</p>
        </div>
      </div>

      <div className="p-4 space-y-3 border-b bg-muted/20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs uppercase">Típus</Label>
            <Select value={assetType} onValueChange={(v) => setAssetType(v as Asset["asset_type"])}>
              <SelectTrigger className="rounded-none mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs uppercase">Cím *</Label>
            <Input className="rounded-none mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="pl. Nyári kampány banner" />
          </div>
          <div>
            <Label className="text-xs uppercase">Leírás</Label>
            <Input className="rounded-none mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="rövid leírás" />
          </div>
        </div>
        {isTextType ? (
          <div>
            <Label className="text-xs uppercase">Szöveg / sablon</Label>
            <Textarea className="rounded-none mt-1 font-mono text-xs" rows={3} value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Pl. Használd a {coupon} kódot 10% kedvezményért!" />
          </div>
        ) : (
          <div>
            <Label className="text-xs uppercase">Fájl</Label>
            <Input type="file" className="rounded-none mt-1" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        )}
        <Button size="sm" className="rounded-none uppercase text-xs" onClick={save} disabled={uploading}>
          <Plus className="w-3 h-3 mr-1" /> {uploading ? "Feltöltés..." : "Hozzáadás"}
        </Button>
      </div>

      <div className="divide-y">
        {loading && <p className="p-4 text-xs text-muted-foreground">Betöltés…</p>}
        {!loading && assets.length === 0 && <p className="p-4 text-xs text-muted-foreground">Még nincs marketing anyag</p>}
        {assets.map((a) => (
          <div key={a.id} className="p-3 flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-none text-[10px] uppercase">{typeLabel[a.asset_type]}</Badge>
                <span className="font-bold text-sm">{a.title}</span>
              </div>
              {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
              {a.text_content && <pre className="text-[10px] font-mono bg-muted p-2 mt-1 whitespace-pre-wrap">{a.text_content}</pre>}
              {a.asset_url && <p className="text-[10px] text-muted-foreground mt-1 font-mono">📎 {a.asset_url}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={a.active} onCheckedChange={(v) => toggle(a.id, v)} />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyUrl(a)} title="URL/sablon másolása">
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => remove(a)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPartnerMarketingAssets;

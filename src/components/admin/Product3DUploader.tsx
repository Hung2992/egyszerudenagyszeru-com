// Sprint B.2 — 3D asset feltöltő közvetlenül a termékszerkesztőből
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Box, Sparkles } from "lucide-react";

// 10 év érvényességű aláírt URL (privát bucket)
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;
const BUCKET = "product-3d-assets";

type AssetRow = {
  id: string;
  product_id: string;
  glb_url: string | null;
  usdz_url: string | null;
  poster_url: string | null;
  alt_text: string | null;
  ar_enabled: boolean;
  auto_rotate: boolean;
  is_active: boolean;
  glb_storage_path?: string | null;
  usdz_storage_path?: string | null;
  poster_storage_path?: string | null;
};

interface Props {
  productId: string;
  productName?: string;
}

export default function Product3DUploader({ productId, productName }: Props) {
  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<null | "glb" | "usdz" | "poster">(null);
  const glbRef = useRef<HTMLInputElement>(null);
  const usdzRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from as any)("product_3d_assets")
      .select("*")
      .eq("product_id", productId)
      .eq("product_source", "shop")
      .maybeSingle();
    setAsset(data || null);
    setLoading(false);
  };

  useEffect(() => {
    if (productId) load();
  }, [productId]);

  const uploadFile = async (kind: "glb" | "usdz" | "poster", file: File) => {
    setUploading(kind);
    try {
      const ext = kind === "poster" ? (file.name.split(".").pop() || "jpg") : kind;
      const path = `${productId}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, cacheControl: "31536000" });
      if (upErr) throw upErr;

      const { data: signed, error: sErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (sErr) throw sErr;

      const urlField = `${kind}_url` as const;
      const pathField = `${kind}_storage_path` as const;

      if (asset) {
        // töröljük a régi fájlt storage-ból, ha volt
        const oldPath = (asset as any)[pathField] as string | null;
        if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
        const { error } = await (supabase.from as any)("product_3d_assets")
          .update({ [urlField]: signed.signedUrl, [pathField]: path, is_active: true })
          .eq("id", asset.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("product_3d_assets").insert({
          product_id: productId,
          product_source: "shop",
          [urlField]: signed.signedUrl,
          [pathField]: path,
          alt_text: productName || null,
          ar_enabled: true,
          auto_rotate: true,
          is_active: true,
        });
        if (error) throw error;
      }
      toast({ title: `${kind.toUpperCase()} feltöltve ✅` });
      await load();
    } catch (e: any) {
      toast({ title: "Feltöltési hiba", description: e.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const removeFile = async (kind: "glb" | "usdz" | "poster") => {
    if (!asset) return;
    if (!confirm(`${kind.toUpperCase()} fájl törlése?`)) return;
    const pathField = `${kind}_storage_path` as const;
    const urlField = `${kind}_url` as const;
    const path = (asset as any)[pathField];
    if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    await (supabase.from as any)("product_3d_assets")
      .update({ [urlField]: null, [pathField]: null })
      .eq("id", asset.id);
    load();
  };

  const toggleField = async (field: "ar_enabled" | "auto_rotate" | "is_active", v: boolean) => {
    if (!asset) return;
    await (supabase.from as any)("product_3d_assets").update({ [field]: v }).eq("id", asset.id);
    load();
  };

  const deleteAll = async () => {
    if (!asset) return;
    if (!confirm("Teljes 3D asset törlése?")) return;
    const paths = [asset.glb_storage_path, asset.usdz_storage_path, asset.poster_storage_path].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths).catch(() => {});
    await (supabase.from as any)("product_3d_assets").delete().eq("id", asset.id);
    setAsset(null);
    toast({ title: "3D asset törölve" });
  };

  if (loading) return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> 3D asset betöltése…</div>;

  const slot = (kind: "glb" | "usdz" | "poster", label: string, hint: string, ref: React.RefObject<HTMLInputElement>, accept: string) => {
    const url = asset ? ((asset as any)[`${kind}_url`] as string | null) : null;
    return (
      <div className="border border-border p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">{label}</div>
            <div className="text-[10px] text-muted-foreground">{hint}</div>
          </div>
          {url ? (
            <span className="text-[10px] font-mono text-emerald-500">● feltöltve</span>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground">nincs</span>
          )}
        </div>
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(kind, f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-none text-xs h-7 flex-1"
            onClick={() => ref.current?.click()}
            disabled={uploading !== null}
          >
            {uploading === kind ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
            {url ? "Csere" : "Feltöltés"}
          </Button>
          {url && (
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeFile(kind)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const ready = asset?.glb_url;

  return (
    <div className="border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4" />
          <span className="text-sm font-bold uppercase tracking-wider">3D / AR élmény</span>
          {ready && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
              AKTÍV
            </span>
          )}
        </div>
        {asset && (
          <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={deleteAll}>
            <Trash2 className="h-3 w-3 mr-1" /> Teljes törlés
          </Button>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground flex items-start gap-1">
        <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>
          Tölts fel egy <b>GLB</b> fájlt az Android + desktop 3D nézethez. Az iPhone AR Quick Look-hoz külön <b>USDZ</b> fájl kell (opcionális). A poszter fallback kép nem 3D-t támogató böngészőknek szolgál.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {slot("glb", "GLB modell", "Android + Desktop 3D", glbRef, ".glb,model/gltf-binary")}
        {slot("usdz", "USDZ modell", "iOS AR Quick Look", usdzRef, ".usdz,model/vnd.usdz+zip")}
        {slot("poster", "Poster kép", "Fallback / előnézet", posterRef, "image/*")}
      </div>

      {asset && (
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={asset.is_active} onCheckedChange={(v) => toggleField("is_active", v)} />
            Aktív a shopban
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={asset.ar_enabled} onCheckedChange={(v) => toggleField("ar_enabled", v)} />
            AR engedélyezve
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={asset.auto_rotate} onCheckedChange={(v) => toggleField("auto_rotate", v)} />
            Auto forgatás
          </label>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Save, Wand2, ShoppingCart, Vote, Plus, Trash2, Upload, Image as ImageIcon,
  Ruler, Layers, Info, GripVertical, Star, X, Package
} from "lucide-react";

interface ProductImage {
  id?: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

interface Variant {
  id?: string;
  size: string;
  color: string;
  sku: string;
  stock: number;
  preorder_limit: number | null;
  preorder_count?: number;
  price_modifier: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface SizeChartRow {
  id?: string;
  size: string;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  length_cm: number | null;
  shoulder_cm: number | null;
  sleeve_cm: number | null;
  inseam_cm: number | null;
  sort_order: number;
}

type Tab = "basic" | "images" | "variants" | "sizes" | "details";

const ProductLaunchEditor = ({ productId, onClose }: { productId: string; onClose: () => void }) => {
  const [tab, setTab] = useState<Tab>("basic");
  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [sizeChart, setSizeChart] = useState<SizeChartRow[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [pickedSizes, setPickedSizes] = useState<string[]>([]);
  const [pickedColors, setPickedColors] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState("");

  const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "One Size", "34", "36", "38", "40", "42", "44"];
  const COLOR_PRESETS = ["Fekete", "Fehér", "Szürke", "Bézs", "Barna", "Kék", "Piros", "Zöld", "Sárga", "Rózsaszín"];

  const load = async () => {
    const [{ data: p }, { data: imgs }, { data: vars }, { data: chart }] = await Promise.all([
      supabase.from("shop_products").select("*").eq("id", productId).single(),
      supabase.from("product_images").select("*").eq("product_id", productId).order("sort_order"),
      supabase.from("product_variants").select("*").eq("product_id", productId).order("sort_order"),
      supabase.from("product_size_chart").select("*").eq("product_id", productId).order("sort_order"),
    ]);
    if (p) setProduct(p);
    setImages(imgs || []);
    setVariants((vars || []).map((v: any) => ({ ...v, preorder_limit: v.preorder_limit })));
    setSizeChart(chart || []);
  };

  useEffect(() => { load(); }, [productId]);

  /* ----------- BASIC SAVE ----------- */
  const saveBasic = async () => {
    if (!product) return;
    const { error } = await supabase.from("shop_products").update({
      name: product.name,
      description: product.description,
      price: product.price,
      original_price: product.original_price,
      category: product.category,
      launch_status: product.launch_status,
      launch_date: product.launch_date,
      teaser_image_url: product.teaser_image_url,
      teaser_description: product.teaser_description,
      preorder_enabled: product.preorder_enabled,
      preorder_deposit_percent: product.preorder_deposit_percent,
      preorder_limit: product.preorder_limit,
      is_sneak_peek: product.is_sneak_peek,
      material: product.material,
      care_instructions: product.care_instructions,
      origin_country: product.origin_country,
      manufacturer: product.manufacturer,
      weight_grams: product.weight_grams,
      has_variants: variants.length > 0,
    }).eq("id", productId);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Mentve", description: "Termék adatok frissítve." });
  };

  const generateTeaser = async () => {
    if (!product) return;
    setAiLoading(true);
    try {
      const res = await fetch(`https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/admin-ai-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          prompt: `Írj 2-3 mondatos, izgalmas, féligazság teaser szöveget egy közelgő termékhez. Termék: "${product.name}", kategória: "${product.category}". Kelts kíváncsiságot, ne áruld el a teljes részleteket. Magyarul, közvetlen hangnemben.`,
          system: "Te egy marketing szövegíró vagy. Tömör, izgalmas, féligazság-teasereket írsz divatos webshop termékekhez."
        }),
      });
      const data = await res.json();
      if (data.text) setProduct({ ...product, teaser_description: data.text.trim() });
    } catch (e: any) {
      toast({ title: "AI hiba", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  /* ----------- IMAGES ----------- */
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
        if (upErr) { toast({ title: "Feltöltési hiba", description: upErr.message, variant: "destructive" }); continue; }
        const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
        const newOrder = images.length;
        const { data: ins } = await supabase.from("product_images").insert({
          product_id: productId,
          image_url: pub.publicUrl,
          is_primary: newOrder === 0 && images.length === 0,
          sort_order: newOrder,
        }).select().single();
        if (ins) setImages(prev => [...prev, ins as ProductImage]);
      }
      toast({ title: "Képek feltöltve" });
    } finally {
      setUploading(false);
    }
  };

  const setPrimaryImage = async (imgId: string) => {
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
    await supabase.from("product_images").update({ is_primary: true }).eq("id", imgId);
    const primary = images.find(i => i.id === imgId);
    if (primary) {
      await supabase.from("shop_products").update({ image_url: primary.image_url }).eq("id", productId);
      setProduct({ ...product, image_url: primary.image_url });
    }
    setImages(images.map(i => ({ ...i, is_primary: i.id === imgId })));
    toast({ title: "Főkép beállítva" });
  };

  const deleteImage = async (img: ProductImage) => {
    if (!img.id) return;
    if (!confirm("Biztos törlöd ezt a képet?")) return;
    await supabase.from("product_images").delete().eq("id", img.id);
    // Best effort: try to remove from storage
    try {
      const path = img.image_url.split("/product-images/")[1];
      if (path) await supabase.storage.from("product-images").remove([path]);
    } catch {}
    setImages(images.filter(i => i.id !== img.id));
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    const next = [...images];
    const tgt = idx + dir;
    if (tgt < 0 || tgt >= next.length) return;
    [next[idx], next[tgt]] = [next[tgt], next[idx]];
    next.forEach((img, i) => { img.sort_order = i; });
    setImages(next);
    next.forEach(async (img) => {
      if (img.id) await supabase.from("product_images").update({ sort_order: img.sort_order }).eq("id", img.id);
    });
  };

  /* ----------- VARIANTS ----------- */
  const addVariant = () => {
    setVariants([...variants, {
      size: "", color: "", sku: "", stock: 0, preorder_limit: null,
      price_modifier: 0, image_url: null, is_active: true, sort_order: variants.length,
    }]);
  };

  const generateMatrix = () => {
    const sizes = prompt("Méretek (vesszővel elválasztva, pl. S,M,L,XL):", "S,M,L,XL");
    const colors = prompt("Színek (vesszővel elválasztva, pl. Fekete,Fehér):", "Fekete,Fehér");
    if (!sizes || !colors) return;
    const sArr = sizes.split(",").map(s => s.trim()).filter(Boolean);
    const cArr = colors.split(",").map(c => c.trim()).filter(Boolean);
    const newVariants: Variant[] = [];
    let idx = variants.length;
    for (const s of sArr) for (const c of cArr) {
      if (variants.some(v => v.size === s && v.color === c)) continue;
      newVariants.push({
        size: s, color: c, sku: "", stock: 0, preorder_limit: null,
        price_modifier: 0, image_url: null, is_active: true, sort_order: idx++,
      });
    }
    setVariants([...variants, ...newVariants]);
    toast({ title: `${newVariants.length} variáns hozzáadva` });
  };

  const saveVariants = async () => {
    // Delete removed ones
    const { data: existing } = await supabase.from("product_variants").select("id").eq("product_id", productId);
    const keepIds = variants.filter(v => v.id).map(v => v.id);
    const toDelete = (existing || []).filter((e: any) => !keepIds.includes(e.id)).map((e: any) => e.id);
    if (toDelete.length > 0) await supabase.from("product_variants").delete().in("id", toDelete);

    for (const v of variants) {
      if (!v.size && !v.color) continue;
      if (v.id) {
        await supabase.from("product_variants").update({
          size: v.size, color: v.color, sku: v.sku, stock: v.stock,
          preorder_limit: v.preorder_limit, price_modifier: v.price_modifier,
          image_url: v.image_url, is_active: v.is_active, sort_order: v.sort_order,
        }).eq("id", v.id);
      } else {
        await supabase.from("product_variants").insert({ ...v, product_id: productId });
      }
    }
    await supabase.from("shop_products").update({ has_variants: variants.length > 0 }).eq("id", productId);
    toast({ title: "Variánsok mentve" });
    load();
  };

  /* ----------- SIZE CHART ----------- */
  const addSizeRow = () => {
    setSizeChart([...sizeChart, {
      size: "", chest_cm: null, waist_cm: null, hip_cm: null, length_cm: null,
      shoulder_cm: null, sleeve_cm: null, inseam_cm: null, sort_order: sizeChart.length,
    }]);
  };

  const saveSizeChart = async () => {
    const { data: existing } = await supabase.from("product_size_chart").select("id").eq("product_id", productId);
    const keepIds = sizeChart.filter(r => r.id).map(r => r.id);
    const toDelete = (existing || []).filter((e: any) => !keepIds.includes(e.id)).map((e: any) => e.id);
    if (toDelete.length > 0) await supabase.from("product_size_chart").delete().in("id", toDelete);

    for (const row of sizeChart) {
      if (!row.size) continue;
      if (row.id) {
        await supabase.from("product_size_chart").update({ ...row, product_id: productId }).eq("id", row.id);
      } else {
        await supabase.from("product_size_chart").insert({ ...row, product_id: productId });
      }
    }
    toast({ title: "Méret-táblázat mentve" });
    load();
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="border bg-card">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider">{product.name}</h2>
              <p className="text-[10px] text-muted-foreground">Launch termék szerkesztő · {product.category}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="rounded-none">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b overflow-x-auto">
            {[
              { id: "basic" as Tab, label: "Alapadatok", icon: Info },
              { id: "images" as Tab, label: `Képek (${images.length})`, icon: ImageIcon },
              { id: "variants" as Tab, label: `Variánsok (${variants.length})`, icon: Layers },
              { id: "sizes" as Tab, label: `Méret-táblázat (${sizeChart.length})`, icon: Ruler },
              { id: "details" as Tab, label: "Anyag/Gondozás", icon: Package },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="p-4 md:p-6 space-y-4">
            {/* BASIC */}
            {tab === "basic" && (
              <>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Név</Label>
                    <Input value={product.name} onChange={e => setProduct({ ...product, name: e.target.value })} className="mt-1 rounded-none text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Kategória</Label>
                    <Input value={product.category} onChange={e => setProduct({ ...product, category: e.target.value })} className="mt-1 rounded-none text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Ár (Ft)</Label>
                    <Input type="number" value={product.price} onChange={e => setProduct({ ...product, price: Number(e.target.value) })} className="mt-1 rounded-none text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Eredeti ár (áthúzott)</Label>
                    <Input type="number" value={product.original_price ?? ""} onChange={e => setProduct({ ...product, original_price: e.target.value ? Number(e.target.value) : null })} className="mt-1 rounded-none text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Leírás</Label>
                  <Textarea value={product.description || ""} onChange={e => setProduct({ ...product, description: e.target.value })} rows={4} className="mt-1 rounded-none text-xs" />
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Launch beállítások</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Launch állapot</Label>
                      <select value={product.launch_status} onChange={e => setProduct({ ...product, launch_status: e.target.value })} className="w-full mt-1 h-9 px-3 text-xs bg-background border">
                        <option value="live">Élő</option>
                        <option value="coming_soon">Hamarosan (féligazság teaser)</option>
                        <option value="pre_order">Előrendelhető</option>
                        <option value="waitlist">Várólistás</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Megjelenés dátuma</Label>
                      <Input type="datetime-local" value={product.launch_date ? new Date(product.launch_date).toISOString().slice(0, 16) : ""} onChange={e => setProduct({ ...product, launch_date: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1 rounded-none text-xs" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Teaser kép URL (homályos)</Label>
                    <Input value={product.teaser_image_url || ""} onChange={e => setProduct({ ...product, teaser_image_url: e.target.value })} className="mt-1 rounded-none text-xs" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs uppercase tracking-wider">Teaser leírás</Label>
                      <Button size="sm" variant="ghost" onClick={generateTeaser} disabled={aiLoading} className="text-[10px] h-6 rounded-none">
                        <Wand2 className="h-3 w-3 mr-1" /> {aiLoading ? "..." : "AI generál"}
                      </Button>
                    </div>
                    <Textarea value={product.teaser_description || ""} onChange={e => setProduct({ ...product, teaser_description: e.target.value })} rows={3} className="rounded-none text-xs" />
                  </div>

                  <div className="border p-3 space-y-3 bg-accent/5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider flex items-center gap-2"><ShoppingCart className="h-3.5 w-3.5" /> Előrendelés engedélyezve</Label>
                      <Switch checked={product.preorder_enabled} onCheckedChange={v => setProduct({ ...product, preorder_enabled: v })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs uppercase tracking-wider">Foglaló (%)</Label>
                        <Input type="number" min={0} max={100} value={product.preorder_deposit_percent} onChange={e => setProduct({ ...product, preorder_deposit_percent: Number(e.target.value) })} className="mt-1 rounded-none text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider">Összes limit (üres = ∞)</Label>
                        <Input type="number" value={product.preorder_limit ?? ""} onChange={e => setProduct({ ...product, preorder_limit: e.target.value ? Number(e.target.value) : null })} className="mt-1 rounded-none text-xs" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Variánsonkénti limitet a "Variánsok" fülön állíthatod.</p>
                  </div>

                  <div className="flex items-center justify-between border p-3">
                    <Label className="text-xs uppercase tracking-wider flex items-center gap-2"><Vote className="h-3.5 w-3.5" /> Sneak peek (szavazható)</Label>
                    <Switch checked={product.is_sneak_peek} onCheckedChange={v => setProduct({ ...product, is_sneak_peek: v })} />
                  </div>
                </div>

                <Button onClick={saveBasic} className="rounded-none uppercase tracking-wider text-xs">
                  <Save className="h-3.5 w-3.5 mr-1" /> Alapadatok mentése
                </Button>
              </>
            )}

            {/* IMAGES */}
            {tab === "images" && (
              <>
                <div className="border-2 border-dashed p-6 text-center">
                  <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileUpload(e.target.files)} />
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mb-3">Húzz ide képeket vagy kattints a feltöltéshez (max 10/termék)</p>
                  <Button onClick={() => fileInput.current?.click()} disabled={uploading} className="rounded-none text-xs uppercase tracking-wider">
                    <Upload className="h-3.5 w-3.5 mr-1" /> {uploading ? "Feltöltés..." : "Képek kiválasztása"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div key={img.id} className={`border relative group ${img.is_primary ? "border-accent border-2" : ""}`}>
                      <img src={img.image_url} alt="" className="w-full aspect-square object-cover" />
                      {img.is_primary && (
                        <div className="absolute top-1 left-1 bg-accent text-accent-foreground text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-current" /> Főkép
                        </div>
                      )}
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                        {!img.is_primary && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-none w-full" onClick={() => setPrimaryImage(img.id!)}>
                            <Star className="h-3 w-3 mr-1" /> Főképnek
                          </Button>
                        )}
                        <div className="flex gap-1 w-full">
                          <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-none flex-1" onClick={() => moveImage(idx, -1)} disabled={idx === 0}>↑</Button>
                          <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-none flex-1" onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1}>↓</Button>
                        </div>
                        <Button size="sm" variant="destructive" className="h-7 text-[10px] rounded-none w-full" onClick={() => deleteImage(img)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Törlés
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {images.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">Még nincs kép. Tölts fel galériát!</p>}
              </>
            )}

            {/* VARIANTS */}
            {tab === "variants" && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={generateMatrix} variant="outline" className="rounded-none text-xs">
                    <Layers className="h-3.5 w-3.5 mr-1" /> Méret×szín mátrix generálás
                  </Button>
                  <Button onClick={addVariant} variant="outline" className="rounded-none text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Egyedi variáns
                  </Button>
                  <Button onClick={saveVariants} className="rounded-none text-xs ml-auto">
                    <Save className="h-3.5 w-3.5 mr-1" /> Variánsok mentése
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Méret</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Szín</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">SKU</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Készlet</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Pre-order limit</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Pre-order</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Ár ±</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Aktív</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1"><Input value={v.size} onChange={e => { const n = [...variants]; n[i].size = e.target.value; setVariants(n); }} className="h-7 rounded-none text-xs" /></td>
                          <td className="p-1"><Input value={v.color} onChange={e => { const n = [...variants]; n[i].color = e.target.value; setVariants(n); }} className="h-7 rounded-none text-xs" /></td>
                          <td className="p-1"><Input value={v.sku} onChange={e => { const n = [...variants]; n[i].sku = e.target.value; setVariants(n); }} className="h-7 rounded-none text-xs" placeholder="auto" /></td>
                          <td className="p-1"><Input type="number" value={v.stock} onChange={e => { const n = [...variants]; n[i].stock = Number(e.target.value); setVariants(n); }} className="h-7 rounded-none text-xs w-20" /></td>
                          <td className="p-1"><Input type="number" value={v.preorder_limit ?? ""} onChange={e => { const n = [...variants]; n[i].preorder_limit = e.target.value ? Number(e.target.value) : null; setVariants(n); }} className="h-7 rounded-none text-xs w-20" placeholder="∞" /></td>
                          <td className="p-2 text-center text-muted-foreground">{v.preorder_count || 0}</td>
                          <td className="p-1"><Input type="number" value={v.price_modifier} onChange={e => { const n = [...variants]; n[i].price_modifier = Number(e.target.value); setVariants(n); }} className="h-7 rounded-none text-xs w-20" /></td>
                          <td className="p-2"><Switch checked={v.is_active} onCheckedChange={c => { const n = [...variants]; n[i].is_active = c; setVariants(n); }} /></td>
                          <td className="p-1"><Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-none" onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3 text-destructive" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {variants.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">Még nincs variáns. Generálj méret×szín mátrixot vagy adj hozzá egyedit!</p>}
              </>
            )}

            {/* SIZE CHART */}
            {tab === "sizes" && (
              <>
                <div className="flex gap-2">
                  <Button onClick={addSizeRow} variant="outline" className="rounded-none text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Sor hozzáadása
                  </Button>
                  <Button onClick={saveSizeChart} className="rounded-none text-xs ml-auto">
                    <Save className="h-3.5 w-3.5 mr-1" /> Méret-táblázat mentése
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Méret</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Mell (cm)</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Derék (cm)</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Csípő (cm)</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Hossz (cm)</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Váll (cm)</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Ujj (cm)</th>
                        <th className="text-left p-2 font-semibold uppercase tracking-wider text-[10px]">Belső szár (cm)</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizeChart.map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1"><Input value={row.size} onChange={e => { const n = [...sizeChart]; n[i].size = e.target.value; setSizeChart(n); }} className="h-7 rounded-none text-xs w-16" /></td>
                          {(["chest_cm", "waist_cm", "hip_cm", "length_cm", "shoulder_cm", "sleeve_cm", "inseam_cm"] as const).map(k => (
                            <td key={k} className="p-1"><Input type="number" step="0.5" value={row[k] ?? ""} onChange={e => { const n = [...sizeChart]; n[i][k] = e.target.value ? Number(e.target.value) : null; setSizeChart(n); }} className="h-7 rounded-none text-xs w-20" /></td>
                          ))}
                          <td className="p-1"><Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-none" onClick={() => setSizeChart(sizeChart.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3 text-destructive" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sizeChart.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">Még nincs méret-táblázat. Add hozzá az első sort!</p>}
              </>
            )}

            {/* DETAILS */}
            {tab === "details" && (
              <>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Anyag (pl. 95% pamut, 5% elasztán)</Label>
                  <Input value={product.material || ""} onChange={e => setProduct({ ...product, material: e.target.value })} className="mt-1 rounded-none text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Gondozási útmutató</Label>
                  <Textarea value={product.care_instructions || ""} onChange={e => setProduct({ ...product, care_instructions: e.target.value })} rows={4} className="mt-1 rounded-none text-xs" placeholder="Mosás max 30°C, vasalás közepes hőn, ne fehérítsd..." />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Származási ország</Label>
                    <Input value={product.origin_country || ""} onChange={e => setProduct({ ...product, origin_country: e.target.value })} className="mt-1 rounded-none text-xs" placeholder="pl. Magyarország" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Gyártó</Label>
                    <Input value={product.manufacturer || ""} onChange={e => setProduct({ ...product, manufacturer: e.target.value })} className="mt-1 rounded-none text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Súly (gramm)</Label>
                    <Input type="number" value={product.weight_grams ?? ""} onChange={e => setProduct({ ...product, weight_grams: e.target.value ? Number(e.target.value) : null })} className="mt-1 rounded-none text-xs" />
                  </div>
                </div>
                <Button onClick={saveBasic} className="rounded-none uppercase tracking-wider text-xs">
                  <Save className="h-3.5 w-3.5 mr-1" /> Részletek mentése
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductLaunchEditor;

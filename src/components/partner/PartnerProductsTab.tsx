import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Send, X, Edit3, Check } from "lucide-react";
import { uploadPartnerMedia } from "@/lib/partner-storage";
import MediaImage from "./MediaImage";
import ProductAttributesFields from "./ProductAttributesFields";
import VariantMatrix, { Variant } from "./VariantMatrix";

interface Props { partnerId: string; }

const statusLabel: Record<string, string> = {
  draft: "Vázlat", pending_review: "Jóváhagyásra vár", active: "Aktív", paused: "Szünetel", rejected: "Elutasítva",
};

const empty: any = {
  title: "", slug: "", description: "", price_huf: 0, compare_price_huf: null,
  category: "", stock_qty: 0, sku: "", weight_g: null,
  material: "", origin_country: "", tags: [], images: [],
  product_type: "clothing", brand: "", model: "",
  sizes: [], compatible_devices: [], attributes: {},
  care_instructions: "", manufacturer: "", primary_image: 0,
};

interface CatalogRow { product_type: string; label: string; brand: string | null; model: string | null; category: string | null; }

const PartnerProductsTab = ({ partnerId }: Props) => {
  const [products, setProducts] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customSize, setCustomSize] = useState("");

  const load = async () => {
    const { data } = await supabase.from("partner_products").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false });
    setProducts(data || []);
  };
  const loadCatalog = async () => {
    const { data } = await supabase.from("product_type_catalog").select("product_type,label,brand,model,category").eq("is_active", true).order("sort_order");
    setCatalog((data || []) as any);
  };

  useEffect(() => { void load(); void loadCatalog(); }, [partnerId]);

  const types = useMemo(() => catalog.filter(c => c.category === "type"), [catalog]);
  const sizesForType = (t: string) => catalog.filter(c => c.product_type === t && c.category === "size").map(c => c.label);
  const phoneBrands = useMemo(() => Array.from(new Set(catalog.filter(c => c.category === "brand" || c.category === "device").map(c => c.brand).filter(Boolean))) as string[], [catalog]);
  const devicesForBrand = (brand: string) => catalog.filter(c => c.category === "device" && c.brand === brand).map(c => ({ brand: c.brand!, model: c.model! }));
  const allDevices = useMemo(() => catalog.filter(c => c.category === "device").map(c => ({ brand: c.brand!, model: c.model! })), [catalog]);

  const startNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (p: any) => {
    setEditing(p);
    const attrs = p.attributes || {};
    setForm({
      ...empty, ...p,
      images: p.images || [], sizes: p.sizes || [], compatible_devices: p.compatible_devices || [],
      attributes: attrs,
      care_instructions: attrs.care_instructions || "",
      manufacturer: attrs.manufacturer || "",
      primary_image: attrs.primary_image || 0,
    });
    setOpen(true);
  };

  const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

  const handleImageUpload = async (files: FileList) => {
    setUploading(true);
    const paths: string[] = [];
    for (const f of Array.from(files)) {
      const p = await uploadPartnerMedia("partner-product-images", partnerId, f);
      if (p) paths.push(p);
    }
    setForm((f: any) => ({ ...f, images: [...(f.images || []), ...paths] }));
    setUploading(false);
  };
  const removeImage = (i: number) => setForm((f: any) => ({ ...f, images: f.images.filter((_: any, idx: number) => idx !== i) }));

  const toggleSize = (s: string) =>
    setForm((f: any) => ({ ...f, sizes: f.sizes.includes(s) ? f.sizes.filter((x: string) => x !== s) : [...f.sizes, s] }));

  const toggleDevice = (d: { brand: string; model: string }) =>
    setForm((f: any) => {
      const exists = f.compatible_devices.some((x: any) => x.brand === d.brand && x.model === d.model);
      return { ...f, compatible_devices: exists ? f.compatible_devices.filter((x: any) => !(x.brand === d.brand && x.model === d.model)) : [...f.compatible_devices, d] };
    });

  const selectAllBrandDevices = (brand: string) => {
    const all = devicesForBrand(brand);
    setForm((f: any) => {
      const others = f.compatible_devices.filter((x: any) => x.brand !== brand);
      return { ...f, compatible_devices: [...others, ...all] };
    });
  };

  const save = async (submit = false) => {
    if (!form.title || form.price_huf <= 0) { toast({ title: "Cím és ár kötelező", variant: "destructive" }); return; }
    setSaving(true);
    const slug = form.slug || slugify(form.title);
    const payload: any = {
      partner_id: partnerId,
      title: form.title, slug, description: form.description,
      price_huf: Number(form.price_huf), compare_price_huf: form.compare_price_huf ? Number(form.compare_price_huf) : null,
      category: form.category || null, stock_qty: Number(form.stock_qty || 0), sku: form.sku || null,
      weight_g: form.weight_g ? Number(form.weight_g) : null,
      material: form.material || null, origin_country: form.origin_country || null,
      tags: form.tags || [], images: form.images || [],
      product_type: form.product_type || "clothing",
      brand: form.brand || null, model: form.model || null,
      sizes: form.sizes || [],
      compatible_devices: form.compatible_devices || [],
      attributes: {
        ...(form.attributes || {}),
        care_instructions: form.care_instructions || "",
        manufacturer: form.manufacturer || "",
        primary_image: form.primary_image || 0,
      },
      status: submit ? "pending_review" : "draft",
    };
    const op = editing
      ? supabase.from("partner_products").update(payload).eq("id", editing.id)
      : supabase.from("partner_products").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: submit ? "Beküldve jóváhagyásra" : "Mentve" });
    setOpen(false); void load();
  };

  const submitForReview = async (p: any) => {
    const { error } = await supabase.from("partner_products").update({ status: "pending_review" }).eq("id", p.id);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Beküldve jóváhagyásra" }); void load();
  };
  const pauseProduct = async (p: any) => {
    const next = p.status === "paused" ? "draft" : "paused";
    await supabase.from("partner_products").update({ status: next }).eq("id", p.id);
    void load();
  };
  const remove = async (p: any) => {
    if (!confirm(`Törlöd: ${p.title}?`)) return;
    await supabase.from("partner_products").delete().eq("id", p.id);
    toast({ title: "Törölve" }); void load();
  };

  const t = form.product_type;
  const isClothing = t === "clothing" || t === "shoes";
  const isCase = t === "phone_case" || t === "screen_protector";
  const isPhone = t === "phone";
  const sizeOptions = sizesForType(t);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-widest">Termékeim ({products.length})</h2>
        <Button onClick={startNew} className="rounded-none uppercase tracking-wider"><Plus className="h-4 w-4 mr-1" /> Új termék</Button>
      </div>

      {products.length === 0 ? (
        <Card className="rounded-none border-foreground/20 p-8 text-center text-muted-foreground">
          Még nincs terméked. Tölthetsz fel ruhát, cipőt, telefont, telefon tokot — bármit. Kattints az "Új termék" gombra.
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <Card key={p.id} className="rounded-none border-foreground/20 overflow-hidden">
              <div className="aspect-square bg-muted relative">
                {p.images?.[0] ? (
                  <MediaImage bucket="partner-product-images" path={p.images[0]} className="w-full h-full object-cover" />
                ) : <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Nincs kép</div>}
                <Badge className="absolute top-2 right-2 rounded-none uppercase text-[10px]" variant={p.status === "active" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                  {statusLabel[p.status]}
                </Badge>
                <Badge className="absolute top-2 left-2 rounded-none uppercase text-[10px]" variant="outline">
                  {types.find(x => x.product_type === p.product_type)?.label || p.product_type}
                </Badge>
              </div>
              <div className="p-3 space-y-2">
                <div className="font-bold text-sm line-clamp-1">{p.title}</div>
                <div className="text-accent font-bold">{(p.price_huf || 0).toLocaleString("hu-HU")} Ft</div>
                <div className="text-[10px] text-muted-foreground">
                  Készlet: {p.stock_qty} · SKU: {p.sku || "—"}
                  {p.brand && <> · {p.brand}{p.model ? ` ${p.model}` : ""}</>}
                </div>
                {Array.isArray(p.sizes) && p.sizes.length > 0 && (
                  <div className="text-[10px] text-muted-foreground">Méretek: {p.sizes.join(", ")}</div>
                )}
                {Array.isArray(p.compatible_devices) && p.compatible_devices.length > 0 && (
                  <div className="text-[10px] text-muted-foreground line-clamp-2">
                    Kompatibilis: {p.compatible_devices.slice(0, 4).map((d: any) => d.model).join(", ")}{p.compatible_devices.length > 4 ? ` +${p.compatible_devices.length - 4}` : ""}
                  </div>
                )}
                {p.rejection_reason && <div className="text-[10px] text-destructive">Indok: {p.rejection_reason}</div>}
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" className="rounded-none h-7 px-2" onClick={() => startEdit(p)}><Edit3 className="h-3 w-3" /></Button>
                  {p.status === "draft" && <Button size="sm" className="rounded-none h-7 px-2 text-[10px]" onClick={() => submitForReview(p)}><Send className="h-3 w-3 mr-1" /> Beküld</Button>}
                  {(p.status === "active" || p.status === "paused") && <Button size="sm" variant="outline" className="rounded-none h-7 px-2 text-[10px]" onClick={() => pauseProduct(p)}>{p.status === "paused" ? "Aktivál" : "Szünet"}</Button>}
                  <Button size="sm" variant="ghost" className="rounded-none h-7 px-2" onClick={() => remove(p)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Termék szerkesztése" : "Új termék"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Termék típus */}
            <div>
              <Label>Termék típusa *</Label>
              <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v, sizes: [], compatible_devices: [], brand: "", model: "" })}>
                <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map(tt => <SelectItem key={tt.product_type} value={tt.product_type}>{tt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div><Label>Cím *</Label><Input className="rounded-none" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Leírás</Label><Textarea className="rounded-none" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

            <div className="grid grid-cols-3 gap-2">
              <div><Label>Ár (Ft) *</Label><Input type="number" className="rounded-none" value={form.price_huf} onChange={e => setForm({ ...form, price_huf: e.target.value })} /></div>
              <div><Label>Áthúzott ár</Label><Input type="number" className="rounded-none" value={form.compare_price_huf || ""} onChange={e => setForm({ ...form, compare_price_huf: e.target.value })} /></div>
              <div><Label>Készlet</Label><Input type="number" className="rounded-none" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div><Label>Kategória / alkategória</Label><Input className="rounded-none" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="pl. Póló, Hátlap" /></div>
              <div><Label>SKU</Label><Input className="rounded-none" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
              <div><Label>Súly (g)</Label><Input type="number" className="rounded-none" value={form.weight_g || ""} onChange={e => setForm({ ...form, weight_g: e.target.value })} /></div>
            </div>

            {/* Ruha / cipő méretek */}
            {isClothing && (
              <div>
                <Label>Elérhető méretek (preset chipek + egyedi)</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Array.from(new Set([...sizeOptions, ...form.sizes])).map(s => {
                    const on = form.sizes.includes(s);
                    return (
                      <button type="button" key={s} onClick={() => toggleSize(s)}
                        className={`px-3 py-1.5 text-xs font-bold border ${on ? "bg-accent text-accent-foreground border-accent" : "border-foreground/20 hover:border-foreground"}`}>
                        {on && <Check className="h-3 w-3 inline mr-1" />}{s}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-2 max-w-xs">
                  <Input className="rounded-none h-9" placeholder="Egyedi méret (pl. 46, 32/34)" value={customSize}
                    onChange={e => setCustomSize(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const v = customSize.trim(); if (v && !form.sizes.includes(v)) setForm({ ...form, sizes: [...form.sizes, v] }); setCustomSize(""); } }} />
                  <Button type="button" className="rounded-none h-9" onClick={() => { const v = customSize.trim(); if (v && !form.sizes.includes(v)) setForm({ ...form, sizes: [...form.sizes, v] }); setCustomSize(""); }}><Plus className="h-3 w-3" /></Button>
                </div>
              </div>
            )}

            {/* Telefon: márka + modell */}
            {isPhone && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Márka</Label>
                  <Select value={form.brand} onValueChange={v => setForm({ ...form, brand: v })}>
                    <SelectTrigger className="rounded-none"><SelectValue placeholder="Válassz márkát" /></SelectTrigger>
                    <SelectContent>
                      {phoneBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Modell</Label><Input className="rounded-none" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="pl. iPhone 15 Pro" /></div>
              </div>
            )}

            {/* Telefon tok / kijelzővédő: kompatibilis eszközök */}
            {isCase && (
              <div className="border border-foreground/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold">Kompatibilis telefon modellek</Label>
                  <span className="text-[10px] text-muted-foreground">{form.compatible_devices.length} kiválasztva</span>
                </div>
                {phoneBrands.map(b => {
                  const devs = devicesForBrand(b);
                  if (devs.length === 0) return null;
                  return (
                    <div key={b}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider">{b}</span>
                        <button type="button" className="text-[10px] underline" onClick={() => selectAllBrandDevices(b)}>Összes {b}</button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {devs.map(d => {
                          const on = form.compatible_devices.some((x: any) => x.brand === d.brand && x.model === d.model);
                          return (
                            <button type="button" key={d.model} onClick={() => toggleDevice(d)}
                              className={`px-2 py-1 text-[11px] border ${on ? "bg-accent text-accent-foreground border-accent" : "border-foreground/20 hover:border-foreground"}`}>
                              {on && <Check className="h-3 w-3 inline mr-1" />}{d.model}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {form.compatible_devices.length > 0 && (
                  <button type="button" className="text-[10px] text-destructive underline" onClick={() => setForm({ ...form, compatible_devices: [] })}>Mind törlése</button>
                )}
              </div>
            )}

            {/* Saját márka (opcionális minden típusnál) */}
            {!isPhone && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Saját márka</Label><Input className="rounded-none" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="pl. NagyszerűWear" /></div>
                <div><Label>Modell / kollekció</Label><Input className="rounded-none" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></div>
              </div>
            )}

            {/* Típus-specifikus jellemzők + egyéni attribútumok */}
            <ProductAttributesFields
              productType={form.product_type}
              attributes={form.attributes || {}}
              setAttributes={(a) => setForm({ ...form, attributes: a })}
            />

            {/* Variánsok mátrix: méret/modell × szín × készlet */}
            <VariantMatrix
              mode={isCase ? "device" : isClothing ? "size" : "simple"}
              sizes={form.sizes || []}
              devices={form.compatible_devices || []}
              colors={(form.attributes?.colors as string[]) || []}
              setColors={(c) => setForm({ ...form, attributes: { ...(form.attributes || {}), colors: c } })}
              variants={(form.attributes?.variants as Variant[]) || []}
              setVariants={(v) => {
                const total = v.reduce((s, x) => s + (Number(x.stock) || 0), 0);
                setForm({
                  ...form,
                  attributes: { ...(form.attributes || {}), variants: v },
                  stock_qty: total || form.stock_qty,
                });
              }}
            />

            <div className="grid grid-cols-2 gap-2">
              <div><Label>Anyag</Label><Input className="rounded-none" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} placeholder="pl. 100% pamut / szilikon" /></div>
              <div><Label>Származási hely</Label><Input className="rounded-none" value={form.origin_country} onChange={e => setForm({ ...form, origin_country: e.target.value })} placeholder="pl. Magyarország" /></div>
            </div>

            <div>
              <Label>Képek</Label>
              <Input type="file" multiple accept="image/*" className="rounded-none" onChange={e => e.target.files && handleImageUpload(e.target.files)} disabled={uploading} />
              {uploading && <div className="text-xs text-muted-foreground mt-1">Feltöltés…</div>}
              <div className="grid grid-cols-4 gap-2 mt-2">
                {form.images?.map((p: string, i: number) => (
                  <div key={i} className="relative aspect-square border">
                    <MediaImage bucket="partner-product-images" path={p} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-destructive text-white p-1"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="rounded-none flex-1" onClick={() => save(false)} disabled={saving}>Mentés vázlatként</Button>
              <Button className="rounded-none flex-1" onClick={() => save(true)} disabled={saving}><Send className="h-4 w-4 mr-1" /> Beküld jóváhagyásra</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerProductsTab;

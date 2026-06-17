import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Send, X, Upload, Edit3 } from "lucide-react";
import { uploadPartnerMedia } from "@/lib/partner-storage";
import MediaImage from "./MediaImage";

interface Props { partnerId: string; }

const statusLabel: Record<string, string> = {
  draft: "Vázlat", pending_review: "Jóváhagyásra vár", active: "Aktív", paused: "Szünetel", rejected: "Elutasítva",
};

const empty = {
  title: "", slug: "", description: "", price_huf: 0, compare_price_huf: null as number | null,
  category: "", stock_qty: 0, sku: "", weight_g: null as number | null,
  material: "", origin_country: "", tags: [] as string[], images: [] as string[],
};

const PartnerProductsTab = ({ partnerId }: Props) => {
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("partner_products").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => { void load(); }, [partnerId]);

  const startNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (p: any) => { setEditing(p); setForm({ ...p, images: p.images || [] }); setOpen(true); };

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-widest">Termékeim ({products.length})</h2>
        <Button onClick={startNew} className="rounded-none uppercase tracking-wider"><Plus className="h-4 w-4 mr-1" /> Új termék</Button>
      </div>

      {products.length === 0 ? (
        <Card className="rounded-none border-foreground/20 p-8 text-center text-muted-foreground">Még nincs terméked. Kattints az "Új termék" gombra.</Card>
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
              </div>
              <div className="p-3 space-y-2">
                <div className="font-bold text-sm line-clamp-1">{p.title}</div>
                <div className="text-accent font-bold">{(p.price_huf || 0).toLocaleString("hu-HU")} Ft</div>
                <div className="text-[10px] text-muted-foreground">Készlet: {p.stock_qty} · SKU: {p.sku || "—"}</div>
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
        <DialogContent className="max-w-2xl rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Termék szerkesztése" : "Új termék"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cím *</Label><Input className="rounded-none" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Leírás</Label><Textarea className="rounded-none" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Ár (Ft) *</Label><Input type="number" className="rounded-none" value={form.price_huf} onChange={e => setForm({ ...form, price_huf: e.target.value })} /></div>
              <div><Label>Áthúzott ár (Ft)</Label><Input type="number" className="rounded-none" value={form.compare_price_huf || ""} onChange={e => setForm({ ...form, compare_price_huf: e.target.value })} /></div>
              <div><Label>Készlet</Label><Input type="number" className="rounded-none" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Kategória</Label><Input className="rounded-none" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>SKU</Label><Input className="rounded-none" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
              <div><Label>Súly (g)</Label><Input type="number" className="rounded-none" value={form.weight_g || ""} onChange={e => setForm({ ...form, weight_g: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Anyag *</Label><Input className="rounded-none" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} placeholder="pl. 100% pamut" /></div>
              <div><Label>Származási hely *</Label><Input className="rounded-none" value={form.origin_country} onChange={e => setForm({ ...form, origin_country: e.target.value })} placeholder="pl. Magyarország" /></div>
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

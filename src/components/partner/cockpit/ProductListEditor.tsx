// Partner OS terméklista-szerkesztő: név, ár, készlet, kép, leírás, kategória.
// A mentett termékek azonnal a partner saját webshopjában jelennek meg.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Boxes, Loader2, Plus, Save, Trash2 } from "lucide-react";

interface Props { partnerId: string }

interface Row {
  id: string;
  title: string;
  price_huf: number | null;
  stock_qty: number | null;
  category: string | null;
  description: string | null;
  images: string[] | null;
  status: string;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `termek-${Date.now()}`;

const ProductListEditor = ({ partnerId }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [dirty, setDirty] = useState<Record<string, Partial<Row>>>({});
  const [draft, setDraft] = useState({ title: "", price: "", stock: "", category: "", image: "", description: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_products")
      .select("id, title, price_huf, stock_qty, category, description, images, status")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [partnerId]);

  const patch = (id: string, p: Partial<Row>) => setDirty((d) => ({ ...d, [id]: { ...d[id], ...p } }));
  const value = <K extends keyof Row>(r: Row, k: K): Row[K] => (dirty[r.id]?.[k] ?? r[k]) as Row[K];

  const save = async (r: Row) => {
    const p = dirty[r.id];
    if (!p) return;
    setSavingId(r.id);
    const { error } = await supabase.from("partner_products").update(p).eq("id", r.id);
    setSavingId(null);
    if (error) { toast({ title: "Mentés sikertelen", description: error.message, variant: "destructive" }); return; }
    setDirty((d) => { const n = { ...d }; delete n[r.id]; return n; });
    toast({ title: "Mentve", description: "A módosítás megjelenik a webshopban." });
    void load();
  };

  const create = async () => {
    const title = draft.title.trim();
    const price = Number(draft.price);
    if (!title || !Number.isFinite(price) || price <= 0) {
      toast({ title: "Hiányzó adat", description: "A termék nevét és árát add meg.", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("partner_products").insert({
      partner_id: partnerId,
      title,
      slug: slugify(title),
      price_huf: price,
      stock_qty: Number(draft.stock) || 0,
      category: draft.category.trim() || null,
      description: draft.description.trim() || null,
      images: draft.image.trim() ? [draft.image.trim()] : [],
      status: "draft",
    });
    setCreating(false);
    if (error) { toast({ title: "Nem sikerült létrehozni", description: error.message, variant: "destructive" }); return; }
    setDraft({ title: "", price: "", stock: "", category: "", image: "", description: "" });
    toast({ title: "Termék létrehozva", description: "Beküldés és jóváhagyás után jelenik meg élesben." });
    void load();
  };

  const remove = async (r: Row) => {
    if (!confirm(`Biztosan törlöd: ${r.title}?`)) return;
    const { error } = await supabase.from("partner_products").delete().eq("id", r.id);
    if (error) { toast({ title: "Törlés sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Törölve" });
    void load();
  };

  const submitForReview = async (r: Row) => {
    const { error } = await supabase
      .from("partner_products")
      .update({ status: "pending_review", submitted_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) { toast({ title: "Beküldés sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Beküldve jóváhagyásra" });
    void load();
  };

  return (
    <Card className="rounded-none border-foreground/20 p-4 md:p-5 space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Boxes className="h-3.5 w-3.5" /> Terméklista
        </div>
        <p className="text-xs text-muted-foreground">
          Név, ár, készlet, kép, leírás és kategória — a mentett adatok a saját webshopodban jelennek meg.
        </p>
      </div>

      <div className="border border-foreground/15 p-3 space-y-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Új termék</p>
        <div className="grid gap-2 md:grid-cols-4">
          <Input className="rounded-none" placeholder="Név" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <Input className="rounded-none" placeholder="Ár (Ft)" inputMode="numeric" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          <Input className="rounded-none" placeholder="Készlet" inputMode="numeric" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
          <Input className="rounded-none" placeholder="Kategória" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
        </div>
        <Input className="rounded-none" placeholder="Kép URL" value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} />
        <Textarea className="rounded-none" rows={2} placeholder="Leírás" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <Button className="rounded-none" onClick={() => void create()} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Termék hozzáadása
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full rounded-none" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Még nincs terméked.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="border border-foreground/10 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Input
                  className="rounded-none h-9 max-w-xs"
                  value={String(value(r, "title") ?? "")}
                  onChange={(e) => patch(r.id, { title: e.target.value })}
                />
                <Badge variant={r.status === "active" ? "default" : "secondary"} className="rounded-none text-[10px]">
                  {r.status === "active" ? "Élő" : r.status === "pending_review" ? "Jóváhagyásra vár" : "Vázlat"}
                </Badge>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <Input className="rounded-none h-9" inputMode="numeric" placeholder="Ár"
                  value={String(value(r, "price_huf") ?? "")}
                  onChange={(e) => patch(r.id, { price_huf: Number(e.target.value) || 0 })} />
                <Input className="rounded-none h-9" inputMode="numeric" placeholder="Készlet"
                  value={String(value(r, "stock_qty") ?? "")}
                  onChange={(e) => patch(r.id, { stock_qty: Number(e.target.value) || 0 })} />
                <Input className="rounded-none h-9" placeholder="Kategória"
                  value={String(value(r, "category") ?? "")}
                  onChange={(e) => patch(r.id, { category: e.target.value })} />
                <Input className="rounded-none h-9" placeholder="Kép URL"
                  value={String((value(r, "images") || [])[0] ?? "")}
                  onChange={(e) => patch(r.id, { images: e.target.value ? [e.target.value] : [] })} />
              </div>
              <Textarea className="rounded-none" rows={2} placeholder="Leírás"
                value={String(value(r, "description") ?? "")}
                onChange={(e) => patch(r.id, { description: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="rounded-none" onClick={() => void save(r)} disabled={!dirty[r.id] || savingId === r.id}>
                  {savingId === r.id ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Save className="h-3 w-3 mr-2" />} Mentés
                </Button>
                {r.status === "draft" && (
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => void submitForReview(r)}>
                    Beküldés jóváhagyásra
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="rounded-none text-destructive" onClick={() => void remove(r)}>
                  <Trash2 className="h-3 w-3 mr-2" /> Törlés
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ProductListEditor;

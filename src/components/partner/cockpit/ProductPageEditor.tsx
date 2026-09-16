// Partner OS – Termékoldal szerkesztő: egy kiválasztott termék leírása, képei,
// ára és kategóriája szerkeszthető, és a mentés után a webshop termékoldalán jelenik meg.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Image as ImageIcon, Loader2, Plus, Save, Trash2, ArrowUp } from "lucide-react";

interface Props { partnerId: string }

interface Product {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price_huf: number | null;
  compare_price_huf: number | null;
  images: string[] | null;
  category: string | null;
  stock_qty: number | null;
  sku: string | null;
  status: string;
}

const ft = (n: number) => `${Math.round(n || 0).toLocaleString("hu-HU")} Ft`;

const ProductPageEditor = ({ partnerId }: Props) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [storefrontSlug, setStorefrontSlug] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Product | null>(null);
  const [newImage, setNewImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: prods }, { data: sf }] = await Promise.all([
      supabase
        .from("partner_products")
        .select("id, slug, title, description, price_huf, compare_price_huf, images, category, stock_qty, sku, status")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("partner_storefronts")
        .select("slug, is_published")
        .eq("partner_id", partnerId)
        .maybeSingle(),
    ]);
    const list = (prods as Product[]) || [];
    setProducts(list);
    setStorefrontSlug(sf?.is_published ? sf.slug : null);
    setSelectedId((cur) => cur && list.some((p) => p.id === cur) ? cur : list[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [partnerId]);

  useEffect(() => {
    const p = products.find((x) => x.id === selectedId) || null;
    setForm(p ? { ...p, images: Array.isArray(p.images) ? [...p.images] : [] } : null);
    setNewImage("");
  }, [selectedId, products]);

  const publicUrl = useMemo(
    () => (storefrontSlug && form ? `/b/${storefrontSlug}/termek/${form.slug}` : null),
    [storefrontSlug, form],
  );

  const set = (p: Partial<Product>) => setForm((f) => (f ? { ...f, ...p } : f));

  const addImage = () => {
    const url = newImage.trim();
    if (!url) return;
    set({ images: [...(form?.images || []), url] });
    setNewImage("");
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) { toast({ title: "A termék neve kötelező", variant: "destructive" }); return; }
    if (!form.price_huf || form.price_huf <= 0) { toast({ title: "Érvényes árat adj meg", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase
      .from("partner_products")
      .update({
        title: form.title.trim(),
        description: form.description?.trim() || null,
        price_huf: form.price_huf,
        compare_price_huf: form.compare_price_huf || null,
        images: form.images || [],
        category: form.category?.trim() || null,
        stock_qty: form.stock_qty ?? 0,
        sku: form.sku?.trim() || null,
      })
      .eq("id", form.id);
    setSaving(false);
    if (error) { toast({ title: "Mentés sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Termékoldal frissítve", description: "A webshop termékoldalán is megjelenik." });
    void load();
  };

  if (loading) return <Skeleton className="h-64 w-full rounded-none" />;

  return (
    <Card className="rounded-none border-foreground/20 p-4 md:p-5 space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <ImageIcon className="h-3.5 w-3.5" /> Termékoldal szerkesztő
        </div>
        <p className="text-xs text-muted-foreground">
          Válassz terméket, majd írd át a leírását, képeit és árát — a webshop termékoldala azonnal ezt mutatja.
        </p>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Még nincs terméked. Vedd fel a terméklistában.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`text-xs border px-2 py-1 ${p.id === selectedId ? "border-primary bg-primary/10 font-semibold" : "border-border text-muted-foreground"}`}
              >
                {p.title}
              </button>
            ))}
          </div>

          {form && (
            <div className="space-y-3 border border-foreground/15 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant={form.status === "active" ? "default" : "secondary"} className="rounded-none text-[10px]">
                  {form.status === "active" ? "Élő a webshopban" : form.status === "pending_review" ? "Jóváhagyásra vár" : "Vázlat"}
                </Badge>
                {publicUrl && form.status === "active" && (
                  <a href={publicUrl} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 underline">
                    Termékoldal megnyitása <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <Input className="rounded-none" placeholder="Termék neve" value={form.title}
                onChange={(e) => set({ title: e.target.value })} />

              <div className="grid gap-2 md:grid-cols-4">
                <Input className="rounded-none" inputMode="numeric" placeholder="Ár (Ft)"
                  value={String(form.price_huf ?? "")}
                  onChange={(e) => set({ price_huf: Number(e.target.value) || 0 })} />
                <Input className="rounded-none" inputMode="numeric" placeholder="Eredeti ár (Ft)"
                  value={String(form.compare_price_huf ?? "")}
                  onChange={(e) => set({ compare_price_huf: Number(e.target.value) || 0 })} />
                <Input className="rounded-none" inputMode="numeric" placeholder="Készlet"
                  value={String(form.stock_qty ?? "")}
                  onChange={(e) => set({ stock_qty: Number(e.target.value) || 0 })} />
                <Input className="rounded-none" placeholder="Kategória"
                  value={form.category ?? ""}
                  onChange={(e) => set({ category: e.target.value })} />
              </div>

              <Input className="rounded-none" placeholder="Cikkszám (SKU)" value={form.sku ?? ""}
                onChange={(e) => set({ sku: e.target.value })} />

              <Textarea className="rounded-none" rows={5} placeholder="Termékleírás — ez jelenik meg a termékoldalon"
                value={form.description ?? ""}
                onChange={(e) => set({ description: e.target.value })} />

              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Képek</p>
                {(form.images || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Még nincs kép. Az első kép lesz a borítókép.</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(form.images || []).map((url, i) => (
                    <div key={`${url}-${i}`} className="border border-foreground/10 p-1 space-y-1">
                      <img src={url} alt={`${form.title} kép ${i + 1}`} loading="lazy" className="h-20 w-full object-cover" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{i === 0 ? "Borító" : `#${i + 1}`}</span>
                        <div className="flex gap-1">
                          {i > 0 && (
                            <button type="button" aria-label="Előre mozgatás"
                              onClick={() => {
                                const imgs = [...(form.images || [])];
                                [imgs[i - 1], imgs[i]] = [imgs[i], imgs[i - 1]];
                                set({ images: imgs });
                              }}
                              className="text-muted-foreground hover:text-foreground">
                              <ArrowUp className="h-3 w-3" />
                            </button>
                          )}
                          <button type="button" aria-label="Kép törlése"
                            onClick={() => set({ images: (form.images || []).filter((_, k) => k !== i) })}
                            className="text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input className="rounded-none" placeholder="Új kép URL" value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImage(); } }} />
                  <Button type="button" variant="outline" className="rounded-none shrink-0" onClick={addImage}>
                    <Plus className="h-4 w-4 mr-1" /> Hozzáadás
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button className="rounded-none" onClick={() => void save()} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Mentés a webshopba
                </Button>
                <span className="text-xs text-muted-foreground">
                  Ár a webshopban: {ft(form.price_huf || 0)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default ProductPageEditor;

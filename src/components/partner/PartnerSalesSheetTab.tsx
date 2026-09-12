import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import MediaImage from "@/components/partner/MediaImage";
import { storeBaseUrl, storeProductUrl } from "@/lib/storefrontSeo";
import { Loader2, Copy, Printer, ExternalLink, Search, Truck } from "lucide-react";

interface Props { partnerId: string }

type Product = {
  id: string; title: string; slug: string; price_huf: number; compare_price_huf: number | null;
  category: string | null; stock_qty: number | null; sku: string | null; status: string | null;
  images: string[] | null;
};

type Method = {
  id: string; name: string; description: string | null; method_type: string;
  fee_huf: number; free_over_huf: number | null; requires_address: boolean; is_active: boolean;
};

type Storefront = { slug: string; store_name: string | null; custom_domain: string | null; domain_status: string | null; is_published: boolean | null };

const PartnerSalesSheetTab = ({ partnerId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [sf, setSf] = useState<Storefront | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      const [p, m, s] = await Promise.all([
        supabase.from("partner_products").select("id,title,slug,price_huf,compare_price_huf,category,stock_qty,sku,status,images").eq("partner_id", partnerId).order("title"),
        supabase.from("partner_shipping_methods").select("*").eq("partner_id", partnerId).order("sort_order"),
        supabase.from("partner_storefronts").select("slug,store_name,custom_domain,domain_status,is_published").eq("partner_id", partnerId).maybeSingle(),
      ]);
      if (cancel) return;
      setProducts((p.data as Product[]) || []);
      setMethods(((m.data as Method[]) || []).filter(x => x.is_active));
      setSf((s.data as Storefront) || null);
      setLoading(false);
    };
    void load();
    return () => { cancel = true; };
  }, [partnerId]);

  const active = products.filter(p => (p.status || "draft") === "active");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return active;
    return active.filter(p => [p.title, p.sku, p.category].some(v => (v || "").toLowerCase().includes(t)));
  }, [active, q]);

  const baseUrl = sf ? storeBaseUrl(sf) : null;
  const freeOver = methods.map(m => m.free_over_huf).filter((v): v is number => typeof v === "number" && v > 0);
  const cheapest = methods.length ? Math.min(...methods.map(m => m.fee_huf || 0)) : null;

  const copySheet = async () => {
    const lines: string[] = [];
    lines.push(`${sf?.store_name || "Ajánlat"} – termékek és árak`);
    if (baseUrl) lines.push(baseUrl);
    lines.push("");
    filtered.forEach(p => {
      lines.push(`• ${p.title} — ${(p.price_huf || 0).toLocaleString("hu-HU")} Ft${p.sku ? ` (cikkszám: ${p.sku})` : ""}${typeof p.stock_qty === "number" ? ` · készlet: ${p.stock_qty} db` : ""}`);
    });
    if (methods.length) {
      lines.push("", "Szállítás:");
      methods.forEach(m => lines.push(`• ${m.name}: ${m.fee_huf > 0 ? `${m.fee_huf.toLocaleString("hu-HU")} Ft` : "ingyenes"}${m.free_over_huf ? ` (ingyenes ${m.free_over_huf.toLocaleString("hu-HU")} Ft felett)` : ""}`));
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast({ title: "Ajánlat a vágólapon" });
    } catch {
      toast({ title: "Nem sikerült a másolás", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card className="rounded-none p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Értékesítési oldal</h2>
            <p className="text-sm text-muted-foreground">Élő termékek, árak és szállítási díjak egy lapon – ügyfélnek küldhető vagy nyomtatható.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-none" onClick={copySheet}><Copy className="h-4 w-4 mr-2" />Másolás</Button>
            <Button variant="outline" className="rounded-none" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Nyomtatás</Button>
            {baseUrl && (
              <Button className="rounded-none" asChild>
                <a href={baseUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" />Webshop</a>
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="border p-3"><div className="text-muted-foreground">Élő termék</div><div className="text-lg font-bold">{active.length} db</div></div>
          <div className="border p-3"><div className="text-muted-foreground">Legolcsóbb szállítás</div><div className="text-lg font-bold">{cheapest === null ? "–" : cheapest === 0 ? "Ingyenes" : `${cheapest.toLocaleString("hu-HU")} Ft`}</div></div>
          <div className="border p-3"><div className="text-muted-foreground">Ingyenes szállítás</div><div className="text-lg font-bold">{freeOver.length ? `${Math.min(...freeOver).toLocaleString("hu-HU")} Ft felett` : "–"}</div></div>
          <div className="border p-3"><div className="text-muted-foreground">Bolt státusz</div><div className="text-lg font-bold">{sf?.is_published ? "Publikált" : "Nem publikált"}</div></div>
        </div>
      </Card>

      <Card className="rounded-none p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input className="rounded-none" placeholder="Keresés név, cikkszám vagy kategória szerint" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nincs megjeleníthető élő termék. Vidd fel és élesítsd őket a Termékek fülön.</p>
        ) : (
          <div className="divide-y border">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-3">
                <div className="w-14 h-14 bg-muted shrink-0 overflow-hidden">
                  {p.images?.[0] ? <MediaImage bucket="partner-product-images" path={p.images[0]} className="w-full h-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[p.category, p.sku ? `cikkszám: ${p.sku}` : null, typeof p.stock_qty === "number" ? `készlet: ${p.stock_qty} db` : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold">{(p.price_huf || 0).toLocaleString("hu-HU")} Ft</div>
                  {p.compare_price_huf ? <div className="text-xs line-through text-muted-foreground">{p.compare_price_huf.toLocaleString("hu-HU")} Ft</div> : null}
                </div>
                {sf && p.slug ? (
                  <a className="text-xs underline shrink-0" href={storeProductUrl(sf, p.slug)} target="_blank" rel="noopener noreferrer">Megnyitás</a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="rounded-none p-5 space-y-3">
        <h3 className="font-bold flex items-center gap-2"><Truck className="h-4 w-4" />Szállítási díjak</h3>
        {methods.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nincs aktív szállítási mód. Add hozzá a Szállítás fülön.</p>
        ) : (
          <div className="divide-y border">
            {methods.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-4 p-3">
                <div className="min-w-0">
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.description || (m.requires_address ? "Szállítási cím szükséges" : "Cím nélkül is választható")}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.free_over_huf ? <Badge variant="secondary" className="rounded-none">Ingyenes {m.free_over_huf.toLocaleString("hu-HU")} Ft felett</Badge> : null}
                  <div className="font-bold">{m.fee_huf > 0 ? `${m.fee_huf.toLocaleString("hu-HU")} Ft` : "Ingyenes"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PartnerSalesSheetTab;

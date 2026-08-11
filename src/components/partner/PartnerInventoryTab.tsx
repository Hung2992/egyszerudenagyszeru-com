// Készlet és árazás központ: gyors készletmódosítás, tömeges árazás, alacsony készlet riasztás.
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw, Save, Percent, Boxes } from "lucide-react";

interface Props { partnerId: string }

interface Prod {
  id: string; title: string; sku: string | null; price_huf: number | null; compare_price_huf: number | null;
  stock_qty: number | null; status: string; brand: string | null; product_type: string | null; fulfillment_type?: string | null;
}
interface Variant { id: string; product_id: string; size: string | null; color: string | null; stock_qty: number | null; price_override_huf: number | null; sku: string | null }

const fmt = (n: number | null) => `${Number(n || 0).toLocaleString("hu-HU")} Ft`;
const LOW = 3;

const PartnerInventoryTab = ({ partnerId }: Props) => {
  const [products, setProducts] = useState<Prod[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Record<string, { stock?: number; price?: number }>>({});
  const [vDirty, setVDirty] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [bulkPct, setBulkPct] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: prods } = await supabase
      .from("partner_products")
      .select("id,title,sku,price_huf,compare_price_huf,stock_qty,status,brand,product_type,fulfillment_type")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });
    const list = (prods as Prod[]) || [];
    setProducts(list);
    if (list.length) {
      const { data: vars } = await supabase
        .from("partner_product_variants")
        .select("id,product_id,size,color,stock_qty,price_override_huf,sku")
        .in("product_id", list.map((p) => p.id));
      setVariants((vars as Variant[]) || []);
    } else setVariants([]);
    setDirty({}); setVDirty({});
    setLoading(false);
  };

  useEffect(() => { if (partnerId) void load(); /* eslint-disable-next-line */ }, [partnerId]);

  const variantStock = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of variants) m[v.product_id] = (m[v.product_id] || 0) + Number(v.stock_qty || 0);
    return m;
  }, [variants]);

  const effStock = (p: Prod) => (variants.some((v) => v.product_id === p.id) ? variantStock[p.id] || 0 : Number(p.stock_qty || 0));

  const filtered = useMemo(() => products.filter((p) => {
    const s = effStock(p);
    if (filter === "low") return s > 0 && s <= LOW;
    if (filter === "out") return s === 0;
    if (filter === "active") return p.status === "active";
    return true;
  }), [products, filter, variantStock, variants]);

  const dirtyCount = Object.keys(dirty).length + Object.keys(vDirty).length;

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const [id, patch] of Object.entries(dirty)) {
        const upd: Record<string, any> = {};
        if (patch.stock !== undefined) upd.stock_qty = patch.stock;
        if (patch.price !== undefined) upd.price_huf = patch.price;
        if (Object.keys(upd).length) {
          const { error } = await supabase.from("partner_products").update(upd).eq("id", id);
          if (error) throw error;
        }
      }
      for (const [id, stock] of Object.entries(vDirty)) {
        const { error } = await supabase.from("partner_product_variants").update({ stock_qty: stock }).eq("id", id);
        if (error) throw error;
      }
      toast({ title: "Mentve", description: `${dirtyCount} módosítás elmentve.` });
      await load();
    } catch (e: any) {
      toast({ title: "Mentés sikertelen", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const applyBulkPct = () => {
    const pct = Number(bulkPct);
    if (!pct || Number.isNaN(pct)) {
      toast({ title: "Adj meg százalékot", description: "Pl. -10 (10% kedvezmény) vagy 5 (5% emelés).", variant: "destructive" });
      return;
    }
    const next = { ...dirty };
    for (const p of filtered) {
      const base = next[p.id]?.price ?? Number(p.price_huf || 0);
      if (!base) continue;
      next[p.id] = { ...next[p.id], price: Math.max(1, Math.round((base * (100 + pct)) / 100)) };
    }
    setDirty(next);
    toast({ title: "Árak előkészítve", description: `${filtered.length} termék ára módosítva – mentsd el.` });
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-none" />)}</div>;

  const lowCount = products.filter((p) => effStock(p) > 0 && effStock(p) <= LOW).length;
  const outCount = products.filter((p) => effStock(p) === 0).length;
  const stockValue = products.reduce((s, p) => s + effStock(p) * Number(p.price_huf || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-none border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Készletérték</p>
          <p className="text-2xl font-bold mt-1">{fmt(stockValue)}</p>
        </Card>
        <Card className="rounded-none border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Alacsony készlet</p>
          <p className="text-2xl font-bold mt-1">{lowCount}</p>
        </Card>
        <Card className="rounded-none border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Elfogyott</p>
          <p className="text-2xl font-bold mt-1 text-destructive">{outCount}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Label className="text-xs">Szűrés</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes termék</SelectItem>
              <SelectItem value="active">Csak élő</SelectItem>
              <SelectItem value="low">Alacsony készlet</SelectItem>
              <SelectItem value="out">Elfogyott</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="text-xs">Tömeges árazás %</Label>
          <Input className="rounded-none" placeholder="-10" value={bulkPct} onChange={(e) => setBulkPct(e.target.value)} />
        </div>
        <Button variant="outline" className="rounded-none" onClick={applyBulkPct}><Percent className="h-4 w-4 mr-2" />Alkalmaz a listára</Button>
        <Button className="rounded-none" disabled={!dirtyCount || saving} onClick={() => void saveAll()}>
          <Save className="h-4 w-4 mr-2" />{saving ? "Mentés…" : `Mentés (${dirtyCount})`}
        </Button>
        <Button variant="ghost" className="rounded-none" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-2" />Frissítés</Button>
      </div>

      <Card className="rounded-none border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Termék</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead className="w-32">Készlet</TableHead>
              <TableHead className="w-36">Ár (Ft)</TableHead>
              <TableHead className="w-24">Variánsok</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nincs találat.</TableCell></TableRow>
            ) : filtered.map((p) => {
              const hasVars = variants.some((v) => v.product_id === p.id);
              const s = effStock(p);
              return (
                <Fragment key={p.id}>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-[11px] text-muted-foreground">{[p.brand, p.product_type, p.sku].filter(Boolean).join(" • ") || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="rounded-none text-[10px]">{p.status}</Badge>
                        {s === 0 && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                        {s > 0 && s <= LOW && <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(p.fulfillment_type || "physical") !== "physical" ? (
                        <span className="text-[11px] text-muted-foreground">{p.fulfillment_type === "service" ? "szolgáltatás" : p.fulfillment_type === "course" ? "kurzus" : "digitális"}</span>
                      ) : hasVars ? (
                        <span className="text-sm">{s} <span className="text-[11px] text-muted-foreground">(variáns)</span></span>
                      ) : (
                        <Input
                          type="number" className="rounded-none h-8"
                          value={dirty[p.id]?.stock ?? Number(p.stock_qty || 0)}
                          onChange={(e) => setDirty((d) => ({ ...d, [p.id]: { ...d[p.id], stock: Number(e.target.value) } }))}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" className="rounded-none h-8"
                        value={dirty[p.id]?.price ?? Number(p.price_huf || 0)}
                        onChange={(e) => setDirty((d) => ({ ...d, [p.id]: { ...d[p.id], price: Number(e.target.value) } }))}
                      />
                    </TableCell>
                    <TableCell>
                      {hasVars ? (
                        <Button size="sm" variant="outline" className="rounded-none"
                          onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                          <Boxes className="h-4 w-4" />
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                  {expanded === p.id && variants.filter((v) => v.product_id === p.id).map((v) => (
                    <TableRow key={v.id} className="bg-muted/30">
                      <TableCell className="pl-8 text-xs">{[v.size, v.color].filter(Boolean).join(" / ") || v.sku || "variáns"}</TableCell>
                      <TableCell />
                      <TableCell>
                        <Input type="number" className="rounded-none h-8"
                          value={vDirty[v.id] ?? Number(v.stock_qty || 0)}
                          onChange={(e) => setVDirty((d) => ({ ...d, [v.id]: Number(e.target.value) }))} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {v.price_override_huf ? fmt(v.price_override_huf) : "alap ár"}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default PartnerInventoryTab;

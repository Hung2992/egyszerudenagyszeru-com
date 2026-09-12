// Partnerkapcsolatok: partnerek listája + a hozzájuk csatlakoztatott webshopok állapota.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Link2, Loader2, RefreshCw, Search, Store, Truck, Package, ShoppingCart, Globe } from "lucide-react";

interface PartnerRow {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  status: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface StoreRow {
  partner_id: string;
  slug: string | null;
  display_name: string | null;
  is_published: boolean | null;
  custom_domain: string | null;
  custom_domain_status: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

interface Conn {
  partner: PartnerRow;
  store?: StoreRow;
  products: number;
  activeProducts: number;
  shipping: number;
  orders: number;
  revenue: number;
  pages: number;
}

const AdminPartnerConnectionsTab = () => {
  const [rows, setRows] = useState<Conn[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyConnected, setOnlyConnected] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, sRes, prodRes, shipRes, ordRes, pageRes] = await Promise.all([
      supabase.from("partners").select("id, full_name, company_name, email, status, is_active, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("partner_storefronts").select("partner_id, slug, display_name, is_published, custom_domain, custom_domain_status, meta_title, meta_description").limit(500),
      supabase.from("partner_products").select("partner_id, status").limit(5000),
      supabase.from("partner_shipping_methods").select("partner_id, is_active").limit(2000),
      supabase.from("partner_orders").select("partner_id, total_huf").limit(5000),
      supabase.from("partner_pages").select("partner_id, is_published").limit(2000),
    ]);
    if (pRes.error) {
      toast({ title: "Nem sikerült betölteni", description: pRes.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const stores: Record<string, StoreRow> = {};
    ((sRes.data as StoreRow[]) || []).forEach((s) => { stores[s.partner_id] = s; });

    const count = (arr: any[] | null, key: string, pred?: (r: any) => boolean) => {
      const m: Record<string, number> = {};
      (arr || []).forEach((r) => { if (!pred || pred(r)) m[r[key]] = (m[r[key]] || 0) + 1; });
      return m;
    };
    const prodAll = count(prodRes.data as any[], "partner_id");
    const prodActive = count(prodRes.data as any[], "partner_id", (r) => r.status === "active");
    const shipActive = count(shipRes.data as any[], "partner_id", (r) => r.is_active);
    const ordCount = count(ordRes.data as any[], "partner_id");
    const pagesPub = count(pageRes.data as any[], "partner_id", (r) => r.is_published);
    const revenue: Record<string, number> = {};
    ((ordRes.data as any[]) || []).forEach((o) => { revenue[o.partner_id] = (revenue[o.partner_id] || 0) + (o.total_huf || 0); });

    setRows(((pRes.data as PartnerRow[]) || []).map((p) => ({
      partner: p,
      store: stores[p.id],
      products: prodAll[p.id] || 0,
      activeProducts: prodActive[p.id] || 0,
      shipping: shipActive[p.id] || 0,
      orders: ordCount[p.id] || 0,
      revenue: revenue[p.id] || 0,
      pages: pagesPub[p.id] || 0,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyConnected && !r.store) return false;
      if (!t) return true;
      return [r.partner.full_name, r.partner.company_name, r.partner.email, r.store?.slug, r.store?.display_name]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
    });
  }, [rows, q, onlyConnected]);

  const totals = useMemo(() => ({
    partners: rows.length,
    stores: rows.filter((r) => r.store).length,
    published: rows.filter((r) => r.store?.is_published).length,
    orders: rows.reduce((s, r) => s + r.orders, 0),
  }), [rows]);

  const readiness = (r: Conn) => {
    const checks = [
      { ok: !!r.store, l: "Webshop" },
      { ok: r.activeProducts > 0, l: "Aktív termék" },
      { ok: r.shipping > 0, l: "Szállítási mód" },
      { ok: !!r.store?.meta_title && !!r.store?.meta_description, l: "SEO adatok" },
      { ok: !!r.store?.is_published, l: "Publikálva" },
    ];
    return { checks, score: checks.filter((c) => c.ok).length, max: checks.length };
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Partnerek", v: totals.partners, i: Link2 },
          { l: "Csatlakoztatott webshop", v: totals.stores, i: Store },
          { l: "Publikált webshop", v: totals.published, i: Globe },
          { l: "Összes rendelés", v: totals.orders, i: ShoppingCart },
        ].map(({ l, v, i: Icon }) => (
          <Card key={l} className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{l}</div>
            <div className="text-2xl font-bold mt-1">{v}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Keresés partner, e-mail vagy webshop szerint..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant={onlyConnected ? "default" : "outline"} onClick={() => setOnlyConnected((v) => !v)}>
          <Store className="h-4 w-4 mr-2" /> Csak webshoppal
        </Button>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </Card>

      {loading && rows.length === 0 && (
        <Card className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></Card>
      )}

      <div className="space-y-3">
        {filtered.map((r) => {
          const { checks, score, max } = readiness(r);
          const url = r.store?.slug ? `/b/${r.store.slug}` : null;
          return (
            <Card key={r.partner.id} className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.partner.company_name || r.partner.full_name || "Névtelen partner"}</span>
                    <Badge variant={r.partner.is_active ? "default" : "secondary"}>{r.partner.is_active ? "aktív" : "inaktív"}</Badge>
                    {r.store ? (
                      <Badge variant={r.store.is_published ? "default" : "outline"}>
                        {r.store.is_published ? "publikált webshop" : "webshop piszkozat"}
                      </Badge>
                    ) : <Badge variant="destructive">nincs webshop</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{r.partner.email}</div>
                  {r.store && (
                    <div className="text-sm mt-1 flex items-center gap-2 flex-wrap">
                      <Store className="h-4 w-4" />
                      <span>{r.store.display_name || r.store.slug}</span>
                      {url && (
                        <a href={url} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
                          {url} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {r.store.custom_domain && (
                        <Badge variant="outline">{r.store.custom_domain} · {r.store.custom_domain_status || "függőben"}</Badge>
                      )}
                    </div>
                  )}
                  <div className="flex gap-4 mt-2 text-sm flex-wrap">
                    <span className="inline-flex items-center gap-1"><Package className="h-4 w-4" /> {r.activeProducts}/{r.products} termék</span>
                    <span className="inline-flex items-center gap-1"><Truck className="h-4 w-4" /> {r.shipping} szállítási mód</span>
                    <span className="inline-flex items-center gap-1"><ShoppingCart className="h-4 w-4" /> {r.orders} rendelés</span>
                    <span className="inline-flex items-center gap-1"><Globe className="h-4 w-4" /> {r.pages} publikált aloldal</span>
                    <span className="font-medium">{r.revenue.toLocaleString("hu-HU")} Ft forgalom</span>
                  </div>
                </div>
                <div className="lg:w-72 shrink-0">
                  <div className="text-xs text-muted-foreground mb-1">Csatlakoztatottság: {score}/{max}</div>
                  <div className="flex flex-wrap gap-1">
                    {checks.map((c) => (
                      <Badge key={c.l} variant={c.ok ? "default" : "outline"} className={c.ok ? "" : "opacity-60"}>
                        {c.ok ? "✓" : "✕"} {c.l}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {!loading && filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">Nincs találat.</Card>
        )}
      </div>
    </div>
  );
};

export default AdminPartnerConnectionsTab;

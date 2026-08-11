import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { lazyRetry } from "@/lib/lazy-retry";
import {
  Users, ShieldCheck, Store, Banknote, MousePointerClick, Rocket, Sparkles,
  Loader2, AlertTriangle, TrendingUp, Globe, CheckCircle2, Clock, Search, RefreshCw,
} from "lucide-react";

const AdminPartnersTab = lazy(lazyRetry(() => import("@/components/admin/AdminPartnersTab")));
const AdminContractsTab = lazy(lazyRetry(() => import("@/components/admin/AdminContractsTab")));
const PartnerApprovalsPanel = lazy(lazyRetry(() => import("@/components/admin/PartnerApprovalsPanel")));
const AdminPartnerButtonAnalyticsTab = lazy(lazyRetry(() => import("@/components/admin/AdminPartnerButtonAnalyticsTab")));
const AdminPilotPartnersTab = lazy(lazyRetry(() => import("@/components/admin/AdminPilotPartnersTab")));
const AdminPartnerRecruitmentPro = lazy(lazyRetry(() => import("@/components/admin/AdminPartnerRecruitmentPro")));
const AdminPartnerAcquisitionEngine = lazy(lazyRetry(() => import("@/components/admin/AdminPartnerAcquisitionEngine")));

type Section =
  | "overview" | "partners" | "contracts" | "approvals" | "storefronts"
  | "payouts" | "analytics" | "pilot" | "recruitment" | "acquisition";

const SECTIONS: { key: Section; label: string; icon: any }[] = [
  { key: "overview", label: "Áttekintés", icon: TrendingUp },
  { key: "partners", label: "Partnerek", icon: Users },
  { key: "contracts", label: "Szerződések", icon: ShieldCheck },
  { key: "approvals", label: "Jóváhagyások", icon: CheckCircle2 },
  { key: "storefronts", label: "Webshopok", icon: Store },
  { key: "payouts", label: "Kifizetések", icon: Banknote },
  { key: "analytics", label: "Analitika", icon: MousePointerClick },
  { key: "pilot", label: "Pilot program", icon: Rocket },
  { key: "recruitment", label: "Toborzó AI", icon: Sparkles },
  { key: "acquisition", label: "Acquisition Engine", icon: Sparkles },
];

interface Overview {
  partnersTotal: number;
  partnersActive: number;
  contractsPending: number;
  domainPending: number;
  storefrontsPublished: number;
  storefrontsDraft: number;
  payoutsPendingCount: number;
  payoutsPendingAmount: number;
  orders30: number;
  revenue30: number;
  payout30: number;
  fee30: number;
  newPartners30: number;
}

interface StorefrontRow {
  id: string;
  partner_id: string;
  slug: string | null;
  custom_domain: string | null;
  custom_domain_status?: string | null;
  is_published: boolean;
  updated_at?: string | null;
  created_at: string;
  partnerName?: string;
  orders?: number;
  revenue?: number;
}

interface PayoutRow {
  id: string;
  partner_id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  partnerName?: string;
}

const huf = (n: number) => `${Math.round(n || 0).toLocaleString("hu-HU")} Ft`;

export default function AdminPartnerCenterTab() {
  const [section, setSection] = useState<Section>("overview");
  const [loading, setLoading] = useState(true);
  const [ov, setOv] = useState<Overview | null>(null);
  const [storefronts, setStorefronts] = useState<StorefrontRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [pRes, cRes, dRes, sRes, poRes, oRes] = await Promise.all([
      supabase.from("partners").select("id, full_name, company_name, is_active, created_at"),
      supabase.from("partner_contracts").select("id, status"),
      supabase.from("partner_domain_requests").select("id, status"),
      supabase.from("partner_storefronts").select("id, partner_id, slug, custom_domain, custom_domain_status, is_published, created_at, updated_at"),
      supabase.from("partner_payouts").select("id, partner_id, amount, status, paid_at, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("partner_orders").select("partner_id, total_huf, partner_payout_huf, platform_fee_huf, created_at").gte("created_at", since).limit(2000),
    ]);

    const partners = (pRes.data ?? []) as any[];
    const nameOf = new Map<string, string>(
      partners.map((p) => [p.id, p.company_name || p.full_name || "Névtelen partner"]),
    );
    const contracts = (cRes.data ?? []) as any[];
    const domains = (dRes.data ?? []) as any[];
    const sfs = (sRes.data ?? []) as any[];
    const pays = (poRes.data ?? []) as any[];
    const orders = (oRes.data ?? []) as any[];

    const ordersByPartner = new Map<string, { n: number; rev: number }>();
    for (const o of orders) {
      const cur = ordersByPartner.get(o.partner_id) ?? { n: 0, rev: 0 };
      cur.n += 1;
      cur.rev += Number(o.total_huf || 0);
      ordersByPartner.set(o.partner_id, cur);
    }

    setStorefronts(
      sfs
        .map((s) => ({
          ...s,
          partnerName: nameOf.get(s.partner_id) ?? "—",
          orders: ordersByPartner.get(s.partner_id)?.n ?? 0,
          revenue: ordersByPartner.get(s.partner_id)?.rev ?? 0,
        }))
        .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0)),
    );
    setPayouts(pays.map((p) => ({ ...p, partnerName: nameOf.get(p.partner_id) ?? "—" })));

    const pendingPays = pays.filter((p) => p.status !== "paid" && p.status !== "cancelled");
    setOv({
      partnersTotal: partners.length,
      partnersActive: partners.filter((p) => p.is_active).length,
      contractsPending: contracts.filter((c) => c.status && !["signed", "active", "terminated"].includes(c.status)).length,
      domainPending: domains.filter((d) => d.status === "pending" || d.status === "submitted").length,
      storefrontsPublished: sfs.filter((s) => s.is_published).length,
      storefrontsDraft: sfs.filter((s) => !s.is_published).length,
      payoutsPendingCount: pendingPays.length,
      payoutsPendingAmount: pendingPays.reduce((s, p) => s + Number(p.amount || 0), 0),
      orders30: orders.length,
      revenue30: orders.reduce((s, o) => s + Number(o.total_huf || 0), 0),
      payout30: orders.reduce((s, o) => s + Number(o.partner_payout_huf || 0), 0),
      fee30: orders.reduce((s, o) => s + Number(o.platform_fee_huf || 0), 0),
      newPartners30: partners.filter((p) => p.created_at >= since).length,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredStorefronts = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return storefronts;
    return storefronts.filter((s) =>
      [s.partnerName, s.slug, s.custom_domain].some((v) => (v ?? "").toLowerCase().includes(t)),
    );
  }, [storefronts, q]);

  const todos = useMemo(() => {
    if (!ov) return [];
    return [
      { n: ov.contractsPending, label: "aláírásra váró szerződés", to: "contracts" as Section },
      { n: ov.domainPending, label: "függő domain kérés", to: "approvals" as Section },
      { n: ov.storefrontsDraft, label: "még nem publikált webshop", to: "storefronts" as Section },
      { n: ov.payoutsPendingCount, label: "kifizetetlen jutalék", to: "payouts" as Section },
    ].filter((t) => t.n > 0);
  }, [ov]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="font-heading text-xl">🤝 Partner Központ</h2>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Frissítés
        </Button>
      </div>

      {/* Aloldal navigáció */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={section === s.key ? "default" : "outline"}
            className="shrink-0"
            onClick={() => setSection(s.key)}
          >
            <s.icon className="h-4 w-4 mr-1" />
            {s.label}
          </Button>
        ))}
      </div>

      {section === "overview" && (
        loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : ov && (
          <div className="space-y-6">
            {/* Teendők */}
            {todos.length > 0 && (
              <Card className="p-4 border-amber-500/40">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Teendők
                </div>
                <div className="flex flex-wrap gap-2">
                  {todos.map((t) => (
                    <Button key={t.label} size="sm" variant="outline" onClick={() => setSection(t.to)}>
                      <Badge className="mr-2">{t.n}</Badge> {t.label}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {/* KPI-k */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Aktív partner", value: `${ov.partnersActive} / ${ov.partnersTotal}`, icon: Users, sub: `+${ov.newPartners30} új (30 nap)` },
                { label: "Élő webshop", value: `${ov.storefrontsPublished}`, icon: Globe, sub: `${ov.storefrontsDraft} vázlat` },
                { label: "Partner bevétel (30 nap)", value: huf(ov.revenue30), icon: TrendingUp, sub: `${ov.orders30} rendelés` },
                { label: "Platform jutalék (30 nap)", value: huf(ov.fee30), icon: Banknote, sub: `partner kifizetés: ${huf(ov.payout30)}` },
                { label: "Aláírásra vár", value: `${ov.contractsPending}`, icon: ShieldCheck, sub: "szerződés" },
                { label: "Domain kérés", value: `${ov.domainPending}`, icon: Globe, sub: "jóváhagyásra vár" },
                { label: "Függő kifizetés", value: huf(ov.payoutsPendingAmount), icon: Clock, sub: `${ov.payoutsPendingCount} tétel` },
                { label: "Átl. rendelésérték", value: huf(ov.orders30 ? ov.revenue30 / ov.orders30 : 0), icon: TrendingUp, sub: "utolsó 30 nap" },
              ].map((k) => (
                <Card key={k.label} className="p-4 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <k.icon className="h-3 w-3" /> {k.label}
                  </div>
                  <p className="text-xl font-bold">{k.value}</p>
                  <p className="text-[11px] text-muted-foreground">{k.sub}</p>
                </Card>
              ))}
            </div>

            {/* Top partnerek */}
            <div className="space-y-2">
              <h3 className="font-medium">Top partnerek (30 nap)</h3>
              <Card className="divide-y">
                {storefronts.filter((s) => (s.orders ?? 0) > 0).slice(0, 8).map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-bold w-5 text-muted-foreground">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.partnerName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.custom_domain || (s.slug ? `/b/${s.slug}` : "—")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono">{huf(s.revenue ?? 0)}</p>
                      <p className="text-xs text-muted-foreground">{s.orders} rendelés</p>
                    </div>
                  </div>
                ))}
                {storefronts.every((s) => !(s.orders ?? 0)) && (
                  <p className="p-4 text-sm text-muted-foreground">Még nincs partner rendelés az elmúlt 30 napban.</p>
                )}
              </Card>
            </div>
          </div>
        )
      )}

      {section === "storefronts" && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Keresés partner / slug / domain…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="text-left p-2">Partner</th>
                  <th className="text-left p-2">Cím</th>
                  <th className="text-left p-2">Státusz</th>
                  <th className="text-right p-2">Rendelés (30n)</th>
                  <th className="text-right p-2">Bevétel (30n)</th>
                  <th className="text-right p-2">Megnyitás</th>
                </tr>
              </thead>
              <tbody>
                {filteredStorefronts.map((s) => {
                  const url = s.custom_domain
                    ? `https://${s.custom_domain.replace(/^https?:\/\//, "")}`
                    : s.slug ? `/b/${s.slug}` : null;
                  return (
                    <tr key={s.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{s.partnerName}</td>
                      <td className="p-2 text-muted-foreground">{s.custom_domain || (s.slug ? `/b/${s.slug}` : "—")}</td>
                      <td className="p-2">
                        <Badge variant={s.is_published ? "default" : "secondary"}>
                          {s.is_published ? "Élő" : "Vázlat"}
                        </Badge>
                        {s.custom_domain && s.custom_domain_status !== "verified" && (
                          <Badge variant="outline" className="ml-1">DNS: {s.custom_domain_status || "nincs"}</Badge>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono">{s.orders}</td>
                      <td className="p-2 text-right font-mono">{huf(s.revenue ?? 0)}</td>
                      <td className="p-2 text-right">
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer" className="underline text-xs">
                            Megnyitás
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && filteredStorefronts.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">Nincs találat.</p>
            )}
          </div>
        </div>
      )}

      {section === "payouts" && (
        <div className="space-y-3">
          <h3 className="font-medium">Jutalék kifizetések</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="text-left p-2">Partner</th>
                  <th className="text-right p-2">Összeg</th>
                  <th className="text-left p-2">Státusz</th>
                  <th className="text-left p-2">Létrehozva</th>
                  <th className="text-left p-2">Kifizetve</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-medium">{p.partnerName}</td>
                    <td className="p-2 text-right font-mono">{huf(Number(p.amount))}</td>
                    <td className="p-2">
                      <Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge>
                    </td>
                    <td className="p-2 text-muted-foreground">{p.created_at?.slice(0, 10)}</td>
                    <td className="p-2 text-muted-foreground">{p.paid_at?.slice(0, 10) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && payouts.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">Még nincs kifizetési tétel.</p>
            )}
          </div>
        </div>
      )}

      <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
        {section === "partners" && <AdminPartnersTab />}
        {section === "contracts" && <AdminContractsTab />}
        {section === "approvals" && <PartnerApprovalsPanel />}
        {section === "analytics" && <AdminPartnerButtonAnalyticsTab />}
        {section === "pilot" && <AdminPilotPartnersTab />}
        {section === "recruitment" && <AdminPartnerRecruitmentPro />}
        {section === "acquisition" && <AdminPartnerAcquisitionEngine />}
      </Suspense>
    </div>
  );
}

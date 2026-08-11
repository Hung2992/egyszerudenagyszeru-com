// Ügynökönkénti vezérlőpanel mérőszámok (Finance / Marketing / Sales / SEO / Commerce).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";

export interface AgentMetric { label: string; value: string; hint?: string }

export interface AgentMetrics {
  finance: AgentMetric[];
  marketing: AgentMetric[];
  sales: AgentMetric[];
  seo: AgentMetric[];
  commerce: AgentMetric[];
  alerts: string[];
}

const ft = (n: number) => `${Math.round(n).toLocaleString("hu-HU")} Ft`;

export const usePartnerAgentMetrics = (partnerId: string) => {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const [ordersRes, prodRes, campRes, abRes, sfRes] = await Promise.all([
        supabase.from("partner_orders").select("total_huf,partner_payout_huf,commission_huf,created_at,status")
          .eq("partner_id", partnerId).gte("created_at", since).limit(1000),
        supabase.from("partner_products").select("id,title,price_huf,stock_qty,status,view_count,sales_count,description")
          .eq("partner_id", partnerId).limit(500),
        supabase.from("partner_marketing_campaigns").select("id,status,platform,created_at")
          .eq("partner_id", partnerId).gte("created_at", since).limit(500),
        supabase.from("partner_ab_tests").select("id,status,winner,confidence").eq("partner_id", partnerId).limit(100),
        supabase.from("partner_storefronts").select("seo_title,seo_description,is_published,slug,custom_domain_status")
          .eq("partner_id", partnerId).maybeSingle(),
      ]);
      if (cancelled) return;

      const orders = (ordersRes.data as any[]) || [];
      const products = (prodRes.data as any[]) || [];
      const camps = (campRes.data as any[]) || [];
      const abs = (abRes.data as any[]) || [];
      const sf = (sfRes.data as any) || null;

      const revenue = orders.reduce((s, o) => s + Number(o.total_huf || 0), 0);
      const payout = orders.reduce((s, o) => s + Number(o.partner_payout_huf || 0), 0);
      const commission = orders.reduce((s, o) => s + Number(o.commission_huf || 0), 0);
      const views = products.reduce((s, p) => s + Number(p.view_count || 0), 0);
      const sales = products.reduce((s, p) => s + Number(p.sales_count || 0), 0);
      const conv = views ? (sales / views) * 100 : 0;
      const oos = products.filter((p) => Number(p.stock_qty || 0) === 0).length;
      const pending = products.filter((p) => p.status === "pending_review").length;
      const noSeo = products.filter((p) => !p.description || String(p.description).length < 60).length;
      const dead = products.filter((p) => Number(p.view_count || 0) > 20 && Number(p.sales_count || 0) === 0).length;
      const top = [...products].sort((a, b) => Number(b.sales_count || 0) - Number(a.sales_count || 0))[0];

      const alerts: string[] = [];
      if (oos) alerts.push(`${oos} termék elfogyott.`);
      if (pending) alerts.push(`${pending} termék jóváhagyásra vár.`);
      if (!sf?.is_published) alerts.push("A webshopod még nincs publikálva.");
      if (noSeo) alerts.push(`${noSeo} terméknél hiányzik vagy túl rövid a leírás.`);
      if (dead) alerts.push(`${dead} terméket néznek, de senki nem vásárolja.`);

      setMetrics({
        finance: [
          { label: "Bruttó bevétel (30 nap)", value: ft(revenue) },
          { label: "Partner kifizetés", value: ft(payout) },
          { label: "Platform jutalék", value: ft(commission) },
          { label: "Átlagos kosárérték", value: orders.length ? ft(revenue / orders.length) : "—" },
          { label: "Árrés arány", value: revenue ? `${((payout / revenue) * 100).toFixed(1)}%` : "—" },
        ],
        marketing: [
          { label: "Kampányok (30 nap)", value: String(camps.length) },
          { label: "Aktív / publikált", value: String(camps.filter((c) => c.status === "published" || c.status === "active").length) },
          { label: "Piszkozat", value: String(camps.filter((c) => c.status === "draft").length) },
          { label: "A/B tesztek", value: String(abs.length), hint: `${abs.filter((a) => a.winner).length} lezárt nyertessel` },
        ],
        sales: [
          { label: "Rendelések (30 nap)", value: String(orders.length) },
          { label: "Konverzió", value: `${conv.toFixed(2)}%` },
          { label: "Top termék", value: top?.title ? String(top.title).slice(0, 28) : "—", hint: top ? `${top.sales_count || 0} eladás` : undefined },
          { label: "Upsell lehetőség", value: String(dead), hint: "nézett, de nem vásárolt termék" },
        ],
        seo: [
          { label: "SEO cím", value: sf?.seo_title ? "✔ beállítva" : "✖ hiányzik" },
          { label: "SEO leírás", value: sf?.seo_description ? "✔ beállítva" : "✖ hiányzik" },
          { label: "Hiányos termékleírás", value: String(noSeo) },
          { label: "Saját domain", value: sf?.custom_domain_status || "nincs" },
        ],
        commerce: [
          { label: "Termékek", value: String(products.length) },
          { label: "Élő", value: String(products.filter((p) => p.status === "active").length) },
          { label: "Elfogyott", value: String(oos) },
          { label: "Megtekintés (összes)", value: String(views) },
        ],
        alerts,
      });
    };
    void run();
    return () => { cancelled = true; };
  }, [partnerId]);

  return metrics;
};

export const AgentMetricGrid = ({ items }: { items: AgentMetric[] }) => (
  <div className="grid grid-cols-2 gap-2">
    {items.map((m) => (
      <div key={m.label} className="border border-border p-2">
        <p className="text-[11px] text-muted-foreground">{m.label}</p>
        <p className="text-sm font-semibold">{m.value}</p>
        {m.hint && <p className="text-[10px] text-muted-foreground">{m.hint}</p>}
      </div>
    ))}
  </div>
);

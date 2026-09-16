// Beérkező fizetések: a webshop rendeléseinek fizetési módja és állapota,
// utalásnál kézi "megérkezett" jelöléssel. Valós partner_orders adatokból.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Banknote, CheckCircle2 } from "lucide-react";

interface Props { partnerId: string; days?: number }

const ft = (n: number) => `${Math.round(n || 0).toLocaleString("hu-HU")} Ft`;
const METHODS: Record<string, string> = { cod: "Utánvét", transfer: "Átutalás", card: "Bankkártya" };

const PartnerPaymentsCard = ({ partnerId, days = 30 }: Props) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const from = new Date(Date.now() - days * 864e5).toISOString();
    const { data } = await supabase
      .from("partner_orders")
      .select("id,order_number,total_huf,payment_method,payment_status,paid_at,created_at,customer_name")
      .eq("partner_id", partnerId)
      .gte("created_at", from)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { if (partnerId) void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [partnerId, days]);

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.payment_status === "paid");
    const pending = rows.filter((r) => r.payment_status !== "paid");
    const byMethod: Record<string, number> = {};
    for (const r of rows) byMethod[r.payment_method || "cod"] = (byMethod[r.payment_method || "cod"] || 0) + Number(r.total_huf || 0);
    return {
      paid: paid.reduce((s, r) => s + Number(r.total_huf || 0), 0),
      pending: pending.reduce((s, r) => s + Number(r.total_huf || 0), 0),
      byMethod,
    };
  }, [rows]);

  const markPaid = async (id: string) => {
    setBusy(id);
    const { error } = await supabase
      .from("partner_orders")
      .update({ payment_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(null);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Fizetés rögzítve" });
    await load();
  };

  if (loading) return <Skeleton className="h-40 w-full rounded-none" />;

  return (
    <Card className="rounded-none p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
        <Banknote className="h-3.5 w-3.5" /> Beérkező fizetések ({days} nap)
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-border p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Beérkezett</div>
          <div className="text-lg font-bold">{ft(totals.paid)}</div>
        </div>
        <div className="border border-border p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Függőben</div>
          <div className="text-lg font-bold">{ft(totals.pending)}</div>
        </div>
        <div className="border border-border p-3">
          <div className="text-[11px] uppercase text-muted-foreground">Módonként</div>
          <div className="text-xs">
            {Object.entries(totals.byMethod).map(([k, v]) => (
              <div key={k}>{METHODS[k] || k}: {ft(v)}</div>
            ))}
            {!Object.keys(totals.byMethod).length && <span className="text-muted-foreground">—</span>}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {rows.slice(0, 15).map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border border-border p-2 text-xs">
            <div className="min-w-0">
              <div className="font-semibold truncate">{r.order_number}</div>
              <div className="text-muted-foreground truncate">
                {r.customer_name || "—"} · {METHODS[r.payment_method] || r.payment_method || "—"} · {new Date(r.created_at).toLocaleDateString("hu-HU")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{ft(Number(r.total_huf || 0))}</span>
              {r.payment_status === "paid" ? (
                <Badge className="rounded-none"><CheckCircle2 className="h-3 w-3 mr-1" />Fizetve</Badge>
              ) : (
                <Button size="sm" variant="outline" className="rounded-none h-7" disabled={busy === r.id} onClick={() => void markPaid(r.id)}>
                  Megérkezett
                </Button>
              )}
            </div>
          </div>
        ))}
        {!rows.length && <p className="text-xs text-muted-foreground">Ebben az időszakban még nincs rendelés.</p>}
      </div>
    </Card>
  );
};

export default PartnerPaymentsCard;

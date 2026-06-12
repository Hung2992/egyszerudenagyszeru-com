import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pause, Play, Ban, Copy, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";

interface Props {
  partnerId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

interface Referral {
  id: string; order_id: string; coupon_code: string;
  order_total: number; commission_amount: number;
  status: string; created_at: string; confirmed_at: string | null;
}
interface Payout {
  id: string; amount: number; status: string;
  requested_at: string; paid_at: string | null;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("hu-HU")} Ft`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("hu-HU") : "—";

const AdminPartnerDetailDrawer = ({ partnerId, onClose, onChanged }: Props) => {
  const [partner, setPartner] = useState<any>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!partnerId) return;
    (async () => {
      setLoading(true);
      const [pRes, rRes, poRes] = await Promise.all([
        supabase.from("partners").select("*").eq("id", partnerId).maybeSingle(),
        supabase.from("partner_referrals").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(50),
        supabase.from("partner_payouts").select("*").eq("partner_id", partnerId).order("requested_at", { ascending: false }).limit(20),
      ]);
      setPartner(pRes.data);
      setReferrals((rRes.data ?? []) as Referral[]);
      setPayouts((poRes.data ?? []) as Payout[]);
      if (pRes.data?.coupon_id) {
        const { data: c } = await supabase.from("coupons").select("code").eq("id", pRes.data.coupon_id).maybeSingle();
        setCouponCode(c?.code ?? null);
      } else {
        const { data: c } = await supabase.from("coupons").select("code").eq("partner_id", partnerId).maybeSingle();
        setCouponCode(c?.code ?? null);
      }
      setLoading(false);
    })();
  }, [partnerId]);

  if (!partnerId) return null;

  const changeStatus = async (status: "active" | "paused" | "revoked") => {
    const { error } = await supabase.from("partners").update({ status, is_active: status === "active" }).eq("id", partnerId);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else {
      toast({ title: `Partner státusz: ${status}` });
      setPartner({ ...partner, status });
      onChanged?.();
    }
  };

  const totals = {
    confirmed: referrals.filter((r) => r.status === "confirmed").reduce((s, r) => s + Number(r.commission_amount), 0),
    pending: referrals.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.commission_amount), 0),
    revenue: referrals.filter((r) => r.status !== "cancelled").reduce((s, r) => s + Number(r.order_total), 0),
    paidOut: payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0),
  };
  const lastPaidPayout = payouts.filter((p) => p.status === "paid" && p.paid_at).sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())[0] || null;
  const statusColor: Record<string, string> = {
    active: "bg-green-500/20 text-green-500 border-green-500/40",
    paused: "bg-yellow-500/20 text-yellow-500 border-yellow-500/40",
    revoked: "bg-red-500/20 text-red-500 border-red-500/40",
    invited: "bg-blue-500/20 text-blue-500 border-blue-500/40",
  };

  return (
    <Sheet open={!!partnerId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-3xl rounded-none overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="uppercase tracking-widest text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" /> Partner részletek
          </SheetTitle>
        </SheetHeader>

        {loading && <p className="text-xs text-muted-foreground mt-4">Betöltés…</p>}

        {partner && (
          <div className="space-y-4 mt-4">
            <div className="border p-3 bg-muted/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{partner.company_name || partner.full_name}</h2>
                  {partner.company_name && <p className="text-xs text-muted-foreground">Kapcsolat: {partner.full_name}</p>}
                  <p className="text-xs text-muted-foreground">{partner.email || "—"} · {partner.phone || "—"}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="rounded-none text-[10px] uppercase">{partner.partner_type}</Badge>
                    <Badge variant="outline" className={`rounded-none text-[10px] uppercase ${statusColor[partner.status] || ""}`}>Státusz: {partner.status}</Badge>
                    <Badge variant="outline" className="rounded-none text-[10px] uppercase">{fmt(Number(partner.commission_per_order_amount || 0))} / rendelés</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {partner.status !== "active" && (
                    <Button size="sm" className="rounded-none h-7 text-[10px] uppercase bg-green-500 hover:bg-green-600" onClick={() => changeStatus("active")}>
                      <Play className="w-3 h-3 mr-1" /> Aktivál
                    </Button>
                  )}
                  {partner.status !== "paused" && partner.status !== "revoked" && (
                    <Button size="sm" variant="outline" className="rounded-none h-7 text-[10px] uppercase" onClick={() => changeStatus("paused")}>
                      <Pause className="w-3 h-3 mr-1" /> Szünet
                    </Button>
                  )}
                  {partner.status !== "revoked" && (
                    <Button size="sm" variant="outline" className="rounded-none h-7 text-[10px] uppercase text-red-500 border-red-500/30" onClick={() => { if (confirm("Visszavonod a partneri státuszt? Nem szedi tovább a jutalékot.")) changeStatus("revoked"); }}>
                      <Ban className="w-3 h-3 mr-1" /> Visszavon
                    </Button>
                  )}
                </div>
              </div>
              {couponCode && (
                <div className="mt-3 border-t pt-2 flex items-center gap-2">
                  <span className="text-[10px] uppercase text-muted-foreground">Kupon kód:</span>
                  <code className="font-mono text-sm font-bold text-accent">{couponCode}</code>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(couponCode); toast({ title: "Másolva" }); }}>
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?ref=${couponCode}`); toast({ title: "Referral link másolva" }); }}>
                    Link másolása
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="border p-2"><p className="text-[10px] uppercase text-muted-foreground">Forgalom</p><p className="text-sm font-bold">{fmt(totals.revenue)}</p></div>
              <div className="border p-2"><p className="text-[10px] uppercase text-muted-foreground">Megerősített jutalék</p><p className="text-sm font-bold text-accent">{fmt(totals.confirmed)}</p></div>
              <div className="border p-2"><p className="text-[10px] uppercase text-muted-foreground">Függő</p><p className="text-sm font-bold text-yellow-500">{fmt(totals.pending)}</p></div>
              <div className="border p-2"><p className="text-[10px] uppercase text-muted-foreground">Kifizetve</p><p className="text-sm font-bold text-green-500">{fmt(totals.paidOut)}</p></div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-widest font-bold mb-2">Rendelések (utolsó 50)</h3>
              <div className="border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Kupon</TableHead>
                      <TableHead className="text-right">Összeg</TableHead>
                      <TableHead className="text-right">Jutalék</TableHead>
                      <TableHead>Státusz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs py-4">Nincs rendelés</TableCell></TableRow>}
                    {referrals.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{fmtDate(r.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{r.coupon_code}</TableCell>
                        <TableCell className="text-right text-xs">{fmt(Number(r.order_total))}</TableCell>
                        <TableCell className="text-right font-bold text-xs">{fmt(Number(r.commission_amount))}</TableCell>
                        <TableCell><Badge variant="outline" className="rounded-none text-[10px] uppercase">{r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-widest font-bold mb-2">Kifizetés történet</h3>
              <div className="border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Igényelve</TableHead>
                      <TableHead className="text-right">Összeg</TableHead>
                      <TableHead>Státusz</TableHead>
                      <TableHead>Kifizetve</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-4">Nincs kifizetés</TableCell></TableRow>}
                    {payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">{fmtDate(p.requested_at)}</TableCell>
                        <TableCell className="text-right font-bold text-xs">{fmt(Number(p.amount))}</TableCell>
                        <TableCell><Badge variant="outline" className="rounded-none text-[10px] uppercase">{p.status}</Badge></TableCell>
                        <TableCell className="text-xs">{fmtDate(p.paid_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AdminPartnerDetailDrawer;

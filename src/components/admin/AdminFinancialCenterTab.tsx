import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Plus, Banknote,
  CreditCard, Building2, TrendingUp, Clock, CheckCircle2, XCircle, Save
} from "lucide-react";

/* ─── helpers ─── */
const fmt = (n: number) => (Number(n) || 0).toLocaleString("hu-HU") + " Ft";
const shortDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("hu-HU") : "–";
const statusBadge = (s: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Függőben", variant: "secondary" },
    processing: { label: "Feldolgozás", variant: "outline" },
    completed: { label: "Teljesítve", variant: "default" },
    failed: { label: "Sikertelen", variant: "destructive" },
  };
  const m = map[s] || { label: s, variant: "outline" as const };
  return <Badge variant={m.variant} className="text-[9px] h-5">{m.label}</Badge>;
};

/* ─── types ─── */
interface Payout { id: string; amount: number; fee: number | null; net_amount: number; currency: string | null; status: string | null; payment_method: string | null; payment_details: any; created_at: string | null; processed_at: string | null; failed_reason: string | null; }
interface Refund { id: string; order_id: string | null; customer_name: string; amount: number; currency: string; reason: string | null; method: string; status: string; bank_details: any; notes: string | null; created_at: string | null; }
interface SupplierPayment { id: string; supplier_name: string; amount: number; currency: string; method: string; status: string; bank_details: any; invoice_ref: string | null; notes: string | null; created_at: string | null; }

const AdminFinancialCenterTab = () => {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPaidOut, setTotalPaidOut] = useState(0);

  /* forms */
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: "", method: "bank_transfer", bank_name: "", iban: "", note: "" });
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundForm, setRefundForm] = useState({ customer_name: "", amount: "", reason: "", method: "bank_transfer", iban: "" });
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ supplier_name: "", amount: "", method: "bank_transfer", invoice_ref: "", iban: "", notes: "" });

  const fetchAll = async () => {
    setLoading(true);
    const [pRes, rRes, sRes, oRes] = await Promise.all([
      supabase.from("payouts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("refunds").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("supplier_payments").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("orders").select("total_amount, status"),
    ]);
    const p = (pRes.data || []) as Payout[];
    const r = (rRes.data || []) as Refund[];
    const s = (sRes.data || []) as SupplierPayment[];
    const orders = oRes.data || [];
    setPayouts(p);
    setRefunds(r);
    setSupplierPayments(s);
    setTotalRevenue(orders.reduce((sum, o: any) => sum + (Number(o.total_amount) || 0), 0));
    setTotalPaidOut(p.filter(x => x.status === "completed").reduce((sum, x) => sum + (Number(x.net_amount) || 0), 0));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  /* ─── actions ─── */
  const submitPayout = async () => {
    const amt = Number(payoutForm.amount);
    if (!amt || amt <= 0) return toast({ title: "Adj meg érvényes összeget", variant: "destructive" });
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return toast({ title: "Be kell jelentkezned", variant: "destructive" });
    const insertData: any = {
      user_id: userId,
      amount: amt,
      fee: 0,
      net_amount: amt,
      currency: "HUF",
      status: "pending",
      payment_method: payoutForm.method as any,
      payment_details: { bank_name: payoutForm.bank_name, iban: payoutForm.iban, note: payoutForm.note },
    };
    const { error } = await supabase.from("payouts").insert(insertData);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Kifizetés igényelve ✓" });
    setShowPayoutForm(false);
    setPayoutForm({ amount: "", method: "bank_transfer", bank_name: "", iban: "", note: "" });
    fetchAll();
  };

  const submitRefund = async () => {
    const amt = Number(refundForm.amount);
    if (!amt || !refundForm.customer_name.trim()) return toast({ title: "Töltsd ki az összes mezőt", variant: "destructive" });
    const { error } = await supabase.from("refunds").insert({
      customer_name: refundForm.customer_name,
      amount: amt,
      reason: refundForm.reason || null,
      method: refundForm.method,
      bank_details: refundForm.iban ? { iban: refundForm.iban } : null,
    });
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Visszatérítés rögzítve ✓" });
    setShowRefundForm(false);
    setRefundForm({ customer_name: "", amount: "", reason: "", method: "bank_transfer", iban: "" });
    fetchAll();
  };

  const submitSupplierPayment = async () => {
    const amt = Number(supplierForm.amount);
    if (!amt || !supplierForm.supplier_name.trim()) return toast({ title: "Töltsd ki az összes mezőt", variant: "destructive" });
    const { error } = await supabase.from("supplier_payments").insert({
      supplier_name: supplierForm.supplier_name,
      amount: amt,
      method: supplierForm.method,
      invoice_ref: supplierForm.invoice_ref || null,
      bank_details: supplierForm.iban ? { iban: supplierForm.iban } : null,
      notes: supplierForm.notes || null,
    });
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Szállítói kifizetés rögzítve ✓" });
    setShowSupplierForm(false);
    setSupplierForm({ supplier_name: "", amount: "", method: "bank_transfer", invoice_ref: "", iban: "", notes: "" });
    fetchAll();
  };

  if (loading) return <div className="flex items-center gap-2 p-8 text-muted-foreground"><RefreshCw className="w-4 h-4 animate-spin" /> Betöltés...</div>;

  const balance = totalRevenue - totalPaidOut;
  const totalRefunded = refunds.filter(r => r.status === "completed").reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalSupplierPaid = supplierPayments.filter(s => s.status === "completed").reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-lg tracking-tight">Pénzügyi Központ</h2>
          <p className="text-xs text-muted-foreground">Bevétel kifizetés · Szállítói fizetés · Visszatérítések</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Összbevétel", value: fmt(totalRevenue), icon: TrendingUp, accent: "text-green-400" },
          { label: "Kifizetve", value: fmt(totalPaidOut), icon: ArrowUpRight, accent: "text-primary" },
          { label: "Egyenleg", value: fmt(balance), icon: Banknote, accent: "text-blue-400" },
          { label: "Visszatérítve", value: fmt(totalRefunded), icon: ArrowDownLeft, accent: "text-red-400" },
        ].map(kpi => (
          <div key={kpi.label} className="border border-border/50 bg-card/50 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={`w-3.5 h-3.5 ${kpi.accent}`} />
            </div>
            <p className="text-lg font-bold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="overview" className="text-xs gap-1"><Banknote className="w-3 h-3" /> Bevétel</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs gap-1"><Building2 className="w-3 h-3" /> Szállítók</TabsTrigger>
          <TabsTrigger value="refunds" className="text-xs gap-1"><ArrowDownLeft className="w-3 h-3" /> Visszatérítés</TabsTrigger>
        </TabsList>

        {/* ═══════ BEVÉTEL KIFIZETÉS ═══════ */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Bevételed kifizetése bankszámlára</p>
            <Button size="sm" onClick={() => setShowPayoutForm(!showPayoutForm)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Új kifizetés</Button>
          </div>

          {showPayoutForm && (
            <div className="border border-primary/20 bg-primary/5 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Kifizetés igénylése</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Összeg (Ft)" type="number" value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} />
                <Select value={payoutForm.method} onValueChange={v => setPayoutForm({...payoutForm, method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer"><Building2 className="w-3 h-3 inline mr-1" />Banki átutalás</SelectItem>
                    <SelectItem value="card"><CreditCard className="w-3 h-3 inline mr-1" />Bankkártya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Bank neve" value={payoutForm.bank_name} onChange={e => setPayoutForm({...payoutForm, bank_name: e.target.value})} />
              <Input placeholder="IBAN / Számlaszám" value={payoutForm.iban} onChange={e => setPayoutForm({...payoutForm, iban: e.target.value})} />
              <Input placeholder="Megjegyzés (opcionális)" value={payoutForm.note} onChange={e => setPayoutForm({...payoutForm, note: e.target.value})} />
              <div className="flex gap-2">
                <Button onClick={submitPayout} className="gap-1"><Save className="w-3.5 h-3.5" /> Igénylés</Button>
                <Button variant="outline" onClick={() => setShowPayoutForm(false)}>Mégse</Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dátum</TableHead>
                <TableHead>Összeg</TableHead>
                <TableHead>Mód</TableHead>
                <TableHead>Státusz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">Még nincsenek kifizetések.</TableCell></TableRow>
              ) : payouts.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{shortDate(p.created_at)}</TableCell>
                  <TableCell className="font-semibold">{fmt(p.net_amount)}</TableCell>
                  <TableCell className="text-xs">{p.payment_method === "card" ? "💳 Kártya" : "🏦 Átutalás"}</TableCell>
                  <TableCell>{statusBadge(p.status || "pending")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ═══════ SZÁLLÍTÓ KIFIZETÉS ═══════ */}
        <TabsContent value="suppliers" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Szállítók kifizetése</p>
            <Button size="sm" onClick={() => setShowSupplierForm(!showSupplierForm)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Új fizetés</Button>
          </div>

          {showSupplierForm && (
            <div className="border border-primary/20 bg-primary/5 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Szállítói kifizetés</h3>
              <Input placeholder="Szállító neve" value={supplierForm.supplier_name} onChange={e => setSupplierForm({...supplierForm, supplier_name: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Összeg (Ft)" type="number" value={supplierForm.amount} onChange={e => setSupplierForm({...supplierForm, amount: e.target.value})} />
                <Select value={supplierForm.method} onValueChange={v => setSupplierForm({...supplierForm, method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">🏦 Átutalás</SelectItem>
                    <SelectItem value="card">💳 Kártya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="IBAN / Számlaszám" value={supplierForm.iban} onChange={e => setSupplierForm({...supplierForm, iban: e.target.value})} />
              <Input placeholder="Számla hivatkozás (opcionális)" value={supplierForm.invoice_ref} onChange={e => setSupplierForm({...supplierForm, invoice_ref: e.target.value})} />
              <Textarea placeholder="Megjegyzés" value={supplierForm.notes} onChange={e => setSupplierForm({...supplierForm, notes: e.target.value})} />
              <div className="flex gap-2">
                <Button onClick={submitSupplierPayment} className="gap-1"><Save className="w-3.5 h-3.5" /> Rögzítés</Button>
                <Button variant="outline" onClick={() => setShowSupplierForm(false)}>Mégse</Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dátum</TableHead>
                <TableHead>Szállító</TableHead>
                <TableHead>Összeg</TableHead>
                <TableHead>Mód</TableHead>
                <TableHead>Státusz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierPayments.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">Még nincsenek szállítói kifizetések.</TableCell></TableRow>
              ) : supplierPayments.map(sp => (
                <TableRow key={sp.id}>
                  <TableCell className="text-xs">{shortDate(sp.created_at)}</TableCell>
                  <TableCell className="font-medium">{sp.supplier_name}</TableCell>
                  <TableCell className="font-semibold">{fmt(sp.amount)}</TableCell>
                  <TableCell className="text-xs">{sp.method === "card" ? "💳 Kártya" : "🏦 Átutalás"}</TableCell>
                  <TableCell>{statusBadge(sp.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ═══════ VISSZATÉRÍTÉS ═══════ */}
        <TabsContent value="refunds" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Visszatérítés vásárlóknak</p>
            <Button size="sm" onClick={() => setShowRefundForm(!showRefundForm)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Új visszatérítés</Button>
          </div>

          {showRefundForm && (
            <div className="border border-primary/20 bg-primary/5 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Visszatérítés rögzítése</h3>
              <Input placeholder="Vásárló neve" value={refundForm.customer_name} onChange={e => setRefundForm({...refundForm, customer_name: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Összeg (Ft)" type="number" value={refundForm.amount} onChange={e => setRefundForm({...refundForm, amount: e.target.value})} />
                <Select value={refundForm.method} onValueChange={v => setRefundForm({...refundForm, method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">🏦 Átutalás</SelectItem>
                    <SelectItem value="card">💳 Kártyára vissza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="IBAN / Számlaszám (átutaláshoz)" value={refundForm.iban} onChange={e => setRefundForm({...refundForm, iban: e.target.value})} />
              <Textarea placeholder="Visszatérítés oka" value={refundForm.reason} onChange={e => setRefundForm({...refundForm, reason: e.target.value})} />
              <div className="flex gap-2">
                <Button onClick={submitRefund} className="gap-1"><Save className="w-3.5 h-3.5" /> Rögzítés</Button>
                <Button variant="outline" onClick={() => setShowRefundForm(false)}>Mégse</Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dátum</TableHead>
                <TableHead>Vásárló</TableHead>
                <TableHead>Összeg</TableHead>
                <TableHead>Mód</TableHead>
                <TableHead>Státusz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">Még nincsenek visszatérítések.</TableCell></TableRow>
              ) : refunds.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{shortDate(r.created_at)}</TableCell>
                  <TableCell className="font-medium">{r.customer_name}</TableCell>
                  <TableCell className="font-semibold">{fmt(r.amount)}</TableCell>
                  <TableCell className="text-xs">{r.method === "card" ? "💳 Kártyára" : "🏦 Átutalás"}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminFinancialCenterTab;

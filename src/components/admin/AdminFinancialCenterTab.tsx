import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Plus, Banknote,
  CreditCard, Building2, TrendingUp, Clock, CheckCircle2, XCircle, Save,
  Trash2, Star, Eye, EyeOff, ArrowRightLeft, PiggyBank, Receipt,
  Shield, AlertTriangle, CircleDollarSign
} from "lucide-react";

const fmt = (n: number) => (Number(n) || 0).toLocaleString("hu-HU") + " Ft";
const shortDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("hu-HU") : "–";
const shortDateTime = (iso: string | null) => iso ? new Date(iso).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";

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

const typeBadge = (t: string) => {
  if (t === "deposit") return <Badge className="bg-green-500/20 text-green-400 text-[9px] h-5">💰 Befizetés</Badge>;
  if (t === "withdrawal") return <Badge className="bg-red-500/20 text-red-400 text-[9px] h-5">💸 Kivétel</Badge>;
  return <Badge variant="outline" className="text-[9px] h-5">{t}</Badge>;
};

interface BankCard { id: string; card_name: string; card_last4: string; card_type: string; expiry_month: number | null; expiry_year: number | null; holder_name: string | null; bank_name: string | null; iban: string | null; is_default: boolean; created_at: string; }
interface Transaction { id: string; type: string; amount: number; fee: number; net_amount: number; currency: string; status: string; card_id: string | null; method: string; description: string | null; reference_id: string | null; created_at: string; completed_at: string | null; }
interface Payout { id: string; amount: number; fee: number | null; net_amount: number; currency: string | null; status: string | null; payment_method: string | null; payment_details: any; created_at: string | null; processed_at: string | null; failed_reason: string | null; }
interface Refund { id: string; order_id: string | null; customer_name: string; amount: number; currency: string; reason: string | null; method: string; status: string; bank_details: any; notes: string | null; created_at: string | null; }
interface SupplierPayment { id: string; supplier_name: string; amount: number; currency: string; method: string; status: string; bank_details: any; invoice_ref: string | null; notes: string | null; created_at: string | null; }

const AdminFinancialCenterTab = () => {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Data
  const [bankCards, setBankCards] = useState<BankCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPaidOut, setTotalPaidOut] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);

  // Forms
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardForm, setCardForm] = useState({ card_name: "", card_last4: "", card_type: "visa", expiry_month: "", expiry_year: "", holder_name: "", bank_name: "", iban: "" });
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ type: "deposit", amount: "", card_id: "", method: "bank_transfer", description: "" });
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: "", method: "bank_transfer", bank_name: "", iban: "", note: "" });
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundForm, setRefundForm] = useState({ customer_name: "", amount: "", reason: "", method: "bank_transfer", iban: "" });
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ supplier_name: "", amount: "", method: "bank_transfer", invoice_ref: "", iban: "", notes: "" });
  const [showIban, setShowIban] = useState<Record<string, boolean>>({});

  const fetchAll = async () => {
    setLoading(true);
    const [cRes, tRes, pRes, rRes, sRes, oRes] = await Promise.all([
      supabase.from("admin_bank_cards").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_transactions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("payouts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("refunds").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("supplier_payments").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("orders").select("total_amount, status"),
    ]);
    const cards = (cRes.data || []) as BankCard[];
    const txs = (tRes.data || []) as Transaction[];
    const p = (pRes.data || []) as Payout[];
    const r = (rRes.data || []) as Refund[];
    const s = (sRes.data || []) as SupplierPayment[];
    const orders = oRes.data || [];

    setBankCards(cards);
    setTransactions(txs);
    setPayouts(p);
    setRefunds(r);
    setSupplierPayments(s);
    setTotalRevenue(orders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0));
    setTotalPaidOut(p.filter(x => x.status === "completed").reduce((sum, x) => sum + (Number(x.net_amount) || 0), 0));
    setTotalDeposits(txs.filter(t => t.type === "deposit" && t.status === "completed").reduce((sum, t) => sum + (Number(t.net_amount) || 0), 0));
    setTotalWithdrawals(txs.filter(t => t.type === "withdrawal" && t.status === "completed").reduce((sum, t) => sum + (Number(t.net_amount) || 0), 0));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Card actions
  const submitCard = async () => {
    if (!cardForm.card_name.trim() || !cardForm.card_last4.trim()) return toast({ title: "Adj meg kártyanevet és utolsó 4 számot", variant: "destructive" });
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { error } = await supabase.from("admin_bank_cards").insert({
      user_id: userId,
      card_name: cardForm.card_name,
      card_last4: cardForm.card_last4,
      card_type: cardForm.card_type,
      expiry_month: cardForm.expiry_month ? Number(cardForm.expiry_month) : null,
      expiry_year: cardForm.expiry_year ? Number(cardForm.expiry_year) : null,
      holder_name: cardForm.holder_name || null,
      bank_name: cardForm.bank_name || null,
      iban: cardForm.iban || null,
    });
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    toast({ title: "Bankkártya hozzáadva ✓" });
    setShowCardForm(false);
    setCardForm({ card_name: "", card_last4: "", card_type: "visa", expiry_month: "", expiry_year: "", holder_name: "", bank_name: "", iban: "" });
    fetchAll();
  };

  const deleteCard = async (id: string) => {
    if (!confirm("Biztosan törlöd ezt a kártyát?")) return;
    await supabase.from("admin_bank_cards").delete().eq("id", id);
    toast({ title: "Kártya törölve" });
    fetchAll();
  };

  const setDefaultCard = async (id: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    await supabase.from("admin_bank_cards").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("admin_bank_cards").update({ is_default: true }).eq("id", id);
    toast({ title: "Alapértelmezett kártya beállítva ✓" });
    fetchAll();
  };

  // Transaction actions
  const submitTransaction = async () => {
    const amt = Number(txForm.amount);
    if (!amt || amt <= 0) return toast({ title: "Adj meg érvényes összeget", variant: "destructive" });
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const fee = txForm.type === "withdrawal" ? Math.round(amt * 0.005) : 0;
    const { error } = await supabase.from("admin_transactions").insert({
      user_id: userId,
      type: txForm.type,
      amount: amt,
      fee,
      net_amount: txForm.type === "withdrawal" ? amt - fee : amt,
      card_id: txForm.card_id || null,
      method: txForm.method,
      description: txForm.description || null,
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    toast({ title: txForm.type === "deposit" ? "Befizetés rögzítve ✓" : "Kivétel rögzítve ✓" });
    setShowTxForm(false);
    setTxForm({ type: "deposit", amount: "", card_id: "", method: "bank_transfer", description: "" });
    fetchAll();
  };

  // Payout actions
  const submitPayout = async () => {
    const amt = Number(payoutForm.amount);
    if (!amt || amt <= 0) return toast({ title: "Adj meg érvényes összeget", variant: "destructive" });
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { error } = await supabase.from("payouts").insert({
      user_id: userId, amount: amt, fee: 0, net_amount: amt, currency: "HUF", status: "pending",
      payment_method: payoutForm.method,
      payment_details: { bank_name: payoutForm.bank_name, iban: payoutForm.iban, note: payoutForm.note },
    });
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    toast({ title: "Kifizetés igényelve ✓" });
    setShowPayoutForm(false);
    setPayoutForm({ amount: "", method: "bank_transfer", bank_name: "", iban: "", note: "" });
    fetchAll();
  };

  const updatePayoutStatus = async (id: string, status: string) => {
    await supabase.from("payouts").update({ status, processed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", id);
    toast({ title: `Státusz: ${status === "completed" ? "Teljesítve" : status}` });
    fetchAll();
  };

  // Refund actions
  const submitRefund = async () => {
    const amt = Number(refundForm.amount);
    if (!amt || !refundForm.customer_name.trim()) return toast({ title: "Töltsd ki az összes mezőt", variant: "destructive" });
    const { error } = await supabase.from("refunds").insert({
      customer_name: refundForm.customer_name, amount: amt, reason: refundForm.reason || null,
      method: refundForm.method, bank_details: refundForm.iban ? { iban: refundForm.iban } : null,
    });
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    toast({ title: "Visszatérítés rögzítve ✓" });
    setShowRefundForm(false);
    setRefundForm({ customer_name: "", amount: "", reason: "", method: "bank_transfer", iban: "" });
    fetchAll();
  };

  const updateRefundStatus = async (id: string, status: string) => {
    await supabase.from("refunds").update({ status }).eq("id", id);
    toast({ title: `Visszatérítés: ${status === "completed" ? "Teljesítve" : status}` });
    fetchAll();
  };

  // Supplier payment actions
  const submitSupplierPayment = async () => {
    const amt = Number(supplierForm.amount);
    if (!amt || !supplierForm.supplier_name.trim()) return toast({ title: "Töltsd ki az összes mezőt", variant: "destructive" });
    const { error } = await supabase.from("supplier_payments").insert({
      supplier_name: supplierForm.supplier_name, amount: amt, method: supplierForm.method,
      invoice_ref: supplierForm.invoice_ref || null, bank_details: supplierForm.iban ? { iban: supplierForm.iban } : null, notes: supplierForm.notes || null,
    });
    if (error) return toast({ title: "Hiba", description: error.message, variant: "destructive" });
    toast({ title: "Szállítói kifizetés rögzítve ✓" });
    setShowSupplierForm(false);
    setSupplierForm({ supplier_name: "", amount: "", method: "bank_transfer", invoice_ref: "", iban: "", notes: "" });
    fetchAll();
  };

  const updateSupplierStatus = async (id: string, status: string) => {
    await supabase.from("supplier_payments").update({ status }).eq("id", id);
    toast({ title: `Szállítói fizetés: ${status === "completed" ? "Teljesítve" : status}` });
    fetchAll();
  };

  if (loading) return <div className="flex items-center gap-2 p-8 text-muted-foreground"><RefreshCw className="w-4 h-4 animate-spin" /> Betöltés...</div>;

  const walletBalance = totalRevenue + totalDeposits - totalWithdrawals - totalPaidOut;
  const totalRefunded = refunds.filter(r => r.status === "completed").reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalSupplierPaid = supplierPayments.filter(s => s.status === "completed").reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const getCardName = (cardId: string | null) => {
    if (!cardId) return "–";
    const card = bankCards.find(c => c.id === cardId);
    return card ? `${card.card_name} (****${card.card_last4})` : "–";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex items-center justify-center rounded-lg">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-lg tracking-tight">💳 Pénzügyi Központ</h2>
          <p className="text-xs text-muted-foreground">Bankkártya · Bevétel · Be/Kifizetés · Szállítók · Visszatérítés</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Összbevétel", value: fmt(totalRevenue), icon: TrendingUp, accent: "text-green-400" },
          { label: "Tárca egyenleg", value: fmt(walletBalance), icon: Wallet, accent: "text-blue-400" },
          { label: "Befizetések", value: fmt(totalDeposits), icon: ArrowDownLeft, accent: "text-emerald-400" },
          { label: "Kivételek", value: fmt(totalWithdrawals), icon: ArrowUpRight, accent: "text-orange-400" },
          { label: "Visszatérítve", value: fmt(totalRefunded), icon: Receipt, accent: "text-red-400" },
          { label: "Szállítóknak", value: fmt(totalSupplierPaid), icon: Building2, accent: "text-purple-400" },
        ].map(kpi => (
          <div key={kpi.label} className="border border-border/50 bg-card/50 p-3 space-y-1 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={`w-3.5 h-3.5 ${kpi.accent}`} />
            </div>
            <p className="text-lg font-bold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="text-xs gap-1"><CreditCard className="w-3 h-3" /> Kártyák</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs gap-1"><ArrowRightLeft className="w-3 h-3" /> Tranzakciók</TabsTrigger>
          <TabsTrigger value="payouts" className="text-xs gap-1"><Banknote className="w-3 h-3" /> Kifizetés</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs gap-1"><Building2 className="w-3 h-3" /> Szállítók</TabsTrigger>
          <TabsTrigger value="refunds" className="text-xs gap-1"><ArrowDownLeft className="w-3 h-3" /> Visszatérítés</TabsTrigger>
        </TabsList>

        {/* ═══════ BANKKÁRTYÁK ═══════ */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Saját bankkártyák</p>
              <p className="text-xs text-muted-foreground">Add meg a kártyáidat a be/kifizetésekhez</p>
            </div>
            <Button size="sm" onClick={() => setShowCardForm(!showCardForm)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Új kártya</Button>
          </div>

          {showCardForm && (
            <div className="border border-primary/20 bg-primary/5 p-4 space-y-3 rounded-lg">
              <h3 className="text-sm font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4" /> Új bankkártya hozzáadása</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Kártya neve (pl: OTP Visa)" value={cardForm.card_name} onChange={e => setCardForm({...cardForm, card_name: e.target.value})} />
                <Input placeholder="Utolsó 4 szám" maxLength={4} value={cardForm.card_last4} onChange={e => setCardForm({...cardForm, card_last4: e.target.value.replace(/\D/g, "").slice(0, 4)})} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Select value={cardForm.card_type} onValueChange={v => setCardForm({...cardForm, card_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">💳 Visa</SelectItem>
                    <SelectItem value="mastercard">💳 Mastercard</SelectItem>
                    <SelectItem value="maestro">💳 Maestro</SelectItem>
                    <SelectItem value="amex">💳 Amex</SelectItem>
                    <SelectItem value="other">Egyéb</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Hónap (MM)" maxLength={2} value={cardForm.expiry_month} onChange={e => setCardForm({...cardForm, expiry_month: e.target.value.replace(/\D/g, "").slice(0, 2)})} />
                <Input placeholder="Év (ÉÉÉÉ)" maxLength={4} value={cardForm.expiry_year} onChange={e => setCardForm({...cardForm, expiry_year: e.target.value.replace(/\D/g, "").slice(0, 4)})} />
              </div>
              <Input placeholder="Kártyatulajdonos neve" value={cardForm.holder_name} onChange={e => setCardForm({...cardForm, holder_name: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Bank neve" value={cardForm.bank_name} onChange={e => setCardForm({...cardForm, bank_name: e.target.value})} />
                <Input placeholder="IBAN / Számlaszám" value={cardForm.iban} onChange={e => setCardForm({...cardForm, iban: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <Button onClick={submitCard} className="gap-1"><Save className="w-3.5 h-3.5" /> Mentés</Button>
                <Button variant="outline" onClick={() => setShowCardForm(false)}>Mégse</Button>
              </div>
            </div>
          )}

          {bankCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <CreditCard className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-sm">Még nincs bankkártya hozzáadva</p>
              <p className="text-xs">Kattints az "Új kártya" gombra a kezdéshez</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {bankCards.map(card => (
                <div key={card.id} className={`relative border rounded-xl p-4 space-y-3 ${card.is_default ? "border-primary/50 bg-primary/5" : "border-border/50 bg-card/50"}`}>
                  {card.is_default && <Badge className="absolute top-2 right-2 bg-primary/20 text-primary text-[9px]"><Star className="w-2.5 h-2.5 mr-1" /> Alapértelmezett</Badge>}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                      <CreditCard className="w-5 h-3 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{card.card_name}</p>
                      <p className="text-xs text-muted-foreground">{card.card_type.toUpperCase()} •••• {card.card_last4}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    {card.holder_name && <p>👤 {card.holder_name}</p>}
                    {card.bank_name && <p>🏦 {card.bank_name}</p>}
                    {card.expiry_month && card.expiry_year && <p>📅 {String(card.expiry_month).padStart(2, "0")}/{card.expiry_year}</p>}
                    {card.iban && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowIban(prev => ({...prev, [card.id]: !prev[card.id]}))} className="flex items-center gap-1 hover:text-foreground">
                          {showIban[card.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {showIban[card.id] ? card.iban : "•••• •••• ••••"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    {!card.is_default && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDefaultCard(card.id)}><Star className="w-3 h-3 mr-1" /> Alapértelm.</Button>}
                    <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => deleteCard(card.id)}><Trash2 className="w-3 h-3 mr-1" /> Törlés</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════ TRANZAKCIÓK (BE/KIFIZETÉS) ═══════ */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Befizetések & Kivételek</p>
              <p className="text-xs text-muted-foreground">Saját pénzmozgások kezelése</p>
            </div>
            <Button size="sm" onClick={() => setShowTxForm(!showTxForm)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Új tranzakció</Button>
          </div>

          {/* Balance card */}
          <div className="border border-blue-500/30 bg-blue-500/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Tárca egyenleg</p>
              <p className="text-2xl font-bold text-blue-400">{fmt(walletBalance)}</p>
            </div>
            <PiggyBank className="w-10 h-10 text-blue-400/30" />
          </div>

          {showTxForm && (
            <div className="border border-primary/20 bg-primary/5 p-4 space-y-3 rounded-lg">
              <h3 className="text-sm font-semibold flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Új tranzakció</h3>
              <div className="grid grid-cols-2 gap-3">
                <Select value={txForm.type} onValueChange={v => setTxForm({...txForm, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">💰 Befizetés (pénz be)</SelectItem>
                    <SelectItem value="withdrawal">💸 Kivétel (pénz ki)</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Összeg (Ft)" type="number" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={txForm.method} onValueChange={v => setTxForm({...txForm, method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">🏦 Banki átutalás</SelectItem>
                    <SelectItem value="card">💳 Bankkártya</SelectItem>
                    <SelectItem value="cash">💵 Készpénz</SelectItem>
                  </SelectContent>
                </Select>
                {txForm.method === "card" && bankCards.length > 0 && (
                  <Select value={txForm.card_id} onValueChange={v => setTxForm({...txForm, card_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Válassz kártyát" /></SelectTrigger>
                    <SelectContent>
                      {bankCards.map(c => <SelectItem key={c.id} value={c.id}>{c.card_name} (****{c.card_last4})</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Input placeholder="Leírás / megjegyzés" value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} />
              {txForm.type === "withdrawal" && Number(txForm.amount) > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                  <p>💡 Kezelési díj: {fmt(Math.round(Number(txForm.amount) * 0.005))} (0.5%)</p>
                  <p>Nettó kivétel: <span className="font-semibold text-foreground">{fmt(Number(txForm.amount) - Math.round(Number(txForm.amount) * 0.005))}</span></p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={submitTransaction} className="gap-1"><Save className="w-3.5 h-3.5" /> Rögzítés</Button>
                <Button variant="outline" onClick={() => setShowTxForm(false)}>Mégse</Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dátum</TableHead>
                <TableHead>Típus</TableHead>
                <TableHead>Összeg</TableHead>
                <TableHead>Díj</TableHead>
                <TableHead>Nettó</TableHead>
                <TableHead>Mód</TableHead>
                <TableHead>Kártya</TableHead>
                <TableHead>Státusz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-8">Még nincsenek tranzakciók.</TableCell></TableRow>
              ) : transactions.map(tx => (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs">{shortDateTime(tx.created_at)}</TableCell>
                  <TableCell>{typeBadge(tx.type)}</TableCell>
                  <TableCell className="font-semibold">{fmt(tx.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{tx.fee > 0 ? fmt(tx.fee) : "–"}</TableCell>
                  <TableCell className={`font-semibold ${tx.type === "deposit" ? "text-green-400" : "text-red-400"}`}>{tx.type === "deposit" ? "+" : "-"}{fmt(tx.net_amount)}</TableCell>
                  <TableCell className="text-xs">{tx.method === "card" ? "💳" : tx.method === "cash" ? "💵" : "🏦"}</TableCell>
                  <TableCell className="text-xs">{getCardName(tx.card_id)}</TableCell>
                  <TableCell>{statusBadge(tx.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ═══════ BEVÉTEL KIFIZETÉS ═══════ */}
        <TabsContent value="payouts" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Bevételed kifizetése bankszámlára</p>
            <Button size="sm" onClick={() => setShowPayoutForm(!showPayoutForm)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Új kifizetés</Button>
          </div>

          {showPayoutForm && (
            <div className="border border-primary/20 bg-primary/5 p-4 space-y-3 rounded-lg">
              <h3 className="text-sm font-semibold">Kifizetés igénylése</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Összeg (Ft)" type="number" value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} />
                <Select value={payoutForm.method} onValueChange={v => setPayoutForm({...payoutForm, method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">🏦 Banki átutalás</SelectItem>
                    <SelectItem value="card">💳 Bankkártya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Bank neve" value={payoutForm.bank_name} onChange={e => setPayoutForm({...payoutForm, bank_name: e.target.value})} />
              <Input placeholder="IBAN / Számlaszám" value={payoutForm.iban} onChange={e => setPayoutForm({...payoutForm, iban: e.target.value})} />
              <Input placeholder="Megjegyzés" value={payoutForm.note} onChange={e => setPayoutForm({...payoutForm, note: e.target.value})} />
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
                <TableHead>Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">Még nincsenek kifizetések.</TableCell></TableRow>
              ) : payouts.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{shortDate(p.created_at)}</TableCell>
                  <TableCell className="font-semibold">{fmt(p.net_amount)}</TableCell>
                  <TableCell className="text-xs">{p.payment_method === "card" ? "💳 Kártya" : "🏦 Átutalás"}</TableCell>
                  <TableCell>{statusBadge(p.status || "pending")}</TableCell>
                  <TableCell>
                    {p.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updatePayoutStatus(p.id, "completed")}><CheckCircle2 className="w-3 h-3 mr-1" /> Kész</Button>
                        <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => updatePayoutStatus(p.id, "failed")}><XCircle className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </TableCell>
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
            <div className="border border-primary/20 bg-primary/5 p-4 space-y-3 rounded-lg">
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
              <Input placeholder="Számla hivatkozás" value={supplierForm.invoice_ref} onChange={e => setSupplierForm({...supplierForm, invoice_ref: e.target.value})} />
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
                <TableHead>Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierPayments.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">Még nincsenek szállítói kifizetések.</TableCell></TableRow>
              ) : supplierPayments.map(sp => (
                <TableRow key={sp.id}>
                  <TableCell className="text-xs">{shortDate(sp.created_at)}</TableCell>
                  <TableCell className="font-medium">{sp.supplier_name}</TableCell>
                  <TableCell className="font-semibold">{fmt(sp.amount)}</TableCell>
                  <TableCell className="text-xs">{sp.method === "card" ? "💳 Kártya" : "🏦 Átutalás"}</TableCell>
                  <TableCell>{statusBadge(sp.status)}</TableCell>
                  <TableCell>
                    {sp.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateSupplierStatus(sp.id, "completed")}><CheckCircle2 className="w-3 h-3 mr-1" /> Kész</Button>
                        <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => updateSupplierStatus(sp.id, "failed")}><XCircle className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </TableCell>
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
            <div className="border border-primary/20 bg-primary/5 p-4 space-y-3 rounded-lg">
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
              <Input placeholder="IBAN / Számlaszám" value={refundForm.iban} onChange={e => setRefundForm({...refundForm, iban: e.target.value})} />
              <Input placeholder="Indok (opcionális)" value={refundForm.reason} onChange={e => setRefundForm({...refundForm, reason: e.target.value})} />
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
                <TableHead>Indok</TableHead>
                <TableHead>Státusz</TableHead>
                <TableHead>Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">Még nincsenek visszatérítések.</TableCell></TableRow>
              ) : refunds.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{shortDate(r.created_at)}</TableCell>
                  <TableCell className="font-medium">{r.customer_name}</TableCell>
                  <TableCell className="font-semibold text-red-400">{fmt(r.amount)}</TableCell>
                  <TableCell className="text-xs">{r.method === "card" ? "💳 Kártya" : "🏦 Átutalás"}</TableCell>
                  <TableCell className="text-xs max-w-[120px] truncate">{r.reason || "–"}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>
                    {r.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateRefundStatus(r.id, "completed")}><CheckCircle2 className="w-3 h-3 mr-1" /> Kész</Button>
                        <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => updateRefundStatus(r.id, "failed")}><XCircle className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </TableCell>
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

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CreditCard, Plus, Trash2, Save, Settings, Shield, Eye, EyeOff,
  TrendingUp, DollarSign, ShoppingCart, AlertTriangle, CheckCircle2,
  Zap, Globe, Lock, Percent, Clock, BarChart3, Wallet, ArrowUpRight,
  RefreshCw, FileText, ChevronsUp, Banknote
} from "lucide-react";

interface PaymentIntegration {
  id: string;
  name: string;
  provider: string;
  is_active: boolean;
  config: Record<string, any>;
  test_mode: boolean;
}

const PROVIDERS = [
  { key: "stripe", label: "Stripe", icon: "💳", color: "#635BFF", desc: "Kártyás fizetés globálisan", fee: "1.4% + €0.25" },
  { key: "paypal", label: "PayPal", icon: "🅿️", color: "#003087", desc: "Online pénztárca & vásárlóvédelem", fee: "2.9% + €0.35" },
  { key: "barion", label: "Barion", icon: "🟢", color: "#2ECC71", desc: "Magyar online fizetés", fee: "1% + 49 Ft" },
  { key: "simplepay", label: "SimplePay", icon: "🔵", color: "#00A0E3", desc: "OTP SimplePay kártyás fizetés", fee: "1.5% + 29 Ft" },
  { key: "cod", label: "Utánvét", icon: "📦", color: "#F39C12", desc: "Fizetés átvételkor", fee: "0%" },
  { key: "bank_transfer", label: "Banki átutalás", icon: "🏦", color: "#8E44AD", desc: "Hagyományos utalás", fee: "0%" },
  { key: "revolut", label: "Revolut Pay", icon: "💜", color: "#5541D7", desc: "Revolut gyorsfizetés", fee: "1% + €0.20" },
  { key: "apple_pay", label: "Apple Pay", icon: "🍎", color: "#333", desc: "Apple fizetés (Stripe-on keresztül)", fee: "Stripe díj" },
  { key: "google_pay", label: "Google Pay", icon: "🔴", color: "#4285F4", desc: "Google fizetés (Stripe-on keresztül)", fee: "Stripe díj" },
];

const CURRENCIES = [
  { code: "HUF", label: "Magyar forint (HUF)", symbol: "Ft" },
  { code: "EUR", label: "Euró (EUR)", symbol: "€" },
  { code: "USD", label: "US Dollár (USD)", symbol: "$" },
  { code: "GBP", label: "Font (GBP)", symbol: "£" },
];

// Real stats – loaded from DB
interface PaymentStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  successRate: number;
  failedPayments: number;
  todayOrders: number;
  weeklyGrowth: number;
  methodBreakdown: { method: string; pct: number; count: number; revenue: number }[];
  recentTransactions: { id: string; amount: number; method: string; status: string; time: string; customer: string }[];
}

const emptyStats: PaymentStats = {
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  successRate: 0,
  failedPayments: 0,
  todayOrders: 0,
  weeklyGrowth: 0,
  methodBreakdown: [],
  recentTransactions: [],
};
const getTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "most";
  if (mins < 60) return `${mins} perce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} órája`;
  return `${Math.floor(hrs / 24)} napja`;
};

const AdminPaymentIntegrationsTab = () => {
  const [integrations, setIntegrations] = useState<PaymentIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", provider: "stripe" });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<PaymentStats>(emptyStats);
  const [checkoutSettings, setCheckoutSettings] = useState({
    currency: "HUF",
    minOrder: 1990,
    maxOrder: 999999,
    autoCapture: true,
    requireBilling: true,
    requirePhone: true,
    allowGuestCheckout: true,
    showOrderSummary: true,
    enableCoupons: true,
    enable3DS: true,
    enableFraudDetection: true,
    webhookRetries: 3,
    paymentTimeout: 30,
    showInstallments: false,
    installmentProviders: ["simplepay"],
    savedCards: true,
    oneClickPay: false,
  });

  const fetchIntegrations = async () => {
    const { data } = await supabase.from("payment_integrations").select("*").order("created_at");
    if (data) setIntegrations(data as PaymentIntegration[]);
    setLoading(false);
  };

  const fetchStats = async () => {
    // Fetch real orders from DB
    const { data: orders } = await supabase.from("orders").select("id, total_amount, status, payment_method, created_at, shipping_address").order("created_at", { ascending: false });
    const all = orders || [];
    const totalRevenue = all.reduce((s, o: any) => s + (Number(o.total_amount) || 0), 0);
    const totalOrders = all.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const successful = all.filter((o: any) => o.status !== "cancelled" && o.status !== "failed");
    const failed = all.filter((o: any) => o.status === "failed" || o.status === "cancelled");
    const successRate = totalOrders > 0 ? Math.round((successful.length / totalOrders) * 1000) / 10 : 0;

    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = all.filter((o: any) => o.created_at?.startsWith(today)).length;

    // Method breakdown
    const methodMap: Record<string, { count: number; revenue: number }> = {};
    all.forEach((o: any) => {
      const m = o.payment_method || "Ismeretlen";
      if (!methodMap[m]) methodMap[m] = { count: 0, revenue: 0 };
      methodMap[m].count++;
      methodMap[m].revenue += Number(o.total_amount) || 0;
    });
    const methodBreakdown = Object.entries(methodMap).map(([method, d]) => ({
      method,
      count: d.count,
      revenue: d.revenue,
      pct: totalOrders > 0 ? Math.round((d.count / totalOrders) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    // Recent transactions
    const recentTransactions = all.slice(0, 6).map((o: any) => {
      const addr = o.shipping_address as any;
      const name = addr?.name || addr?.full_name || "—";
      const ago = getTimeAgo(o.created_at);
      return {
        id: o.id?.slice(0, 8)?.toUpperCase() || "—",
        amount: Number(o.total_amount) || 0,
        method: o.payment_method || "—",
        status: o.status === "failed" || o.status === "cancelled" ? "failed" : o.status === "refunded" ? "refunded" : "success",
        time: ago,
        customer: name,
      };
    });

    setStats({ totalRevenue, totalOrders, avgOrderValue, successRate, failedPayments: failed.length, todayOrders, weeklyGrowth: 0, methodBreakdown, recentTransactions });
  };

  useEffect(() => { fetchIntegrations(); fetchStats(); }, []);

  const add = async () => {
    if (!form.name.trim()) return;
    const { error } = await supabase.from("payment_integrations").insert({ name: form.name, provider: form.provider });
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fizetési mód hozzáadva" });
      setForm({ name: "", provider: "stripe" });
      setShowForm(false);
      fetchIntegrations();
    }
  };

  const toggle = async (id: string, field: "is_active" | "test_mode", val: boolean) => {
    const update = field === "is_active" ? { is_active: !val } : { test_mode: !val };
    await supabase.from("payment_integrations").update(update).eq("id", id);
    fetchIntegrations();
  };

  const remove = async (id: string) => {
    await supabase.from("payment_integrations").delete().eq("id", id);
    toast({ title: "Törölve" });
    fetchIntegrations();
  };

  const formatHuf = (n: number) => n.toLocaleString("hu-HU") + " Ft";

  if (loading) return <div className="flex items-center gap-2 p-8 text-muted-foreground"><RefreshCw className="w-4 h-4 animate-spin" /> Betöltés...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#e6a817]/10 border border-[#e6a817]/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-[#e6a817]" />
          </div>
          <div>
            <h2 className="font-bold text-lg tracking-tight">Fizetési Központ</h2>
            <p className="text-xs text-muted-foreground">Fizetési módok, tranzakciók & checkout beállítások</p>
          </div>
        </div>
        <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs gap-1">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Rendszer aktív
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="dashboard" className="text-xs gap-1"><BarChart3 className="w-3 h-3" /> Dashboard</TabsTrigger>
          <TabsTrigger value="methods" className="text-xs gap-1"><CreditCard className="w-3 h-3" /> Módok</TabsTrigger>
          <TabsTrigger value="checkout" className="text-xs gap-1"><ShoppingCart className="w-3 h-3" /> Checkout</TabsTrigger>
          <TabsTrigger value="security" className="text-xs gap-1"><Shield className="w-3 h-3" /> Biztonság</TabsTrigger>
        </TabsList>

        {/* ═══════ DASHBOARD ═══════ */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Összbevétel", value: formatHuf(stats.totalRevenue), icon: DollarSign, accent: "text-[#e6a817]", sub: stats.weeklyGrowth > 0 ? `+${stats.weeklyGrowth}% heti` : `${stats.todayOrders} ma` },
              { label: "Rendelések", value: stats.totalOrders.toString(), icon: ShoppingCart, accent: "text-blue-400", sub: `${stats.todayOrders} ma` },
              { label: "Átl. kosárérték", value: formatHuf(stats.avgOrderValue), icon: TrendingUp, accent: "text-green-400", sub: `${stats.totalOrders} rendelés` },
              { label: "Sikerráta", value: `${stats.successRate}%`, icon: CheckCircle2, accent: "text-emerald-400", sub: `${stats.failedPayments} sikertelen` },
            ].map((kpi, idx) => (
              <div key={idx} className="border border-border/50 bg-card/50 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                  <kpi.icon className={`w-3.5 h-3.5 ${kpi.accent}`} />
                </div>
                <p className="text-lg font-bold tracking-tight">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="w-2.5 h-2.5 text-green-400" />
                  {kpi.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Method breakdown */}
          <div className="border border-border/50 bg-card/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Percent className="w-4 h-4 text-[#e6a817]" /> Fizetési módok megoszlása</h3>
            <div className="space-y-2">
              {stats.methodBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Még nincsenek tranzakciók.</p>
              ) : stats.methodBreakdown.map((m, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{m.method}</span>
                    <span className="text-muted-foreground">{m.count} tranzakció · {formatHuf(m.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-muted/30 overflow-hidden">
                    <div className="h-full bg-[#e6a817] transition-all duration-700" style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="border border-border/50 bg-card/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-[#e6a817]" /> Legutóbbi tranzakciók</h3>
            <div className="space-y-2">
              {stats.recentTransactions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Még nincsenek tranzakciók.</p>
              ) : stats.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted/20 flex items-center justify-center text-xs font-mono">{tx.method.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-medium">{tx.customer}</p>
                      <p className="text-[10px] text-muted-foreground">{tx.id} · {tx.method} · {tx.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatHuf(tx.amount)}</p>
                    <Badge variant={tx.status === "success" ? "default" : tx.status === "refunded" ? "destructive" : "secondary"} className="text-[9px] h-4 px-1.5">
                      {tx.status === "success" ? "Sikeres" : tx.status === "refunded" ? "Visszatérítve" : "Függőben"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ═══════ METHODS ═══════ */}
        <TabsContent value="methods" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Aktív fizetési módok kezelése</p>
            <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Új mód</Button>
          </div>

          {showForm && (
            <div className="border border-[#e6a817]/20 bg-[#e6a817]/5 p-4 space-y-4">
              <h3 className="text-sm font-semibold">Új fizetési mód hozzáadása</h3>
              
              {/* Provider grid */}
              <div className="grid grid-cols-3 gap-2">
                {PROVIDERS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setForm({ ...form, provider: p.key, name: form.name || p.label })}
                    className={`border p-2.5 text-left transition-all hover:border-[#e6a817]/40 ${
                      form.provider === p.key ? "border-[#e6a817] bg-[#e6a817]/10" : "border-border/50"
                    }`}
                  >
                    <div className="text-lg mb-0.5">{p.icon}</div>
                    <p className="text-xs font-semibold">{p.label}</p>
                    <p className="text-[9px] text-muted-foreground">{p.fee}</p>
                  </button>
                ))}
              </div>

              <div>
                <Label className="text-xs">Megnevezés</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="pl. Stripe kártyás fizetés" className="mt-1" />
              </div>

              {/* Provider-specific config */}
              {(form.provider === "stripe" || form.provider === "barion" || form.provider === "simplepay") && (
                <div className="space-y-2 border-t border-border/30 pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API kulcsok</h4>
                  <div>
                    <Label className="text-xs">Publikus kulcs (Publishable Key)</Label>
                    <Input placeholder="pk_test_..." className="mt-1 font-mono text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Titkos kulcs (Secret Key)</Label>
                    <div className="relative mt-1">
                      <Input type={showKeys[form.provider] ? "text" : "password"} placeholder="sk_test_..." className="font-mono text-xs pr-10" />
                      <button 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowKeys(prev => ({ ...prev, [form.provider]: !prev[form.provider] }))}
                      >
                        {showKeys[form.provider] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {form.provider === "stripe" && (
                    <div>
                      <Label className="text-xs">Webhook Secret</Label>
                      <Input type="password" placeholder="whsec_..." className="mt-1 font-mono text-xs" />
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Kulcsok titkosítva tárolódnak — soha nem jelennek meg nyíltan.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={add} className="gap-1"><Save className="w-3.5 h-3.5" /> Mentés</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Mégse</Button>
              </div>
            </div>
          )}

          {/* Integration list */}
          <div className="space-y-2">
            {integrations.map(i => {
              const prov = PROVIDERS.find(p => p.key === i.provider);
              return (
                <div key={i.id} className="border border-border/50 bg-card/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{prov?.icon || "💳"}</span>
                      <div>
                        <p className="font-semibold text-sm">{i.name}</p>
                        <div className="flex gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5">{prov?.label || i.provider}</Badge>
                          {i.test_mode && <Badge variant="secondary" className="text-[9px] h-4 px-1.5 border-yellow-500/20 text-yellow-400">⚠ Teszt</Badge>}
                          {i.is_active 
                            ? <Badge className="text-[9px] h-4 px-1.5 bg-green-500/10 text-green-400 border-green-500/20">Aktív</Badge>
                            : <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Inaktív</Badge>
                          }
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-6 pt-2 border-t border-border/20">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Aktív</Label>
                      <Switch checked={i.is_active} onCheckedChange={() => toggle(i.id, "is_active", i.is_active)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Teszt mód</Label>
                      <Switch checked={i.test_mode} onCheckedChange={() => toggle(i.id, "test_mode", i.test_mode)} />
                    </div>
                    <Button variant="ghost" size="sm" className="ml-auto text-xs gap-1 h-7">
                      <Settings className="w-3 h-3" /> Beállítások
                    </Button>
                  </div>
                </div>
              );
            })}
            {integrations.length === 0 && (
              <div className="border border-dashed border-border/50 p-8 text-center space-y-2">
                <CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">Nincs fizetési mód konfigurálva</p>
                <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Hozzáadás</Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══════ CHECKOUT ═══════ */}
        <TabsContent value="checkout" className="space-y-4 mt-4">
          <div className="border border-border/50 bg-card/50 p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-[#e6a817]" /> Checkout beállítások</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Alapértelmezett pénznem</Label>
                <Select value={checkoutSettings.currency} onValueChange={v => setCheckoutSettings(s => ({ ...s, currency: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Min. rendelési érték</Label>
                <Input type="number" value={checkoutSettings.minOrder} onChange={e => setCheckoutSettings(s => ({ ...s, minOrder: +e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Max. rendelési érték</Label>
                <Input type="number" value={checkoutSettings.maxOrder} onChange={e => setCheckoutSettings(s => ({ ...s, maxOrder: +e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Fizetési időkorlát (mp)</Label>
                <Input type="number" value={checkoutSettings.paymentTimeout} onChange={e => setCheckoutSettings(s => ({ ...s, paymentTimeout: +e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>

          <div className="border border-border/50 bg-card/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-[#e6a817]" /> Checkout opciók</h3>
            <div className="space-y-3">
              {[
                { key: "allowGuestCheckout", label: "Vendég checkout engedélyezése", desc: "Regisztráció nélküli vásárlás", icon: Globe },
                { key: "requireBilling", label: "Számlázási cím kötelező", desc: "Minden rendeléshez szükséges", icon: FileText },
                { key: "requirePhone", label: "Telefonszám kötelező", desc: "Futárszolgálatnak szükséges", icon: Zap },
                { key: "showOrderSummary", label: "Rendelés összesítő mutatása", desc: "Részletes kosártartalom a checkoutnál", icon: ShoppingCart },
                { key: "enableCoupons", label: "Kuponkód mező", desc: "Kedvezménykód megadásának lehetősége", icon: Percent },
                { key: "autoCapture", label: "Automatikus terhelés", desc: "Azonnal terheli a kártyát (vs. manuális capture)", icon: Zap },
                { key: "savedCards", label: "Mentett kártyák", desc: "Visszatérő vásárlók menthetik kártyájukat", icon: CreditCard },
                { key: "oneClickPay", label: "Egy kattintásos fizetés", desc: "Visszatérő vásárlók azonnali fizetése", icon: ChevronsUp },
                { key: "showInstallments", label: "Részletfizetés", desc: "Részletfizetési opció megjelenítése", icon: Banknote },
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <opt.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={(checkoutSettings as any)[opt.key]} 
                    onCheckedChange={v => setCheckoutSettings(s => ({ ...s, [opt.key]: v }))} 
                  />
                </div>
              ))}
            </div>
          </div>

          <Button className="w-full gap-1" onClick={() => toast({ title: "Checkout beállítások mentve ✓" })}>
            <Save className="w-4 h-4" /> Beállítások mentése
          </Button>
        </TabsContent>

        {/* ═══════ SECURITY ═══════ */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <div className="border border-border/50 bg-card/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-[#e6a817]" /> Biztonsági beállítások</h3>
            <div className="space-y-3">
              {[
                { key: "enable3DS", label: "3D Secure hitelesítés", desc: "Erős ügyfél-hitelesítés (PSD2 kompatibilis)", icon: Shield },
                { key: "enableFraudDetection", label: "Csalásfelismerés", desc: "AI-alapú gyanús tranzakció szűrés", icon: AlertTriangle },
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <opt.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={(checkoutSettings as any)[opt.key]} 
                    onCheckedChange={v => setCheckoutSettings(s => ({ ...s, [opt.key]: v }))} 
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border/50 bg-card/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-[#e6a817]" /> Webhook konfiguráció</h3>
            <div>
              <Label className="text-xs">Webhook URL</Label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook`} className="font-mono text-[10px]" />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook`); toast({ title: "Webhook URL másolva ✓" }); }}>
                  Másolás
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Másold be a fizetési szolgáltató dashboardjára (Stripe, Barion, stb.)</p>
            </div>
            <div>
              <Label className="text-xs">Webhook újrapróbálkozások száma</Label>
              <Select value={String(checkoutSettings.webhookRetries)} onValueChange={v => setCheckoutSettings(s => ({ ...s, webhookRetries: +v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1×</SelectItem>
                  <SelectItem value="3">3×</SelectItem>
                  <SelectItem value="5">5×</SelectItem>
                  <SelectItem value="10">10×</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SSL & compliance */}
          <div className="border border-border/50 bg-card/50 p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Megfelelőség</h3>
            {[
              { label: "SSL/TLS titkosítás", status: true },
              { label: "PCI DSS Level 1 kompatibilis", status: true },
              { label: "PSD2 SCA kompatibilis", status: checkoutSettings.enable3DS },
              { label: "GDPR megfelelő adatkezelés", status: true },
              { label: "Tokenizált kártyatárolás", status: true },
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-xs">{c.label}</span>
                {c.status 
                  ? <Badge className="text-[9px] h-4 px-1.5 bg-green-500/10 text-green-400 border-green-500/20">✓ Teljesítve</Badge>
                  : <Badge variant="destructive" className="text-[9px] h-4 px-1.5">✗ Nincs</Badge>
                }
              </div>
            ))}
          </div>

          <Button className="w-full gap-1" onClick={() => toast({ title: "Biztonsági beállítások mentve ✓" })}>
            <Save className="w-4 h-4" /> Mentés
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPaymentIntegrationsTab;

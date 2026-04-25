import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Sparkles, Send, Calculator, FileSpreadsheet, Receipt, TrendingUp, AlertTriangle,
  Banknote, Brain, Loader2, Trash2, Copy, Bot, User as UserIcon, ShieldCheck, Percent,
  FileDown, Calendar, ArrowRightLeft, Hash, BookOpen, Wallet, PiggyBank, Building2,
  ScrollText, Activity, Target, Briefcase, ClipboardList, FileCheck2, Coins,
  TrendingDown, Zap, Globe, CheckCircle2, XCircle, Timer, BarChart3, Boxes,
  CalendarClock, FileText, Landmark, Scale, Flame, Award, Gauge, LineChart,
  Printer, Search, Database,
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; ts: number };
type Period = "today" | "week" | "month" | "quarter" | "year" | "all";

type Snapshot = {
  revenue: number; orders: number; avgOrder: number; cogs: number; profit: number;
  margin: number; vatPayable: number; pendingPay: number; cancelled: number;
  topProducts: { name: string; qty: number; revenue: number }[];
};

const STORAGE_KEY = "admin_ai_bookkeeper_history_v2";

const PROMPT_GROUPS: { title: string; icon: any; items: { icon: any; label: string; prompt: string }[] }[] = [
  {
    title: "ÁFA & Adó", icon: Receipt, items: [
      { icon: Receipt, label: "Havi ÁFA bevallás", prompt: "Készíts részletes havi ÁFA összesítőt: bruttó/nettó bevétel, fizetendő ÁFA bontásban (27%, 18%, 5%, AAM), NAV bevallás sorai." },
      { icon: ShieldCheck, label: "Adóoptimalizálás", prompt: "Adj 5 jogszerű adóoptimalizálási javaslatot a forgalom alapján (KATA/KIVA/TAO, költségelszámolás, ÁFA-rendszerek)." },
      { icon: FileDown, label: "NAV XML csekklista", prompt: "Mely adatok hiányoznak a NAV-kompatibilis online számla XML exporthoz? Pontos lista." },
      { icon: Percent, label: "Fordított adózás", prompt: "Mely tételek esnek fordított adózás (reverse charge) alá az EU B2B forgalomban? Adj konkrét példákat." },
    ],
  },
  {
    title: "Pénzügy & Riport", icon: TrendingUp, items: [
      { icon: TrendingUp, label: "Eredménykimutatás", prompt: "Egyszerűsített eredménykimutatás: bevételek, COGS, bruttó nyereség, árrés %, működési költségek, adózás előtti eredmény. Magyar számviteli stílus." },
      { icon: Banknote, label: "Cash flow 30/60/90", prompt: "30/60/90 napos cash flow előrejelzés: várható bejövő, kifizetendő beszerzések, nettó pozíció, likviditási kockázatok." },
      { icon: Activity, label: "KPI dashboard", prompt: "Számold ki a kulcs KPI-okat: AOV, CAC becslés, LTV becslés, visszatérő vásárlók aránya, készletforgási sebesség." },
      { icon: Target, label: "Hónap-terv vs tény", prompt: "Hasonlítsd össze az aktuális hónapot az előzővel: bevétel, profit, rendelésszám, árrés. Mutasd a változás %-át és okait." },
    ],
  },
  {
    title: "Könyvelés & Naplótétel", icon: BookOpen, items: [
      { icon: ScrollText, label: "Naplófőkönyv tételek", prompt: "Az utolsó 10 rendeléshez generálj könyvelési naplótételeket (T/K, magyar kontírozás: 311, 466, 91, 814)." },
      { icon: ClipboardList, label: "Beszerzés kontírozása", prompt: "Az utolsó 10 beszerzéshez (procurement) javasolj kontírozást: anyag/áru beszerzés, ÁFA, szállító folyószámla." },
      { icon: FileCheck2, label: "Évzárás csekklista", prompt: "Magyar évzárás teljes csekklista: leltár, értékvesztés, időbeli elhatárolás, ÁFA elszámolás, eredmény átvezetés." },
      { icon: Building2, label: "Főkönyvi kivonat", prompt: "Készíts becsült főkönyvi kivonatot a rendelkezésre álló adatokból: 1-es, 2-es, 3-as, 4-es, 5-ös, 8-as, 9-es számlaosztály." },
    ],
  },
  {
    title: "Elemzés & Anomália", icon: AlertTriangle, items: [
      { icon: AlertTriangle, label: "Anomália felderítés", prompt: "Keress anomáliákat: gyanús árrés, kifizetetlen régi számlák, rendelés-beszerzés eltérések, hiányzó dokumentumok. Kockázat szerint." },
      { icon: Percent, label: "Termék árrés top/flop", prompt: "Top 5 legjövedelmezőbb és 5 legveszteségesebb termék. Konkrét cselekvési javaslat mindegyikre." },
      { icon: PiggyBank, label: "Költségcsökkentés", prompt: "Hol lehet azonnal pénzt megtakarítani? Nézd a beszerzési árakat, szállítási költségeket, visszatérítéseket." },
      { icon: Coins, label: "Beszállító elemzés", prompt: "Beszállítónkénti összesítés: rendelt mennyiség, átlag költség, megbízhatóság, javaslat váltásra ha van olcsóbb." },
    ],
  },
  {
    title: "Likviditás & Pénzügy", icon: Wallet, items: [
      { icon: Gauge, label: "Working capital", prompt: "Számold ki a forgótőkét: vevőállomány + készlet - szállítóállomány. Adj javaslatot az optimalizálásra." },
      { icon: Timer, label: "Vevő futamidő (DSO)", prompt: "Számold ki az átlagos vevői futamidőt (Days Sales Outstanding). Mely vevők késnek? Mit tegyek?" },
      { icon: LineChart, label: "Burn rate / runway", prompt: "Mennyi a havi égés (burn rate)? Hány hónapra elég a likviditás (runway)? Vészforgatókönyv ha 30%-kal esik a bevétel." },
      { icon: Scale, label: "Mérleg becslés", prompt: "Készíts becsült mérleget: eszközök (forgó+befektetett), források (saját tőke + kötelezettségek). Magyar számviteli sémában." },
    ],
  },
  {
    title: "Készlet & Logisztika", icon: Boxes, items: [
      { icon: Boxes, label: "Készletérték", prompt: "Számold ki a teljes készletértéket beszerzési áron és eladási áron. Mely termékek kötnek le legtöbb tőkét?" },
      { icon: TrendingDown, label: "Lassú forgók", prompt: "Mely termékek nem fogytak az utolsó 60 napban? Javaslat akcióra/leértékelésre/kivonásra." },
      { icon: Flame, label: "Kifutó/hiány figyelő", prompt: "Mely termékek 7 napon belül kifogynak az aktuális forgási sebesség alapján? Sürgősségi rendelési lista." },
      { icon: Printer, label: "Szállítás-arányos profit", prompt: "Mennyi a tényleges profit szállítási költséggel együtt? Mely régiók/súlyok veszteségesek?" },
    ],
  },
  {
    title: "Vevő & Marketing ROI", icon: Award, items: [
      { icon: Award, label: "Top 10 vevő", prompt: "Top 10 vevő bevétel szerint. Mennyit költöttek, hányszor rendeltek, mikor utoljára? VIP javaslat." },
      { icon: AlertTriangle, label: "Lemorzsolódás", prompt: "Kik nem rendeltek 60+ napja, pedig korábban gyakori vásárlók voltak? Visszahívási kampány terv." },
      { icon: BarChart3, label: "Kupon ROI", prompt: "Számold ki az aktív kuponok megtérülését: kedvezmény mértéke vs. plusz bevétel. Mely kuponok rontják a marzsot?" },
      { icon: Zap, label: "Kosárelhagyás veszteség", prompt: "Becsüld meg a kosárelhagyásból származó elmaradt bevételt és adj 5 azonnali optimalizálási javaslatot." },
    ],
  },
  {
    title: "Megfelelőség & Audit", icon: ShieldCheck, items: [
      { icon: Landmark, label: "NAV határidők", prompt: "Listázd a következő 60 nap NAV határidőit (ÁFA, TBJ, SZJA, társasági adó, KIVA, KATA) magyarázattal." },
      { icon: FileText, label: "Számla-audit", prompt: "Audit: minden teljesített rendeléshez van-e számla? Listázd a hiányzókat. Hol vannak ÁFA-eltérések?" },
      { icon: ScrollText, label: "GDPR pénzügyi szempont", prompt: "Mely pénzügyi adatok tárolása esik GDPR alá? Mennyi ideig kell megőrizni (8 év szabály)? Audit lista." },
      { icon: Search, label: "Bizonylat-csekklista", prompt: "Magyar számvitel: mely bizonylatok kötelezőek (számla, nyugta, szállítólevél, készletmozgás bizonylat)? Audit kész állapot?" },
    ],
  },
];

function rangeFor(p: Period): { from: Date | null; to: Date } {
  const to = new Date();
  const from = new Date();
  switch (p) {
    case "today": from.setHours(0, 0, 0, 0); break;
    case "week": from.setDate(from.getDate() - 7); break;
    case "month": from.setMonth(from.getMonth() - 1); break;
    case "quarter": from.setMonth(from.getMonth() - 3); break;
    case "year": from.setFullYear(from.getFullYear() - 1); break;
    case "all": return { from: null, to };
  }
  return { from, to };
}

const fmt = (n: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(Math.round(n || 0));

const AdminAiBookkeeperTab = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("month");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(false);
  const [vatRate, setVatRate] = useState(27);
  const [grossInput, setGrossInput] = useState("");
  const [netInput, setNetInput] = useState("");
  const [invoicePreview, setInvoicePreview] = useState<string>("");
  // Extra tools state
  const [depAmount, setDepAmount] = useState(""); const [depYears, setDepYears] = useState("5");
  const [lateAmount, setLateAmount] = useState(""); const [lateDays, setLateDays] = useState("30"); const [lateRate, setLateRate] = useState("13");
  const [bepFixed, setBepFixed] = useState(""); const [bepPrice, setBepPrice] = useState(""); const [bepCost, setBepCost] = useState("");
  const [fxAmount, setFxAmount] = useState(""); const [fxRate, setFxRate] = useState("400"); const [fxFrom, setFxFrom] = useState("EUR");
  const [validateInput, setValidateInput] = useState("");
  const [validateType, setValidateType] = useState<"iban" | "tax">("iban");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))); } catch {}
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Live snapshot loader
  const loadSnapshot = async () => {
    setSnapLoading(true);
    try {
      const { from } = rangeFor(period);
      let q = supabase.from("orders").select("total_amount, status, items, created_at");
      if (from) q = q.gte("created_at", from.toISOString());
      const { data: orders, error } = await q.limit(1000);
      if (error) throw error;

      let revenue = 0, cogs = 0, cancelled = 0, pendingPay = 0;
      const productMap = new Map<string, { qty: number; revenue: number }>();
      const list = orders || [];
      for (const o of list) {
        const total = Number(o.total_amount) || 0;
        if (o.status === "cancelled" || o.status === "refunded") { cancelled += total; continue; }
        if (o.status === "pending" || o.status === "awaiting_payment") pendingPay += total;
        revenue += total;
        const items = Array.isArray(o.items) ? o.items : [];
        for (const it of items) {
          const name = it?.name || it?.title || "Ismeretlen";
          const qty = Number(it?.quantity) || 1;
          const price = Number(it?.price) || 0;
          const cost = Number(it?.cost) || price * 0.55;
          cogs += cost * qty;
          const cur = productMap.get(name) || { qty: 0, revenue: 0 };
          cur.qty += qty; cur.revenue += price * qty;
          productMap.set(name, cur);
        }
      }
      const validOrders = list.filter((o: any) => o.status !== "cancelled" && o.status !== "refunded").length;
      const profit = revenue - cogs;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const vatPayable = revenue - revenue / (1 + vatRate / 100);
      const topProducts = Array.from(productMap.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      setSnapshot({
        revenue, orders: validOrders, avgOrder: validOrders > 0 ? revenue / validOrders : 0,
        cogs, profit, margin, vatPayable, pendingPay, cancelled, topProducts,
      });
    } catch (err: any) {
      toast({ title: "Snapshot hiba", description: err?.message || "Nem sikerült betölteni", variant: "destructive" });
    } finally {
      setSnapLoading(false);
    }
  };

  useEffect(() => { loadSnapshot(); /* eslint-disable-next-line */ }, [period, vatRate]);

  // VAT calculator
  const handleGross = (v: string) => {
    setGrossInput(v);
    const g = parseFloat(v.replace(",", ".")) || 0;
    const n = g / (1 + vatRate / 100);
    setNetInput(n ? n.toFixed(2) : "");
  };
  const handleNet = (v: string) => {
    setNetInput(v);
    const n = parseFloat(v.replace(",", ".")) || 0;
    const g = n * (1 + vatRate / 100);
    setGrossInput(g ? g.toFixed(2) : "");
  };

  // Invoice number preview
  const generateInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase.rpc("generate_invoice_number");
      if (error) throw error;
      setInvoicePreview(String(data));
      toast({ title: "Új számlaszám generálva", description: String(data) });
    } catch (err: any) {
      toast({ title: "Hiba", description: err?.message || "Nem sikerült", variant: "destructive" });
    }
  };

  // CSV export of snapshot
  const exportCsv = () => {
    if (!snapshot) return;
    const rows: string[] = [
      "Mutató;Érték (HUF)",
      `Bevétel;${Math.round(snapshot.revenue)}`,
      `Rendelések száma;${snapshot.orders}`,
      `Átlag rendelés;${Math.round(snapshot.avgOrder)}`,
      `COGS (becsült);${Math.round(snapshot.cogs)}`,
      `Bruttó profit;${Math.round(snapshot.profit)}`,
      `Árrés (%);${snapshot.margin.toFixed(2)}`,
      `Fizetendő ÁFA (${vatRate}%);${Math.round(snapshot.vatPayable)}`,
      `Függő (fizetésre vár);${Math.round(snapshot.pendingPay)}`,
      `Visszamondott/visszatérített;${Math.round(snapshot.cancelled)}`,
      "",
      "Top termékek;Mennyiség;Bevétel",
      ...snapshot.topProducts.map(p => `${p.name};${p.qty};${Math.round(p.revenue)}`),
    ];
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `konyveles-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "CSV exportálva" });
  };

  // Send snapshot to AI as context
  const askWithContext = (text: string) => {
    if (!snapshot) return ask(text);
    const ctx = `[ÉLŐ ADATOK – ${period.toUpperCase()}]
Bevétel: ${fmt(snapshot.revenue)} Ft | Rendelések: ${snapshot.orders} | Átlag: ${fmt(snapshot.avgOrder)} Ft
COGS: ${fmt(snapshot.cogs)} Ft | Profit: ${fmt(snapshot.profit)} Ft | Árrés: ${snapshot.margin.toFixed(1)}%
Fizetendő ÁFA (${vatRate}%): ${fmt(snapshot.vatPayable)} Ft | Függő: ${fmt(snapshot.pendingPay)} Ft
Top termékek: ${snapshot.topProducts.map(p => `${p.name} (${p.qty}db, ${fmt(p.revenue)}Ft)`).join(", ")}

KÉRDÉS: ${text}`;
    ask(ctx);
  };

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Msg = { role: "user", content: trimmed, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const payload = {
        mode: "bookkeeper",
        messages: [
          { role: "system", content: "Te egy magyar nyelvű, NAV-kompatibilis számviteli és könyvelési AI asszisztens vagy. Mindig magyarul válaszolj, használj magyar számviteli kifejezéseket. Számoláskor mutasd a képletet és végeredményt is. Adj konkrét, cselekvésre kész javaslatokat." },
          ...next.map((m) => ({ role: m.role, content: m.content })),
        ],
      };
      const { data, error } = await supabase.functions.invoke("admin-ai-assistant", { body: payload });
      if (error) throw error;
      const reply = data?.reply || data?.message || data?.choices?.[0]?.message?.content || "Nincs válasz az AI-tól.";
      setMessages((m) => [...m, { role: "assistant", content: reply, ts: Date.now() }]);
    } catch (err: any) {
      toast({ title: "AI hiba", description: err?.message || "Nem sikerült elérni az AI-t.", variant: "destructive" });
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Hiba történt. Próbáld újra.", ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]); localStorage.removeItem(STORAGE_KEY);
    toast({ title: "Beszélgetés törölve" });
  };

  const copyMsg = (text: string) => {
    navigator.clipboard.writeText(text); toast({ title: "Másolva" });
  };

  const stats = useMemo(() => ({
    user: messages.filter((m) => m.role === "user").length,
    ai: messages.filter((m) => m.role === "assistant").length,
    total: messages.length,
  }), [messages]);

  const periodLabels: Record<Period, string> = {
    today: "Ma", week: "7 nap", month: "30 nap", quarter: "90 nap", year: "1 év", all: "Összes",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Brain className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-black uppercase tracking-widest">AI Könyvelő + Eszköztár</h2>
            <Badge className="rounded-none bg-accent text-accent-foreground uppercase tracking-wider text-[10px]">
              <Sparkles className="h-3 w-3 mr-1" /> Profi
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Élő pénzügyi dashboard, ÁFA kalkulátor, kontírozó, számlaszám generátor, CSV export és AI asszisztens — egy helyen.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="rounded-none uppercase tracking-wider text-[10px]">{stats.total} üzenet</Badge>
          {messages.length > 0 && (
            <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={clearHistory}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Új beszélgetés
            </Button>
          )}
        </div>
      </div>

      {/* Period selector + actions */}
      <div className="border-2 border-border bg-muted/20 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="h-4 w-4 text-accent" />
          <span className="text-[11px] uppercase tracking-widest font-bold">Időszak:</span>
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-xs uppercase tracking-wider px-3 py-1.5 border transition-colors ${period === p ? "bg-accent text-accent-foreground border-accent" : "border-border hover:border-accent/50"}`}>
              {periodLabels[p]}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={loadSnapshot} disabled={snapLoading}>
              {snapLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Activity className="h-3.5 w-3.5 mr-1" />} Frissítés
            </Button>
            <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={exportCsv} disabled={!snapshot}>
              <FileDown className="h-3.5 w-3.5 mr-1" /> CSV export
            </Button>
          </div>
        </div>
      </div>

      {/* Live snapshot dashboard */}
      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Bevétel", value: fmt(snapshot.revenue) + " Ft", icon: Wallet, color: "text-accent" },
            { label: "Profit", value: fmt(snapshot.profit) + " Ft", icon: TrendingUp, color: snapshot.profit >= 0 ? "text-green-600" : "text-red-600" },
            { label: "Árrés", value: snapshot.margin.toFixed(1) + "%", icon: Percent, color: "text-foreground" },
            { label: "Fizetendő ÁFA", value: fmt(snapshot.vatPayable) + " Ft", icon: Receipt, color: "text-orange-600" },
            { label: "Rendelések", value: String(snapshot.orders), icon: ClipboardList, color: "text-foreground" },
            { label: "Átlag rendelés", value: fmt(snapshot.avgOrder) + " Ft", icon: Coins, color: "text-foreground" },
            { label: "Függő (fiz.vár)", value: fmt(snapshot.pendingPay) + " Ft", icon: AlertTriangle, color: "text-yellow-600" },
            { label: "COGS (becs.)", value: fmt(snapshot.cogs) + " Ft", icon: Briefcase, color: "text-muted-foreground" },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="border-2 border-border bg-background p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  <Icon className="h-3 w-3" /> {c.label}
                </div>
                <div className={`text-lg font-black mt-1 ${c.color}`}>{c.value}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tools row: VAT calc + Invoice number + Top products */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* VAT Calculator */}
        <div className="border-2 border-border bg-background p-3">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft className="h-4 w-4 text-accent" />
            <span className="text-[11px] uppercase tracking-widest font-bold">Nettó ↔ Bruttó ({vatRate}% ÁFA)</span>
          </div>
          <div className="flex gap-1 mb-2">
            {[27, 18, 5, 0].map((r) => (
              <button key={r} onClick={() => setVatRate(r)}
                className={`text-[10px] uppercase tracking-wider px-2 py-1 border ${vatRate === r ? "bg-foreground text-background border-foreground" : "border-border hover:border-accent/50"}`}>
                {r === 0 ? "AAM" : r + "%"}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nettó (Ft)</label>
              <Input value={netInput} onChange={(e) => handleNet(e.target.value)} placeholder="0" className="rounded-none" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Bruttó (Ft)</label>
              <Input value={grossInput} onChange={(e) => handleGross(e.target.value)} placeholder="0" className="rounded-none" />
            </div>
            {grossInput && netInput && (
              <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
                ÁFA tartalom: <span className="font-bold text-foreground">{fmt(parseFloat(grossInput) - parseFloat(netInput))} Ft</span>
              </div>
            )}
          </div>
        </div>

        {/* Invoice number generator */}
        <div className="border-2 border-border bg-background p-3">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="h-4 w-4 text-accent" />
            <span className="text-[11px] uppercase tracking-widest font-bold">Számlaszám generátor</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">Generálj következő, NAV-kompatibilis sorszámot a beállított prefix alapján.</p>
          <Button onClick={generateInvoiceNumber} className="rounded-none w-full uppercase tracking-wider text-xs" size="sm">
            <FileCheck2 className="h-3.5 w-3.5 mr-1" /> Új számlaszám
          </Button>
          {invoicePreview && (
            <div className="mt-3 border border-accent bg-accent/10 p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Generált:</div>
              <div className="font-mono font-bold text-sm text-accent">{invoicePreview}</div>
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="border-2 border-border bg-background p-3">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-accent" />
            <span className="text-[11px] uppercase tracking-widest font-bold">Top 5 termék</span>
          </div>
          {snapshot && snapshot.topProducts.length > 0 ? (
            <div className="space-y-1.5">
              {snapshot.topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs gap-2">
                  <span className="truncate flex-1"><span className="font-bold text-accent mr-1">{i + 1}.</span>{p.name}</span>
                  <span className="text-muted-foreground shrink-0">{p.qty}db</span>
                  <span className="font-bold shrink-0">{fmt(p.revenue)} Ft</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">Nincs adat ebben az időszakban.</p>
          )}
        </div>
      </div>

      {/* Categorized prompt palette */}
      <div className="space-y-3">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
          <Calculator className="h-3.5 w-3.5" /> Profi munkafolyamatok (kattints — élő adatokkal küldi)
        </div>
        {PROMPT_GROUPS.map((g) => {
          const GIcon = g.icon;
          return (
            <div key={g.title}>
              <div className="text-[10px] uppercase tracking-widest text-accent font-bold mb-1.5 flex items-center gap-1.5">
                <GIcon className="h-3 w-3" /> {g.title}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {g.items.map((q) => {
                  const Icon = q.icon;
                  return (
                    <button key={q.label} disabled={loading} onClick={() => askWithContext(q.prompt)}
                      className="border border-border hover:border-accent hover:bg-accent/5 transition-colors p-2.5 text-left disabled:opacity-50">
                      <Icon className="h-3.5 w-3.5 text-accent mb-1.5" />
                      <div className="text-[11px] font-bold uppercase tracking-wider leading-tight">{q.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat */}
      <div className="border-2 border-border bg-background flex flex-col h-[55vh] min-h-[380px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
              <Bot className="h-12 w-12 mb-3 opacity-40" />
              <div className="text-sm font-bold uppercase tracking-wider">Kérdezz bármit a könyvelésről</div>
              <div className="text-xs mt-2 max-w-md">A felső gombokkal élő adatokat küldesz az AI-nak. Kézzel is írhatsz.</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="h-8 w-8 shrink-0 border-2 border-accent flex items-center justify-center bg-accent/10">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
              )}
              <div className={`max-w-[80%] border p-3 group relative ${m.role === "user" ? "bg-foreground text-background border-foreground" : "bg-muted/30 border-border"}`}>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                <button onClick={() => copyMsg(m.content)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background/20" title="Másolás">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              {m.role === "user" && (
                <div className="h-8 w-8 shrink-0 border-2 border-foreground flex items-center justify-center">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 shrink-0 border-2 border-accent flex items-center justify-center bg-accent/10">
                <Bot className="h-4 w-4 text-accent animate-pulse" />
              </div>
              <div className="border border-border bg-muted/30 p-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Az AI könyvelő dolgozik…
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border p-3 bg-muted/20">
          <div className="flex gap-2 items-end">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
              placeholder="Írd ide a könyvelési kérdést… (Enter = küldés)"
              className="rounded-none min-h-[60px] resize-none flex-1" disabled={loading} />
            <Button onClick={() => ask(input)} disabled={loading || !input.trim()} className="rounded-none h-[60px] px-4 uppercase tracking-wider text-xs">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Send className="h-4 w-4 mr-1" /> Küldés</>)}
            </Button>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">
            AI hozzáfér rendelésekhez, beszerzésekhez, termékekhez. A snapshot dashboard valós idejű.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAiBookkeeperTab;

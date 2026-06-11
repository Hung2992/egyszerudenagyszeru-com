import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { useAccountantCheck } from "@/hooks/useAccountantCheck";
import {
  Calculator, FileText, TrendingDown, ShoppingCart, Receipt, Download,
  LogOut, ChevronLeft, ChevronRight, AlertTriangle, Loader2, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type Tab = "overview" | "invoices" | "refunds" | "expenses" | "vat" | "export";

interface Legal {
  ownerName?: string; taxId?: string; euVatNumber?: string;
  registryNumber?: string; vatStatus?: string; registeredOffice?: string;
  bankName?: string; bankAccount?: string;
}

interface Invoice {
  id: string; invoice_number: string | null; customer_name: string | null;
  customer_address: string | null; customer_tax_number: string | null;
  subtotal: number | null; tax_amount: number | null; total_amount: number | null;
  tax_rate: number | null; currency: string | null; paid_at: string | null;
  created_at: string; status: string | null; pdf_url: string | null;
}

interface Refund { id: string; amount: number | null; created_at: string; new_status: string | null; transaction_id: string | null; }
interface Procurement { id: string; product_name: string; supplier_name: string | null; total_cost: number | null; unit_cost: number; quantity: number; created_at: string; currency: string | null; order_status: string | null; }

const HUF = (n: number) => new Intl.NumberFormat("hu-HU").format(Math.round(n)) + " Ft";
const DATE = (s: string | null) => s ? new Date(s).toLocaleDateString("hu-HU") : "—";

const monthRange = (y: number, m: number) => {
  const from = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const to = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
  return { from: from.toISOString(), to: to.toISOString(), label: from.toLocaleDateString("hu-HU", { year: "numeric", month: "long" }) };
};

const AccountantPortal = () => {
  const navigate = useNavigate();
  const { allowed, loading: authLoading, role, email } = useAccountantCheck();
  const [tab, setTab] = useState<Tab>("overview");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [legal, setLegal] = useState<Legal>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [procurement, setProcurement] = useState<Procurement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!allowed) { navigate("/auth"); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const range = monthRange(year, month);
      const [legalRes, invRes, refRes, procRes] = await Promise.all([
        supabase.rpc("get_accountant_legal_info"),
        supabase.from("invoices").select("*").gte("created_at", range.from).lt("created_at", range.to).order("created_at", { ascending: false }),
        supabase.from("refund_history").select("id,amount,created_at,new_status,transaction_id").gte("created_at", range.from).lt("created_at", range.to).order("created_at", { ascending: false }),
        supabase.from("admin_procurement_orders").select("id,product_name,supplier_name,total_cost,unit_cost,quantity,created_at,currency,order_status").gte("created_at", range.from).lt("created_at", range.to).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (legalRes.data) setLegal(legalRes.data as Legal);
      setInvoices((invRes.data as Invoice[]) ?? []);
      setRefunds((refRes.data as Refund[]) ?? []);
      setProcurement((procRes.data as Procurement[]) ?? []);
      setLoading(false);

      // Audit
      await supabase.from("accountant_access_log").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "view_month", resource: range.label, metadata: { tab },
      });
    })();
    return () => { cancelled = true; };
  }, [authLoading, allowed, year, month, tab, navigate]);

  const kpi = useMemo(() => {
    const gross = invoices.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
    const net = invoices.reduce((s, i) => s + Number(i.subtotal ?? 0), 0);
    const vat = invoices.reduce((s, i) => s + Number(i.tax_amount ?? 0), 0);
    const refundSum = refunds.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const costSum = procurement.reduce((s, p) => s + Number(p.total_cost ?? (p.unit_cost * p.quantity)), 0);
    return { gross, net, vat, refundSum, costSum, payableVat: vat - 0 };
  }, [invoices, refunds, procurement]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const rangeLabel = monthRange(year, month).label;

  const exportCsv = () => {
    const rows = [
      ["Szamlaszam","Datum","Vevo","Vevo adoszam","Cim","Netto","AFA kulcs","AFA","Brutto","Penznem","Allapot"],
      ...invoices.map(i => [
        i.invoice_number ?? "",
        DATE(i.paid_at ?? i.created_at),
        i.customer_name ?? "",
        i.customer_tax_number ?? "",
        i.customer_address ?? "",
        String(i.subtotal ?? 0),
        String(i.tax_rate ?? 27),
        String(i.tax_amount ?? 0),
        String(i.total_amount ?? 0),
        i.currency ?? "HUF",
        i.status ?? "",
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `szamlak_${year}_${String(month+1).padStart(2,"0")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    void supabase.from("accountant_access_log").insert({ user_id: null, action: "export_csv", resource: rangeLabel, metadata: { count: invoices.length } } as any);
    toast({ title: "Export kész", description: `${invoices.length} számla letöltve` });
  };

  if (authLoading) return <FullPageLoader />;
  if (!allowed) return null;

  const isMissingLegal = !legal.ownerName || !legal.taxId;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Topbar */}
      <header className="border-b border-border bg-secondary/30 sticky top-0 z-40 backdrop-blur">
        <div className="mx-auto max-w-7xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-accent/10 border border-accent flex items-center justify-center">
              <Calculator className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Könyvelői központ</p>
              <h1 className="text-sm font-bold leading-tight">
                {legal.ownerName ?? "—"} <span className="text-muted-foreground font-normal">· {legal.taxId ?? "adószám PÓTLANDÓ"}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-[10px] uppercase tracking-widest text-muted-foreground">
              {role === "admin" ? "Admin felügyelet" : "Könyvelő"} · {email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut().then(() => navigate("/auth"))}>
              <LogOut className="h-4 w-4 mr-1" /> Kilépés
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        {isMissingLegal && (
          <div className="border border-destructive/40 bg-destructive/10 p-4 mb-6 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-destructive uppercase tracking-wide mb-1">Hiányzó cégadatok</p>
              <p className="text-muted-foreground">Az admin még nem töltötte ki az összes kötelező cégadatot. A NAV-bevallásig hiányosak az export adatok.</p>
            </div>
          </div>
        )}

        {/* Hónap választó */}
        <div className="flex items-center justify-between border border-border p-3 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="px-4 min-w-[200px] text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Időszak</p>
              <p className="text-lg font-bold">{rangeLabel}</p>
            </div>
            <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!invoices.length}>
            <Download className="h-4 w-4 mr-1" /> Havi CSV
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-border mb-6 -mx-5 px-5 gap-1">
          {([
            ["overview", "Áttekintés", Calculator],
            ["invoices", `Számlák (${invoices.length})`, FileText],
            ["refunds", `Visszatérítések (${refunds.length})`, TrendingDown],
            ["expenses", `Költségek (${procurement.length})`, ShoppingCart],
            ["vat", "ÁFA-összesítő", Receipt],
            ["export", "Export", FileSpreadsheet],
          ] as const).map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTab(k as Tab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === k ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="h-3.5 w-3.5" />{l}
            </button>
          ))}
        </div>

        {loading ? <FullPageLoader inline /> : (
          <>
            {tab === "overview" && <Overview kpi={kpi} legal={legal} invoices={invoices} />}
            {tab === "invoices" && <InvoicesTable invoices={invoices} />}
            {tab === "refunds" && <RefundsTable refunds={refunds} />}
            {tab === "expenses" && <ExpensesTable items={procurement} />}
            {tab === "vat" && <VatSummary kpi={kpi} legal={legal} invoices={invoices} />}
            {tab === "export" && <ExportPanel onCsv={exportCsv} invoices={invoices} />}
          </>
        )}

        <footer className="mt-12 border-t border-border pt-6 text-[10px] uppercase tracking-widest text-muted-foreground text-center">
          Könyvelői hozzáférés — csak olvasás · minden lekérdezés auditálva
        </footer>
      </div>
    </div>
  );
};

const FullPageLoader = ({ inline }: { inline?: boolean }) => (
  <div className={inline ? "py-20 flex justify-center" : "min-h-screen flex items-center justify-center"}>
    <Loader2 className="h-6 w-6 animate-spin text-accent" />
  </div>
);

const Kpi = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className={`border p-5 ${accent ? "border-accent bg-accent/5" : "border-border"}`}>
    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
    <p className={`mt-2 text-2xl font-bold tabular-nums ${accent ? "text-accent" : ""}`}>{value}</p>
  </div>
);

const Overview = ({ kpi, legal, invoices }: { kpi: any; legal: Legal; invoices: Invoice[] }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi label="Bruttó bevétel" value={HUF(kpi.gross)} />
      <Kpi label="Nettó (adóalap)" value={HUF(kpi.net)} />
      <Kpi label="Felszámított ÁFA" value={HUF(kpi.vat)} accent />
      <Kpi label="Visszatérítések" value={HUF(kpi.refundSum)} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <Kpi label="Beszerzési költség" value={HUF(kpi.costSum)} />
      <Kpi label="Bruttó − Költség" value={HUF(kpi.gross - kpi.costSum)} />
      <Kpi label="Kiállított számla" value={`${invoices.length} db`} />
    </div>

    <div className="border border-border p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Cégadatok</h3>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <Row k="Egyéni vállalkozó" v={legal.ownerName} />
        <Row k="Adószám" v={legal.taxId} />
        <Row k="Közösségi adószám" v={legal.euVatNumber} />
        <Row k="Nyilvántartási szám" v={legal.registryNumber} />
        <Row k="ÁFA-státusz" v={legal.vatStatus} />
        <Row k="Székhely" v={legal.registeredOffice} />
        <Row k="Bank" v={legal.bankName} />
        <Row k="Számlaszám" v={legal.bankAccount} />
      </dl>
    </div>
  </div>
);

const Row = ({ k, v }: { k: string; v?: string }) => (
  <div className="flex justify-between gap-4 border-b border-border/50 py-1.5">
    <dt className="text-muted-foreground">{k}</dt>
    <dd className={`font-bold ${!v ? "text-destructive" : ""}`}>{v ?? "PÓTLANDÓ"}</dd>
  </div>
);

const InvoicesTable = ({ invoices }: { invoices: Invoice[] }) => (
  <div className="border border-border overflow-x-auto">
    <table className="w-full text-xs">
      <thead className="bg-secondary/40">
        <tr className="text-left">
          <th className="p-3">Szám</th><th className="p-3">Dátum</th><th className="p-3">Vevő</th>
          <th className="p-3 text-right">Nettó</th><th className="p-3 text-right">ÁFA</th>
          <th className="p-3 text-right">Bruttó</th><th className="p-3">Állapot</th><th className="p-3"></th>
        </tr>
      </thead>
      <tbody>
        {invoices.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nincs adat ebben a hónapban</td></tr>}
        {invoices.map(i => (
          <tr key={i.id} className="border-t border-border hover:bg-secondary/20">
            <td className="p-3 font-mono">{i.invoice_number ?? "—"}</td>
            <td className="p-3">{DATE(i.paid_at ?? i.created_at)}</td>
            <td className="p-3">{i.customer_name ?? "—"}</td>
            <td className="p-3 text-right tabular-nums">{HUF(Number(i.subtotal ?? 0))}</td>
            <td className="p-3 text-right tabular-nums">{HUF(Number(i.tax_amount ?? 0))}</td>
            <td className="p-3 text-right tabular-nums font-bold">{HUF(Number(i.total_amount ?? 0))}</td>
            <td className="p-3"><span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-secondary">{i.status ?? "—"}</span></td>
            <td className="p-3">{i.pdf_url && <a href={i.pdf_url} target="_blank" rel="noopener" className="text-accent hover:underline">PDF</a>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RefundsTable = ({ refunds }: { refunds: Refund[] }) => (
  <div className="border border-border overflow-x-auto">
    <table className="w-full text-xs">
      <thead className="bg-secondary/40"><tr className="text-left"><th className="p-3">Dátum</th><th className="p-3">Tranzakció</th><th className="p-3">Állapot</th><th className="p-3 text-right">Összeg</th></tr></thead>
      <tbody>
        {refunds.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nincs visszatérítés</td></tr>}
        {refunds.map(r => (
          <tr key={r.id} className="border-t border-border"><td className="p-3">{DATE(r.created_at)}</td><td className="p-3 font-mono text-[11px]">{r.transaction_id ?? "—"}</td><td className="p-3">{r.new_status ?? "—"}</td><td className="p-3 text-right tabular-nums">{HUF(Number(r.amount ?? 0))}</td></tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ExpensesTable = ({ items }: { items: Procurement[] }) => (
  <div className="border border-border overflow-x-auto">
    <table className="w-full text-xs">
      <thead className="bg-secondary/40"><tr className="text-left"><th className="p-3">Dátum</th><th className="p-3">Termék</th><th className="p-3">Beszállító</th><th className="p-3 text-right">Db</th><th className="p-3 text-right">Egys. ár</th><th className="p-3 text-right">Összesen</th><th className="p-3">Állapot</th></tr></thead>
      <tbody>
        {items.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nincs költség</td></tr>}
        {items.map(p => (
          <tr key={p.id} className="border-t border-border"><td className="p-3">{DATE(p.created_at)}</td><td className="p-3">{p.product_name}</td><td className="p-3">{p.supplier_name ?? "—"}</td><td className="p-3 text-right">{p.quantity}</td><td className="p-3 text-right tabular-nums">{HUF(Number(p.unit_cost))}</td><td className="p-3 text-right tabular-nums font-bold">{HUF(Number(p.total_cost ?? p.unit_cost * p.quantity))}</td><td className="p-3"><span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-secondary">{p.order_status ?? "—"}</span></td></tr>
        ))}
      </tbody>
    </table>
  </div>
);

const VatSummary = ({ kpi, legal, invoices }: { kpi: any; legal: Legal; invoices: Invoice[] }) => {
  // Bontás ÁFA-kulcsonként
  const byRate = invoices.reduce<Record<string, { net: number; vat: number; gross: number; count: number }>>((acc, i) => {
    const rate = String(i.tax_rate ?? 27);
    if (!acc[rate]) acc[rate] = { net: 0, vat: 0, gross: 0, count: 0 };
    acc[rate].net += Number(i.subtotal ?? 0);
    acc[rate].vat += Number(i.tax_amount ?? 0);
    acc[rate].gross += Number(i.total_amount ?? 0);
    acc[rate].count += 1;
    return acc;
  }, {});
  return (
    <div className="space-y-6">
      <div className="border border-border p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Adóalany</p>
        <p className="text-lg font-bold">{legal.ownerName ?? "—"} · {legal.taxId ?? "—"}</p>
        <p className="text-xs text-muted-foreground mt-1">{legal.vatStatus ?? "ÁFA-státusz pótlandó"}</p>
      </div>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40"><tr className="text-left"><th className="p-3">ÁFA kulcs</th><th className="p-3 text-right">Adóalap (nettó)</th><th className="p-3 text-right">Felszámított ÁFA</th><th className="p-3 text-right">Bruttó</th><th className="p-3 text-right">Tételszám</th></tr></thead>
          <tbody>
            {Object.entries(byRate).sort().map(([rate, v]) => (
              <tr key={rate} className="border-t border-border"><td className="p-3 font-bold">{rate}%</td><td className="p-3 text-right tabular-nums">{HUF(v.net)}</td><td className="p-3 text-right tabular-nums">{HUF(v.vat)}</td><td className="p-3 text-right tabular-nums">{HUF(v.gross)}</td><td className="p-3 text-right">{v.count}</td></tr>
            ))}
            <tr className="border-t-2 border-accent bg-accent/5 font-bold"><td className="p-3">ÖSSZESEN</td><td className="p-3 text-right tabular-nums">{HUF(kpi.net)}</td><td className="p-3 text-right tabular-nums text-accent">{HUF(kpi.vat)}</td><td className="p-3 text-right tabular-nums">{HUF(kpi.gross)}</td><td className="p-3 text-right">{invoices.length}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="border border-border p-5 bg-secondary/20">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Fizetendő ÁFA (becslés)</p>
        <p className="text-3xl font-bold text-accent tabular-nums">{HUF(kpi.vat)}</p>
        <p className="text-xs text-muted-foreground mt-2">Levonható előzetes ÁFA-t (beszerzések) a könyvelő külön rögzíti a bevallásban.</p>
      </div>
    </div>
  );
};

const ExportPanel = ({ onCsv, invoices }: { onCsv: () => void; invoices: Invoice[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    <button onClick={onCsv} disabled={!invoices.length} className="border border-border p-6 text-left hover:border-accent transition-colors disabled:opacity-50">
      <FileSpreadsheet className="h-7 w-7 text-accent mb-3" />
      <p className="font-bold uppercase tracking-wide text-sm">Havi CSV</p>
      <p className="text-xs text-muted-foreground mt-1">Excel/könyvelőprogramba (UTF-8 BOM, pontosvessző)</p>
    </button>
    <div className="border border-border p-6 opacity-60 cursor-not-allowed">
      <FileText className="h-7 w-7 mb-3" />
      <p className="font-bold uppercase tracking-wide text-sm">NAV Online Számla XML</p>
      <p className="text-xs text-muted-foreground mt-1">Hamarosan — admin élesíti a NAV technikai felhasználót</p>
    </div>
    <div className="border border-border p-6 opacity-60 cursor-not-allowed">
      <FileText className="h-7 w-7 mb-3" />
      <p className="font-bold uppercase tracking-wide text-sm">Számlák ZIP letöltés</p>
      <p className="text-xs text-muted-foreground mt-1">Hamarosan — PDF-csomag minden számlához</p>
    </div>
  </div>
);

export default AccountantPortal;

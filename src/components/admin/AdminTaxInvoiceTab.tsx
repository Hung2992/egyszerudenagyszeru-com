import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Save,
  Receipt,
  Percent,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Power,
  Sparkles,
  CheckCircle2,
  FileText,
  Building2,
  Banknote,
  Globe,
  Star,
  StarOff,
} from "lucide-react";

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  country: string;
  is_default: boolean;
  is_active: boolean;
  applies_to?: string;
}

interface InvoiceSettings {
  id: string;
  prefix: string;
  next_number: number;
  company_name: string | null;
  company_address: string | null;
  company_tax_number: string | null;
  company_bank_account: string | null;
  footer_note: string | null;
  auto_generate: boolean;
}

const VAT_PRESETS = [
  { label: "Normál", rate: 27, color: "accent" },
  { label: "Kedvezményes", rate: 18, color: "muted" },
  { label: "Kedvezményes II.", rate: 5, color: "muted" },
  { label: "Mentes (AAM)", rate: 0, color: "muted" },
];

type View = "overview" | "tax_rates" | "invoice";

const AdminTaxInvoiceTab = () => {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [taxForm, setTaxForm] = useState({ name: "", rate: 27, country: "HU" });
  const [view, setView] = useState<View>("overview");
  const [demoPrice, setDemoPrice] = useState<number>(10000);

  const fetchData = async () => {
    const [taxRes, invRes, storeRes] = await Promise.all([
      supabase.from("tax_rates").select("*").order("rate", { ascending: false }),
      supabase.from("invoice_settings").select("*").limit(1).maybeSingle(),
      supabase.from("store_settings").select("*").limit(1).maybeSingle(),
    ]);
    if (taxRes.data) setTaxRates(taxRes.data as TaxRate[]);
    if (invRes.data) {
      setInvoiceSettings(invRes.data as InvoiceSettings);
    } else {
      const { data } = await supabase.from("invoice_settings").insert({}).select().single();
      if (data) setInvoiceSettings(data as InvoiceSettings);
    }
    if (storeRes.data) setStoreSettings(storeRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStore = (patch: Record<string, any>) =>
    setStoreSettings((s: any) => ({ ...s, ...patch }));

  const saveStore = async () => {
    if (!storeSettings) return;
    setSaving(true);
    const { error } = await supabase
      .from("store_settings")
      .update({
        vat_enabled: storeSettings.vat_enabled,
        vat_rate: storeSettings.vat_rate,
        vat_mode: storeSettings.vat_mode,
        price_display_mode: storeSettings.price_display_mode,
        vat_exempt: storeSettings.vat_exempt,
        vat_exempt_reason: storeSettings.vat_exempt_reason,
        reverse_charge_enabled: storeSettings.reverse_charge_enabled,
      })
      .eq("id", storeSettings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "ÁFA beállítások frissítve." });
  };

  const addTax = async () => {
    if (!taxForm.name.trim()) return;
    const { error } = await supabase.from("tax_rates").insert({
      name: taxForm.name,
      rate: taxForm.rate,
      country: taxForm.country,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Adókulcs hozzáadva" });
      setShowTaxForm(false);
      setTaxForm({ name: "", rate: 27, country: "HU" });
      fetchData();
    }
  };

  const toggleTax = async (id: string, active: boolean) => {
    await supabase.from("tax_rates").update({ is_active: !active }).eq("id", id);
    fetchData();
  };

  const setDefault = async (id: string) => {
    await supabase.from("tax_rates").update({ is_default: false }).neq("id", id);
    await supabase.from("tax_rates").update({ is_default: true }).eq("id", id);
    fetchData();
  };

  const deleteTax = async (id: string) => {
    await supabase.from("tax_rates").delete().eq("id", id);
    toast({ title: "Törölve" });
    fetchData();
  };

  const saveInvoice = async () => {
    if (!invoiceSettings) return;
    setSaving(true);
    const { error } = await supabase
      .from("invoice_settings")
      .update({
        prefix: invoiceSettings.prefix,
        next_number: invoiceSettings.next_number,
        company_name: invoiceSettings.company_name,
        company_address: invoiceSettings.company_address,
        company_tax_number: invoiceSettings.company_tax_number,
        company_bank_account: invoiceSettings.company_bank_account,
        footer_note: invoiceSettings.footer_note,
        auto_generate: invoiceSettings.auto_generate,
      })
      .eq("id", invoiceSettings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Számlázási beállítások mentve" });
  };

  const calc = useMemo(() => {
    if (!storeSettings) return null;
    const enabled = !!storeSettings.vat_enabled && !storeSettings.vat_exempt;
    const rate = enabled ? Number(storeSettings.vat_rate) || 0 : 0;
    const r = rate / 100;
    const mode = storeSettings.vat_mode || "gross";
    const p = Number(demoPrice) || 0;
    let net: number;
    let gross: number;
    let vat: number;
    if (!enabled) {
      net = p;
      gross = p;
      vat = 0;
    } else if (mode === "gross") {
      gross = p;
      net = p / (1 + r);
      vat = gross - net;
    } else {
      net = p;
      vat = p * r;
      gross = net + vat;
    }
    return { net, gross, vat, rate, enabled };
  }, [storeSettings, demoPrice]);

  if (loading) return <p className="text-muted-foreground p-4">Betöltés…</p>;
  if (!storeSettings) return <p className="text-destructive p-4">Hiba a betöltésben.</p>;

  const vatActive = !!storeSettings.vat_enabled && !storeSettings.vat_exempt;

  // NAV megfelelőségi mérő
  const checks = [
    { label: "Cégnév kitöltve", ok: !!invoiceSettings?.company_name?.trim() },
    { label: "Cím kitöltve", ok: !!invoiceSettings?.company_address?.trim() },
    { label: "Adószám kitöltve", ok: !!invoiceSettings?.company_tax_number?.trim() },
    { label: "Számla prefix", ok: !!invoiceSettings?.prefix?.trim() },
    { label: "ÁFA mód beállítva", ok: !!storeSettings.vat_mode },
    {
      label: "Aktív adókulcs",
      ok: taxRates.some((t) => t.is_active && t.is_default),
    },
    {
      label: "Automatikus számla",
      ok: !!invoiceSettings?.auto_generate,
    },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const compliance = Math.round((passed / checks.length) * 100);
  const compliant = passed === checks.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black uppercase tracking-widest">Adó &amp; Számlázás</h2>
            <Badge className="rounded-none bg-accent text-accent-foreground uppercase tracking-wider text-[10px]">
              <Sparkles className="h-3 w-3 mr-1" /> Pro
            </Badge>
            <Badge
              variant="outline"
              className={`rounded-none uppercase tracking-wider text-[10px] ${
                vatActive ? "border-accent text-accent" : ""
              }`}
            >
              {vatActive ? `ÁFA ${storeSettings.vat_rate}% BE` : "ÁFA KI"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Egyetlen kapcsolóval ÁFA be/ki — automatikus számolás kosárban, számlán,
            könyvelésben. NAV-kompatibilis számlasorszám rendszerrel.
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-none uppercase tracking-wider text-xs"
          onClick={async () => {
            await saveStore();
            await saveInvoice();
          }}
          disabled={saving}
        >
          <Save className="h-3.5 w-3.5 mr-1" />
          {saving ? "Mentés…" : "Minden mentése"}
        </Button>
      </div>

      {/* Nézetváltó */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { key: "overview", label: "Áttekintés", Icon: Power },
          { key: "tax_rates", label: "Adókulcsok", Icon: Percent },
          { key: "invoice", label: "Számlázás", Icon: Receipt },
        ] as const).map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`flex items-center justify-center gap-2 border-2 px-3 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              view === v.key
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-card text-foreground hover:border-accent"
            }`}
          >
            <v.Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        ))}
      </div>

      {/* ─── ÁTTEKINTÉS ─── */}
      {view === "overview" && (
        <>
          {/* MASTER VAT SWITCH */}
          <div
            className={`relative border-2 ${
              vatActive ? "border-accent" : "border-border"
            } p-6 transition-colors`}
          >
            <div className="absolute -top-3 left-4 bg-background px-2 text-[10px] font-bold uppercase tracking-widest text-accent">
              Fő ÁFA kapcsoló
            </div>
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex items-start gap-4 flex-1 min-w-[260px]">
                <div
                  className={`h-14 w-14 flex items-center justify-center border-2 ${
                    vatActive ? "border-accent text-accent" : "border-muted text-muted-foreground"
                  }`}
                >
                  <Power className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold uppercase tracking-wider">
                      ÁFA {vatActive ? "BEKAPCSOLVA" : "KIKAPCSOLVA"}
                    </h3>
                    <Badge
                      variant={vatActive ? "default" : "outline"}
                      className="rounded-none uppercase tracking-wider text-[10px]"
                    >
                      {vatActive ? `${storeSettings.vat_rate}%` : "0%"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    {vatActive
                      ? "Az ÁFA aktívan szerepel a végső árban, kosárban és számlán."
                      : storeSettings.vat_exempt
                        ? "Alanyi adómentes (AAM) mód — minden ár ÁFA nélkül."
                        : "Az ÁFA jelenleg nem kerül felszámításra."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Ki
                </span>
                <Switch
                  checked={!!storeSettings.vat_enabled}
                  onCheckedChange={(v) => updateStore({ vat_enabled: v })}
                  className="scale-150"
                />
                <span className="text-xs uppercase tracking-wider text-accent font-bold">
                  Be
                </span>
              </div>
            </div>

            {/* preset gombok */}
            <div className="mt-6 flex flex-wrap gap-2">
              {VAT_PRESETS.map((p) => (
                <Button
                  key={p.rate}
                  size="sm"
                  variant={Number(storeSettings.vat_rate) === p.rate ? "default" : "outline"}
                  className="rounded-none uppercase tracking-wider text-[11px]"
                  onClick={() =>
                    updateStore({ vat_rate: p.rate, vat_enabled: p.rate > 0 })
                  }
                  disabled={storeSettings.vat_exempt}
                >
                  <Percent className="h-3 w-3 mr-1" /> {p.label} {p.rate}%
                </Button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                className="rounded-none uppercase tracking-wider text-xs"
                onClick={saveStore}
                disabled={saving}
              >
                <Save className="h-3.5 w-3.5 mr-1" /> ÁFA mentése
              </Button>
            </div>
          </div>

          {/* NAV megfelelőségi mérő */}
          <div
            className={`border-2 ${
              compliant ? "border-accent" : "border-destructive"
            } p-5`}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div
                  className={`h-12 w-12 flex items-center justify-center border-2 ${
                    compliant
                      ? "border-accent text-accent"
                      : "border-destructive text-destructive"
                  }`}
                >
                  {compliant ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <AlertTriangle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    {compliant ? "NAV-kompatibilis" : "Hiányzó adatok"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {passed}/{checks.length} ellenőrzés sikeres ({compliance}%)
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-64">
                <div className="h-2 w-full bg-muted">
                  <div
                    className={`h-2 ${compliant ? "bg-accent" : "bg-destructive"}`}
                    style={{ width: `${compliance}%` }}
                  />
                </div>
              </div>
            </div>
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checks.map((c) => (
                <li
                  key={c.label}
                  className={`flex items-center gap-2 text-xs border-l-2 px-2 py-1.5 ${
                    c.ok
                      ? "border-accent text-foreground"
                      : "border-destructive text-muted-foreground"
                  }`}
                >
                  {c.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  {c.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Élő ÁFA kalkulátor + módok */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="border p-5 space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                <Percent className="h-4 w-4 text-accent" /> ÁFA módok
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider">ÁFA kulcs (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={storeSettings.vat_rate ?? 27}
                  onChange={(e) =>
                    updateStore({ vat_rate: parseFloat(e.target.value) || 0 })
                  }
                  className="rounded-none mt-1 max-w-xs text-lg font-bold"
                  disabled={!storeSettings.vat_enabled || storeSettings.vat_exempt}
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider">
                  Árak tárolási módja
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { v: "gross", l: "Bruttó (ÁFÁ-val)" },
                    { v: "net", l: "Nettó (ÁFA nélkül)" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => updateStore({ vat_mode: o.v })}
                      className={`border p-3 text-xs uppercase tracking-wider text-left transition-colors ${
                        storeSettings.vat_mode === o.v
                          ? "border-accent bg-accent/10 text-accent font-bold"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider">
                  Árkijelzés a vásárlóknak
                </Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { v: "gross", l: "Bruttó" },
                    { v: "net", l: "Nettó" },
                    { v: "both", l: "Mindkettő" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => updateStore({ price_display_mode: o.v })}
                      className={`border p-3 text-xs uppercase tracking-wider transition-colors ${
                        storeSettings.price_display_mode === o.v
                          ? "border-accent bg-accent/10 text-accent font-bold"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Élő kalkulátor */}
            <div className="border p-5 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                <Calculator className="h-4 w-4 text-accent" /> Élő ÁFA kalkulátor
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">
                  Teszt ár ({storeSettings.vat_mode === "net" ? "nettó" : "bruttó"})
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={demoPrice}
                  onChange={(e) => setDemoPrice(parseFloat(e.target.value) || 0)}
                  className="rounded-none mt-1 max-w-xs text-lg font-bold"
                />
              </div>

              {calc && (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="border p-3 bg-background">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Nettó
                    </div>
                    <div className="text-lg font-black mt-1 tabular-nums">
                      {Math.round(calc.net).toLocaleString("hu-HU")} Ft
                    </div>
                  </div>
                  <div className="border p-3 bg-background">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      ÁFA ({calc.rate}%)
                    </div>
                    <div className="text-lg font-black mt-1 tabular-nums text-accent">
                      {Math.round(calc.vat).toLocaleString("hu-HU")} Ft
                    </div>
                  </div>
                  <div className="border-2 border-accent p-3 bg-background">
                    <div className="text-[10px] uppercase tracking-wider text-accent font-bold">
                      Bruttó
                    </div>
                    <div className="text-lg font-black mt-1 tabular-nums">
                      {Math.round(calc.gross).toLocaleString("hu-HU")} Ft
                    </div>
                  </div>
                </div>
              )}

              {!calc?.enabled && (
                <div className="flex items-start gap-2 text-[11px] text-muted-foreground border-l-2 border-muted-foreground/40 pl-3">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Az ÁFA jelenleg nincs aktiválva — minden összeg ÁFA nélkül.</span>
                </div>
              )}
            </div>
          </div>

          {/* Speciális adójogi módok */}
          <div className="border p-5 space-y-5">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-accent" /> Speciális adójogi módok
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider font-bold">
                    Alanyi adómentesség (AAM)
                  </Label>
                  <Switch
                    checked={!!storeSettings.vat_exempt}
                    onCheckedChange={(v) => updateStore({ vat_exempt: v })}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Bekapcsolva minden számlán „AAM" jelölés és <strong>0% ÁFA</strong>.
                </p>
                {storeSettings.vat_exempt && (
                  <Input
                    value={storeSettings.vat_exempt_reason ?? ""}
                    onChange={(e) => updateStore({ vat_exempt_reason: e.target.value })}
                    placeholder="Pl. AAM — Áfa tv. XIII. fejezet"
                    className="rounded-none"
                  />
                )}
              </div>
              <div className="border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider font-bold">
                    Fordított adózás (B2B EU)
                  </Label>
                  <Switch
                    checked={!!storeSettings.reverse_charge_enabled}
                    onCheckedChange={(v) => updateStore({ reverse_charge_enabled: v })}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  EU-s, érvényes adószámmal rendelkező B2B vevőknél automatikus
                  fordított adózás.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── ADÓKULCSOK ─── */}
      {view === "tax_rates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Globe className="h-4 w-4 text-accent" /> Adókulcsok ({taxRates.length})
            </div>
            <Button
              size="sm"
              className="rounded-none uppercase tracking-wider text-xs"
              onClick={() => setShowTaxForm(!showTaxForm)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Új adókulcs
            </Button>
          </div>

          {showTaxForm && (
            <div className="border-2 border-accent p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider">Megnevezés</Label>
                  <Input
                    value={taxForm.name}
                    onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                    placeholder="pl. Normál ÁFA"
                    className="rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Kulcs (%)</Label>
                  <Input
                    type="number"
                    value={taxForm.rate}
                    onChange={(e) =>
                      setTaxForm({ ...taxForm, rate: parseFloat(e.target.value) || 0 })
                    }
                    className="rounded-none mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Ország</Label>
                  <Input
                    value={taxForm.country}
                    onChange={(e) => setTaxForm({ ...taxForm, country: e.target.value })}
                    className="rounded-none mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-none text-xs"
                  onClick={() => setShowTaxForm(false)}
                >
                  Mégse
                </Button>
                <Button
                  size="sm"
                  className="rounded-none uppercase tracking-wider text-xs"
                  onClick={addTax}
                >
                  <Save className="h-3.5 w-3.5 mr-1" /> Mentés
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            {taxRates.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 border p-3 ${
                  t.is_default ? "border-accent bg-accent/5" : "border-border"
                }`}
              >
                <button
                  onClick={() => setDefault(t.id)}
                  className="shrink-0"
                  title={t.is_default ? "Alapértelmezett" : "Beállítás alapértelmezettként"}
                >
                  {t.is_default ? (
                    <Star className="h-5 w-5 text-accent fill-accent" />
                  ) : (
                    <StarOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{t.name}</span>
                    <Badge variant="outline" className="rounded-none text-[10px]">
                      <Percent className="h-2.5 w-2.5 mr-0.5" />
                      {t.rate}%
                    </Badge>
                    <Badge variant="outline" className="rounded-none text-[10px]">
                      {t.country}
                    </Badge>
                    {t.is_default && (
                      <Badge className="rounded-none bg-accent text-accent-foreground text-[10px] uppercase tracking-wider">
                        Alapértelmezett
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={t.is_active}
                  onCheckedChange={() => toggleTax(t.id, t.is_active)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-none h-8 w-8"
                  onClick={() => deleteTax(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            {taxRates.length === 0 && (
              <div className="text-center text-muted-foreground border border-dashed p-8 text-sm">
                Nincs adókulcs. Adj hozzá egyet a fenti gombbal.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SZÁMLÁZÁS ─── */}
      {view === "invoice" && invoiceSettings && (
        <div className="space-y-6">
          <div
            className={`border-2 p-5 flex items-start justify-between gap-4 flex-wrap ${
              invoiceSettings.auto_generate ? "border-accent" : "border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`h-12 w-12 flex items-center justify-center border-2 ${
                  invoiceSettings.auto_generate
                    ? "border-accent text-accent"
                    : "border-muted text-muted-foreground"
                }`}
              >
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Automatikus számlagenerálás
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Rendelés után automatikusan számla készül
                </p>
              </div>
            </div>
            <Switch
              checked={invoiceSettings.auto_generate}
              onCheckedChange={(v) =>
                setInvoiceSettings({ ...invoiceSettings, auto_generate: v })
              }
              className="scale-125"
            />
          </div>

          <div className="border p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <FileText className="h-4 w-4 text-accent" /> Számla sorszám
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider">Prefix</Label>
                <Input
                  value={invoiceSettings.prefix}
                  onChange={(e) =>
                    setInvoiceSettings({ ...invoiceSettings, prefix: e.target.value })
                  }
                  className="rounded-none mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">
                  Következő sorszám
                </Label>
                <Input
                  type="number"
                  value={invoiceSettings.next_number}
                  onChange={(e) =>
                    setInvoiceSettings({
                      ...invoiceSettings,
                      next_number: parseInt(e.target.value) || 1,
                    })
                  }
                  className="rounded-none mt-1 font-mono"
                />
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground border-l-2 border-accent pl-3 font-mono">
              Következő számla:{" "}
              <span className="font-bold text-foreground">
                {invoiceSettings.prefix}-{new Date().getFullYear()}-
                {String(invoiceSettings.next_number).padStart(5, "0")}
              </span>
            </div>
          </div>

          <div className="border p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Building2 className="h-4 w-4 text-accent" /> Cégadatok
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider">Cégnév *</Label>
                <Input
                  value={invoiceSettings.company_name || ""}
                  onChange={(e) =>
                    setInvoiceSettings({
                      ...invoiceSettings,
                      company_name: e.target.value,
                    })
                  }
                  className="rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Adószám *</Label>
                <Input
                  value={invoiceSettings.company_tax_number || ""}
                  onChange={(e) =>
                    setInvoiceSettings({
                      ...invoiceSettings,
                      company_tax_number: e.target.value,
                    })
                  }
                  className="rounded-none mt-1 font-mono"
                  placeholder="12345678-1-42"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Cím *</Label>
              <Input
                value={invoiceSettings.company_address || ""}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    company_address: e.target.value,
                  })
                }
                className="rounded-none mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider flex items-center gap-1">
                <Banknote className="h-3 w-3" /> Bankszámlaszám
              </Label>
              <Input
                value={invoiceSettings.company_bank_account || ""}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    company_bank_account: e.target.value,
                  })
                }
                className="rounded-none mt-1 font-mono"
                placeholder="12345678-12345678-12345678"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Számla lábléc</Label>
              <Textarea
                value={invoiceSettings.footer_note || ""}
                onChange={(e) =>
                  setInvoiceSettings({
                    ...invoiceSettings,
                    footer_note: e.target.value,
                  })
                }
                rows={3}
                className="rounded-none mt-1 text-xs"
                placeholder="pl. Köszönjük a vásárlást! AAM — alanyi adómentes."
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              className="rounded-none uppercase tracking-wider text-xs"
              onClick={saveInvoice}
              disabled={saving}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? "Mentés…" : "Számlázás mentése"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTaxInvoiceTab;

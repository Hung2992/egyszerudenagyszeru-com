import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Receipt,
  FileDown,
  Percent,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Power,
  Banknote,
  FileText,
  Sparkles,
} from "lucide-react";

const VAT_PRESETS = [
  { label: "Normál (HU)", rate: 27 },
  { label: "Kedvezményes", rate: 18 },
  { label: "Kedvezményes II.", rate: 5 },
  { label: "Mentes", rate: 0 },
];

const AdminAccountingTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [demoPrice, setDemoPrice] = useState<number>(10000);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (data) setSettings(data);
    })();
  }, []);

  const update = (patch: Record<string, any>) => setSettings((s: any) => ({ ...s, ...patch }));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("store_settings")
      .update({
        vat_enabled: settings.vat_enabled,
        vat_rate: settings.vat_rate,
        vat_mode: settings.vat_mode,
        price_display_mode: settings.price_display_mode,
        vat_exempt: settings.vat_exempt,
        vat_exempt_reason: settings.vat_exempt_reason,
        reverse_charge_enabled: settings.reverse_charge_enabled,
        accounting_vat_rate: settings.accounting_vat_rate,
        accounting_invoice_prefix: settings.accounting_invoice_prefix,
        accounting_auto_invoice: settings.accounting_auto_invoice,
        accounting_export_format: settings.accounting_export_format,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Adó és könyvelési beállítások frissítve." });
  };

  const calc = useMemo(() => {
    if (!settings) return null;
    const enabled = !!settings.vat_enabled && !settings.vat_exempt;
    const rate = enabled ? Number(settings.vat_rate) || 0 : 0;
    const r = rate / 100;
    const mode = settings.vat_mode || "gross";
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
  }, [settings, demoPrice]);

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés…</div>;

  const vatActive = !!settings.vat_enabled && !settings.vat_exempt;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black uppercase tracking-widest">Adó &amp; Könyvelés</h2>
            <Badge className="rounded-none bg-accent text-accent-foreground uppercase tracking-wider text-[10px]">
              <Sparkles className="h-3 w-3 mr-1" /> Pro
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Egy kapcsolóval be- vagy kikapcsolhatod az ÁFA-t. Az árak automatikusan, a beállított mód
            szerint kerülnek számolásra a kosárban, számlán és könyvelési exportban.
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-none uppercase tracking-wider text-xs"
          onClick={save}
          disabled={saving}
        >
          <Save className="h-3.5 w-3.5 mr-1" />
          {saving ? "Mentés…" : "Mentés"}
        </Button>
      </div>

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
              className={`h-12 w-12 flex items-center justify-center border-2 ${
                vatActive ? "border-accent text-accent" : "border-muted text-muted-foreground"
              }`}
            >
              <Power className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold uppercase tracking-wider">
                  ÁFA {vatActive ? "BEKAPCSOLVA" : "KIKAPCSOLVA"}
                </h3>
                <Badge
                  variant={vatActive ? "default" : "outline"}
                  className="rounded-none uppercase tracking-wider text-[10px]"
                >
                  {vatActive ? `${settings.vat_rate}%` : "0%"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                {vatActive
                  ? "Az ÁFA aktívan szerepel a végső árban, a kosárban és a számlán."
                  : settings.vat_exempt
                  ? "Alanyi adómentes módban vagy — minden ár ÁFA nélkül kerül feltüntetésre."
                  : "Az ÁFA jelenleg nem kerül felszámításra. Az árak ÁFA nélkül jelennek meg."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Ki</span>
            <Switch
              checked={!!settings.vat_enabled}
              onCheckedChange={(v) => update({ vat_enabled: v })}
              className="scale-150"
            />
            <span className="text-xs uppercase tracking-wider text-accent font-bold">Be</span>
          </div>
        </div>

        {/* preset gombok */}
        <div className="mt-6 flex flex-wrap gap-2">
          {VAT_PRESETS.map((p) => (
            <Button
              key={p.rate}
              size="sm"
              variant={Number(settings.vat_rate) === p.rate ? "default" : "outline"}
              className="rounded-none uppercase tracking-wider text-[11px]"
              onClick={() => update({ vat_rate: p.rate, vat_enabled: p.rate > 0 })}
              disabled={settings.vat_exempt}
            >
              <Percent className="h-3 w-3 mr-1" /> {p.label} {p.rate}%
            </Button>
          ))}
        </div>
      </div>

      {/* Részletes ÁFA beállítások */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border p-5 space-y-5">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Percent className="h-4 w-4 text-accent" /> ÁFA finomhangolás
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider">ÁFA kulcs (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={settings.vat_rate ?? 27}
              onChange={(e) => update({ vat_rate: parseFloat(e.target.value) || 0 })}
              className="rounded-none mt-1 max-w-xs"
              disabled={!settings.vat_enabled || settings.vat_exempt}
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider">Árak tárolási módja</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { v: "gross", l: "Bruttó (ÁFÁ-val)" },
                { v: "net", l: "Nettó (ÁFA nélkül)" },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => update({ vat_mode: o.v })}
                  className={`border p-3 text-xs uppercase tracking-wider text-left transition-colors ${
                    settings.vat_mode === o.v
                      ? "border-accent bg-accent/10 text-accent font-bold"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              A termékáraidat melyik formában adod meg az adminban.
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider">Árkijelzés a vásárlóknak</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { v: "gross", l: "Bruttó" },
                { v: "net", l: "Nettó" },
                { v: "both", l: "Mindkettő" },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => update({ price_display_mode: o.v })}
                  className={`border p-3 text-xs uppercase tracking-wider transition-colors ${
                    settings.price_display_mode === o.v
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
              Teszt ár ({settings.vat_mode === "net" ? "nettó" : "bruttó"})
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
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Nettó</div>
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
                <div className="text-[10px] uppercase tracking-wider text-accent font-bold">Bruttó</div>
                <div className="text-lg font-black mt-1 tabular-nums">
                  {Math.round(calc.gross).toLocaleString("hu-HU")} Ft
                </div>
              </div>
            </div>
          )}

          {!calc?.enabled && (
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground border-l-2 border-muted-foreground/40 pl-3">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Az ÁFA jelenleg nincs aktiválva — minden összeg ÁFA nélkül szerepel.</span>
            </div>
          )}
        </div>
      </div>

      {/* Speciális adójogi beállítások */}
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
                checked={!!settings.vat_exempt}
                onCheckedChange={(v) => update({ vat_exempt: v })}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Bekapcsolva minden számlán „AAM” jelölés és <strong>0% ÁFA</strong> szerepel,
              függetlenül a kulcstól.
            </p>
            {settings.vat_exempt && (
              <Input
                value={settings.vat_exempt_reason ?? ""}
                onChange={(e) => update({ vat_exempt_reason: e.target.value })}
                placeholder="Pl. AAM (alanyi adómentes) — Áfa tv. XIII. fejezet"
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
                checked={!!settings.reverse_charge_enabled}
                onCheckedChange={(v) => update({ reverse_charge_enabled: v })}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              EU-s, érvényes adószámmal rendelkező B2B vevőknél automatikusan fordított adózást
              alkalmaz a számla.
            </p>
          </div>
        </div>
      </div>

      {/* Számla beállítások */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Receipt className="h-4 w-4 text-accent" /> Számla beállítások
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Számla prefix</Label>
            <Input
              value={settings.accounting_invoice_prefix ?? "INV-"}
              onChange={(e) => update({ accounting_invoice_prefix: e.target.value })}
              className="rounded-none mt-1 max-w-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider">Automatikus számlakiállítás</Label>
            <Switch
              checked={!!settings.accounting_auto_invoice}
              onCheckedChange={(v) => update({ accounting_auto_invoice: v })}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Rendelés után automatikusan generálódik a számla a fenti adózási beállításokkal.
          </p>
        </div>

        <div className="border p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <FileDown className="h-4 w-4 text-accent" /> Könyvelési export
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Export formátum</Label>
            <select
              value={settings.accounting_export_format ?? "csv"}
              onChange={(e) => update({ accounting_export_format: e.target.value })}
              className="flex h-10 w-full max-w-xs rounded-none border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX (Excel)</option>
              <option value="xml">XML (NAV)</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Banknote className="h-3 w-3" /> NAV-kompatibilis
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3" /> ÁFA bontva
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAccountingTab;

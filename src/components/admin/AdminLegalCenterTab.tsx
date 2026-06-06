import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Shield,
  FileText,
  Cookie,
  Undo2,
  Truck,
  ShieldCheck,
  Building2,
  Scale,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from "lucide-react";

type DocKey =
  | "terms_and_conditions"
  | "privacy_policy"
  | "cookie_policy"
  | "withdrawal_policy"
  | "shipping_policy"
  | "warranty_policy"
  | "imprint"
  | "legal_disclaimer";

interface LegalDoc {
  key: DocKey;
  title: string;
  short: string;
  Icon: any;
  publicPath: string;
  hint: string;
  required: boolean;
}

const DOCS: LegalDoc[] = [
  {
    key: "terms_and_conditions",
    title: "ÁSZF",
    short: "Általános Szerződési Feltételek",
    Icon: FileText,
    publicPath: "/legal/aszf",
    hint: "EU + magyar fogyasztóvédelmi szabályok szerint kötelező.",
    required: true,
  },
  {
    key: "privacy_policy",
    title: "Adatvédelem",
    short: "GDPR Adatkezelési tájékoztató",
    Icon: Shield,
    publicPath: "/legal/adatvedelem",
    hint: "GDPR (EU 2016/679) szerint kötelező.",
    required: true,
  },
  {
    key: "cookie_policy",
    title: "Cookie",
    short: "Süti szabályzat",
    Icon: Cookie,
    publicPath: "/legal/cookie",
    hint: "ePrivacy + GDPR szerinti süti tájékoztató.",
    required: true,
  },
  {
    key: "withdrawal_policy",
    title: "Elállás",
    short: "14 napos elállási / felmondási jog",
    Icon: Undo2,
    publicPath: "/legal/elallas",
    hint: "45/2014. (II.26.) Korm. rendelet szerint kötelező.",
    required: true,
  },
  {
    key: "shipping_policy",
    title: "Szállítás",
    short: "Szállítási és fizetési feltételek",
    Icon: Truck,
    publicPath: "/legal/szallitas",
    hint: "Vásárlói tájékoztatás minimuma.",
    required: false,
  },
  {
    key: "warranty_policy",
    title: "Garancia",
    short: "Szavatosság, jótállás, panaszkezelés",
    Icon: ShieldCheck,
    publicPath: "/legal/garancia",
    hint: "Ptk. + 19/2014. (IV.29.) NGM rendelet.",
    required: false,
  },
  {
    key: "imprint",
    title: "Impresszum",
    short: "Szolgáltató adatai",
    Icon: Building2,
    publicPath: "/legal/impresszum",
    hint: "Ekertv. szerinti kötelező adatok.",
    required: true,
  },
  {
    key: "legal_disclaimer",
    title: "Jogi nyilatkozat",
    short: "Felelősségkorlátozás, szellemi tulajdon",
    Icon: Scale,
    publicPath: "/legal/jogi-nyilatkozat",
    hint: "Felelősségi és copyright nyilatkozat.",
    required: false,
  },
];

const AdminLegalCenterTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [active, setActive] = useState<DocKey>("terms_and_conditions");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (data) setSettings(data);
    })();
  }, []);

  const update = (patch: Record<string, any>) =>
    setSettings((s: any) => ({ ...s, ...patch }));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const payload: Record<string, any> = {};
    DOCS.forEach((d) => {
      payload[d.key] = settings[d.key] ?? "";
    });
    payload.legal_require_consent_register = !!settings.legal_require_consent_register;
    payload.legal_require_consent_checkout = !!settings.legal_require_consent_checkout;
    payload.legal_show_in_footer = !!settings.legal_show_in_footer;
    payload.legal_version = settings.legal_version || "1.0";
    payload.legal_effective_date = settings.legal_effective_date || null;

    // Cégadatok (impresszum / NAV-megfelelőség)
    const companyFields = [
      "legal_owner_name", "legal_registry_number", "legal_vat_status",
      "legal_eu_vat_number", "legal_invoice_email", "legal_privacy_email",
      "legal_phone", "legal_customer_hours", "legal_mailing_address",
      "legal_bank_name", "invoice_company_name", "invoice_tax_number",
      "invoice_address", "invoice_bank_account", "contact_email", "contact_phone",
    ];
    companyFields.forEach((f) => { payload[f] = settings[f] ?? null; });

    const { error } = await supabase
      .from("store_settings")
      .update(payload)
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mentve", description: "Jogi dokumentumok frissítve." });
    }
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés…</div>;

  const filledCount = DOCS.filter((d) => (settings[d.key] || "").trim().length > 50).length;
  const requiredFilledCount = DOCS.filter(
    (d) => d.required && (settings[d.key] || "").trim().length > 50
  ).length;
  const totalRequired = DOCS.filter((d) => d.required).length;
  const completionPct = Math.round((filledCount / DOCS.length) * 100);
  const compliant = requiredFilledCount === totalRequired;

  const activeDoc = DOCS.find((d) => d.key === active)!;
  const activeContent = settings[active] || "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black uppercase tracking-widest">Jogi Központ</h2>
            <Badge className="rounded-none bg-accent text-accent-foreground uppercase tracking-wider text-[10px]">
              <Sparkles className="h-3 w-3 mr-1" /> Pro
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Minden jogi dokumentum egy helyen — szerkesztés, élő preview, GDPR / EU
            megfelelőség egy gombnyomással.
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

      {/* Compliance bar */}
      <div
        className={`relative border-2 ${
          compliant ? "border-accent" : "border-destructive"
        } p-6`}
      >
        <div className="absolute -top-3 left-4 bg-background px-2 text-[10px] font-bold uppercase tracking-widest text-accent">
          Megfelelőségi Státusz
        </div>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4 flex-1 min-w-[260px]">
            <div
              className={`h-14 w-14 flex items-center justify-center border-2 ${
                compliant
                  ? "border-accent text-accent"
                  : "border-destructive text-destructive"
              }`}
            >
              {compliant ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <AlertTriangle className="h-7 w-7" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wider">
                {compliant ? "GDPR + EU megfelelő" : "Hiányzó kötelező dokumentumok"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Kötelező:{" "}
                <span className="font-bold text-foreground">
                  {requiredFilledCount}/{totalRequired}
                </span>{" "}
                kitöltve · Összes:{" "}
                <span className="font-bold text-foreground">
                  {filledCount}/{DOCS.length}
                </span>{" "}
                ({completionPct}%)
              </p>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <div className="h-2 w-full bg-muted">
              <div
                className={`h-2 ${compliant ? "bg-accent" : "bg-destructive"}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
              {completionPct}% kész
            </p>
          </div>
        </div>
      </div>

      {/* Globális kapcsolók */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider font-bold">
              Regisztráció kötelező pipa
            </Label>
            <Switch
              checked={!!settings.legal_require_consent_register}
              onCheckedChange={(v) => update({ legal_require_consent_register: v })}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Regisztrációkor kötelező elfogadtatja az ÁSZF + Adatvédelem + Cookie-kat.
          </p>
        </div>
        <div className="border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider font-bold">
              Checkout kötelező pipa
            </Label>
            <Switch
              checked={!!settings.legal_require_consent_checkout}
              onCheckedChange={(v) => update({ legal_require_consent_checkout: v })}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Rendelés leadásához kötelező elfogadtatás.
          </p>
        </div>
        <div className="border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider font-bold">
              Footer linkek megjelenítése
            </Label>
            <Switch
              checked={settings.legal_show_in_footer !== false}
              onCheckedChange={(v) => update({ legal_show_in_footer: v })}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Minden jogi dokumentum link a footerben.
          </p>
        </div>
      </div>

      {/* Verzió + dátum */}
      <div className="grid gap-4 md:grid-cols-2 border p-5">
        <div>
          <Label className="text-xs uppercase tracking-wider">Verzió</Label>
          <Input
            value={settings.legal_version || "1.0"}
            onChange={(e) => update({ legal_version: e.target.value })}
            className="rounded-none mt-1"
            placeholder="1.0"
          />
      </div>

      {/* Cégadatok — impresszum / NAV megfelelőség */}
      <div className="border-2 border-accent/60 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" /> Cégadatok / Impresszum
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-xl">
              Ezek az adatok jelennek meg élesben az <strong>/legal/impresszum</strong> oldalon,
              és a kibocsátott számlákon. EV-regisztráció (NAV Webes Ügysegéd) után töltsd ki.
            </p>
          </div>
          <Badge variant="outline" className="rounded-none text-[10px] uppercase">
            Jogszabály alapján publikus
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {[
            { k: "legal_owner_name",       label: "Tulajdonos teljes neve",       ph: "pl. Horváth Zoltán" },
            { k: "invoice_company_name",   label: "Vállalkozás neve",             ph: "pl. Horváth Zoltán e.v." },
            { k: "invoice_tax_number",     label: "Adószám",                      ph: "12345678-1-42" },
            { k: "legal_eu_vat_number",    label: "Közösségi adószám (opcionális)", ph: "HU12345678" },
            { k: "legal_registry_number",  label: "Nyilvántartási szám (EV szám)", ph: "12345678" },
            { k: "legal_vat_status",       label: "ÁFA-státusz",                  ph: "Alanyi adómentes / 27% ÁFA-s" },
            { k: "invoice_address",        label: "Székhely (teljes cím)",        ph: "1234 Budapest, Példa utca 1." },
            { k: "legal_mailing_address",  label: "Levelezési cím (ha eltér)",    ph: "ugyanaz, vagy: 1234 Budapest, Pf. 12." },
            { k: "contact_email",          label: "Általános e-mail",             ph: "info@egyszerudenagyszeru.com" },
            { k: "legal_invoice_email",    label: "Jogi/számlázási e-mail",       ph: "jog@egyszerudenagyszeru.com" },
            { k: "legal_privacy_email",    label: "Adatvédelmi e-mail",           ph: "adatvedelem@egyszerudenagyszeru.com" },
            { k: "legal_phone",            label: "Ügyfélszolgálati telefon",     ph: "+36 30 123 4567" },
            { k: "legal_customer_hours",   label: "Ügyfélszolgálat ideje",        ph: "Munkanapokon 9:00–17:00" },
            { k: "legal_bank_name",        label: "Bank neve",                    ph: "pl. OTP Bank" },
            { k: "invoice_bank_account",   label: "Bankszámlaszám",               ph: "12345678-12345678-12345678" },
          ].map((f) => (
            <div key={f.k}>
              <Label className="text-[11px] uppercase tracking-wider">{f.label}</Label>
              <Input
                value={settings[f.k] || ""}
                onChange={(e) => update({ [f.k]: e.target.value })}
                className="rounded-none mt-1"
                placeholder={f.ph}
              />
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-3 text-[11px] text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">NAV Online Számla:</strong> a számlák
            automatikus bejelentéséhez (technikai felhasználó adatok) külön titkos
            kulcsokat kell beállítani, amint megkapod az adószámot — szólj és
            előkészítem az integrációt.
          </p>
          <p>
            <strong className="text-foreground">Adatváltozás után:</strong> kattints a fenti
            „Mentés" gombra. Az új adatok azonnal frissülnek az impresszum oldalon.
          </p>
        </div>
      </div>

        <div>
          <Label className="text-xs uppercase tracking-wider">Hatálybalépés dátuma</Label>
          <Input
            type="date"
            value={settings.legal_effective_date || ""}
            onChange={(e) => update({ legal_effective_date: e.target.value })}
            className="rounded-none mt-1"
          />
        </div>
      </div>

      {/* Dokumentum választó grid */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Dokumentumok
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {DOCS.map((d) => {
            const filled = (settings[d.key] || "").trim().length > 50;
            const isActive = active === d.key;
            return (
              <button
                key={d.key}
                onClick={() => setActive(d.key)}
                className={`relative flex flex-col gap-2 border p-3 text-left transition-colors min-h-[88px] ${
                  isActive
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <d.Icon className="h-4 w-4" />
                  {filled ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                  ) : d.required ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <span className="h-3.5 w-3.5" />
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider">
                    {d.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                    {d.short}
                  </div>
                </div>
                {d.required && (
                  <span className="absolute top-1 right-1 text-[8px] font-bold uppercase tracking-widest text-destructive">
                    Köt.
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Aktív szerkesztő */}
      <div className="border-2 border-accent">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b bg-accent/5">
          <div className="flex items-center gap-2">
            <activeDoc.Icon className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              {activeDoc.title}
            </h3>
            <Badge variant="outline" className="rounded-none text-[10px] uppercase">
              {activeContent.length.toLocaleString("hu-HU")} karakter
            </Badge>
          </div>
          <Link
            to={activeDoc.publicPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-accent hover:underline"
          >
            <Eye className="h-3 w-3" /> Élő oldal
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[11px] text-muted-foreground">{activeDoc.hint}</p>
          <Textarea
            value={activeContent}
            onChange={(e) => update({ [active]: e.target.value })}
            className="rounded-none min-h-[420px] text-xs leading-relaxed font-mono"
            placeholder={`Írd ide a(z) ${activeDoc.title} szövegét…`}
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Publikus URL: <span className="text-foreground font-bold">{activeDoc.publicPath}</span>
            </p>
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
        </div>
      </div>
    </div>
  );
};

export default AdminLegalCenterTab;

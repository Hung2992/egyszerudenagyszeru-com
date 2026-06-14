import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { ShieldCheck, Upload, Loader2, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";

interface Form {
  full_name: string;
  birth_name: string;
  birth_place: string;
  birth_date: string;
  mother_name: string;
  nationality: string;
  id_card_number: string;
  address_card_number: string;
  tax_id: string;
  address_country: string;
  address_zip: string;
  address_city: string;
  address_street: string;
  phone: string;
  email: string;
  bank_name: string;
  bank_account_holder: string;
  bank_account_number: string;
  company_name: string;
  company_tax_number: string;
  company_reg_number: string;
}

const EMPTY: Form = {
  full_name: "", birth_name: "", birth_place: "", birth_date: "", mother_name: "",
  nationality: "magyar", id_card_number: "", address_card_number: "", tax_id: "",
  address_country: "Magyarország", address_zip: "", address_city: "", address_street: "",
  phone: "", email: "", bank_name: "", bank_account_holder: "", bank_account_number: "",
  company_name: "", company_tax_number: "", company_reg_number: "",
};

const PartnerOnboarding = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [existing, setExisting] = useState<any>(null);
  const [files, setFiles] = useState<{ id_front?: File; id_back?: File; address_card?: File; selfie?: File }>({});
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth?redirect=/partner-onboarding"); return; }
      setUserId(session.user.id);
      setForm(f => ({ ...f, email: session.user.email || "" }));
      const { data } = await supabase.from("tenant_kyc_submissions")
        .select("*").eq("user_id", session.user.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) {
        setExisting(data);
        setForm({
          full_name: data.full_name || "", birth_name: data.birth_name || "",
          birth_place: data.birth_place || "", birth_date: data.birth_date || "",
          mother_name: data.mother_name || "", nationality: data.nationality || "magyar",
          id_card_number: data.id_card_number || "", address_card_number: data.address_card_number || "",
          tax_id: data.tax_id || "", address_country: data.address_country || "Magyarország",
          address_zip: data.address_zip || "", address_city: data.address_city || "",
          address_street: data.address_street || "", phone: data.phone || "",
          email: data.email || session.user.email || "", bank_name: data.bank_name || "",
          bank_account_holder: data.bank_account_holder || "", bank_account_number: data.bank_account_number || "",
          company_name: data.company_name || "", company_tax_number: data.company_tax_number || "",
          company_reg_number: data.company_reg_number || "",
        });
      }
      setLoading(false);
    })();
  }, [navigate]);

  const uploadFile = async (key: string, file: File): Promise<string | null> => {
    if (!userId) return null;
    const ext = file.name.split(".").pop();
    const path = `${userId}/${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tenant-kyc").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Feltöltési hiba", description: error.message, variant: "destructive" }); return null; }
    return path;
  };

  const submit = async () => {
    if (!userId) return;
    const required: (keyof Form)[] = ["full_name","birth_place","birth_date","mother_name","id_card_number","address_card_number","address_zip","address_city","address_street","phone","email","bank_name","bank_account_holder","bank_account_number"];
    for (const k of required) if (!form[k]) { toast({ title: "Hiányzó adat", description: k, variant: "destructive" }); return; }
    if (!existing && (!files.id_front || !files.id_back || !files.address_card || !files.selfie)) {
      toast({ title: "Hiányzó dokumentum", description: "Minden 4 fotót fel kell tölteni.", variant: "destructive" }); return;
    }
    setSaving(true);
    const urls: any = {};
    if (files.id_front) urls.id_card_front_url = await uploadFile("id-front", files.id_front);
    if (files.id_back) urls.id_card_back_url = await uploadFile("id-back", files.id_back);
    if (files.address_card) urls.address_card_url = await uploadFile("address-card", files.address_card);
    if (files.selfie) urls.selfie_url = await uploadFile("selfie", files.selfie);

    const payload = { ...form, ...urls, user_id: userId, status: "pending" as const };
    let res;
    if (existing && existing.status === "pending") {
      res = await supabase.from("tenant_kyc_submissions").update(payload).eq("id", existing.id);
    } else {
      res = await supabase.from("tenant_kyc_submissions").insert(payload);
    }
    setSaving(false);
    if (res.error) { toast({ title: "Hiba", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: "Sikeres beadás", description: "Az admin hamarosan ellenőrzi az adatokat." });
    const { data } = await supabase.from("tenant_kyc_submissions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    setExisting(data);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const readonly = existing && (existing.status === "approved" || existing.status === "rejected");

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="border p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold tracking-tight">Bérlői (KYC) ellenőrzés</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Mielőtt elindíthatnád saját webshopodat, kötelező azonosítanunk a személyedet. Minden adat titkosítva és szigorúan bizalmasan kerül tárolásra. (GDPR + Pmt. 2017/LIII.)
          </p>
          {existing && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Állapot:</span>
              {existing.status === "pending" && <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Ellenőrzésre vár</Badge>}
              {existing.status === "approved" && <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Jóváhagyva</Badge>}
              {existing.status === "rejected" && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Elutasítva</Badge>}
              {existing.admin_note && <span className="text-xs text-muted-foreground">– {existing.admin_note}</span>}
            </div>
          )}
        </div>

        <Section title="Személyes adatok">
          <Field label="Teljes név *" value={form.full_name} onChange={v => setForm({...form, full_name: v})} disabled={readonly} />
          <Field label="Születési név" value={form.birth_name} onChange={v => setForm({...form, birth_name: v})} disabled={readonly} />
          <Field label="Anyja neve *" value={form.mother_name} onChange={v => setForm({...form, mother_name: v})} disabled={readonly} />
          <Field label="Születési hely *" value={form.birth_place} onChange={v => setForm({...form, birth_place: v})} disabled={readonly} />
          <Field label="Születési dátum *" type="date" value={form.birth_date} onChange={v => setForm({...form, birth_date: v})} disabled={readonly} />
          <Field label="Állampolgárság *" value={form.nationality} onChange={v => setForm({...form, nationality: v})} disabled={readonly} />
          <Field label="Személyi igazolvány szám *" value={form.id_card_number} onChange={v => setForm({...form, id_card_number: v})} disabled={readonly} />
          <Field label="Lakcímkártya szám *" value={form.address_card_number} onChange={v => setForm({...form, address_card_number: v})} disabled={readonly} />
          <Field label="Adóazonosító" value={form.tax_id} onChange={v => setForm({...form, tax_id: v})} disabled={readonly} />
        </Section>

        <Section title="Lakcím">
          <Field label="Ország *" value={form.address_country} onChange={v => setForm({...form, address_country: v})} disabled={readonly} />
          <Field label="Irányítószám *" value={form.address_zip} onChange={v => setForm({...form, address_zip: v})} disabled={readonly} />
          <Field label="Város *" value={form.address_city} onChange={v => setForm({...form, address_city: v})} disabled={readonly} />
          <Field label="Utca, házszám *" value={form.address_street} onChange={v => setForm({...form, address_street: v})} disabled={readonly} full />
        </Section>

        <Section title="Elérhetőség">
          <Field label="Telefon *" value={form.phone} onChange={v => setForm({...form, phone: v})} disabled={readonly} />
          <Field label="E-mail *" type="email" value={form.email} onChange={v => setForm({...form, email: v})} disabled={readonly} />
        </Section>

        <Section title="Bankszámla (jutalék kifizetéshez)">
          <Field label="Bank neve *" value={form.bank_name} onChange={v => setForm({...form, bank_name: v})} disabled={readonly} />
          <Field label="Számlatulajdonos *" value={form.bank_account_holder} onChange={v => setForm({...form, bank_account_holder: v})} disabled={readonly} />
          <Field label="Számlaszám / IBAN *" value={form.bank_account_number} onChange={v => setForm({...form, bank_account_number: v})} disabled={readonly} full />
        </Section>

        <Section title="Vállalkozás (opcionális)">
          <Field label="Cégnév" value={form.company_name} onChange={v => setForm({...form, company_name: v})} disabled={readonly} />
          <Field label="Adószám" value={form.company_tax_number} onChange={v => setForm({...form, company_tax_number: v})} disabled={readonly} />
          <Field label="Cégjegyzékszám" value={form.company_reg_number} onChange={v => setForm({...form, company_reg_number: v})} disabled={readonly} />
        </Section>

        <Section title="Dokumentumok feltöltése">
          <FileField label="Személyi ig. – elülső oldal *" file={files.id_front} onChange={f => setFiles({...files, id_front: f})} disabled={readonly} done={!!existing?.id_card_front_url} />
          <FileField label="Személyi ig. – hátsó oldal *" file={files.id_back} onChange={f => setFiles({...files, id_back: f})} disabled={readonly} done={!!existing?.id_card_back_url} />
          <FileField label="Lakcímkártya *" file={files.address_card} onChange={f => setFiles({...files, address_card: f})} disabled={readonly} done={!!existing?.address_card_url} />
          <FileField label="Selfie igazolvánnyal *" file={files.selfie} onChange={f => setFiles({...files, selfie: f})} disabled={readonly} done={!!existing?.selfie_url} />
        </Section>

        {!readonly && (
          <Button className="w-full" size="lg" onClick={submit} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Beadás...</> : existing?.status === "pending" ? "Adatok frissítése" : "KYC beadása"}
          </Button>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border p-5 space-y-4">
    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
  </div>
);

const Field = ({ label, value, onChange, type = "text", disabled, full }: { label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean; full?: boolean }) => (
  <div className={full ? "sm:col-span-2" : ""}>
    <Label className="text-xs">{label}</Label>
    <Input type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="mt-1" />
  </div>
);

const FileField = ({ label, file, onChange, disabled, done }: { label: string; file?: File; onChange: (f: File) => void; disabled?: boolean; done?: boolean }) => (
  <div>
    <Label className="text-xs">{label} {done && <CheckCircle2 className="w-3 h-3 inline text-green-500" />}</Label>
    <label className={`mt-1 flex items-center gap-2 border border-dashed p-3 cursor-pointer hover:bg-accent/5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <Upload className="w-4 h-4" />
      <span className="text-xs truncate">{file?.name || (done ? "Feltöltve – újratölthető" : "Válassz fájlt")}</span>
      <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} disabled={disabled} />
    </label>
  </div>
);

export default PartnerOnboarding;

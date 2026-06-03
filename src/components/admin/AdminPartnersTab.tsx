import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Banknote, Building2, CalendarDays, Copy, Edit, Mail, Percent, Plus, Search, ShieldCheck, Ticket, Trash2, User, Users } from "lucide-react";

interface Partner {
  id: string;
  partner_type: "person" | "company";
  full_name: string;
  company_name: string | null;
  tax_number: string | null;
  registry_number: string | null;
  id_document_type: string | null;
  id_document_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  iban: string | null;
  card_holder_name: string | null;
  card_last4: string | null;
  default_commission_percent: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  notes: string | null;
}

type PartnerForm = {
  partner_type: "person" | "company";
  full_name: string;
  company_name: string;
  tax_number: string;
  registry_number: string;
  id_document_type: string;
  id_document_number: string;
  email: string;
  phone: string;
  address: string;
  iban: string;
  card_holder_name: string;
  card_last4: string;
  default_commission_percent: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  notes: string;
};

const empty: PartnerForm = {
  partner_type: "person",
  full_name: "",
  company_name: "",
  tax_number: "",
  registry_number: "",
  id_document_type: "szig",
  id_document_number: "",
  email: "",
  phone: "",
  address: "",
  iban: "",
  card_holder_name: "",
  card_last4: "",
  default_commission_percent: 10,
  valid_from: "",
  valid_until: "",
  is_active: true,
  notes: "",
};

const toDtLocal = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 16) : "");
const displayName = (p: Partner) => p.company_name || p.full_name;
const isExpired = (p: Partner) => !!p.valid_until && new Date(p.valid_until).getTime() < Date.now();
const hasFullProfile = (p: Partner) => Boolean(p.full_name && p.email && p.address && (p.partner_type === "person" || (p.company_name && p.tax_number)) && p.id_document_number && p.iban);
const huDate = (v: string | null) => (v ? new Date(v).toLocaleDateString("hu-HU") : "—");

const profileScore = (p: Partner) => {
  const checks = [
    !!p.full_name,
    p.partner_type === "person" || !!p.company_name,
    p.partner_type === "person" || !!p.tax_number,
    !!p.email,
    !!p.phone,
    !!p.address,
    !!p.id_document_number,
    !!p.iban,
    !!p.card_holder_name,
    !!p.card_last4,
    !!p.valid_until,
    Number(p.default_commission_percent ?? 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const randomCode = (name: string) => {
  const prefix = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PARTNER";
  return `${prefix}-${Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5)}`;
};

const AdminPartnersTab = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PartnerForm>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [couponCounts, setCouponCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired" | "incomplete">("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else setPartners((data ?? []) as Partner[]);

    const { data: cps } = await supabase.from("coupons").select("partner_id");
    const map: Record<string, number> = {};
    (cps ?? []).forEach((r: { partner_id?: string | null }) => { if (r.partner_id) map[r.partner_id] = (map[r.partner_id] ?? 0) + 1; });
    setCouponCounts(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredPartners = useMemo(() => {
    const q = query.trim().toLowerCase();
    return partners.filter((p) => {
      const haystack = [p.full_name, p.company_name, p.email, p.phone, p.tax_number, p.registry_number, p.id_document_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const statusOk =
        statusFilter === "all" ||
        (statusFilter === "active" && p.is_active && !isExpired(p)) ||
        (statusFilter === "inactive" && !p.is_active) ||
        (statusFilter === "expired" && isExpired(p)) ||
        (statusFilter === "incomplete" && !hasFullProfile(p));
      return statusOk && (!q || haystack.includes(q));
    });
  }, [partners, query, statusFilter]);

  const stats = useMemo(() => ({
    total: partners.length,
    active: partners.filter((p) => p.is_active && !isExpired(p)).length,
    expiring: partners.filter((p) => p.valid_until && new Date(p.valid_until).getTime() >= Date.now() && new Date(p.valid_until).getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000).length,
    incomplete: partners.filter((p) => !hasFullProfile(p)).length,
    coupons: Object.values(couponCounts).reduce((sum, count) => sum + count, 0),
  }), [partners, couponCounts]);

  const startEdit = (p: Partner) => {
    setEditId(p.id);
    setForm({
      partner_type: p.partner_type,
      full_name: p.full_name,
      company_name: p.company_name || "",
      tax_number: p.tax_number || "",
      registry_number: p.registry_number || "",
      id_document_type: p.id_document_type || "szig",
      id_document_number: p.id_document_number || "",
      email: p.email || "",
      phone: p.phone || "",
      address: p.address || "",
      iban: p.iban || "",
      card_holder_name: p.card_holder_name || "",
      card_last4: p.card_last4 || "",
      default_commission_percent: Number(p.default_commission_percent ?? 0),
      valid_from: toDtLocal(p.valid_from),
      valid_until: toDtLocal(p.valid_until),
      is_active: p.is_active,
      notes: p.notes || "",
    });
    setShowForm(true);
  };

  const reset = () => { setForm(empty); setEditId(null); setShowForm(false); };

  const save = async () => {
    if (!form.full_name.trim()) {
      toast({ title: "Kötelező név", variant: "destructive" });
      return;
    }
    if (form.partner_type === "company" && !form.company_name.trim()) {
      toast({ title: "Cégprofilnál kötelező a cégnév", variant: "destructive" });
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      toast({ title: "Hibás e-mail cím", variant: "destructive" });
      return;
    }
    if (form.card_last4 && !/^\d{4}$/.test(form.card_last4)) {
      toast({ title: "Kártya utolsó 4", description: "Pontosan 4 számjegy.", variant: "destructive" });
      return;
    }
    if (form.valid_from && form.valid_until && new Date(form.valid_until) <= new Date(form.valid_from)) {
      toast({ title: "Hibás időszak", description: "A lejárat legyen később, mint a kezdés.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: any = {
      partner_type: form.partner_type,
      full_name: form.full_name.trim(),
      company_name: form.partner_type === "company" ? form.company_name || null : null,
      tax_number: form.partner_type === "company" ? form.tax_number || null : null,
      registry_number: form.partner_type === "company" ? form.registry_number || null : null,
      id_document_type: form.id_document_type || null,
      id_document_number: form.id_document_number || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      iban: form.iban || null,
      card_holder_name: form.card_holder_name || null,
      card_last4: form.card_last4 || null,
      default_commission_percent: form.default_commission_percent || 0,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      is_active: form.is_active,
      notes: form.notes || null,
    };
    const { error } = editId
      ? await supabase.from("partners").update(payload).eq("id", editId)
      : await supabase.from("partners").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else {
      toast({ title: editId ? "Partner frissítve" : "Partner létrehozva", description: displayName({ ...payload, id: editId || "" } as Partner) });
      reset();
      load();
    }
  };

  const toggle = async (id: string, v: boolean) => {
    const { error } = await supabase.from("partners").update({ is_active: v }).eq("id", id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Törlöd a partnert? A hozzá tartozó kuponok megmaradnak (partner mező kiürül).")) return;
    const { error } = await supabase.from("partners").delete().eq("id", id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Partner törölve" });
    load();
  };

  const createCouponForPartner = async (p: Partner) => {
    if (!p.is_active || isExpired(p)) {
      toast({ title: "Nem aktív partner", description: "Lejárt vagy inaktív profilhoz nem hozok létre aktív kupont.", variant: "destructive" });
      return;
    }
    const code = randomCode(displayName(p));
    const { error } = await supabase.from("coupons").insert({
      code,
      coupon_type: "partner",
      partner_id: p.id,
      partner_name: displayName(p),
      partner_email: p.email,
      partner_commission_percent: p.default_commission_percent ?? 0,
      discount_percent: 10,
      discount_amount: null,
      is_active: true,
      valid_from: p.valid_from,
      valid_until: p.valid_until,
      single_use: false,
      max_uses: null,
      description: `Partner kupon — ${displayName(p)}`,
      notes: `Automatikusan létrehozva partner profilból. Partner ID: ${p.id}`,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Partner kupon létrehozva", description: code }); load(); }
  };

  const copyPartnerSummary = (p: Partner) => {
    const text = [
      `Partner: ${displayName(p)}`,
      `Kapcsolattartó: ${p.full_name}`,
      `E-mail: ${p.email || "—"}`,
      `Jutalék: ${p.default_commission_percent ?? 0}%`,
      `Érvényes: ${huDate(p.valid_from)} – ${huDate(p.valid_until)}`,
      `Kuponok: ${couponCounts[p.id] ?? 0}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Partner összefoglaló másolva" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider">Partnerek (egyedi profil)</h2>
            <p className="text-xs text-muted-foreground">Szerződés, igazolás, jutalék és partnerkupon egy helyen.</p>
          </div>
        </div>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { reset(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Új partner profil
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="border p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Összes partner</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="border p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Aktív</p><p className="text-2xl font-bold text-accent">{stats.active}</p></div>
        <div className="border p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">30 napon belül lejár</p><p className="text-2xl font-bold">{stats.expiring}</p></div>
        <div className="border p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Hiányos profil</p><p className="text-2xl font-bold">{stats.incomplete}</p></div>
        <div className="border p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Partner kupon</p><p className="text-2xl font-bold">{stats.coupons}</p></div>
      </div>

      <div className="border border-yellow-500/30 bg-yellow-500/5 p-3 flex gap-2 text-xs">
        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <strong className="text-yellow-500">Adatvédelem:</strong> Teljes bankkártyaszámot SOHA nem tárolunk — csak a kártyabirtokos nevét és az utolsó 4 számjegyet.
          Okmányadatot és adószámot csak admin kezelhet, kizárólag partneri együttműködéshez.
        </p>
      </div>

      {showForm && (
        <div className="border p-4 space-y-5">
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest">{editId ? "Partner profil szerkesztése" : "Új partner profil"}</p>
              <p className="text-xs text-muted-foreground">Profil teljesség: {profileScore({ ...empty, ...form, id: editId || "" } as Partner)}%</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label className="text-xs uppercase tracking-wider">Aktív együttműködés</Label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-xs uppercase tracking-wider">Profil típusa</Label>
              <Select value={form.partner_type} onValueChange={(v) => setForm({ ...form, partner_type: v })}>
                <SelectTrigger className="rounded-none mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Magánszemély</SelectItem>
                  <SelectItem value="company">Cég / Vállalkozás</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Teljes név *</Label>
              <Input className="rounded-none mt-1" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Kapcsolattartó / magánszemély neve" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">E-mail</Label>
              <Input type="email" className="rounded-none mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="partner@email.hu" />
            </div>

            {form.partner_type === "company" && (
              <>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Cégnév *</Label>
                  <Input className="rounded-none mt-1" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Adószám</Label>
                  <Input className="rounded-none mt-1" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} placeholder="12345678-1-42" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Cégjegyzékszám / nyilvántartás</Label>
                  <Input className="rounded-none mt-1" value={form.registry_number} onChange={(e) => setForm({ ...form, registry_number: e.target.value })} />
                </div>
              </>
            )}

            <div>
              <Label className="text-xs uppercase tracking-wider">Telefon</Label>
              <Input className="rounded-none mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider">Számlázási / igazolási cím</Label>
              <Input className="rounded-none mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            <div className="md:col-span-3 border-t pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Azonosítás és igazolás</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Igazolvány típusa</Label>
              <Select value={form.id_document_type} onValueChange={(v) => setForm({ ...form, id_document_type: v })}>
                <SelectTrigger className="rounded-none mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="szig">Személyi igazolvány</SelectItem>
                  <SelectItem value="passport">Útlevél</SelectItem>
                  <SelectItem value="driver_license">Jogosítvány</SelectItem>
                  <SelectItem value="tax_card">Adókártya</SelectItem>
                  <SelectItem value="other">Egyéb</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Igazolvány / adókártya szám</Label>
              <Input className="rounded-none mt-1" value={form.id_document_number} onChange={(e) => setForm({ ...form, id_document_number: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Ellenőrzési státusz</Label>
              <div className="mt-1 border h-10 px-3 flex items-center text-xs text-muted-foreground">
                {form.id_document_number ? "Alapadat rögzítve" : "Igazolásra vár"}
              </div>
            </div>

            <div className="md:col-span-3 border-t pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 flex items-center gap-1"><Banknote className="w-3 h-3" /> Banki adatok</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">IBAN / számlaszám</Label>
              <Input className="rounded-none mt-1" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Kártyabirtokos neve</Label>
              <Input className="rounded-none mt-1" value={form.card_holder_name} onChange={(e) => setForm({ ...form, card_holder_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Kártya utolsó 4 számjegy</Label>
              <Input maxLength={4} inputMode="numeric" className="rounded-none mt-1" value={form.card_last4} onChange={(e) => setForm({ ...form, card_last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="1234" />
            </div>

            <div className="md:col-span-3 border-t pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Együttműködés alapjai</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Érvényes (-tól)</Label>
              <Input type="datetime-local" className="rounded-none mt-1" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Érvényes (-ig)</Label>
              <Input type="datetime-local" className="rounded-none mt-1" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Alap jutalék %</Label>
              <Input type="number" min={0} max={100} className="rounded-none mt-1" value={form.default_commission_percent} onChange={(e) => setForm({ ...form, default_commission_percent: Number(e.target.value) })} />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider">Szerződéses / belső megjegyzés</Label>
            <Textarea className="rounded-none mt-1" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Jutalék feltételek, kampány név, jóváhagyás, dokumentum hivatkozás…" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-none uppercase text-xs" onClick={save} disabled={saving}>
              {saving ? "Mentés..." : editId ? "Profil frissítése" : "Partner létrehozása"}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-none uppercase text-xs" onClick={reset}>Mégse</Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="rounded-none pl-9" placeholder="Keresés név, cég, e-mail, adószám, igazolvány alapján…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes státusz</SelectItem>
            <SelectItem value="active">Aktív</SelectItem>
            <SelectItem value="inactive">Inaktív</SelectItem>
            <SelectItem value="expired">Lejárt</SelectItem>
            <SelectItem value="incomplete">Hiányos profil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Név / cég</TableHead>
              <TableHead>Profil</TableHead>
              <TableHead>Kapcsolat</TableHead>
              <TableHead>Érvényesség</TableHead>
              <TableHead>Jutalék</TableHead>
              <TableHead>Kupon</TableHead>
              <TableHead>Aktív</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Betöltés...</TableCell></TableRow>}
            {!loading && filteredPartners.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nincs találat</TableCell></TableRow>}
            {filteredPartners.map((p) => {
              const score = profileScore(p);
              const expired = isExpired(p);
              return (
                <TableRow key={p.id}>
                  <TableCell className="min-w-[180px]">
                    <div className="font-bold text-xs flex items-center gap-2">
                      {p.partner_type === "company" ? <Building2 className="w-4 h-4 text-accent" /> : <User className="w-4 h-4 text-accent" />}
                      {displayName(p)}
                    </div>
                    {p.company_name && <div className="text-[10px] text-muted-foreground pl-6">Kapcsolattartó: {p.full_name}</div>}
                    <div className="text-[10px] text-muted-foreground pl-6 font-mono">{p.tax_number || p.registry_number || p.id_document_number || "azonosító hiányzik"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline" className="rounded-none text-[10px] uppercase">
                        {p.partner_type === "company" ? "Cég" : "Személy"}
                      </Badge>
                      <div className="h-1.5 w-24 bg-muted"><div className="h-full bg-accent" style={{ width: `${score}%` }} /></div>
                      <p className="text-[10px] text-muted-foreground">{score}% kész</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-muted-foreground" /> {p.email || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{p.phone || "telefon nincs"}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={expired ? "destructive" : "outline"} className="rounded-none text-[10px] uppercase">
                      {expired ? "Lejárt" : p.valid_until ? "Időzített" : "Korlátlan"}
                    </Badge>
                    <div className="text-[10px] text-muted-foreground mt-1">{huDate(p.valid_from)} – {huDate(p.valid_until)}</div>
                  </TableCell>
                  <TableCell className="text-xs"><span className="inline-flex items-center gap-1"><Percent className="w-3 h-3" />{p.default_commission_percent ?? 0}%</span></TableCell>
                  <TableCell className="text-xs font-bold">{couponCounts[p.id] ?? 0}</TableCell>
                  <TableCell><Switch checked={p.is_active} onCheckedChange={(v) => toggle(p.id, v)} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Partner összefoglaló másolása" onClick={() => copyPartnerSummary(p)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Új partner kupon" onClick={() => createCouponForPartner(p)}>
                        <Ticket className="w-4 h-4 text-accent" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Szerkesztés" onClick={() => startEdit(p)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Törlés" onClick={() => remove(p.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminPartnersTab;

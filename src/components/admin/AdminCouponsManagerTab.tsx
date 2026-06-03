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
import { Building2, CalendarDays, Copy, Edit, Filter, Percent, Plus, Search, Ticket, Trash2, Users } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  is_active: boolean;
  coupon_type: "normal" | "single_use" | "partner";
  single_use: boolean;
  partner_id: string | null;
  partner_name: string | null;
  partner_email: string | null;
  partner_commission_percent: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  notes: string | null;
  created_at?: string;
}

interface Partner {
  id: string;
  partner_type: "person" | "company";
  full_name: string;
  company_name: string | null;
  email: string | null;
  default_commission_percent: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

const empty = {
  code: "",
  description: "",
  discount_percent: 10,
  discount_amount: 0,
  is_active: true,
  coupon_type: "normal" as const,
  single_use: false,
  partner_id: "manual",
  partner_name: "",
  partner_email: "",
  partner_commission_percent: 0,
  max_uses: 0,
  valid_from: "",
  valid_until: "",
  notes: "",
};

const toDtLocal = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 16) : "");
const huDate = (v: string | null) => (v ? new Date(v).toLocaleDateString("hu-HU") : "—");
const partnerName = (p: Partner) => p.company_name || p.full_name;
const isExpired = (c: Coupon) => !!c.valid_until && new Date(c.valid_until).getTime() < Date.now();
const isExhausted = (c: Coupon) => !!c.max_uses && c.used_count >= c.max_uses;

const randomCode = (prefix = "") => {
  const part = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return prefix ? `${prefix}-${part}` : part;
};

const AdminCouponsManagerTab = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "normal" | "single_use" | "partner" | "expired" | "exhausted">("all");

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: partnerData, error: partnerError }] = await Promise.all([
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("partners").select("id, partner_type, full_name, company_name, email, default_commission_percent, valid_from, valid_until, is_active").order("company_name", { ascending: true }),
    ]);
    if (error) toast({ title: "Kupon betöltési hiba", description: error.message, variant: "destructive" });
    else setCoupons((data ?? []) as Coupon[]);
    if (partnerError) toast({ title: "Partner betöltési hiba", description: partnerError.message, variant: "destructive" });
    else setPartners((partnerData ?? []) as Partner[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredCoupons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return coupons.filter((c) => {
      const haystack = [c.code, c.description, c.partner_name, c.partner_email, c.notes].filter(Boolean).join(" ").toLowerCase();
      const typeOk =
        typeFilter === "all" ||
        c.coupon_type === typeFilter ||
        (typeFilter === "expired" && isExpired(c)) ||
        (typeFilter === "exhausted" && isExhausted(c));
      return typeOk && (!q || haystack.includes(q));
    });
  }, [coupons, query, typeFilter]);

  const stats = useMemo(() => ({
    total: coupons.length,
    active: coupons.filter((c) => c.is_active && !isExpired(c) && !isExhausted(c)).length,
    partner: coupons.filter((c) => c.coupon_type === "partner").length,
    singleUse: coupons.filter((c) => c.coupon_type === "single_use").length,
    used: coupons.reduce((sum, c) => sum + (c.used_count ?? 0), 0),
  }), [coupons]);

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (coupon: Coupon) => {
    setEditId(coupon.id);
    setForm({
      ...empty,
      ...coupon,
      discount_percent: coupon.discount_percent ?? 0,
      discount_amount: coupon.discount_amount ?? 0,
      partner_id: coupon.partner_id || "manual",
      partner_name: coupon.partner_name || "",
      partner_email: coupon.partner_email || "",
      partner_commission_percent: coupon.partner_commission_percent ?? 0,
      max_uses: coupon.max_uses ?? 0,
      valid_from: toDtLocal(coupon.valid_from),
      valid_until: toDtLocal(coupon.valid_until),
      notes: coupon.notes || "",
      description: coupon.description || "",
    });
    setShowForm(true);
  };

  const applyPartner = (partnerId: string) => {
    if (partnerId === "manual") {
      setForm({ ...form, partner_id: "manual" });
      return;
    }
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) return;
    setForm({
      ...form,
      partner_id: partner.id,
      partner_name: partnerName(partner),
      partner_email: partner.email || "",
      partner_commission_percent: partner.default_commission_percent ?? 0,
      valid_from: toDtLocal(partner.valid_from) || form.valid_from,
      valid_until: toDtLocal(partner.valid_until) || form.valid_until,
      code: form.code || randomCode(partnerName(partner).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)),
      description: form.description || `Partner kupon — ${partnerName(partner)}`,
    });
  };

  const save = async () => {
    if (!form.code.trim()) {
      toast({ title: "Hiányzó kód", variant: "destructive" });
      return;
    }
    if (Number(form.discount_percent || 0) <= 0 && Number(form.discount_amount || 0) <= 0) {
      toast({ title: "Hiányzó kedvezmény", description: "Adj meg százalékos vagy fix kedvezményt.", variant: "destructive" });
      return;
    }
    if (form.coupon_type === "partner" && !form.partner_name.trim()) {
      toast({ title: "Hiányzó partner", description: "Partner kuponhoz válassz partnert vagy add meg a partner nevét.", variant: "destructive" });
      return;
    }
    if (form.valid_from && form.valid_until && new Date(form.valid_until) <= new Date(form.valid_from)) {
      toast({ title: "Hibás időszak", description: "A lejárat legyen később, mint a kezdés.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      description: form.description || null,
      discount_percent: Number(form.discount_percent || 0) > 0 ? Number(form.discount_percent) : null,
      discount_amount: Number(form.discount_amount || 0) > 0 ? Number(form.discount_amount) : null,
      is_active: form.is_active,
      coupon_type: form.coupon_type,
      single_use: form.coupon_type === "single_use" ? true : form.single_use,
      partner_id: form.coupon_type === "partner" && form.partner_id !== "manual" ? form.partner_id : null,
      partner_name: form.coupon_type === "partner" ? form.partner_name || null : null,
      partner_email: form.coupon_type === "partner" ? form.partner_email || null : null,
      partner_commission_percent: form.coupon_type === "partner" ? Number(form.partner_commission_percent || 0) : null,
      max_uses: form.coupon_type === "single_use" ? 1 : Number(form.max_uses || 0) > 0 ? Number(form.max_uses) : null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      notes: form.notes || null,
    };
    const { error } = editId
      ? await supabase.from("coupons").update(payload).eq("id", editId)
      : await supabase.from("coupons").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else {
      toast({ title: editId ? "Kupon frissítve" : "Kupon létrehozva", description: payload.code });
      reset();
      load();
    }
  };

  const toggle = async (id: string, v: boolean) => {
    const { error } = await supabase.from("coupons").update({ is_active: v }).eq("id", id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Törlöd a kupont?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Kupon törölve" });
    load();
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Kód másolva", description: code });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-accent" />
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider">Kuponok kezelése (mód és partner)</h2>
            <p className="text-xs text-muted-foreground">Normál, egyszeri és partner kuponok jutalékkal, lejárattal és partner profillal.</p>
          </div>
        </div>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { reset(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Új kupon
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="border p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Összes kupon</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="border p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Aktív</p><p className="text-2xl font-bold text-accent">{stats.active}</p></div>
        <div className="border p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Partner kupon</p><p className="text-2xl font-bold">{stats.partner}</p></div>
        <div className="border p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Egyszeri</p><p className="text-2xl font-bold">{stats.singleUse}</p></div>
        <div className="border p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Felhasználás</p><p className="text-2xl font-bold">{stats.used}</p></div>
      </div>

      {showForm && (
        <div className="border p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest">{editId ? "Kupon szerkesztése" : "Új kupon létrehozása"}</p>
              <p className="text-xs text-muted-foreground">A partner mód automatikusan áthúzza a partner profil alapadatait.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label className="text-xs uppercase tracking-wider">Aktív</Label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-xs uppercase tracking-wider">Mód / típus</Label>
              <Select value={form.coupon_type} onValueChange={(v) => setForm({ ...form, coupon_type: v, code: v === "partner" ? randomCode("PARTNER") : v === "single_use" ? randomCode("ONE") : form.code, max_uses: v === "single_use" ? 1 : form.max_uses })}>
                <SelectTrigger className="rounded-none mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normál (többször használható)</SelectItem>
                  <SelectItem value="single_use">Egyszeri (egy beváltás)</SelectItem>
                  <SelectItem value="partner">Partner kupon (jutalékkal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Kód</Label>
              <div className="flex gap-2 mt-1">
                <Input className="rounded-none uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="PL. WELCOME10" />
                <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={() => setForm({ ...form, code: randomCode(form.coupon_type === "partner" ? "PARTNER" : form.coupon_type === "single_use" ? "ONE" : "") })}>Generálás</Button>
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Felhasználási limit</Label>
              <Input type="number" min={0} disabled={form.coupon_type === "single_use"} className="rounded-none mt-1" value={form.coupon_type === "single_use" ? 1 : form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} placeholder="0 = korlátlan" />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider">Kedvezmény %</Label>
              <Input type="number" min={0} max={100} className="rounded-none mt-1" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Fix kedvezmény (Ft)</Label>
              <Input type="number" min={0} className="rounded-none mt-1" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs uppercase tracking-wider">Érvényes -tól</Label>
                <Input type="datetime-local" className="rounded-none mt-1" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Érvényes -ig</Label>
                <Input type="datetime-local" className="rounded-none mt-1" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>

            {form.coupon_type === "partner" && (
              <>
                <div className="md:col-span-3 border-t pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Partner profil kapcsolat</p>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Partner profil</Label>
                  <Select value={form.partner_id || "manual"} onValueChange={applyPartner}>
                    <SelectTrigger className="rounded-none mt-1"><SelectValue placeholder="Válassz partnert" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Kézi partner adat</SelectItem>
                      {partners.map((partner) => (
                        <SelectItem key={partner.id} value={partner.id} disabled={!partner.is_active}>
                          {partnerName(partner)}{!partner.is_active ? " (inaktív)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Partner neve</Label>
                  <Input className="rounded-none mt-1" value={form.partner_name} onChange={(e) => setForm({ ...form, partner_name: e.target.value, partner_id: "manual" })} />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Partner e-mail</Label>
                  <Input type="email" className="rounded-none mt-1" value={form.partner_email} onChange={(e) => setForm({ ...form, partner_email: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Partner jutalék %</Label>
                  <Input type="number" min={0} max={100} className="rounded-none mt-1" value={form.partner_commission_percent} onChange={(e) => setForm({ ...form, partner_commission_percent: Number(e.target.value) })} />
                </div>
              </>
            )}
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider">Leírás</Label>
            <Input className="rounded-none mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Belső megjegyzés</Label>
            <Textarea className="rounded-none mt-1" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-none uppercase text-xs" onClick={save} disabled={saving}>
              {saving ? "Mentés..." : editId ? "Kupon frissítése" : "Kupon létrehozása"}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-none uppercase text-xs" onClick={reset}>Mégse</Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="rounded-none pl-9" placeholder="Gyorskeresés kód, partner, e-mail vagy megjegyzés alapján…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="rounded-none"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes kupon</SelectItem>
            <SelectItem value="normal">Normál</SelectItem>
            <SelectItem value="single_use">Egyszeri</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
            <SelectItem value="expired">Lejárt</SelectItem>
            <SelectItem value="exhausted">Elfogyott</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kód</TableHead>
              <TableHead>Mód</TableHead>
              <TableHead>Kedvezmény</TableHead>
              <TableHead>Felh.</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Érvényesség</TableHead>
              <TableHead>Aktív</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Betöltés...</TableCell></TableRow>}
            {!loading && filteredCoupons.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nincs találat</TableCell></TableRow>}
            {filteredCoupons.map((c) => {
              const expired = isExpired(c);
              const exhausted = isExhausted(c);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold min-w-[150px]">
                    <button onClick={() => copy(c.code)} className="flex items-center gap-1 hover:text-accent">
                      {c.code} <Copy className="w-3 h-3" />
                    </button>
                    {(expired || exhausted) && <p className="text-[10px] text-muted-foreground mt-1">{expired ? "Lejárt" : "Limit elérve"}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-none text-xs uppercase">
                      {c.coupon_type === "single_use" ? "Egyszeri" : c.coupon_type === "partner" ? "Partner" : "Normál"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-flex items-center gap-1">
                      {c.discount_percent ? <Percent className="w-3 h-3" /> : null}
                      {c.discount_percent ? `${c.discount_percent}%` : c.discount_amount ? `${c.discount_amount} Ft` : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : " / ∞"}</TableCell>
                  <TableCell className="text-xs min-w-[160px]">
                    {c.partner_name ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-medium"><Building2 className="w-3 h-3 text-accent" /> {c.partner_name}</div>
                        <div className="text-[10px] text-muted-foreground">Jutalék: {c.partner_commission_percent ?? 0}%</div>
                        {c.partner_email && <div className="text-[10px] text-muted-foreground">{c.partner_email}</div>}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs min-w-[150px]">
                    <div className="flex items-center gap-1"><CalendarDays className="w-3 h-3 text-muted-foreground" /> {huDate(c.valid_until)}</div>
                    {c.valid_from && <div className="text-[10px] text-muted-foreground">kezdés: {huDate(c.valid_from)}</div>}
                  </TableCell>
                  <TableCell><Switch checked={c.is_active} onCheckedChange={(v) => toggle(c.id, v)} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Szerkesztés" onClick={() => startEdit(c)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Törlés" onClick={() => remove(c.id)}>
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

export default AdminCouponsManagerTab;

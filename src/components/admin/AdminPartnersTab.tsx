import { useEffect, useState } from "react";
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
import { Plus, Trash2, Users, Edit, Ticket, AlertTriangle } from "lucide-react";

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

const empty: any = {
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

const AdminPartnersTab = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [couponCounts, setCouponCounts] = useState<Record<string, number>>({});

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
    (cps ?? []).forEach((r: any) => { if (r.partner_id) map[r.partner_id] = (map[r.partner_id] ?? 0) + 1; });
    setCouponCounts(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (p: Partner) => {
    setEditId(p.id);
    setForm({
      ...empty,
      ...p,
      valid_from: toDtLocal(p.valid_from),
      valid_until: toDtLocal(p.valid_until),
    });
    setShowForm(true);
  };

  const reset = () => { setForm(empty); setEditId(null); setShowForm(false); };

  const save = async () => {
    if (!form.full_name.trim()) {
      toast({ title: "Kötelező név", variant: "destructive" });
      return;
    }
    if (form.card_last4 && !/^\d{4}$/.test(form.card_last4)) {
      toast({ title: "Kártya utolsó 4", description: "Pontosan 4 számjegy.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      partner_type: form.partner_type,
      full_name: form.full_name.trim(),
      company_name: form.company_name || null,
      tax_number: form.tax_number || null,
      registry_number: form.registry_number || null,
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
      toast({ title: editId ? "Partner frissítve" : "Partner létrehozva" });
      reset();
      load();
    }
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("partners").update({ is_active: v }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Törlöd a partnert? A hozzá tartozó kuponok megmaradnak (partner mező kiürül).")) return;
    await supabase.from("partners").delete().eq("id", id);
    toast({ title: "Törölve" });
    load();
  };

  const createCouponForPartner = async (p: Partner) => {
    const code = `${(p.company_name || p.full_name).substring(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, "")}-${Math.random().toString(36).toUpperCase().slice(2, 6)}`;
    const { error } = await supabase.from("coupons").insert({
      code,
      coupon_type: "partner",
      partner_id: p.id,
      partner_name: p.company_name || p.full_name,
      partner_email: p.email,
      partner_commission_percent: p.default_commission_percent ?? 0,
      discount_percent: 10,
      is_active: p.is_active,
      valid_until: p.valid_until,
      single_use: false,
      max_uses: null,
      description: `Partner kupon — ${p.company_name || p.full_name}`,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Partner kupon létrehozva", description: code }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-bold uppercase tracking-wider">Partnerek (egyedi profil)</h2>
        </div>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { reset(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Új partner
        </Button>
      </div>

      <div className="border border-yellow-500/30 bg-yellow-500/5 p-3 flex gap-2 text-xs">
        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <strong className="text-yellow-500">Adatvédelem:</strong> Teljes bankkártyaszámot SOHA nem tárolunk — csak a kártyabirtokos nevét és az utolsó 4 számjegyet.
          Személyes okmány adatok (igazolvány) bizalmas — csak admin férhet hozzá, csak akkor töltsd ki, ha a partnerszerződéshez szükséges.
        </p>
      </div>

      {showForm && (
        <div className="border p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-xs uppercase tracking-wider">Típus</Label>
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
              <Input className="rounded-none mt-1" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label className="text-sm">Aktív</Label>
            </div>

            {form.partner_type === "company" && (
              <>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Cégnév</Label>
                  <Input className="rounded-none mt-1" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Adószám</Label>
                  <Input className="rounded-none mt-1" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Cégjegyzékszám</Label>
                  <Input className="rounded-none mt-1" value={form.registry_number} onChange={(e) => setForm({ ...form, registry_number: e.target.value })} />
                </div>
              </>
            )}

            <div>
              <Label className="text-xs uppercase tracking-wider">Igazolvány típusa</Label>
              <Select value={form.id_document_type} onValueChange={(v) => setForm({ ...form, id_document_type: v })}>
                <SelectTrigger className="rounded-none mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="szig">Személyi igazolvány</SelectItem>
                  <SelectItem value="passport">Útlevél</SelectItem>
                  <SelectItem value="driver_license">Jogosítvány</SelectItem>
                  <SelectItem value="other">Egyéb</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Igazolvány száma</Label>
              <Input className="rounded-none mt-1" value={form.id_document_number} onChange={(e) => setForm({ ...form, id_document_number: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">E-mail</Label>
              <Input type="email" className="rounded-none mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider">Telefon</Label>
              <Input className="rounded-none mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider">Cím</Label>
              <Input className="rounded-none mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            <div className="md:col-span-3 border-t pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">💳 Banki adatok (csak hivatkozás)</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">IBAN / Számlaszám</Label>
              <Input className="rounded-none mt-1" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Kártyabirtokos neve</Label>
              <Input className="rounded-none mt-1" value={form.card_holder_name} onChange={(e) => setForm({ ...form, card_holder_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Kártya utolsó 4 számjegy</Label>
              <Input maxLength={4} className="rounded-none mt-1" value={form.card_last4} onChange={(e) => setForm({ ...form, card_last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="1234" />
            </div>

            <div className="md:col-span-3 border-t pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">📅 Együttműködés érvényessége</p>
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
            <Label className="text-xs uppercase tracking-wider">Megjegyzés</Label>
            <Textarea className="rounded-none mt-1" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="rounded-none uppercase text-xs" onClick={save} disabled={saving}>
              {saving ? "Mentés..." : editId ? "Frissítés" : "Partner létrehozása"}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-none uppercase text-xs" onClick={reset}>Mégse</Button>
          </div>
        </div>
      )}

      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Név / Cég</TableHead>
              <TableHead>Típus</TableHead>
              <TableHead>Adószám</TableHead>
              <TableHead>Érvényes</TableHead>
              <TableHead>Jutalék</TableHead>
              <TableHead>Kuponok</TableHead>
              <TableHead>Aktív</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Betöltés...</TableCell></TableRow>}
            {!loading && partners.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nincs partner</TableCell></TableRow>}
            {partners.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-bold text-xs">
                  {p.company_name || p.full_name}
                  {p.company_name && <div className="text-[10px] text-muted-foreground font-normal">{p.full_name}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-none text-[10px] uppercase">
                    {p.partner_type === "company" ? "Cég" : "Személy"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono">{p.tax_number || "—"}</TableCell>
                <TableCell className="text-xs">
                  {p.valid_until ? `→ ${new Date(p.valid_until).toLocaleDateString("hu-HU")}` : "korlátlan"}
                </TableCell>
                <TableCell className="text-xs">{p.default_commission_percent ?? 0}%</TableCell>
                <TableCell className="text-xs">{couponCounts[p.id] ?? 0}</TableCell>
                <TableCell><Switch checked={p.is_active} onCheckedChange={(v) => toggle(p.id, v)} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Új kupon" onClick={() => createCouponForPartner(p)}>
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminPartnersTab;

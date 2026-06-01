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
import { Plus, Trash2, Ticket, Copy } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  is_active: boolean;
  coupon_type: "normal" | "single_use" | "partner";
  single_use: boolean;
  partner_name: string | null;
  partner_email: string | null;
  partner_commission_percent: number | null;
  max_uses: number | null;
  used_count: number;
  valid_until: string | null;
  notes: string | null;
}

const empty = {
  code: "",
  description: "",
  discount_percent: 10,
  discount_amount: 0,
  is_active: true,
  coupon_type: "normal" as const,
  single_use: false,
  partner_name: "",
  partner_email: "",
  partner_commission_percent: 0,
  max_uses: 0,
  valid_until: "",
  notes: "",
};

const randomCode = (prefix = "") => {
  const part = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return prefix ? `${prefix}-${part}` : part;
};

const AdminCouponsManagerTab = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else setCoupons((data ?? []) as Coupon[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.code.trim()) {
      toast({ title: "Hiányzó kód", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      description: form.description || null,
      discount_percent: form.discount_percent || null,
      discount_amount: form.discount_amount || null,
      is_active: form.is_active,
      coupon_type: form.coupon_type,
      single_use: form.coupon_type === "single_use" ? true : form.single_use,
      partner_name: form.coupon_type === "partner" ? form.partner_name || null : null,
      partner_email: form.coupon_type === "partner" ? form.partner_email || null : null,
      partner_commission_percent: form.coupon_type === "partner" ? form.partner_commission_percent : null,
      max_uses: form.coupon_type === "single_use" ? 1 : form.max_uses || null,
      valid_until: form.valid_until || null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("coupons").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Kupon létrehozva", description: payload.code });
      setForm(empty);
      setShowForm(false);
      load();
    }
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("coupons").update({ is_active: v }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Törlöd a kupont?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    toast({ title: "Törölve" });
    load();
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Kód másolva", description: code });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-bold uppercase tracking-wider">Kuponok kezelése</h2>
        </div>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> Új kupon
        </Button>
      </div>

      {showForm && (
        <div className="border p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-xs uppercase tracking-wider">Mód (típus)</Label>
              <Select value={form.coupon_type} onValueChange={(v) => setForm({ ...form, coupon_type: v, code: v === "partner" ? randomCode("PARTNER") : v === "single_use" ? randomCode("ONE") : form.code })}>
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
                <Input className="rounded-none uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PL. WELCOME10" />
                <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={() => setForm({ ...form, code: randomCode(form.coupon_type === "partner" ? "PARTNER" : form.coupon_type === "single_use" ? "ONE" : "") })}>Generálás</Button>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label className="text-sm">Aktív</Label>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider">Kedvezmény %</Label>
              <Input type="number" min={0} max={100} className="rounded-none mt-1" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Fix kedvezmény (Ft)</Label>
              <Input type="number" min={0} className="rounded-none mt-1" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Lejárat</Label>
              <Input type="datetime-local" className="rounded-none mt-1" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
            </div>

            {form.coupon_type === "normal" && (
              <div>
                <Label className="text-xs uppercase tracking-wider">Max. felhasználás (0 = korlátlan)</Label>
                <Input type="number" min={0} className="rounded-none mt-1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} />
              </div>
            )}

            {form.coupon_type === "partner" && (
              <>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Partner neve</Label>
                  <Input className="rounded-none mt-1" value={form.partner_name} onChange={(e) => setForm({ ...form, partner_name: e.target.value })} />
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

          <div className="flex gap-2">
            <Button size="sm" className="rounded-none uppercase text-xs" onClick={save} disabled={saving}>
              {saving ? "Mentés..." : "Kupon létrehozása"}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-none uppercase text-xs" onClick={() => { setShowForm(false); setForm(empty); }}>Mégse</Button>
          </div>
        </div>
      )}

      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kód</TableHead>
              <TableHead>Mód</TableHead>
              <TableHead>Kedvezmény</TableHead>
              <TableHead>Felh.</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Lejár</TableHead>
              <TableHead>Aktív</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Betöltés...</TableCell></TableRow>}
            {!loading && coupons.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nincs kupon</TableCell></TableRow>}
            {coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-bold">
                  <button onClick={() => copy(c.code)} className="flex items-center gap-1 hover:text-accent">
                    {c.code} <Copy className="w-3 h-3" />
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-none text-xs uppercase">
                    {c.coupon_type === "single_use" ? "Egyszeri" : c.coupon_type === "partner" ? "Partner" : "Normál"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {c.discount_percent ? `${c.discount_percent}%` : c.discount_amount ? `${c.discount_amount} Ft` : "—"}
                </TableCell>
                <TableCell className="text-xs">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</TableCell>
                <TableCell className="text-xs">{c.partner_name ? `${c.partner_name} (${c.partner_commission_percent ?? 0}%)` : "—"}</TableCell>
                <TableCell className="text-xs">{c.valid_until ? new Date(c.valid_until).toLocaleDateString("hu-HU") : "—"}</TableCell>
                <TableCell><Switch checked={c.is_active} onCheckedChange={(v) => toggle(c.id, v)} /></TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => remove(c.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminCouponsManagerTab;

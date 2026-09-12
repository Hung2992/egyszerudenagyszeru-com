import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Truck, Plus, Trash2, Loader2, Save } from "lucide-react";

interface Props {
  partnerId: string;
}

type Method = {
  id: string;
  name: string;
  description: string | null;
  method_type: string;
  fee_huf: number;
  free_over_huf: number | null;
  requires_address: boolean;
  is_active: boolean;
  sort_order: number;
};

const TYPES: { v: string; l: string; address: boolean }[] = [
  { v: "home_delivery", l: "Házhozszállítás", address: true },
  { v: "pickup_point", l: "Csomagpont", address: true },
  { v: "personal_pickup", l: "Személyes átvétel", address: false },
];

const PartnerShippingTab = ({ partnerId }: Props) => {
  const [rows, setRows] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("partner_shipping_methods")
      .select("*")
      .eq("partner_id", partnerId)
      .order("sort_order");
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    setRows((data as Method[]) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [partnerId]);

  const addMethod = async () => {
    const { error } = await supabase.from("partner_shipping_methods").insert({
      partner_id: partnerId,
      name: "Házhozszállítás",
      method_type: "home_delivery",
      fee_huf: 1490,
      requires_address: true,
      sort_order: rows.length,
    });
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    void load();
  };

  const patch = (id: string, values: Partial<Method>) =>
    setRows((r) => r.map((m) => (m.id === id ? { ...m, ...values } : m)));

  const save = async (m: Method) => {
    setSaving(m.id);
    const { error } = await supabase.from("partner_shipping_methods").update({
      name: m.name.trim().slice(0, 80) || "Szállítás",
      description: m.description?.trim() ? m.description.trim().slice(0, 200) : null,
      method_type: m.method_type,
      fee_huf: Math.max(0, Math.round(Number(m.fee_huf) || 0)),
      free_over_huf: m.free_over_huf ? Math.max(0, Math.round(Number(m.free_over_huf))) : null,
      requires_address: m.requires_address,
      is_active: m.is_active,
    }).eq("id", m.id);
    setSaving(null);
    if (error) { toast({ title: "Mentés sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Mentve", description: `${m.name} frissítve.` });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("partner_shipping_methods").delete().eq("id", id);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setRows((r) => r.filter((m) => m.id !== id));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Betöltés…</p>;

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg">Szállítási módok</h3>
          <Badge variant="outline" className="rounded-none">{rows.length} db</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Ezek a módok jelennek meg a vásárlóknak a pénztárnál. A díjat és az ingyenes szállítás értékhatárát
          a rendszer a rendeléskor is ellenőrzi.
        </p>
        <Button onClick={addMethod} className="rounded-none"><Plus className="h-4 w-4 mr-2" />Új szállítási mód</Button>
      </Card>

      {rows.map((m) => (
        <Card key={m.id} className="rounded-none border-border p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Megnevezés</Label>
              <Input className="rounded-none" value={m.name} onChange={(e) => patch(m.id, { name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Típus</Label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => patch(m.id, { method_type: t.v, requires_address: t.address })}
                    className={`text-xs border px-3 py-2 ${m.method_type === t.v ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Szállítási díj (Ft)</Label>
              <Input
                type="number"
                min={0}
                className="rounded-none"
                value={m.fee_huf}
                onChange={(e) => patch(m.id, { fee_huf: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Ingyenes szállítás e felett (Ft, üresen hagyható)</Label>
              <Input
                type="number"
                min={0}
                className="rounded-none"
                value={m.free_over_huf ?? ""}
                onChange={(e) => patch(m.id, { free_over_huf: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Leírás a vásárlónak (nem kötelező)</Label>
              <Input
                className="rounded-none"
                placeholder="Pl.: 1-3 munkanap, futárszolgálattal"
                value={m.description ?? ""}
                onChange={(e) => patch(m.id, { description: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={m.is_active} onCheckedChange={(v) => patch(m.id, { is_active: v })} />
              Aktív (látszik a pénztárnál)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={m.requires_address} onCheckedChange={(v) => patch(m.id, { requires_address: v })} />
              Szállítási cím szükséges
            </label>
            <div className="ml-auto flex gap-2">
              <Button onClick={() => void save(m)} disabled={saving === m.id} className="rounded-none">
                {saving === m.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Mentés
              </Button>
              <Button variant="outline" onClick={() => void remove(m.id)} className="rounded-none">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {!rows.length && (
        <p className="text-sm text-muted-foreground">
          Még nincs szállítási mód. Amíg nincs, a pénztár nem számol szállítási díjat.
        </p>
      )}
    </div>
  );
};

export default PartnerShippingTab;

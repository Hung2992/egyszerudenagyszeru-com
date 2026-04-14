import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, ShoppingCart, Plus, Trash2, Pencil } from "lucide-react";

interface CustomField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  required: boolean;
  placeholder: string;
  options: string;
  position: "billing" | "shipping" | "notes";
  is_active: boolean;
}

const emptyField = (): CustomField => ({
  id: crypto.randomUUID(), label: "", type: "text", required: false,
  placeholder: "", options: "", position: "notes", is_active: true,
});

const FIELD_TYPES: Record<string, string> = { text: "Szöveg", textarea: "Hosszú szöveg", select: "Legördülő", checkbox: "Jelölőnégyzet" };
const POSITIONS: Record<string, string> = { billing: "Számlázási adatok", shipping: "Szállítási adatok", notes: "Megjegyzések" };

const AdminCheckoutCustomTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  useEffect(() => {
    const f = async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (data) setSettings(data);
    };
    f();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("store_settings").update({
      checkout_custom_settings: settings.checkout_custom_settings,
      checkout_custom_enabled: settings.checkout_custom_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Checkout testreszabás beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const co = settings.checkout_custom_settings && typeof settings.checkout_custom_settings === "object" ? settings.checkout_custom_settings : {};
  const fields: CustomField[] = Array.isArray(co.custom_fields) ? co.custom_fields : [];

  const updateCo = (field: string, value: any) => {
    setSettings({ ...settings, checkout_custom_settings: { ...co, [field]: value } });
  };
  const updateFields = (newFields: CustomField[]) => updateCo("custom_fields", newFields);
  const addField = () => { updateFields([...fields, emptyField()]); setEditIdx(fields.length); };
  const updateField = (idx: number, field: string, value: any) => {
    const updated = [...fields]; updated[idx] = { ...updated[idx], [field]: value }; updateFields(updated);
  };
  const removeField = (idx: number) => { updateFields(fields.filter((_, i) => i !== idx)); if (editIdx === idx) setEditIdx(null); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Checkout testreszabás</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <ShoppingCart className="h-4 w-4 text-accent" /> Egyedi checkout
          </div>
          <Switch checked={settings.checkout_custom_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, checkout_custom_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Egyedi mezők, lépések és beállítások a checkout folyamatban.</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Általános</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Guest checkout engedélyezés</Label><Switch checked={co.guest_checkout ?? true} onCheckedChange={v => updateCo("guest_checkout", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Lépések száma</Label>
            <select value={co.steps ?? "3"} onChange={e => updateCo("steps", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
              <option value="1">1 lépés (egy oldalas)</option>
              <option value="2">2 lépés</option>
              <option value="3">3 lépés (alapértelmezett)</option>
            </select>
          </div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Rendelési megjegyzés mező</Label><Switch checked={co.order_notes ?? true} onCheckedChange={v => updateCo("order_notes", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Cég adatok kérése</Label><Switch checked={co.company_fields ?? false} onCheckedChange={v => updateCo("company_fields", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Adószám mező</Label><Switch checked={co.tax_id_field ?? false} onCheckedChange={v => updateCo("tax_id_field", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Kupon mező megjelenítés</Label><Switch checked={co.show_coupon ?? true} onCheckedChange={v => updateCo("show_coupon", v)} /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Egyedi mezők ({fields.length})</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addField}><Plus className="h-3 w-3 mr-1" /> Új mező</Button>
        </div>
        {fields.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek egyedi mezők.</p>}
        {fields.map((f, i) => (
          <div key={f.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{f.label || "Névtelen mező"}</span>
                <span className="text-[9px] uppercase tracking-widest border px-1.5 py-0.5">{FIELD_TYPES[f.type]}</span>
                <span className="text-[9px] uppercase tracking-widest border px-1.5 py-0.5">{POSITIONS[f.position]}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditIdx(editIdx === i ? null : i)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeField(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {editIdx === i && (
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label className="text-xs uppercase tracking-wider">Címke</Label><Input value={f.label} onChange={e => updateField(i, "label", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
                <div><Label className="text-xs uppercase tracking-wider">Típus</Label>
                  <select value={f.type} onChange={e => updateField(i, "type", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
                    {Object.entries(FIELD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs uppercase tracking-wider">Pozíció</Label>
                  <select value={f.position} onChange={e => updateField(i, "position", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
                    {Object.entries(POSITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs uppercase tracking-wider">Placeholder</Label><Input value={f.placeholder} onChange={e => updateField(i, "placeholder", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
                {f.type === "select" && <div><Label className="text-xs uppercase tracking-wider">Opciók (vesszővel)</Label><Input value={f.options} onChange={e => updateField(i, "options", e.target.value)} className="rounded-none mt-1 text-xs" /></div>}
                <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Kötelező</Label><Switch checked={f.required} onCheckedChange={v => updateField(i, "required", v)} /></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCheckoutCustomTab;

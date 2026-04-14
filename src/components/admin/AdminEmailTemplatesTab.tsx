import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Mail, Plus, Trash2, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface EmailTemplate {
  name: string;
  subject: string;
  body_preview: string;
  trigger: string;
}

const AdminEmailTemplatesTab = () => {
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
      email_templates_custom: settings.email_templates_custom,
      email_sender_domain: settings.email_sender_domain,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "E-mail sablon beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const templates: EmailTemplate[] = Array.isArray(settings.email_templates_custom) ? settings.email_templates_custom : [];

  const updateTemplate = (idx: number, field: string, value: string) => {
    const updated = [...templates];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings({ ...settings, email_templates_custom: updated });
  };

  const addTemplate = () => {
    const newT: EmailTemplate = { name: "", subject: "", body_preview: "", trigger: "order_confirmed" };
    setSettings({ ...settings, email_templates_custom: [...templates, newT] });
    setEditIdx(templates.length);
  };

  const removeTemplate = (idx: number) => {
    setSettings({ ...settings, email_templates_custom: templates.filter((_, i) => i !== idx) });
    if (editIdx === idx) setEditIdx(null);
  };

  const triggerLabels: Record<string, string> = {
    order_confirmed: "Rendelés visszaigazolás",
    order_shipped: "Szállítás elindult",
    order_delivered: "Kézbesítve",
    password_reset: "Jelszó visszaállítás",
    welcome: "Üdvözlő e-mail",
    review_request: "Vélemény kérés",
    abandoned_cart: "Elhagyott kosár",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">E-mail sablonok</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Mail className="h-4 w-4 text-accent" /> Feladó domain
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Feladó e-mail domain</Label>
          <Input value={settings.email_sender_domain ?? ""} onChange={e => setSettings({ ...settings, email_sender_domain: e.target.value })} placeholder="pl. noreply@example.com" className="rounded-none mt-1 max-w-sm" />
          <p className="text-xs text-muted-foreground mt-1">Az e-mailek erről a címről kerülnek kiküldésre.</p>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Sablonok</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addTemplate}>
            <Plus className="h-3 w-3 mr-1" /> Új sablon
          </Button>
        </div>
        {templates.length === 0 && <p className="text-xs text-muted-foreground">Nincs egyedi sablon. Az alapértelmezett sablonok vannak használatban.</p>}
        {templates.map((tpl, i) => (
          <div key={i} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{tpl.name || "Névtelen sablon"}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditIdx(editIdx === i ? null : i)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeTemplate(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Trigger: {triggerLabels[tpl.trigger] || tpl.trigger}</div>
            {editIdx === i && (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-wider">Sablon neve</Label>
                  <Input value={tpl.name} onChange={e => updateTemplate(i, "name", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Trigger esemény</Label>
                  <select value={tpl.trigger} onChange={e => updateTemplate(i, "trigger", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
                    {Object.entries(triggerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-wider">Tárgy</Label>
                  <Input value={tpl.subject} onChange={e => updateTemplate(i, "subject", e.target.value)} className="rounded-none mt-1 text-xs" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-wider">Tartalom (előnézet)</Label>
                  <Textarea value={tpl.body_preview} onChange={e => updateTemplate(i, "body_preview", e.target.value)} className="rounded-none mt-1 text-xs min-h-[80px]" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminEmailTemplatesTab;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, ShieldAlert, ClipboardCheck, AlertTriangle, Package } from "lucide-react";

const AdminProductRecallTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_disable_product: true,
    notify_affected_customers: true,
    notify_via_email: true,
    notify_via_sms: false,
    quality_checklist: [
      "Anyagminőség ellenőrzés",
      "Méret pontosság",
      "Varrás minőség",
      "Címke és összetétel",
      "Csomagolás állapot",
    ],
    batch_tracking_enabled: true,
    batch_code_format: "BATCH-YYYYMMDD-XXX",
    recall_reason_options: [
      "Anyaghiba",
      "Méreteltérés",
      "Színeltérés",
      "Biztonsági probléma",
      "Címkézési hiba",
      "Egyéb",
    ],
    auto_refund: false,
    replacement_offer: true,
    recall_urgency_levels: ["Alacsony", "Közepes", "Magas", "Kritikus"],
    documentation_required: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("product_recall_enabled, product_recall_settings").limit(1).single();
      if (data) {
        setEnabled(data.product_recall_enabled ?? false);
        if (data.product_recall_settings && typeof data.product_recall_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.product_recall_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      product_recall_enabled: enabled,
      product_recall_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Termékvizsgálat beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-accent" /> Termékvizsgálat & visszahívás</h2>
          <p className="text-sm text-muted-foreground">Minőségellenőrzés, batch tracking és termék visszahívás</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Visszahívás</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_disable_product} onCheckedChange={(v) => setSettings({ ...settings, auto_disable_product: v })} />
            <Label className="text-sm">Termék automatikus letiltása</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.notify_affected_customers} onCheckedChange={(v) => setSettings({ ...settings, notify_affected_customers: v })} />
            <Label className="text-sm">Érintett vásárlók értesítése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.notify_via_email} onCheckedChange={(v) => setSettings({ ...settings, notify_via_email: v })} />
            <Label className="text-sm">Értesítés e-mailben</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_refund} onCheckedChange={(v) => setSettings({ ...settings, auto_refund: v })} />
            <Label className="text-sm">Automatikus visszatérítés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.replacement_offer} onCheckedChange={(v) => setSettings({ ...settings, replacement_offer: v })} />
            <Label className="text-sm">Cseretermék felajánlás</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Visszahívás okok (vesszővel)</Label>
            <Input value={settings.recall_reason_options.join(", ")} onChange={(e) => setSettings({ ...settings, recall_reason_options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sürgősségi szintek (vesszővel)</Label>
            <Input value={settings.recall_urgency_levels.join(", ")} onChange={(e) => setSettings({ ...settings, recall_urgency_levels: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </div>
        </div>

        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Minőségellenőrzés</h3>
          <div>
            <Label className="text-xs text-muted-foreground">Ellenőrzési checklist (vesszővel)</Label>
            <Input value={settings.quality_checklist.join(", ")} onChange={(e) => setSettings({ ...settings, quality_checklist: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.documentation_required} onCheckedChange={(v) => setSettings({ ...settings, documentation_required: v })} />
            <Label className="text-sm">Dokumentáció kötelező</Label>
          </div>

          <h3 className="font-semibold text-foreground flex items-center gap-2 mt-4"><Package className="w-4 h-4" /> Batch tracking</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.batch_tracking_enabled} onCheckedChange={(v) => setSettings({ ...settings, batch_tracking_enabled: v })} />
            <Label className="text-sm">Batch követés</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Batch kód formátum</Label>
            <Input value={settings.batch_code_format} onChange={(e) => setSettings({ ...settings, batch_code_format: e.target.value })} />
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}
      </Button>
    </div>
  );
};

export default AdminProductRecallTab;

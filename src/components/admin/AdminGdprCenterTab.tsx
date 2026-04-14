import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Shield } from "lucide-react";

const AdminGdprCenterTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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
      gdpr_center_settings: settings.gdpr_center_settings,
      gdpr_center_enabled: settings.gdpr_center_enabled,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "GDPR központ beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const gdpr = settings.gdpr_center_settings && typeof settings.gdpr_center_settings === "object" ? settings.gdpr_center_settings : {};
  const updateGdpr = (field: string, value: any) => {
    setSettings({ ...settings, gdpr_center_settings: { ...gdpr, [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">GDPR / Adatvédelmi központ</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Shield className="h-4 w-4 text-accent" /> GDPR központ
          </div>
          <Switch checked={settings.gdpr_center_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, gdpr_center_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Vásárlói hozzájárulás kezelés, adattörlési kérelmek, marketing opt-in/out és süti beállítások.</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Hozzájárulás kezelés</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Marketing hozzájárulás kérése</Label><Switch checked={gdpr.marketing_consent ?? true} onCheckedChange={v => updateGdpr("marketing_consent", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Analytics hozzájárulás kérése</Label><Switch checked={gdpr.analytics_consent ?? true} onCheckedChange={v => updateGdpr("analytics_consent", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Harmadik fél sütik kérése</Label><Switch checked={gdpr.third_party_consent ?? true} onCheckedChange={v => updateGdpr("third_party_consent", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Double opt-in marketing</Label><Switch checked={gdpr.double_optin ?? false} onCheckedChange={v => updateGdpr("double_optin", v)} /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Süti kezelés</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Süti banner megjelenítés</Label><Switch checked={gdpr.cookie_banner ?? true} onCheckedChange={v => updateGdpr("cookie_banner", v)} /></div>
          <div>
            <Label className="text-xs uppercase tracking-wider">Banner pozíció</Label>
            <select value={gdpr.cookie_position ?? "bottom"} onChange={e => updateGdpr("cookie_position", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
              <option value="bottom">Alul</option>
              <option value="top">Felül</option>
              <option value="center">Középen (modal)</option>
            </select>
          </div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Részletes süti beállítások</Label><Switch checked={gdpr.granular_cookies ?? true} onCheckedChange={v => updateGdpr("granular_cookies", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Süti lejárat (nap)</Label><Input type="number" value={gdpr.cookie_expiry_days ?? 365} onChange={e => updateGdpr("cookie_expiry_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Adattörlési kérelmek</span>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Self-service törlés</Label><Switch checked={gdpr.self_delete ?? false} onCheckedChange={v => updateGdpr("self_delete", v)} /></div>
          <div><Label className="text-xs uppercase tracking-wider">Törlési határidő (nap)</Label><Input type="number" value={gdpr.deletion_deadline_days ?? 30} onChange={e => updateGdpr("deletion_deadline_days", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Anonimizálás törlés helyett</Label><Switch checked={gdpr.anonymize_instead ?? true} onCheckedChange={v => updateGdpr("anonymize_instead", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Adatexport (GDPR portolhatóság)</Label><Switch checked={gdpr.data_export ?? true} onCheckedChange={v => updateGdpr("data_export", v)} /></div>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Adatvédelmi dokumentumok</span>
        <div className="space-y-3">
          <div><Label className="text-xs uppercase tracking-wider">Adatvédelmi tájékoztató URL</Label><Input value={gdpr.privacy_url ?? ""} onChange={e => updateGdpr("privacy_url", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="/adatvedelem" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Süti tájékoztató URL</Label><Input value={gdpr.cookie_policy_url ?? ""} onChange={e => updateGdpr("cookie_policy_url", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="/suti-tajekoztato" /></div>
          <div><Label className="text-xs uppercase tracking-wider">DPO e-mail cím</Label><Input value={gdpr.dpo_email ?? ""} onChange={e => updateGdpr("dpo_email", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="dpo@webshop.hu" /></div>
        </div>
      </div>
    </div>
  );
};

export default AdminGdprCenterTab;

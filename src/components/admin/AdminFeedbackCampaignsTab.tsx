import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, MessageSquare, BarChart3, Clock } from "lucide-react";

const AdminFeedbackCampaignsTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    nps_survey_enabled: true,
    nps_frequency_days: 30,
    post_purchase_survey: true,
    post_purchase_delay_hours: 48,
    csat_survey_enabled: true,
    email_feedback_enabled: true,
    in_app_feedback: true,
    auto_follow_up_negative: true,
    negative_threshold: 3,
    incentive_enabled: false,
    incentive_points: 50,
    max_surveys_per_customer_month: 2,
    anonymous_feedback: true,
    report_frequency: "weekly",
    auto_tag_feedback: true,
    sentiment_analysis: true,
    escalate_critical: true,
    critical_keywords: "rossz,szörnyű,visszaküldöm",
    survey_expiry_days: 7,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("feedback_campaigns_enabled, feedback_campaigns_settings").limit(1).single();
      if (data) {
        setEnabled(data.feedback_campaigns_enabled ?? false);
        if (data.feedback_campaigns_settings && typeof data.feedback_campaigns_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.feedback_campaigns_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      feedback_campaigns_enabled: enabled,
      feedback_campaigns_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Visszajelzés kampány beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><MessageSquare className="w-5 h-5 text-accent" /> Visszajelzés kampányok</h2>
          <p className="text-sm text-muted-foreground">NPS felmérés, elégedettségi kérdőívek, visszajelzés gyűjtés automatizálás</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Felmérés típusok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.nps_survey_enabled} onCheckedChange={(v) => setSettings({ ...settings, nps_survey_enabled: v })} />
            <Label className="text-sm">NPS felmérés</Label>
          </div>
          {settings.nps_survey_enabled && (
            <div><Label className="text-xs text-muted-foreground">NPS gyakoriság (nap)</Label>
              <Input type="number" min={7} max={365} value={settings.nps_frequency_days} onChange={(e) => setSettings({ ...settings, nps_frequency_days: Number(e.target.value) })} /></div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.post_purchase_survey} onCheckedChange={(v) => setSettings({ ...settings, post_purchase_survey: v })} />
            <Label className="text-sm">Vásárlás utáni kérdőív</Label>
          </div>
          {settings.post_purchase_survey && (
            <div><Label className="text-xs text-muted-foreground">Küldés késleltetés (óra)</Label>
              <Input type="number" min={1} max={168} value={settings.post_purchase_delay_hours} onChange={(e) => setSettings({ ...settings, post_purchase_delay_hours: Number(e.target.value) })} /></div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.csat_survey_enabled} onCheckedChange={(v) => setSettings({ ...settings, csat_survey_enabled: v })} />
            <Label className="text-sm">CSAT felmérés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.email_feedback_enabled} onCheckedChange={(v) => setSettings({ ...settings, email_feedback_enabled: v })} />
            <Label className="text-sm">E-mail visszajelzés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.in_app_feedback} onCheckedChange={(v) => setSettings({ ...settings, in_app_feedback: v })} />
            <Label className="text-sm">Alkalmazáson belüli visszajelzés</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Max felmérés / ügyfél / hó</Label>
            <Input type="number" min={1} max={10} value={settings.max_surveys_per_customer_month} onChange={(e) => setSettings({ ...settings, max_surveys_per_customer_month: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Felmérés lejárat (nap)</Label>
            <Input type="number" min={1} max={30} value={settings.survey_expiry_days} onChange={(e) => setSettings({ ...settings, survey_expiry_days: Number(e.target.value) })} /></div>
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Automatizálás & elemzés</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_follow_up_negative} onCheckedChange={(v) => setSettings({ ...settings, auto_follow_up_negative: v })} />
            <Label className="text-sm">Negatív visszajelzés követés</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Negatív küszöb (1-5)</Label>
            <Input type="number" min={1} max={5} value={settings.negative_threshold} onChange={(e) => setSettings({ ...settings, negative_threshold: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.sentiment_analysis} onCheckedChange={(v) => setSettings({ ...settings, sentiment_analysis: v })} />
            <Label className="text-sm">Hangulat elemzés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_tag_feedback} onCheckedChange={(v) => setSettings({ ...settings, auto_tag_feedback: v })} />
            <Label className="text-sm">Auto címkézés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.escalate_critical} onCheckedChange={(v) => setSettings({ ...settings, escalate_critical: v })} />
            <Label className="text-sm">Kritikus esetek eszkaláció</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.incentive_enabled} onCheckedChange={(v) => setSettings({ ...settings, incentive_enabled: v })} />
            <Label className="text-sm">Ösztönző pontok</Label>
          </div>
          {settings.incentive_enabled && (
            <div><Label className="text-xs text-muted-foreground">Pont / kitöltés</Label>
              <Input type="number" min={1} max={500} value={settings.incentive_points} onChange={(e) => setSettings({ ...settings, incentive_points: Number(e.target.value) })} /></div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={settings.anonymous_feedback} onCheckedChange={(v) => setSettings({ ...settings, anonymous_feedback: v })} />
            <Label className="text-sm">Anonim visszajelzés engedélyezés</Label>
          </div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminFeedbackCampaignsTab;

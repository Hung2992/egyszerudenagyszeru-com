import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Save, Sparkles, Tag, Search } from "lucide-react";

const AdminAiProductTaggingTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState({
    auto_tag_new_products: true,
    auto_categorize: true,
    generate_keywords: true,
    generate_seo_description: true,
    max_tags_per_product: 10,
    max_keywords: 15,
    language: "hu",
    tag_from_image: true,
    tag_from_description: true,
    tag_from_title: true,
    confidence_threshold: 70,
    require_approval: true,
    auto_translate_tags: false,
    suggest_related_products: true,
    color_detection: true,
    material_detection: true,
    style_detection: true,
    brand_detection: false,
    batch_processing: true,
    batch_size: 50,
    reprocess_interval_days: 30,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("store_settings").select("ai_product_tagging_enabled, ai_product_tagging_settings").limit(1).single();
      if (data) {
        setEnabled(data.ai_product_tagging_enabled ?? false);
        if (data.ai_product_tagging_settings && typeof data.ai_product_tagging_settings === "object") {
          setSettings((prev) => ({ ...prev, ...(data.ai_product_tagging_settings as any) }));
        }
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("store_settings").update({
      ai_product_tagging_enabled: enabled,
      ai_product_tagging_settings: settings as any,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "AI címkézés beállítások mentve!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> AI termék címkézés</h2>
          <p className="text-sm text-muted-foreground">Automatikus címkézés, kategorizálás, kulcsszó generálás</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>{enabled ? "Aktív" : "Inaktív"}</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Tag className="w-4 h-4" /> Címkézési szabályok</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_tag_new_products} onCheckedChange={(v) => setSettings({ ...settings, auto_tag_new_products: v })} />
            <Label className="text-sm">Új termékek auto címkézése</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.auto_categorize} onCheckedChange={(v) => setSettings({ ...settings, auto_categorize: v })} />
            <Label className="text-sm">Automatikus kategorizálás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.generate_keywords} onCheckedChange={(v) => setSettings({ ...settings, generate_keywords: v })} />
            <Label className="text-sm">Kulcsszó generálás</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.generate_seo_description} onCheckedChange={(v) => setSettings({ ...settings, generate_seo_description: v })} />
            <Label className="text-sm">SEO leírás generálás</Label>
          </div>
          <div><Label className="text-xs text-muted-foreground">Max címkék / termék</Label>
            <Input type="number" min={1} max={30} value={settings.max_tags_per_product} onChange={(e) => setSettings({ ...settings, max_tags_per_product: Number(e.target.value) })} /></div>
          <div><Label className="text-xs text-muted-foreground">Megbízhatósági küszöb (%)</Label>
            <Input type="number" min={10} max={100} value={settings.confidence_threshold} onChange={(e) => setSettings({ ...settings, confidence_threshold: Number(e.target.value) })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.require_approval} onCheckedChange={(v) => setSettings({ ...settings, require_approval: v })} />
            <Label className="text-sm">Jóváhagyás szükséges</Label>
          </div>
        </div>
        <div className="border border-border rounded p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Search className="w-4 h-4" /> Felismerés & feldolgozás</h3>
          <div className="flex items-center gap-2">
            <Switch checked={settings.tag_from_image} onCheckedChange={(v) => setSettings({ ...settings, tag_from_image: v })} />
            <Label className="text-sm">Képből címkézés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.tag_from_description} onCheckedChange={(v) => setSettings({ ...settings, tag_from_description: v })} />
            <Label className="text-sm">Leírásból címkézés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.color_detection} onCheckedChange={(v) => setSettings({ ...settings, color_detection: v })} />
            <Label className="text-sm">Szín felismerés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.material_detection} onCheckedChange={(v) => setSettings({ ...settings, material_detection: v })} />
            <Label className="text-sm">Anyag felismerés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.style_detection} onCheckedChange={(v) => setSettings({ ...settings, style_detection: v })} />
            <Label className="text-sm">Stílus felismerés</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.suggest_related_products} onCheckedChange={(v) => setSettings({ ...settings, suggest_related_products: v })} />
            <Label className="text-sm">Kapcsolódó termék javaslat</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={settings.batch_processing} onCheckedChange={(v) => setSettings({ ...settings, batch_processing: v })} />
            <Label className="text-sm">Kötegelt feldolgozás</Label>
          </div>
          {settings.batch_processing && (
            <div><Label className="text-xs text-muted-foreground">Köteg méret</Label>
              <Input type="number" min={1} max={200} value={settings.batch_size} onChange={(e) => setSettings({ ...settings, batch_size: Number(e.target.value) })} /></div>
          )}
          <div><Label className="text-xs text-muted-foreground">Újrafeldolgozás (nap)</Label>
            <Input type="number" min={1} max={90} value={settings.reprocess_interval_days} onChange={(e) => setSettings({ ...settings, reprocess_interval_days: Number(e.target.value) })} /></div>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? "Mentés..." : "Mentés"}</Button>
    </div>
  );
};

export default AdminAiProductTaggingTab;

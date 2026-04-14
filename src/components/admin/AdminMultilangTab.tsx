import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Languages, Plus, Trash2 } from "lucide-react";

const AdminMultilangTab = () => {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [newLang, setNewLang] = useState("");

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
      multilang_enabled: settings.multilang_enabled,
      multilang_default_language: settings.multilang_default_language,
      multilang_available_languages: settings.multilang_available_languages,
      multilang_auto_translate: settings.multilang_auto_translate,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Többnyelvűség beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const langs: string[] = Array.isArray(settings.multilang_available_languages) ? settings.multilang_available_languages : ["hu"];

  const addLang = () => {
    if (!newLang.trim() || langs.includes(newLang.trim().toLowerCase())) return;
    setSettings({ ...settings, multilang_available_languages: [...langs, newLang.trim().toLowerCase()] });
    setNewLang("");
  };

  const removeLang = (lang: string) => {
    setSettings({ ...settings, multilang_available_languages: langs.filter(l => l !== lang) });
  };

  const langNames: Record<string, string> = { hu: "Magyar", en: "English", de: "Deutsch", fr: "Français", ro: "Română", sk: "Slovenčina", hr: "Hrvatski", sr: "Srpski", it: "Italiano", es: "Español", pl: "Polski", cs: "Čeština" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Többnyelvűség kezelés</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Languages className="h-4 w-4 text-accent" /> Többnyelvűség
          </div>
          <Switch checked={settings.multilang_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, multilang_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Webshop tartalom megjelenítése több nyelven.</p>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Alapértelmezett nyelv</span>
        <select
          value={settings.multilang_default_language ?? "hu"}
          onChange={e => setSettings({ ...settings, multilang_default_language: e.target.value })}
          className="flex h-10 w-full max-w-xs rounded-none border border-input bg-background px-3 py-2 text-sm mt-1"
        >
          {langs.map(l => <option key={l} value={l}>{langNames[l] || l.toUpperCase()}</option>)}
        </select>
      </div>

      <div className="border p-4 space-y-4">
        <span className="text-sm font-bold uppercase tracking-wider">Elérhető nyelvek</span>
        <div className="flex flex-wrap gap-2">
          {langs.map(l => (
            <div key={l} className="border px-3 py-1.5 flex items-center gap-2 text-xs uppercase tracking-wider">
              {langNames[l] || l.toUpperCase()}
              {langs.length > 1 && (
                <button onClick={() => removeLang(l)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input value={newLang} onChange={e => setNewLang(e.target.value)} placeholder="Nyelv kód (pl. en, de)" className="rounded-none max-w-[200px] text-xs" />
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addLang}>
            <Plus className="h-3 w-3 mr-1" /> Hozzáadás
          </Button>
        </div>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wider">Automatikus fordítási javaslatok</Label>
          <Switch checked={settings.multilang_auto_translate ?? false} onCheckedChange={v => setSettings({ ...settings, multilang_auto_translate: v })} />
        </div>
        <p className="text-xs text-muted-foreground">AI-alapú fordítási javaslatok termékleírásokhoz és kategóriákhoz.</p>
      </div>
    </div>
  );
};

export default AdminMultilangTab;

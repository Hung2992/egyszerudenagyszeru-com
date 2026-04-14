import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Plus, Trash2, Pencil, Rss } from "lucide-react";

interface FeedChannel {
  id: string;
  name: string;
  type: "google_shopping" | "facebook" | "instagram" | "csv" | "xml";
  url: string;
  auto_update: boolean;
  update_interval_hours: number;
  include_categories: string;
  exclude_out_of_stock: boolean;
  is_active: boolean;
}

const FEED_TYPES: Record<string, string> = { google_shopping: "Google Shopping", facebook: "Facebook Catalog", instagram: "Instagram Shopping", csv: "CSV Export", xml: "XML Feed" };

const emptyChannel = (): FeedChannel => ({
  id: crypto.randomUUID(), name: "", type: "google_shopping", url: "", auto_update: true,
  update_interval_hours: 24, include_categories: "", exclude_out_of_stock: true, is_active: true,
});

const AdminProductFeedTab = () => {
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
      product_feed_enabled: settings.product_feed_enabled,
      product_feed_channels: settings.product_feed_channels,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Mentve", description: "Termékadat feed beállítások frissítve." });
  };

  if (!settings) return <div className="text-muted-foreground text-sm">Betöltés...</div>;

  const channels: FeedChannel[] = Array.isArray(settings.product_feed_channels) ? settings.product_feed_channels : [];

  const addChannel = () => {
    const n = emptyChannel();
    setSettings({ ...settings, product_feed_channels: [...channels, n] });
    setEditIdx(channels.length);
  };

  const updateChannel = (idx: number, field: string, value: any) => {
    const updated = [...channels];
    updated[idx] = { ...updated[idx], [field]: value };
    setSettings({ ...settings, product_feed_channels: updated });
  };

  const removeChannel = (idx: number) => {
    setSettings({ ...settings, product_feed_channels: channels.filter((_, i) => i !== idx) });
    if (editIdx === idx) setEditIdx(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Termékadat feed kezelő</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Mentés..." : "Mentés"}
        </Button>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Rss className="h-4 w-4 text-accent" /> Termék feed generálás
          </div>
          <Switch checked={settings.product_feed_enabled ?? false} onCheckedChange={v => setSettings({ ...settings, product_feed_enabled: v })} />
        </div>
        <p className="text-xs text-muted-foreground">Automatikus termékadat feed generálás külső csatornákhoz.</p>
      </div>

      <div className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider">Csatornák ({channels.length})</span>
          <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={addChannel}>
            <Plus className="h-3 w-3 mr-1" /> Új csatorna
          </Button>
        </div>

        {channels.length === 0 && <p className="text-xs text-muted-foreground">Nincsenek feed csatornák konfigurálva.</p>}

        {channels.map((c, i) => (
          <div key={c.id} className="border p-3 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.name || "Névtelen"}</span>
                <span className="text-[9px] uppercase tracking-widest border px-1.5 py-0.5">{FEED_TYPES[c.type]}</span>
                {c.is_active ? (
                  <span className="text-[9px] uppercase tracking-widest text-green-500 border border-green-500/30 px-1.5 py-0.5">Aktív</span>
                ) : (
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground border px-1.5 py-0.5">Inaktív</span>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditIdx(editIdx === i ? null : i)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeChannel(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {editIdx === i && (
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label className="text-xs uppercase tracking-wider">Csatorna neve</Label><Input value={c.name} onChange={e => updateChannel(i, "name", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
                <div><Label className="text-xs uppercase tracking-wider">Típus</Label>
                  <select value={c.type} onChange={e => updateChannel(i, "type", e.target.value)} className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-xs mt-1">
                    {Object.entries(FEED_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2"><Label className="text-xs uppercase tracking-wider">Feed URL</Label><Input value={c.url} onChange={e => updateChannel(i, "url", e.target.value)} className="rounded-none mt-1 text-xs" placeholder="https://..." /></div>
                <div><Label className="text-xs uppercase tracking-wider">Frissítési intervallum (óra)</Label><Input type="number" value={c.update_interval_hours} onChange={e => updateChannel(i, "update_interval_hours", Number(e.target.value))} className="rounded-none mt-1 text-xs" /></div>
                <div><Label className="text-xs uppercase tracking-wider">Kategóriák (üres = mind)</Label><Input value={c.include_categories} onChange={e => updateChannel(i, "include_categories", e.target.value)} className="rounded-none mt-1 text-xs" /></div>
                <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Kifogyott termékek kizárása</Label><Switch checked={c.exclude_out_of_stock} onCheckedChange={v => updateChannel(i, "exclude_out_of_stock", v)} /></div>
                <div className="flex items-center justify-between"><Label className="text-xs uppercase tracking-wider">Aktív</Label><Switch checked={c.is_active} onCheckedChange={v => updateChannel(i, "is_active", v)} /></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminProductFeedTab;

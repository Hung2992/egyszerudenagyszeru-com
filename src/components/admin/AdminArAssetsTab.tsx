// Sprint B — Admin AR/3D asset manager + analitika
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, View, Eye } from "lucide-react";
import ArConversionFunnel from "@/components/admin/ArConversionFunnel";
import ArCommerceOptimizer from "@/components/admin/ArCommerceOptimizer";
import TryOnFunnel from "@/components/admin/TryOnFunnel";

type Asset = {
  id: string;
  product_id: string;
  product_source: string;
  glb_url: string | null;
  usdz_url: string | null;
  poster_url: string | null;
  alt_text: string | null;
  ar_enabled: boolean;
  auto_rotate: boolean;
  camera_orbit: string | null;
  is_active: boolean;
  created_at: string;
};

type Stat = {
  event_type: string;
  device_type: string | null;
  cnt: number;
};

export default function AdminArAssetsTab() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stat[]>([]);
  const [form, setForm] = useState({
    product_id: "",
    glb_url: "",
    usdz_url: "",
    poster_url: "",
    alt_text: "",
    ar_enabled: true,
    auto_rotate: true,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: a } = await (supabase.from("product_3d_assets" as any) as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setAssets((a as Asset[]) || []);

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: e } = await (supabase.from("ar_events" as any) as any)
      .select("event_type, device_type")
      .gte("created_at", since);
    const map = new Map<string, number>();
    (e || []).forEach((r: any) => {
      const key = `${r.event_type}|${r.device_type || "unknown"}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    setStats(
      Array.from(map.entries()).map(([k, cnt]) => {
        const [event_type, device_type] = k.split("|");
        return { event_type, device_type, cnt };
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.product_id || !form.glb_url) {
      toast({ title: "Termék ID és GLB URL kötelező", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("product_3d_assets" as any) as any).insert({
      product_id: form.product_id,
      glb_url: form.glb_url,
      usdz_url: form.usdz_url || null,
      poster_url: form.poster_url || null,
      alt_text: form.alt_text || null,
      ar_enabled: form.ar_enabled,
      auto_rotate: form.auto_rotate,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "3D asset mentve ✅" });
    setForm({ product_id: "", glb_url: "", usdz_url: "", poster_url: "", alt_text: "", ar_enabled: true, auto_rotate: true });
    load();
  };

  const toggle = async (id: string, field: "is_active" | "ar_enabled", value: boolean) => {
    await (supabase.from("product_3d_assets" as any) as any).update({ [field]: value }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Biztosan törlöd?")) return;
    await (supabase.from("product_3d_assets" as any) as any).delete().eq("id", id);
    toast({ title: "Törölve" });
    load();
  };

  const totalEvents = stats.reduce((s, r) => s + r.cnt, 0);
  const arLaunches = stats.filter((s) => s.event_type === "ar_launch").reduce((s, r) => s + r.cnt, 0);
  const viewOpens = stats.filter((s) => s.event_type === "3d_view_open").reduce((s, r) => s + r.cnt, 0);
  const styleRecs = stats.filter((s) => s.event_type.startsWith("style_recommend")).reduce((s, r) => s + r.cnt, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <View className="h-5 w-5" />
            AR / 3D Termékélmény
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="border border-border p-3">
              <div className="text-xs text-muted-foreground">Aktív 3D modellek</div>
              <div className="text-2xl font-bold">{assets.filter((a) => a.is_active).length}</div>
            </div>
            <div className="border border-border p-3">
              <div className="text-xs text-muted-foreground">3D megnyitás (30n)</div>
              <div className="text-2xl font-bold">{viewOpens}</div>
            </div>
            <div className="border border-border p-3">
              <div className="text-xs text-muted-foreground">AR indítás (30n)</div>
              <div className="text-2xl font-bold">{arLaunches}</div>
            </div>
            <div className="border border-border p-3">
              <div className="text-xs text-muted-foreground">AI stílus kérés</div>
              <div className="text-2xl font-bold">{styleRecs}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ArConversionFunnel />

      <TryOnFunnel />

      <ArCommerceOptimizer />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Új 3D asset hozzáadása
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Termék ID (shop_products UUID)</Label>
              <Input value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} placeholder="uuid..." />
            </div>
            <div>
              <Label>Alt szöveg</Label>
              <Input value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} placeholder="pl. Fekete streetwear cipő 3D" />
            </div>
            <div>
              <Label>GLB URL (Android + desktop) *</Label>
              <Input value={form.glb_url} onChange={(e) => setForm({ ...form, glb_url: e.target.value })} placeholder="https://.../model.glb" />
            </div>
            <div>
              <Label>USDZ URL (iOS AR Quick Look)</Label>
              <Input value={form.usdz_url} onChange={(e) => setForm({ ...form, usdz_url: e.target.value })} placeholder="https://.../model.usdz" />
            </div>
            <div className="md:col-span-2">
              <Label>Poster kép (fallback)</Label>
              <Input value={form.poster_url} onChange={(e) => setForm({ ...form, poster_url: e.target.value })} placeholder="https://.../poster.jpg" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.ar_enabled} onCheckedChange={(v) => setForm({ ...form, ar_enabled: v })} />
              AR engedélyezve
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.auto_rotate} onCheckedChange={(v) => setForm({ ...form, auto_rotate: v })} />
              Automatikus forgatás
            </label>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Mentés
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meglévő 3D assetek</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : assets.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Még nincs 3D asset feltöltve.</div>
          ) : (
            <div className="space-y-2">
              {assets.map((a) => (
                <div key={a.id} className="flex items-center justify-between border border-border p-3">
                  <div className="flex items-center gap-3">
                    {a.poster_url && <img src={a.poster_url} alt="" className="h-12 w-12 border border-border object-cover" />}
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs">{a.product_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.ar_enabled ? "AR ✅" : "AR ❌"} • {a.is_active ? "aktív" : "inaktív"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={a.is_active} onCheckedChange={(v) => toggle(a.id, "is_active", v)} />
                    <Button size="icon" variant="ghost" onClick={() => window.open(a.glb_url || "", "_blank")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eseménybontás (30 nap)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Összes esemény: {totalEvents}</div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center justify-between border border-border px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{s.event_type}</span>{" "}
                  <span className="text-xs text-muted-foreground">({s.device_type})</span>
                </div>
                <div className="font-mono">{s.cnt}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

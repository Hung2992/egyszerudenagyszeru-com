import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Shield, TrendingUp, Ban, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface Rule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  max_discount_percent: number;
  min_margin_percent: number;
  min_cart_value: number;
  offer_ttl_minutes: number;
  allow_on_sale_products: boolean;
  allow_on_new_products: boolean;
  allow_on_clearance: boolean;
  allowed_categories: string[];
  blocked_categories: string[];
  max_offers_per_product_per_day: number;
  max_attempts_per_hour: number;
  max_rejected_per_hour: number;
  coupon_conflict_policy: "override" | "block" | "ask";
}

interface Event {
  id: string;
  created_at: string;
  granted: boolean;
  reason: string | null;
  requested_discount_percent: number | null;
  product_id: string | null;
  user_id: string | null;
  context: any;
}

interface Offer {
  id: string;
  created_at: string;
  product_name: string;
  original_price: number;
  offered_price: number;
  discount_percent: number;
  coupon_code: string;
  expires_at: string;
  accepted: boolean;
}

export default function AdminAiPricingTab() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: r }, { data: e }, { data: o }] = await Promise.all([
      supabase.from("ai_pricing_rules").select("*").order("priority", { ascending: true }),
      supabase.from("ai_pricing_events").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("ai_price_offers").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setRules((r as Rule[]) ?? []);
    setEvents((e as Event[]) ?? []);
    setOffers((o as Offer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveRule = async (r: Rule) => {
    setSaving(r.id);
    const { error } = await supabase
      .from("ai_pricing_rules")
      .update({
        name: r.name,
        description: r.description,
        is_active: r.is_active,
        priority: r.priority,
        max_discount_percent: r.max_discount_percent,
        min_margin_percent: r.min_margin_percent,
        min_cart_value: r.min_cart_value,
        offer_ttl_minutes: r.offer_ttl_minutes,
        allow_on_sale_products: r.allow_on_sale_products,
        allow_on_new_products: r.allow_on_new_products,
        allow_on_clearance: r.allow_on_clearance,
        allowed_categories: r.allowed_categories,
        blocked_categories: r.blocked_categories,
        max_offers_per_product_per_day: r.max_offers_per_product_per_day,
        max_attempts_per_hour: r.max_attempts_per_hour,
        max_rejected_per_hour: r.max_rejected_per_hour,
        coupon_conflict_policy: r.coupon_conflict_policy,
      } as any)
      .eq("id", r.id);
    setSaving(null);
    if (error) toast.error("Mentés sikertelen: " + error.message);
    else toast.success("Szabály mentve");
  };

  const createRule = async () => {
    const { error } = await supabase.from("ai_pricing_rules").insert({
      name: "Új szabály",
      priority: 200,
      max_discount_percent: 10,
      min_margin_percent: 15,
      offer_ttl_minutes: 30,
    });
    if (error) toast.error(error.message);
    else { toast.success("Létrehozva"); load(); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Biztosan törlöd?")) return;
    const { error } = await supabase.from("ai_pricing_rules").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Törölve"); load(); }
  };

  const updateLocal = (id: string, patch: Partial<Rule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const grantedCount = events.filter(e => e.granted).length;
  const rejectedCount = events.length - grantedCount;
  const acceptedOffers = offers.filter(o => o.accepted).length;

  // === Analitika számítások ===
  const acceptRate = offers.length > 0 ? Math.round((acceptedOffers / offers.length) * 100) : 0;
  const avgDiscount = offers.length > 0
    ? Math.round((offers.reduce((s, o) => s + Number(o.discount_percent || 0), 0) / offers.length) * 10) / 10
    : 0;
  const marginImpact = offers.filter(o => o.accepted).reduce(
    (s, o) => s + (Number(o.original_price) - Number(o.offered_price)), 0
  );
  const rejectionByReason = useMemo(() => {
    const map = new Map<string, number>();
    events.filter(e => !e.granted).forEach(e => {
      const key = (e.reason ?? "Ismeretlen").slice(0, 60);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map, ([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [events]);
  const dailyTrend = useMemo(() => {
    const map = new Map<string, { day: string; granted: number; rejected: number }>();
    events.forEach(e => {
      const day = new Date(e.created_at).toLocaleDateString("hu-HU");
      const row = map.get(day) ?? { day, granted: 0, rejected: 0 };
      if (e.granted) row.granted++; else row.rejected++;
      map.set(day, row);
    });
    return Array.from(map.values()).reverse();
  }, [events]);
  const pieColors = ["hsl(var(--primary))", "hsl(var(--destructive))"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" /> 💰 AI Áralku motor
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Az AI CSAK az itt beállított szabályok között javasolhat kedvezményt. A margin védelem és a kategória-tiltás mindig érvényesül.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Aktív szabályok</div>
          <div className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Engedélyezett ajánlat (100)</div>
          <div className="text-2xl font-bold text-green-600">{grantedCount}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Elutasított (100)</div>
          <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Felhasznált ajánlat</div>
          <div className="text-2xl font-bold">{acceptedOffers} / {offers.length}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Szabályok</TabsTrigger>
          <TabsTrigger value="offers">Kiadott ajánlatok</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1" /> Analitika</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Button onClick={createRule} size="sm"><Plus className="w-4 h-4 mr-1" /> Új szabály</Button>
          {rules.map(r => (
            <Card key={r.id} className={r.is_active ? "" : "opacity-60"}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex-1 space-y-1">
                  <Input value={r.name} onChange={e => updateLocal(r.id, { name: e.target.value })} className="font-semibold text-base" />
                  <div className="flex gap-2 mt-1">
                    <Badge variant={r.is_active ? "default" : "outline"}>Priority {r.priority}</Badge>
                    <Badge variant="secondary">Max {r.max_discount_percent}%</Badge>
                    <Badge variant="secondary">Min margin {r.min_margin_percent}%</Badge>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Switch checked={r.is_active} onCheckedChange={v => updateLocal(r.id, { is_active: v })} />
                  <Button size="icon" variant="ghost" onClick={() => deleteRule(r.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea placeholder="Leírás" value={r.description ?? ""} onChange={e => updateLocal(r.id, { description: e.target.value })} rows={2} />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Prioritás (kisebb = előbb)</Label>
                    <Input type="number" value={r.priority} onChange={e => updateLocal(r.id, { priority: +e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Max kedvezmény %</Label>
                    <Input type="number" min={0} max={100} value={r.max_discount_percent} onChange={e => updateLocal(r.id, { max_discount_percent: +e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Min margin % (védelem)</Label>
                    <Input type="number" min={0} max={100} value={r.min_margin_percent} onChange={e => updateLocal(r.id, { min_margin_percent: +e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Min kosárérték (Ft)</Label>
                    <Input type="number" value={r.min_cart_value} onChange={e => updateLocal(r.id, { min_cart_value: +e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Ajánlat érvényessége (perc)</Label>
                    <Input type="number" value={r.offer_ttl_minutes} onChange={e => updateLocal(r.id, { offer_ttl_minutes: +e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={r.allow_on_sale_products} onCheckedChange={v => updateLocal(r.id, { allow_on_sale_products: v })} />
                    Akciós termékre is
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={r.allow_on_new_products} onCheckedChange={v => updateLocal(r.id, { allow_on_new_products: v })} />
                    Új termékre is
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={r.allow_on_clearance} onCheckedChange={v => updateLocal(r.id, { allow_on_clearance: v })} />
                    Kifutó készletre
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Engedélyezett kategóriák (vesszővel)</Label>
                    <Input
                      placeholder="pl. póló, cipő"
                      value={(r.allowed_categories ?? []).join(", ")}
                      onChange={e => updateLocal(r.id, { allowed_categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Ban className="w-3 h-3" /> Tiltott kategóriák</Label>
                    <Input
                      placeholder="pl. limitált, exkluzív"
                      value={(r.blocked_categories ?? []).join(", ")}
                      onChange={e => updateLocal(r.id, { blocked_categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    />
                  </div>
                </div>

                <Button onClick={() => saveRule(r)} disabled={saving === r.id} size="sm">
                  {saving === r.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Mentés
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="offers">
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr><th className="p-2 text-left">Dátum</th><th className="p-2 text-left">Termék</th><th className="p-2 text-right">Ár</th><th className="p-2 text-right">Ajánlat</th><th className="p-2 text-right">%</th><th className="p-2 text-left">Kupon</th><th className="p-2 text-left">Lejár</th><th className="p-2">Elfogadva</th></tr>
                </thead>
                <tbody>
                  {offers.map(o => (
                    <tr key={o.id} className="border-t">
                      <td className="p-2">{new Date(o.created_at).toLocaleString("hu-HU")}</td>
                      <td className="p-2">{o.product_name}</td>
                      <td className="p-2 text-right">{o.original_price.toLocaleString()} Ft</td>
                      <td className="p-2 text-right font-semibold">{o.offered_price.toLocaleString()} Ft</td>
                      <td className="p-2 text-right">{o.discount_percent}%</td>
                      <td className="p-2 font-mono text-xs">{o.coupon_code}</td>
                      <td className="p-2 text-xs">{new Date(o.expires_at).toLocaleString("hu-HU")}</td>
                      <td className="p-2 text-center">{o.accepted ? "✅" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr><th className="p-2 text-left">Dátum</th><th className="p-2">Eredmény</th><th className="p-2 text-right">%</th><th className="p-2 text-left">Ok</th></tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id} className="border-t">
                      <td className="p-2 text-xs">{new Date(e.created_at).toLocaleString("hu-HU")}</td>
                      <td className="p-2 text-center">
                        {e.granted ? <Badge className="bg-green-600"><TrendingUp className="w-3 h-3 mr-1" />OK</Badge> : <Badge variant="destructive">✕</Badge>}
                      </td>
                      <td className="p-2 text-right">{e.requested_discount_percent ?? "—"}</td>
                      <td className="p-2 text-xs">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Elfogadási arány</div>
              <div className="text-2xl font-bold text-primary">{acceptRate}%</div>
              <div className="text-[10px] text-muted-foreground">{acceptedOffers} / {offers.length} ajánlat</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Átlagos kedvezmény</div>
              <div className="text-2xl font-bold">{avgDiscount}%</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Margin hatás (beváltott)</div>
              <div className="text-2xl font-bold text-red-600">-{marginImpact.toLocaleString("hu-HU")} Ft</div>
              <div className="text-[10px] text-muted-foreground">összes engedmény</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Engedélyezés / elutasítás</div>
              <div className="text-2xl font-bold">
                <span className="text-green-600">{grantedCount}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-red-600">{rejectedCount}</span>
              </div>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Napi trend</CardTitle></CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrend}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="granted" name="Engedélyezett" fill="hsl(var(--primary))" />
                    <Bar dataKey="rejected" name="Elutasított" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Elfogadás / elutasítás arány</CardTitle></CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Engedélyezett", value: grantedCount },
                        { name: "Elutasított", value: rejectedCount },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      {[0, 1].map(i => <Cell key={i} fill={pieColors[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Elutasítási okok (top 8)</CardTitle></CardHeader>
            <CardContent>
              {rejectionByReason.length === 0 ? (
                <p className="text-sm text-muted-foreground">Még nincs elutasítás.</p>
              ) : (
                <div className="space-y-2">
                  {rejectionByReason.map(r => {
                    const max = rejectionByReason[0].count;
                    const pct = Math.round((r.count / max) * 100);
                    return (
                      <div key={r.reason}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="truncate mr-2">{r.reason}</span>
                          <span className="font-mono">{r.count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-destructive/70" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

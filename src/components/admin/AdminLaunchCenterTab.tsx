import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Rocket, Calendar, Users, ShoppingCart, Vote, Sparkles, Save, Trash2,
  Eye, AlertTriangle, TrendingUp, Mail, Wand2, Plus
} from "lucide-react";

type LaunchStatus = "live" | "coming_soon" | "pre_order" | "waitlist";

interface LaunchProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url: string | null;
  launch_status: LaunchStatus;
  launch_date: string | null;
  teaser_image_url: string | null;
  teaser_description: string | null;
  preorder_enabled: boolean;
  preorder_deposit_percent: number;
  preorder_limit: number | null;
  preorder_count: number;
  waitlist_count: number;
  is_sneak_peek: boolean;
  poll_votes: number;
}

const STATUS_LABEL: Record<LaunchStatus, string> = {
  live: "Élő",
  coming_soon: "Hamarosan",
  pre_order: "Előrendelhető",
  waitlist: "Várólistás",
};

const STATUS_COLOR: Record<LaunchStatus, string> = {
  live: "text-green-500 border-green-500/30 bg-green-500/5",
  coming_soon: "text-blue-500 border-blue-500/30 bg-blue-500/5",
  pre_order: "text-accent border-accent/30 bg-accent/5",
  waitlist: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5",
};

const AdminLaunchCenterTab = () => {
  const [products, setProducts] = useState<LaunchProduct[]>([]);
  const [filter, setFilter] = useState<"all" | LaunchStatus>("all");
  const [editing, setEditing] = useState<LaunchProduct | null>(null);
  const [preorderList, setPreorderList] = useState<any[]>([]);
  const [waitlistList, setWaitlistList] = useState<any[]>([]);
  const [pollList, setPollList] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAll = async () => {
    const { data: prods } = await supabase
      .from("shop_products")
      .select("id, name, category, price, image_url, launch_status, launch_date, teaser_image_url, teaser_description, preorder_enabled, preorder_deposit_percent, preorder_limit, preorder_count, waitlist_count, is_sneak_peek, poll_votes")
      .order("launch_date", { ascending: true, nullsFirst: false });
    if (prods) setProducts(prods as any);

    const [{ data: pre }, { data: wait }, { data: polls }] = await Promise.all([
      supabase.from("product_preorders").select("*, shop_products(name)").order("created_at", { ascending: false }).limit(50),
      supabase.from("product_waitlist").select("*, shop_products(name)").order("position").limit(100),
      supabase.from("product_polls").select("*, shop_products(name)").order("created_at", { ascending: false }).limit(50),
    ]);
    setPreorderList(pre || []);
    setWaitlistList(wait || []);
    setPollList(polls || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from("shop_products").update({
      launch_status: editing.launch_status,
      launch_date: editing.launch_date,
      teaser_image_url: editing.teaser_image_url,
      teaser_description: editing.teaser_description,
      preorder_enabled: editing.preorder_enabled,
      preorder_deposit_percent: editing.preorder_deposit_percent,
      preorder_limit: editing.preorder_limit,
      is_sneak_peek: editing.is_sneak_peek,
    }).eq("id", editing.id);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Mentve", description: "Launch beállítások frissítve." });
    setEditing(null);
    fetchAll();
  };

  const generateTeaser = async () => {
    if (!editing) return;
    setAiLoading(true);
    try {
      const res = await fetch(`https://meyxhsgnryuupwpddxav.supabase.co/functions/v1/admin-ai-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          prompt: `Írj 2-3 mondatos, izgalmas, féligazság teaser szöveget egy közelgő termékhez. Termék: "${editing.name}", kategória: "${editing.category}". Kelts kíváncsiságot, ne áruld el a teljes részleteket. Magyarul, közvetlen hangnemben.`,
          system: "Te egy marketing szövegíró vagy. Tömör, izgalmas, féligazság-teasereket írsz divatos webshop termékekhez."
        }),
      });
      const data = await res.json();
      if (data.text) {
        setEditing({ ...editing, teaser_description: data.text.trim() });
        toast({ title: "AI generált", description: "Teaser szöveg készen áll." });
      } else {
        toast({ title: "AI hiba", description: data.error || "Nem sikerült generálni.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const filtered = products.filter(p => filter === "all" ? p.launch_status !== "live" : p.launch_status === filter);
  const stats = {
    coming: products.filter(p => p.launch_status === "coming_soon").length,
    pre: products.filter(p => p.launch_status === "pre_order").length,
    wait: products.filter(p => p.launch_status === "waitlist").length,
    totalPreorders: products.reduce((s, p) => s + p.preorder_count, 0),
    totalWaitlist: products.reduce((s, p) => s + p.waitlist_count, 0),
    totalVotes: products.reduce((s, p) => s + p.poll_votes, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
          <Rocket className="h-5 w-5 text-accent" /> Launch Center
        </h2>
        <span className="text-xs text-muted-foreground">Pre-order · Várólista · Sneak peek</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { icon: Calendar, label: "Hamarosan", value: stats.coming, color: "text-blue-500" },
          { icon: ShoppingCart, label: "Előrendelhető", value: stats.pre, color: "text-accent" },
          { icon: Users, label: "Várólistás", value: stats.wait, color: "text-yellow-500" },
          { icon: TrendingUp, label: "Előrendelések", value: stats.totalPreorders, color: "text-foreground" },
          { icon: Mail, label: "Feliratkozók", value: stats.totalWaitlist, color: "text-foreground" },
          { icon: Vote, label: "Szavazatok", value: stats.totalVotes, color: "text-foreground" },
        ].map((s, i) => (
          <div key={i} className="border bg-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{s.label}</span>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "coming_soon", "pre_order", "waitlist"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
              filter === f ? "border-accent text-accent bg-accent/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "Összes launch" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Product list */}
      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="border bg-card p-3 flex items-center gap-3">
            <div className="h-12 w-12 border flex-shrink-0 overflow-hidden">
              {p.teaser_image_url || p.image_url ? (
                <img src={p.teaser_image_url || p.image_url || ""} alt={p.name} className={`h-full w-full object-cover ${p.launch_status === "coming_soon" ? "blur-sm" : ""}`} />
              ) : <div className="h-full w-full bg-muted" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate">{p.name}</span>
                <span className={`text-[10px] px-2 py-0.5 border uppercase tracking-wider font-bold ${STATUS_COLOR[p.launch_status]}`}>{STATUS_LABEL[p.launch_status]}</span>
                {p.is_sneak_peek && <span className="text-[10px] px-2 py-0.5 border border-purple-500/30 text-purple-500 bg-purple-500/5 uppercase tracking-wider font-bold">Sneak peek</span>}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                <span>{p.category}</span>
                {p.launch_date && <span>· {new Date(p.launch_date).toLocaleDateString("hu-HU")}</span>}
                <span>· {p.preorder_count} előrend.</span>
                <span>· {p.waitlist_count} várólista</span>
                {p.is_sneak_peek && <span>· {p.poll_votes} szavazat</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={() => setEditing(p)}>
                Szerkeszt
              </Button>
              {p.launch_status !== "live" && (
                <Button
                  size="sm"
                  className="rounded-none text-[10px] h-7"
                  onClick={async () => {
                    if (!confirm(`Most indítod élesben a "${p.name}" terméket? Minden várólistás és feliratkozó email értesítést kap.`)) return;
                    await supabase.from("shop_products").update({ launch_date: new Date().toISOString() }).eq("id", p.id);
                    const { data, error } = await supabase.functions.invoke("launch-automation");
                    if (error) {
                      toast({ title: "Hiba", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "🚀 Drop elindítva!", description: `${data?.processed || 0} művelet végrehajtva` });
                      fetchAll();
                    }
                  }}
                >
                  🚀 Drop most
                </Button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nincs launch termék ebben a kategóriában. Állíts át egy terméket "Hamarosan" / "Előrendelhető" / "Várólistás" állapotba.</p>
        )}
      </div>

      {/* Bulk product status setter */}
      {filter === "all" && (
        <div className="border p-4 space-y-2">
          <div className="text-sm font-bold uppercase tracking-wider">Élő termék → Launch állapot</div>
          <p className="text-xs text-muted-foreground">Az alábbi termékek élőben vannak. Kattints a launch állapot beállításához.</p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {products.filter(p => p.launch_status === "live").map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs border-b py-1.5">
                <span className="truncate flex-1">{p.name}</span>
                <Button size="sm" variant="ghost" className="text-[10px] h-6 rounded-none" onClick={() => setEditing(p)}>Beállít</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail tables */}
      <div className="grid md:grid-cols-3 gap-3">
        <DetailCard title="Friss előrendelések" icon={ShoppingCart} items={preorderList.slice(0, 8)} render={(o: any) => (
          <div className="text-xs">
            <div className="font-medium truncate">{o.shop_products?.name}</div>
            <div className="text-muted-foreground">{o.customer_email} · {o.quantity} db · {Number(o.deposit_amount).toLocaleString()} Ft</div>
            <div className="text-[10px] text-accent uppercase tracking-wider">{o.status}</div>
          </div>
        )} />
        <DetailCard title="Várólista" icon={Users} items={waitlistList.slice(0, 8)} render={(w: any) => (
          <div className="text-xs">
            <div className="font-medium truncate">{w.shop_products?.name}</div>
            <div className="text-muted-foreground">#{w.position} · {w.email}</div>
            {w.early_access && <div className="text-[10px] text-purple-500 uppercase tracking-wider">Early access</div>}
          </div>
        )} />
        <DetailCard title="Sneak peek szavazatok" icon={Vote} items={pollList.slice(0, 8)} render={(v: any) => (
          <div className="text-xs">
            <div className="font-medium truncate">{v.shop_products?.name}</div>
            <div className="text-muted-foreground truncate">{v.voter_email}</div>
            {v.comment && <div className="text-[10px] italic truncate">"{v.comment}"</div>}
          </div>
        )} />
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="border bg-card max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold uppercase tracking-wider">{editing.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)} className="rounded-none">Mégse</Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-wider">Launch állapot</Label>
                <select
                  value={editing.launch_status}
                  onChange={e => setEditing({ ...editing, launch_status: e.target.value as LaunchStatus })}
                  className="w-full mt-1 h-9 px-3 text-sm bg-background border"
                >
                  <option value="live">Élő</option>
                  <option value="coming_soon">Hamarosan (féligazság teaser)</option>
                  <option value="pre_order">Előrendelhető (foglalóval)</option>
                  <option value="waitlist">Várólistás (early access)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider">Megjelenés dátuma</Label>
                <Input
                  type="datetime-local"
                  value={editing.launch_date ? new Date(editing.launch_date).toISOString().slice(0, 16) : ""}
                  onChange={e => setEditing({ ...editing, launch_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="mt-1 rounded-none text-xs"
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider">Teaser kép URL (homályosítva jelenik meg)</Label>
                <Input
                  value={editing.teaser_image_url || ""}
                  onChange={e => setEditing({ ...editing, teaser_image_url: e.target.value })}
                  className="mt-1 rounded-none text-xs"
                  placeholder="https://..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs uppercase tracking-wider">Teaser leírás (féligazság)</Label>
                  <Button size="sm" variant="ghost" onClick={generateTeaser} disabled={aiLoading} className="text-[10px] h-6 rounded-none uppercase tracking-wider">
                    <Wand2 className="h-3 w-3 mr-1" /> {aiLoading ? "Generálás..." : "AI generál"}
                  </Button>
                </div>
                <Textarea
                  value={editing.teaser_description || ""}
                  onChange={e => setEditing({ ...editing, teaser_description: e.target.value })}
                  className="rounded-none text-xs"
                  rows={3}
                  placeholder="Valami nagyon különleges közelít..."
                />
              </div>

              {(editing.launch_status === "pre_order") && (
                <div className="border p-3 space-y-3 bg-accent/5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider flex items-center gap-2"><ShoppingCart className="h-3.5 w-3.5" /> Előrendelés engedélyezve</Label>
                    <Switch checked={editing.preorder_enabled} onCheckedChange={v => setEditing({ ...editing, preorder_enabled: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Foglaló (%)</Label>
                      <Input type="number" min={0} max={100} value={editing.preorder_deposit_percent}
                        onChange={e => setEditing({ ...editing, preorder_deposit_percent: Number(e.target.value) })}
                        className="mt-1 rounded-none text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Limit (db, üres = ∞)</Label>
                      <Input type="number" value={editing.preorder_limit ?? ""}
                        onChange={e => setEditing({ ...editing, preorder_limit: e.target.value ? Number(e.target.value) : null })}
                        className="mt-1 rounded-none text-xs" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Eddig: {editing.preorder_count} előrendelés.</p>
                </div>
              )}

              <div className="flex items-center justify-between border p-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider flex items-center gap-2"><Vote className="h-3.5 w-3.5" /> Sneak peek (szavazható)</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">A vásárlók szavazhatnak, hogy ez a termék induljon-e először.</p>
                </div>
                <Switch checked={editing.is_sneak_peek} onCheckedChange={v => setEditing({ ...editing, is_sneak_peek: v })} />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={save} className="rounded-none uppercase tracking-wider text-xs">
                <Save className="h-3.5 w-3.5 mr-1" /> Mentés
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailCard = ({ title, icon: Icon, items, render }: any) => (
  <div className="border bg-card p-3">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-accent" />
      <span className="text-[11px] font-bold uppercase tracking-widest">{title}</span>
    </div>
    <div className="space-y-2">
      {items.length === 0 && <p className="text-[10px] text-muted-foreground">Még nincs adat.</p>}
      {items.map((item: any, i: number) => <div key={i} className="border-b pb-1.5 last:border-0">{render(item)}</div>)}
    </div>
  </div>
);

export default AdminLaunchCenterTab;

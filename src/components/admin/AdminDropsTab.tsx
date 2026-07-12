import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trophy, Users, Trash2, ExternalLink, Play, Activity, ChevronDown, ChevronUp } from "lucide-react";
import DropLiveDashboard from "./DropLiveDashboard";

interface Drop {
  id: string; name: string; slug: string; drop_type: string; status: string;
  starts_at: string; ends_at: string | null; raffle_draw_at: string | null;
  total_units: number; reserved_count: number; sold_count: number;
  hold_minutes: number; winner_checkout_minutes: number; require_captcha: boolean;
  hero_image_url: string | null; teaser_text: string | null;
  product_id: string | null; partner_product_id: string | null;
}

export default function AdminDropsTab() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", teaser_text: "", hero_image_url: "",
    drop_type: "first_come" as "first_come" | "raffle",
    product_id: "", starts_at: "", ends_at: "", raffle_draw_at: "",
    total_units: 10, hold_minutes: 10, winner_checkout_minutes: 60,
    require_captcha: true, max_per_user: 1,
  });

  const load = async () => {
    setLoading(true);
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from("product_drops").select("*").order("starts_at", { ascending: false }),
      supabase.from("shop_products").select("id, name").order("name").limit(500),
    ]);
    setDrops((d ?? []) as Drop[]);
    setProducts((p ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createDrop = async () => {
    if (!form.name || !form.slug || !form.starts_at || !form.product_id) {
      toast.error("Név, slug, indulási időpont és termék kötelező"); return;
    }
    setCreating(true);
    try {
      const now = new Date();
      const startsAt = new Date(form.starts_at);
      const status = startsAt > now ? "scheduled" : "open";
      const { error } = await supabase.from("product_drops").insert({
        name: form.name,
        slug: form.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        teaser_text: form.teaser_text || null,
        hero_image_url: form.hero_image_url || null,
        drop_type: form.drop_type,
        product_id: form.product_id,
        starts_at: form.starts_at,
        ends_at: form.ends_at || null,
        raffle_draw_at: form.drop_type === "raffle" ? (form.raffle_draw_at || null) : null,
        total_units: Number(form.total_units),
        hold_minutes: Number(form.hold_minutes),
        winner_checkout_minutes: Number(form.winner_checkout_minutes),
        max_per_user: Number(form.max_per_user),
        require_captcha: form.require_captcha,
        status,
      });
      if (error) throw error;
      toast.success("Drop létrehozva");
      setShowForm(false);
      setForm({ ...form, name: "", slug: "", teaser_text: "", hero_image_url: "", product_id: "", starts_at: "", ends_at: "", raffle_draw_at: "" });
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Nem sikerült létrehozni");
    } finally { setCreating(false); }
  };

  const drawNow = async (dropId: string) => {
    if (!confirm("Biztosan lefuttatod a húzást most?")) return;
    const { data, error } = await supabase.rpc("draw_raffle_winners", { p_drop_id: dropId });
    if (error) { toast.error(error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.error) { toast.error(row.error); return; }
    toast.success(`${row.winner_count} nyertes kihúzva`);
    load();
  };

  const deleteDrop = async (dropId: string) => {
    if (!confirm("Törlöd a dropot? Ez törli a raffle-jelentkezéseket és foglalásokat is.")) return;
    const { error } = await supabase.from("product_drops").delete().eq("id", dropId);
    if (error) { toast.error(error.message); return; }
    toast.success("Drop törölve"); load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("product_drops").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-widest">🔥 Drop / Raffle Engine</h2>
          <p className="text-xs text-muted-foreground mt-1">Időzített drop-ok és raffle sorsolások botvédelemmel</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-2" />Új drop</Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Név</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="pl. Nyári kollekció drop" />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="nyari-drop-2026" />
            </div>
            <div className="col-span-2">
              <Label>Teaser szöveg</Label>
              <Textarea value={form.teaser_text} onChange={e => setForm({ ...form, teaser_text: e.target.value })} rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Hero kép URL</Label>
              <Input value={form.hero_image_url} onChange={e => setForm({ ...form, hero_image_url: e.target.value })} />
            </div>
            <div>
              <Label>Termék</Label>
              <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="Válassz terméket" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Típus</Label>
              <Select value={form.drop_type} onValueChange={(v: any) => setForm({ ...form, drop_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_come">⚡ First come, first serve</SelectItem>
                  <SelectItem value="raffle">🎟️ Raffle (sorsolás)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Indulás</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div>
              <Label>Zárás (opc.)</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} />
            </div>
            {form.drop_type === "raffle" && (
              <div className="col-span-2">
                <Label>Húzás időpontja</Label>
                <Input type="datetime-local" value={form.raffle_draw_at} onChange={e => setForm({ ...form, raffle_draw_at: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Összes egység</Label>
              <Input type="number" min={1} value={form.total_units} onChange={e => setForm({ ...form, total_units: +e.target.value })} />
            </div>
            <div>
              <Label>Max/user</Label>
              <Input type="number" min={1} value={form.max_per_user} onChange={e => setForm({ ...form, max_per_user: +e.target.value })} />
            </div>
            <div>
              <Label>Foglalás hossz (perc)</Label>
              <Input type="number" min={1} value={form.hold_minutes} onChange={e => setForm({ ...form, hold_minutes: +e.target.value })} />
            </div>
            <div>
              <Label>Nyertes fizet (perc)</Label>
              <Input type="number" min={5} value={form.winner_checkout_minutes} onChange={e => setForm({ ...form, winner_checkout_minutes: +e.target.value })} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.require_captcha} onCheckedChange={v => setForm({ ...form, require_captcha: v })} />
              <Label>Turnstile bot-védelem</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={createDrop} disabled={creating}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Létrehozás"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Mégse</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : drops.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nincs még drop létrehozva.</Card>
      ) : (
        <div className="space-y-3">
          {drops.map(d => (
            <Card key={d.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold truncate">{d.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold border ${
                      d.status === "open" ? "bg-primary text-primary-foreground" :
                      d.status === "sold_out" || d.status === "closed" ? "bg-destructive text-destructive-foreground" :
                      "bg-muted"
                    }`}>{d.status}</span>
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest border">{d.drop_type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">/{d.slug}</div>
                  <div className="grid grid-cols-4 gap-3 mt-3 text-sm">
                    <div><div className="text-muted-foreground text-[10px] uppercase">Indul</div><div>{new Date(d.starts_at).toLocaleString("hu-HU")}</div></div>
                    <div><div className="text-muted-foreground text-[10px] uppercase">Készlet</div><div>{d.reserved_count}/{d.total_units}</div></div>
                    <div><div className="text-muted-foreground text-[10px] uppercase">Eladott</div><div>{d.sold_count}</div></div>
                    <div><div className="text-muted-foreground text-[10px] uppercase">Foglalás</div><div>{d.hold_minutes} perc</div></div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <a href={`/drop/${d.slug}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="w-full"><ExternalLink className="h-3 w-3 mr-1" />Megnyit</Button>
                  </a>
                  {d.drop_type === "raffle" && d.status !== "drawn" && (
                    <Button size="sm" onClick={() => drawNow(d.id)}><Trophy className="h-3 w-3 mr-1" />Húzás most</Button>
                  )}
                  {d.status === "scheduled" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(d.id, "open")}><Play className="h-3 w-3 mr-1" />Kinyit</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteDrop(d.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              <ParticipantsSummary dropId={d.id} type={d.drop_type} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ParticipantsSummary({ dropId, type }: { dropId: string; type: string }) {
  const [stats, setStats] = useState<{ entries: number; winners: number; reservations: number; sold: number }>({ entries: 0, winners: 0, reservations: 0, sold: 0 });
  useEffect(() => {
    (async () => {
      const [{ count: e }, { count: w }, { count: r }] = await Promise.all([
        supabase.from("drop_raffle_entries").select("id", { count: "exact", head: true }).eq("drop_id", dropId),
        supabase.from("drop_raffle_entries").select("id", { count: "exact", head: true }).eq("drop_id", dropId).eq("is_winner", true),
        supabase.from("drop_reservations").select("id", { count: "exact", head: true }).eq("drop_id", dropId).eq("status", "active"),
      ]);
      setStats({ entries: e ?? 0, winners: w ?? 0, reservations: r ?? 0, sold: 0 });
    })();
  }, [dropId]);
  return (
    <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
      {type === "raffle" ? (
        <>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {stats.entries} jelentkező</span>
          <span className="flex items-center gap-1"><Trophy className="h-3 w-3" /> {stats.winners} nyertes</span>
        </>
      ) : (
        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {stats.reservations} aktív foglalás</span>
      )}
    </div>
  );
}

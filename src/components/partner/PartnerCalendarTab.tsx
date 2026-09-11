// Partner naptár: napi foglalások, ügyfél-hívólista, időpont létrehozás/módosítás.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Mail, MapPin, Phone, Plus, User } from "lucide-react";

interface Appt {
  id: string;
  starts_at: string | null;
  duration_min: number | null;
  customer_name: string | null;
  customer_email: string | null;
  location: string | null;
  status: string;
  notes: string | null;
  product_id: string | null;
  metadata: any;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: "Kérelem", cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/40" },
  confirmed: { label: "Megerősítve", cls: "bg-green-500/15 text-green-500 border-green-500/40" },
  completed: { label: "Teljesítve", cls: "bg-blue-500/15 text-blue-500 border-blue-500/40" },
  cancelled: { label: "Lemondva", cls: "bg-destructive/15 text-destructive border-destructive/40" },
  no_show: { label: "Nem jelent meg", cls: "bg-muted text-muted-foreground border-border" },
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const HU_DAYS = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];

const emptyDraft = (day: string) => ({
  customer_name: "",
  customer_email: "",
  phone: "",
  day,
  time: "09:00",
  duration_min: "60",
  location: "",
  status: "confirmed",
  notes: "",
  product_id: "",
});

const PartnerCalendarTab = ({ partnerId }: { partnerId: string }) => {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(() => iso(new Date()));
  const [items, setItems] = useState<Appt[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => emptyDraft(iso(new Date())));
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [month]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partner_appointments")
      .select("id, starts_at, duration_min, customer_name, customer_email, location, status, notes, product_id, metadata")
      .eq("partner_id", partnerId)
      .gte("starts_at", range.from)
      .lt("starts_at", range.to)
      .order("starts_at", { ascending: true });
    if (error) toast({ title: "Nem sikerült betölteni a naptárat", description: error.message, variant: "destructive" });
    setItems((data as Appt[]) || []);
    setLoading(false);
  }, [partnerId, range.from, range.to]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    supabase.from("partner_products").select("id, title").eq("partner_id", partnerId).order("created_at", { ascending: false })
      .then(({ data }) => setProducts(data || []));
  }, [partnerId]);

  const byDay = useMemo(() => {
    const m = new Map<string, Appt[]>();
    items.forEach(a => {
      if (!a.starts_at) return;
      const k = iso(new Date(a.starts_at));
      m.set(k, [...(m.get(k) || []), a]);
    });
    return m;
  }, [items]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // hétfővel kezdünk
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let i = 1; i <= days; i++) out.push(iso(new Date(month.getFullYear(), month.getMonth(), i)));
    return out;
  }, [month]);

  const dayItems = byDay.get(selected) || [];
  const todayKey = iso(new Date());
  const callList = useMemo(
    () => (byDay.get(todayKey) || []).filter(a => a.status === "requested" || a.status === "confirmed"),
    [byDay, todayKey]
  );

  const save = async () => {
    if (!draft.customer_name.trim()) { toast({ title: "Add meg az ügyfél nevét", variant: "destructive" }); return; }
    setSaving(true);
    const starts = new Date(`${draft.day}T${draft.time}:00`);
    const { error } = await supabase.from("partner_appointments").insert({
      partner_id: partnerId,
      customer_name: draft.customer_name.trim(),
      customer_email: draft.customer_email.trim() || null,
      starts_at: starts.toISOString(),
      duration_min: Number(draft.duration_min) || 60,
      location: draft.location.trim() || null,
      status: draft.status,
      notes: draft.notes.trim() || null,
      product_id: draft.product_id || null,
      metadata: draft.phone.trim() ? { phone: draft.phone.trim() } : {},
    });
    setSaving(false);
    if (error) { toast({ title: "Mentés sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Időpont felvéve" });
    setOpen(false);
    setDraft(emptyDraft(selected));
    void load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("partner_appointments").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Nem sikerült frissíteni", description: error.message, variant: "destructive" }); return; }
    setItems(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
  };

  const hhmm = (s: string | null) => (s ? new Date(s).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }) : "—");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-none p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Mai időpontok</div>
          <div className="text-2xl font-bold mt-1">{(byDay.get(todayKey) || []).length}</div>
        </Card>
        <Card className="rounded-none p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Jóváhagyásra vár</div>
          <div className="text-2xl font-bold mt-1">{items.filter(a => a.status === "requested").length}</div>
        </Card>
        <Card className="rounded-none p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Hónap összesen</div>
          <div className="text-2xl font-bold mt-1">{items.length}</div>
        </Card>
      </div>

      <Card className="rounded-none p-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="font-bold uppercase tracking-widest text-sm">
              {month.toLocaleDateString("hu-HU", { year: "numeric", month: "long" })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="rounded-none h-8 w-8" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="rounded-none h-8" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelected(iso(d)); }}>Ma</Button>
            <Button variant="outline" size="icon" className="rounded-none h-8 w-8" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {[1, 2, 3, 4, 5, 6, 0].map(d => <div key={d}>{HU_DAYS[d]}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const n = (byDay.get(day) || []).length;
            const isSel = day === selected;
            const isToday = day === todayKey;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                className={`aspect-square border p-1 flex flex-col items-center justify-center text-xs transition-colors ${
                  isSel ? "border-primary bg-primary/10" : isToday ? "border-primary/50" : "border-border hover:border-foreground/40"
                }`}
              >
                <span className={isToday ? "font-bold text-primary" : ""}>{Number(day.slice(-2))}</span>
                {n > 0 && <span className="mt-0.5 text-[9px] px-1 bg-primary/20 text-primary">{n}</span>}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-none p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold uppercase tracking-widest text-sm">
              {new Date(`${selected}T00:00:00`).toLocaleDateString("hu-HU", { month: "long", day: "numeric", weekday: "long" })}
            </div>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setDraft(emptyDraft(selected)); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-none"><Plus className="h-4 w-4 mr-1" />Új időpont</Button>
              </DialogTrigger>
              <DialogContent className="rounded-none max-w-lg">
                <DialogHeader><DialogTitle>Új időpont</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Ügyfél neve</Label>
                      <Input className="rounded-none" value={draft.customer_name} onChange={e => setDraft({ ...draft, customer_name: e.target.value })} /></div>
                    <div><Label className="text-xs">E-mail</Label>
                      <Input className="rounded-none" value={draft.customer_email} onChange={e => setDraft({ ...draft, customer_email: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Telefon</Label>
                      <Input className="rounded-none" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></div>
                    <div><Label className="text-xs">Kapcsolódó szolgáltatás</Label>
                      <Select value={draft.product_id || "none"} onValueChange={v => setDraft({ ...draft, product_id: v === "none" ? "" : v })}>
                        <SelectTrigger className="rounded-none"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nincs</SelectItem>
                          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                        </SelectContent>
                      </Select></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-xs">Dátum</Label>
                      <Input type="date" className="rounded-none" value={draft.day} onChange={e => setDraft({ ...draft, day: e.target.value })} /></div>
                    <div><Label className="text-xs">Időpont</Label>
                      <Input type="time" className="rounded-none" value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })} /></div>
                    <div><Label className="text-xs">Hossz (perc)</Label>
                      <Input type="number" className="rounded-none" value={draft.duration_min} onChange={e => setDraft({ ...draft, duration_min: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Helyszín</Label>
                      <Input className="rounded-none" value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} placeholder="Online / cím" /></div>
                    <div><Label className="text-xs">Állapot</Label>
                      <Select value={draft.status} onValueChange={v => setDraft({ ...draft, status: v })}>
                        <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select></div>
                  </div>
                  <div><Label className="text-xs">Megjegyzés</Label>
                    <Textarea rows={2} className="rounded-none" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></div>
                  <Button className="rounded-none w-full" onClick={save} disabled={saving}>{saving ? "Mentés…" : "Mentés"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Betöltés…</p>
          ) : dayItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Erre a napra nincs időpont.</p>
          ) : (
            <div className="space-y-2">
              {dayItems.map(a => (
                <div key={a.id} className="border border-border p-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 font-bold text-sm min-w-20"><Clock className="h-3.5 w-3.5" />{hhmm(a.starts_at)}</div>
                  <div className="flex-1 min-w-40">
                    <div className="flex items-center gap-1 text-sm font-bold"><User className="h-3.5 w-3.5" />{a.customer_name || "Ismeretlen ügyfél"}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-0.5">
                      {a.customer_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{a.customer_email}</span>}
                      {a.metadata?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{a.metadata.phone}</span>}
                      {a.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</span>}
                      {a.duration_min && <span>{a.duration_min} perc</span>}
                    </div>
                    {a.notes && <div className="text-xs text-muted-foreground mt-1">{a.notes}</div>}
                  </div>
                  <Badge variant="outline" className={`rounded-none ${STATUS[a.status]?.cls || ""}`}>{STATUS[a.status]?.label || a.status}</Badge>
                  <Select value={a.status} onValueChange={v => setStatus(a.id, v)}>
                    <SelectTrigger className="rounded-none w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="rounded-none p-4">
          <div className="font-bold uppercase tracking-widest text-sm mb-3">Ma kikkel kell beszélni</div>
          {callList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Mára nincs egyeztetni való ügyfél.</p>
          ) : (
            <div className="space-y-2">
              {callList.map(a => (
                <div key={a.id} className="border border-border p-2">
                  <div className="text-sm font-bold">{hhmm(a.starts_at)} · {a.customer_name || "Ügyfél"}</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {a.metadata?.phone && (
                      <a href={`tel:${a.metadata.phone}`} className="text-xs border border-border px-2 py-1 hover:border-primary flex items-center gap-1">
                        <Phone className="h-3 w-3" />Hívás
                      </a>
                    )}
                    {a.customer_email && (
                      <a href={`mailto:${a.customer_email}`} className="text-xs border border-border px-2 py-1 hover:border-primary flex items-center gap-1">
                        <Mail className="h-3 w-3" />E-mail
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PartnerCalendarTab;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Rocket, Trash2, Save } from "lucide-react";

interface Pilot {
  id: string;
  partner_id: string | null;
  brand_name: string | null;
  contact_email: string | null;
  cohort: string;
  status: string;
  joined_at: string;
  first_live_at: string | null;
  churned_at: string | null;
  last_active_at: string | null;
  feedback_score: number | null;
  notes: string | null;
}

const STATUSES = [
  { key: "invited", label: "Meghívva" },
  { key: "onboarding", label: "Onboarding" },
  { key: "active", label: "Aktív" },
  { key: "churned", label: "Lemorzsolódott" },
];

export default function AdminPilotPartnersTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Pilot[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPartner, setNewPartner] = useState("");
  const [cohort, setCohort] = useState("pilot-1");

  const load = async () => {
    setLoading(true);
    const [pRes, prRes] = await Promise.all([
      supabase.from("pilot_partners").select("*").order("joined_at", { ascending: false }),
      supabase.from("partners").select("id, brand_name, email").order("brand_name"),
    ]);
    setRows((pRes.data ?? []) as Pilot[]);
    setPartners(prRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const add = async () => {
    const p = partners.find((x) => x.id === newPartner);
    if (!p) { toast({ title: "Válassz partnert", variant: "destructive" }); return; }
    const { error } = await supabase.from("pilot_partners").insert({
      partner_id: p.id, brand_name: p.brand_name, contact_email: p.email, cohort, status: "invited",
    });
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setNewPartner("");
    toast({ title: "Pilot partner hozzáadva" });
    void load();
  };

  const patch = async (id: string, data: Partial<Pilot>) => {
    const { error } = await supabase.from("pilot_partners").update(data).eq("id", id);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setRows((r) => r.map((x) => (x.id === id ? ({ ...x, ...data } as Pilot) : x)));
  };

  const setStatus = async (row: Pilot, status: string) => {
    const extra: Partial<Pilot> = { status };
    if (status === "churned") extra.churned_at = new Date().toISOString();
    if (status === "active") { extra.churned_at = null; extra.last_active_at = new Date().toISOString(); }
    await patch(row.id, extra);
  };

  const markLive = async (row: Pilot) => {
    await patch(row.id, { first_live_at: new Date().toISOString(), status: "active" });
    toast({ title: "Élesítés rögzítve", description: "A time-to-live KPI ebből számol." });
  };

  const remove = async (id: string) => {
    await supabase.from("pilot_partners").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const active = rows.filter((r) => r.status === "active").length;
  const live = rows.filter((r) => r.first_live_at).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl">🚀 Pilot partner program</h2>
        <p className="text-sm text-muted-foreground">10–20 valódi partner éles tesztje — minden lépés mérve.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Összes pilot", value: rows.length },
          { label: "Aktív", value: active },
          { label: "Élesített webshop", value: live },
          { label: "Lemorzsolódott", value: rows.filter((r) => r.status === "churned").length },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="font-medium">Új pilot partner</h3>
        <div className="flex flex-wrap gap-2">
          <Select value={newPartner} onValueChange={setNewPartner}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Partner kiválasztása" /></SelectTrigger>
            <SelectContent>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.brand_name || p.email || p.id.slice(0, 8)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="w-40" value={cohort} onChange={(e) => setCohort(e.target.value)} placeholder="kohorsz" />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Hozzáadás</Button>
        </div>
      </Card>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold">{r.brand_name || "Névtelen partner"}</p>
                <p className="text-xs text-muted-foreground">
                  {r.contact_email || "—"} · {r.cohort} · csatlakozott: {new Date(r.joined_at).toLocaleDateString("hu-HU")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {r.first_live_at
                  ? <Badge>Élő: {new Date(r.first_live_at).toLocaleDateString("hu-HU")}</Badge>
                  : <Button size="sm" variant="outline" onClick={() => markLive(r)}><Rocket className="h-4 w-4 mr-1" />Élesítés rögzítése</Button>}
                <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] items-start">
              <Input
                type="number" min={1} max={10} placeholder="NPS 1-10"
                defaultValue={r.feedback_score ?? ""}
                onBlur={(e) => patch(r.id, { feedback_score: e.target.value ? Number(e.target.value) : null })}
              />
              <Textarea
                rows={2} placeholder="Visszajelzés, akadályok, következő lépés…"
                defaultValue={r.notes ?? ""}
                onBlur={(e) => patch(r.id, { notes: e.target.value })}
              />
              <Button size="sm" variant="outline" onClick={() => toast({ title: "Mentve" })}>
                <Save className="h-4 w-4 mr-1" />Mentés
              </Button>
            </div>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Még nincs pilot partner. Adj hozzá 10–20 valódi partnert a méréshez.
          </Card>
        )}
      </div>
    </div>
  );
}

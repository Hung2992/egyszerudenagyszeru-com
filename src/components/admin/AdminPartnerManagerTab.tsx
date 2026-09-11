// Partner Kezelő: partnerfiókok megtekintése/szerkesztése, hozzáférési jog, márkaoldal állapot.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Search, ShieldCheck, Store, Users } from "lucide-react";
import PartnerFeatureAnnouncement from "./PartnerFeatureAnnouncement";
import PartnerBookingsPanel from "./PartnerBookingsPanel";

interface Row {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  is_active: boolean | null;
  default_commission_percent: number | null;
  user_id: string | null;
  notes: string | null;
  created_at: string | null;
}

interface Store {
  partner_id: string;
  slug: string | null;
  is_published: boolean | null;
  custom_domain: string | null;
}

const AdminPartnerManagerTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [stores, setStores] = useState<Record<string, Store>>({});
  const [roles, setRoles] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, sRes, prodRes] = await Promise.all([
      supabase.from("partners")
        .select("id, full_name, company_name, email, phone, status, is_active, default_commission_percent, user_id, notes, created_at")
        .order("created_at", { ascending: false }).limit(500),
      supabase.from("partner_storefronts").select("partner_id, slug, is_published, custom_domain").limit(500),
      supabase.from("partner_products").select("partner_id, status").limit(2000),
    ]);
    const list = (pRes.data as Row[]) || [];
    setRows(list);
    const smap: Record<string, Store> = {};
    ((sRes.data as Store[]) || []).forEach(s => { smap[s.partner_id] = s; });
    setStores(smap);
    const cmap: Record<string, number> = {};
    ((prodRes.data as any[]) || []).forEach(p => { cmap[p.partner_id] = (cmap[p.partner_id] || 0) + 1; });
    setCounts(cmap);

    const userIds = list.map(r => r.user_id).filter(Boolean) as string[];
    if (userIds.length) {
      const { data: rr } = await supabase.from("user_roles").select("user_id, role").eq("role", "partner").in("user_id", userIds);
      const rmap: Record<string, boolean> = {};
      ((rr as any[]) || []).forEach(r => { rmap[r.user_id] = true; });
      setRoles(rmap);
    }
    if (pRes.error) toast({ title: "Nem sikerült betölteni a partnereket", description: pRes.error.message, variant: "destructive" });
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      [r.company_name, r.full_name, r.email, r.phone, stores[r.id]?.slug].some(v => (v || "").toLowerCase().includes(t))
    );
  }, [rows, q, stores]);

  const savePartner = async () => {
    if (!edit) return;
    setSaving(true);
    const { error } = await supabase.from("partners").update({
      full_name: edit.full_name,
      company_name: edit.company_name,
      email: edit.email,
      phone: edit.phone,
      status: edit.status,
      is_active: edit.is_active,
      default_commission_percent: edit.default_commission_percent,
      notes: edit.notes,
      updated_at: new Date().toISOString(),
    }).eq("id", edit.id);
    setSaving(false);
    if (error) { toast({ title: "Mentés sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Partner mentve" });
    setEdit(null);
    void load();
  };

  const togglePartnerRole = async (row: Row, on: boolean) => {
    if (!row.user_id) { toast({ title: "Ehhez a partnerhez nincs felhasználói fiók", variant: "destructive" }); return; }
    const { error } = on
      ? await supabase.from("user_roles").insert({ user_id: row.user_id, role: "partner" })
      : await supabase.from("user_roles").delete().eq("user_id", row.user_id).eq("role", "partner");
    if (error) { toast({ title: "Jogosultság módosítása sikertelen", description: error.message, variant: "destructive" }); return; }
    setRoles(prev => ({ ...prev, [row.user_id as string]: on }));
    toast({ title: on ? "Partner hozzáférés megadva" : "Partner hozzáférés visszavonva" });
  };

  const partnerNames = useMemo(() => {
    const m: Record<string, string> = {};
    rows.forEach(r => { m[r.id] = r.company_name || r.full_name || "Névtelen partner"; });
    return m;
  }, [rows]);

  const publishAllStores = async () => {
    const pending = Object.values(stores).filter(s => !s.is_published);
    if (!pending.length) { toast({ title: "Minden márkaoldal már élő" }); return; }
    const { error } = await supabase.from("partner_storefronts")
      .update({ is_published: true, updated_at: new Date().toISOString() })
      .in("partner_id", pending.map(s => s.partner_id));
    if (error) { toast({ title: "Élesítés sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${pending.length} márkaoldal élesítve` });
    void load();
  };

  const toggleStore = async (row: Row, on: boolean) => {
    const st = stores[row.id];
    if (!st) { toast({ title: "Ennek a partnernek még nincs márkaoldala", variant: "destructive" }); return; }
    const { error } = await supabase.from("partner_storefronts")
      .update({ is_published: on, updated_at: new Date().toISOString() }).eq("partner_id", row.id);
    if (error) { toast({ title: "Nem sikerült módosítani", description: error.message, variant: "destructive" }); return; }
    setStores(prev => ({ ...prev, [row.id]: { ...st, is_published: on } }));
    toast({ title: on ? "Márkaoldal élesítve" : "Márkaoldal levéve" });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="rounded-none p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <div><div className="text-2xl font-bold">{rows.length}</div><div className="text-xs uppercase tracking-widest text-muted-foreground">Partner</div></div>
        </Card>
        <Card className="rounded-none p-4 flex items-center gap-3">
          <Store className="h-5 w-5 text-primary" />
          <div><div className="text-2xl font-bold">{Object.values(stores).filter(s => s.is_published).length}</div><div className="text-xs uppercase tracking-widest text-muted-foreground">Élő márkaoldal</div></div>
        </Card>
        <Card className="rounded-none p-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div><div className="text-2xl font-bold">{Object.values(roles).filter(Boolean).length}</div><div className="text-xs uppercase tracking-widest text-muted-foreground">Aktív hozzáférés</div></div>
        </Card>
      </div>

      <PartnerFeatureAnnouncement />

      <PartnerBookingsPanel partnerNames={partnerNames} />

      <Card className="rounded-none p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Keresés név, cég, e-mail vagy márkaoldal alapján" className="rounded-none w-full" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-none flex-1 sm:flex-none" onClick={() => void load()}>Frissítés</Button>
            <Button className="rounded-none flex-1 sm:flex-none text-xs sm:text-sm" onClick={() => void publishAllStores()}>Összes márkaoldal élesítése</Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Betöltés...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nincs találat.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const st = stores[r.id];
              return (
                <div key={r.id} className="border border-border p-3 flex flex-col lg:flex-row lg:items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{r.company_name || r.full_name || "Névtelen partner"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.email || "nincs e-mail"} · {r.phone || "nincs telefon"} · {counts[r.id] || 0} termék
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-none">{r.status || (r.is_active ? "aktív" : "inaktív")}</Badge>
                    {st?.slug && (
                      <a href={`/b/${st.slug}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs border border-border px-2 py-1 hover:border-primary flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />/b/{st.slug}
                      </a>
                    )}
                    {st?.custom_domain && <Badge variant="outline" className="rounded-none">{st.custom_domain}</Badge>}

                    <label className="text-xs flex items-center gap-2 border border-border px-2 py-1">
                      Hozzáférés
                      <Switch checked={!!(r.user_id && roles[r.user_id])} onCheckedChange={v => void togglePartnerRole(r, v)} />
                    </label>
                    <label className="text-xs flex items-center gap-2 border border-border px-2 py-1">
                      Márkaoldal élő
                      <Switch checked={!!st?.is_published} onCheckedChange={v => void toggleStore(r, v)} />
                    </label>
                    <Button size="sm" variant="outline" className="rounded-none" onClick={() => setEdit({ ...r })}>Szerkesztés</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent className="rounded-none max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Partner szerkesztése</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label>Cégnév</Label><Input className="rounded-none" value={edit.company_name || ""} onChange={e => setEdit({ ...edit, company_name: e.target.value })} /></div>
              <div><Label>Kapcsolattartó</Label><Input className="rounded-none" value={edit.full_name || ""} onChange={e => setEdit({ ...edit, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>E-mail</Label><Input className="rounded-none" value={edit.email || ""} onChange={e => setEdit({ ...edit, email: e.target.value })} /></div>
                <div><Label>Telefon</Label><Input className="rounded-none" value={edit.phone || ""} onChange={e => setEdit({ ...edit, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Státusz</Label><Input className="rounded-none" value={edit.status || ""} onChange={e => setEdit({ ...edit, status: e.target.value })} /></div>
                <div><Label>Jutalék (%)</Label><Input type="number" className="rounded-none" value={edit.default_commission_percent ?? ""} onChange={e => setEdit({ ...edit, default_commission_percent: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!edit.is_active} onCheckedChange={v => setEdit({ ...edit, is_active: v })} />
                <span className="text-sm">Aktív partner</span>
              </div>
              <div><Label>Belső jegyzet</Label><Input className="rounded-none" value={edit.notes || ""} onChange={e => setEdit({ ...edit, notes: e.target.value })} /></div>
              <Button className="rounded-none w-full" disabled={saving} onClick={() => void savePartner()}>
                {saving ? "Mentés..." : "Mentés"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPartnerManagerTab;

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, DollarSign, Building2, Calendar, CheckCircle2, XCircle } from "lucide-react";

interface Tenant {
  id: string;
  display_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;
  tax_number: string | null;
  iban: string | null;
  domain: string | null;
  fork_project_url: string | null;
  contract_signed_at: string | null;
  contract_reference: string | null;
  contract_expires_at: string | null;
  commission_percent: number;
  status: "draft" | "active" | "suspended" | "terminated";
  notes: string | null;
}

interface RevenueReport {
  id: string;
  tenant_id: string;
  period_year: number;
  period_month: number;
  gross_revenue: number;
  commission_percent_snapshot: number;
  commission_amount: number;
  paid: boolean;
  paid_at: string | null;
  invoice_number: string | null;
  notes: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Vázlat", active: "Aktív", suspended: "Felfüggesztve", terminated: "Megszűnt"
};

const empty: Partial<Tenant> = { commission_percent: 5, status: "draft" };

const AdminTenantsTab = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [reports, setReports] = useState<RevenueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Tenant>>(empty);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTenantId, setReportTenantId] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState({
    period_year: new Date().getFullYear(),
    period_month: new Date().getMonth() + 1,
    gross_revenue: 0,
    invoice_number: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase.from("tenants").select("*").order("created_at", { ascending: false }),
      supabase.from("tenant_revenue_reports").select("*").order("period_year", { ascending: false }).order("period_month", { ascending: false }),
    ]);
    setTenants((t || []) as Tenant[]);
    setReports((r || []) as RevenueReport[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const active = tenants.filter(t => t.status === "active").length;
    const totalRev = reports.reduce((s, r) => s + Number(r.gross_revenue), 0);
    const totalCom = reports.reduce((s, r) => s + Number(r.commission_amount), 0);
    const unpaid = reports.filter(r => !r.paid).reduce((s, r) => s + Number(r.commission_amount), 0);
    return { active, total: tenants.length, totalRev, totalCom, unpaid };
  }, [tenants, reports]);

  const reportsByTenant = useMemo(() => {
    const m = new Map<string, RevenueReport[]>();
    reports.forEach(r => {
      const arr = m.get(r.tenant_id) || [];
      arr.push(r);
      m.set(r.tenant_id, arr);
    });
    return m;
  }, [reports]);

  const saveTenant = async () => {
    if (!editing.display_name) { toast.error("Név kötelező"); return; }
    if ((editing.commission_percent ?? 0) < 5) { toast.error("Minimum 5% jutalék"); return; }
    const payload: any = { ...editing };
    delete payload.id;
    const { error } = editing.id
      ? await supabase.from("tenants").update(payload).eq("id", editing.id)
      : await supabase.from("tenants").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Mentve");
    setEditOpen(false);
    setEditing(empty);
    load();
  };

  const deleteTenant = async (id: string) => {
    if (!confirm("Biztosan törlöd a bérlőt? (A forgalmi jelentések is törlődnek.)")) return;
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Törölve"); load(); }
  };

  const openReport = (tenantId: string) => {
    setReportTenantId(tenantId);
    const now = new Date();
    setReportForm({ period_year: now.getFullYear(), period_month: now.getMonth() + 1, gross_revenue: 0, invoice_number: "", notes: "" });
    setReportOpen(true);
  };

  const saveReport = async () => {
    if (!reportTenantId) return;
    const t = tenants.find(x => x.id === reportTenantId);
    if (!t) return;
    const { error } = await supabase.from("tenant_revenue_reports").insert({
      tenant_id: reportTenantId,
      period_year: reportForm.period_year,
      period_month: reportForm.period_month,
      gross_revenue: reportForm.gross_revenue,
      commission_percent_snapshot: t.commission_percent,
      invoice_number: reportForm.invoice_number || null,
      notes: reportForm.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Forgalom rögzítve");
    setReportOpen(false);
    load();
  };

  const togglePaid = async (r: RevenueReport) => {
    const { error } = await supabase.from("tenant_revenue_reports").update({
      paid: !r.paid,
      paid_at: !r.paid ? new Date().toISOString() : null,
    }).eq("id", r.id);
    if (error) toast.error(error.message); else load();
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Törlöd a jelentést?")) return;
    const { error } = await supabase.from("tenant_revenue_reports").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bérlők</h2>
          <p className="text-sm text-muted-foreground">Szerződéses revenue share partnerek (minimum 5%)</p>
        </div>
        <Button onClick={() => { setEditing(empty); setEditOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Új bérlő
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border p-4">
          <Building2 className="h-4 w-4 text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{stats.active}/{stats.total}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Aktív / Összes</p>
        </div>
        <div className="border p-4">
          <DollarSign className="h-4 w-4 text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{stats.totalRev.toLocaleString("hu-HU")}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Össz. forgalom (Ft)</p>
        </div>
        <div className="border p-4">
          <CheckCircle2 className="h-4 w-4 text-accent mb-2" />
          <p className="text-2xl font-bold text-accent">{stats.totalCom.toLocaleString("hu-HU")}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Össz. jutalék (Ft)</p>
        </div>
        <div className="border p-4">
          <XCircle className="h-4 w-4 text-destructive mb-2" />
          <p className="text-2xl font-bold text-destructive">{stats.unpaid.toLocaleString("hu-HU")}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Fizetetlen jutalék (Ft)</p>
        </div>
      </div>

      {/* Tenant list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Betöltés…</p>
      ) : tenants.length === 0 ? (
        <div className="border p-12 text-center">
          <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Még nincs bérlő. Add hozzá az első szerződést.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map(t => {
            const trs = reportsByTenant.get(t.id) || [];
            const sumRev = trs.reduce((s, r) => s + Number(r.gross_revenue), 0);
            const sumCom = trs.reduce((s, r) => s + Number(r.commission_amount), 0);
            const unpaid = trs.filter(r => !r.paid).reduce((s, r) => s + Number(r.commission_amount), 0);
            return (
              <div key={t.id} className="border">
                <div className="p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg">{t.display_name}</h3>
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 border ${
                        t.status === "active" ? "border-accent text-accent" :
                        t.status === "suspended" ? "border-yellow-500 text-yellow-500" :
                        t.status === "terminated" ? "border-destructive text-destructive" :
                        "border-muted-foreground text-muted-foreground"
                      }`}>{STATUS_LABEL[t.status]}</span>
                      <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 border border-accent text-accent">
                        {Number(t.commission_percent).toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-x-3">
                      {t.company_name && <span>{t.company_name}</span>}
                      {t.contact_email && <span>· {t.contact_email}</span>}
                      {t.domain && <span>· {t.domain}</span>}
                    </div>
                    {t.contract_expires_at && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Szerz. lejár: {t.contract_expires_at}
                      </div>
                    )}
                    <div className="text-xs pt-1">
                      <span className="text-muted-foreground">Forgalom: </span>
                      <span className="font-semibold">{sumRev.toLocaleString("hu-HU")} Ft</span>
                      <span className="text-muted-foreground"> · Jutalék: </span>
                      <span className="font-semibold text-accent">{sumCom.toLocaleString("hu-HU")} Ft</span>
                      {unpaid > 0 && (
                        <>
                          <span className="text-muted-foreground"> · Fizetetlen: </span>
                          <span className="font-semibold text-destructive">{unpaid.toLocaleString("hu-HU")} Ft</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openReport(t.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Forgalom
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setEditOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteTenant(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {trs.length > 0 && (
                  <div className="border-t bg-muted/30">
                    <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">Havi jelentések</div>
                    <div className="divide-y">
                      {trs.map(r => (
                        <div key={r.id} className="px-4 py-2 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono w-16">{r.period_year}/{String(r.period_month).padStart(2, "0")}</span>
                            <span>{Number(r.gross_revenue).toLocaleString("hu-HU")} Ft</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold text-accent">{Number(r.commission_amount).toLocaleString("hu-HU")} Ft</span>
                            {r.invoice_number && <span className="text-muted-foreground">· {r.invoice_number}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant={r.paid ? "default" : "outline"} className="h-6 text-[10px]" onClick={() => togglePaid(r)}>
                              {r.paid ? "Fizetve" : "Fizetetlen"}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteReport(r.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Bérlő szerkesztése" : "Új bérlő"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Megjelenített név *</Label>
              <Input value={editing.display_name || ""} onChange={e => setEditing({ ...editing, display_name: e.target.value })} />
            </div>
            <div>
              <Label>Kapcsolattartó</Label>
              <Input value={editing.contact_name || ""} onChange={e => setEditing({ ...editing, contact_name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editing.contact_email || ""} onChange={e => setEditing({ ...editing, contact_email: e.target.value })} />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={editing.contact_phone || ""} onChange={e => setEditing({ ...editing, contact_phone: e.target.value })} />
            </div>
            <div>
              <Label>Cégnév</Label>
              <Input value={editing.company_name || ""} onChange={e => setEditing({ ...editing, company_name: e.target.value })} />
            </div>
            <div>
              <Label>Adószám</Label>
              <Input value={editing.tax_number || ""} onChange={e => setEditing({ ...editing, tax_number: e.target.value })} />
            </div>
            <div>
              <Label>IBAN</Label>
              <Input value={editing.iban || ""} onChange={e => setEditing({ ...editing, iban: e.target.value })} />
            </div>
            <div>
              <Label>Domain</Label>
              <Input placeholder="bolt.example.hu" value={editing.domain || ""} onChange={e => setEditing({ ...editing, domain: e.target.value })} />
            </div>
            <div>
              <Label>Fork projekt URL</Label>
              <Input placeholder="https://lovable.dev/projects/..." value={editing.fork_project_url || ""} onChange={e => setEditing({ ...editing, fork_project_url: e.target.value })} />
            </div>
            <div>
              <Label>Szerződés azonosító</Label>
              <Input value={editing.contract_reference || ""} onChange={e => setEditing({ ...editing, contract_reference: e.target.value })} />
            </div>
            <div>
              <Label>Aláírva</Label>
              <Input type="date" value={editing.contract_signed_at || ""} onChange={e => setEditing({ ...editing, contract_signed_at: e.target.value })} />
            </div>
            <div>
              <Label>Lejár</Label>
              <Input type="date" value={editing.contract_expires_at || ""} onChange={e => setEditing({ ...editing, contract_expires_at: e.target.value })} />
            </div>
            <div>
              <Label>Jutalék % (min. 5)</Label>
              <Input type="number" min={5} max={100} step={0.5} value={editing.commission_percent ?? 5} onChange={e => setEditing({ ...editing, commission_percent: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Státusz</Label>
              <Select value={editing.status || "draft"} onValueChange={(v: any) => setEditing({ ...editing, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Megjegyzés</Label>
              <Textarea rows={3} value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Mégse</Button>
            <Button onClick={saveTenant}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revenue report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Havi forgalom rögzítése</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Év</Label>
              <Input type="number" value={reportForm.period_year} onChange={e => setReportForm({ ...reportForm, period_year: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Hónap</Label>
              <Input type="number" min={1} max={12} value={reportForm.period_month} onChange={e => setReportForm({ ...reportForm, period_month: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <Label>Bruttó forgalom (Ft)</Label>
              <Input type="number" min={0} value={reportForm.gross_revenue} onChange={e => setReportForm({ ...reportForm, gross_revenue: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <Label>Számlaszám (opcionális)</Label>
              <Input value={reportForm.invoice_number} onChange={e => setReportForm({ ...reportForm, invoice_number: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Megjegyzés</Label>
              <Textarea rows={2} value={reportForm.notes} onChange={e => setReportForm({ ...reportForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Mégse</Button>
            <Button onClick={saveReport}>Rögzítés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTenantsTab;

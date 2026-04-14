import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Link2, Users } from "lucide-react";

interface Program {
  id: string;
  name: string;
  commission_rate: number;
  commission_type: string | null;
  cookie_days: number | null;
  is_active: boolean | null;
  min_payout: number | null;
  recurring_commission: boolean | null;
  recurring_months: number | null;
}

interface Affiliate {
  id: string;
  user_id: string;
  program_id: string | null;
  referral_code: string;
  status: string | null;
  total_earnings: number | null;
  pending_earnings: number | null;
  paid_earnings: number | null;
  total_referrals: number | null;
}

const AdminAffiliateTab = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", commission_rate: 10, commission_type: "percentage", cookie_days: 30, min_payout: 5000, recurring_commission: false, recurring_months: 0 });

  const fetchData = async () => {
    const [pRes, aRes] = await Promise.all([
      supabase.from("affiliate_programs").select("*").order("created_at"),
      supabase.from("affiliates").select("*").order("created_at"),
    ]);
    if (pRes.data) setPrograms(pRes.data);
    if (aRes.data) setAffiliates(aRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addProgram = async () => {
    if (!form.name.trim()) return;
    const { error } = await supabase.from("affiliate_programs").insert({
      name: form.name, commission_rate: form.commission_rate, commission_type: form.commission_type,
      cookie_days: form.cookie_days, min_payout: form.min_payout,
      recurring_commission: form.recurring_commission, recurring_months: form.recurring_months,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Program létrehozva" }); setShowForm(false); fetchData(); }
  };

  const toggleProgram = async (id: string, active: boolean) => {
    await supabase.from("affiliate_programs").update({ is_active: active }).eq("id", id);
    fetchData();
  };

  const deleteProgram = async (id: string) => {
    await supabase.from("affiliate_programs").delete().eq("id", id);
    toast({ title: "Program törölve" }); fetchData();
  };

  const programAffiliates = (pid: string) => affiliates.filter(a => a.program_id === pid);

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Link2 className="w-5 h-5" /><h2 className="font-bold text-lg">Affiliate / Partner program</h2></div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Új program</Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Program neve</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Jutalék (%)</Label><Input type="number" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: Number(e.target.value) })} /></div>
            <div><Label>Cookie napok</Label><Input type="number" value={form.cookie_days} onChange={e => setForm({ ...form, cookie_days: Number(e.target.value) })} /></div>
            <div><Label>Min. kifizetés (Ft)</Label><Input type="number" value={form.min_payout} onChange={e => setForm({ ...form, min_payout: Number(e.target.value) })} /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.recurring_commission} onCheckedChange={v => setForm({ ...form, recurring_commission: v })} />
            <span className="text-sm">Ismétlődő jutalék</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addProgram}>Mentés</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Mégse</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {programs.map(p => (
          <div key={p.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{p.name}</span>
                <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Aktív" : "Inaktív"}</Badge>
                <Badge variant="outline">{p.commission_rate}% jutalék</Badge>
                <Badge variant="outline">{programAffiliates(p.id).length} partner</Badge>
              </div>
              <div className="flex gap-2">
                <Switch checked={!!p.is_active} onCheckedChange={v => toggleProgram(p.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => deleteProgram(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
            {programAffiliates(p.id).length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>Kód</TableHead><TableHead>Státusz</TableHead><TableHead>Bevétel</TableHead><TableHead>Függő</TableHead><TableHead>Ajánlások</TableHead></TableRow></TableHeader>
                <TableBody>
                  {programAffiliates(p.id).map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.referral_code}</TableCell>
                      <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                      <TableCell>{(a.total_earnings || 0).toLocaleString("hu")} Ft</TableCell>
                      <TableCell>{(a.pending_earnings || 0).toLocaleString("hu")} Ft</TableCell>
                      <TableCell>{a.total_referrals || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ))}
        {programs.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek affiliate programok.</p>}
      </div>
    </div>
  );
};

export default AdminAffiliateTab;

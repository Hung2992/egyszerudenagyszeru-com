import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Mail, Play, Pause } from "lucide-react";

interface EmailAutomation {
  id: string;
  name: string;
  trigger_type: string;
  delay_minutes: number;
  subject: string;
  body_html: string;
  is_active: boolean;
  sent_count: number;
}

const TRIGGERS = [
  { value: "welcome", label: "Üdvözlő e-mail (regisztráció után)" },
  { value: "cart_abandoned", label: "Kosárelhagyás emlékeztető" },
  { value: "order_completed", label: "Rendelés visszaigazolás" },
  { value: "review_request", label: "Vélemény kérés (szállítás után)" },
  { value: "reengagement", label: "Visszatérő vásárló (inaktivitás)" },
];

const AdminEmailAutomationTab = () => {
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", trigger_type: "welcome", delay_minutes: 0, subject: "", body_html: "" });

  const fetchData = async () => {
    const { data } = await supabase.from("email_automations").select("*").order("created_at");
    if (data) setAutomations(data as EmailAutomation[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addAutomation = async () => {
    if (!form.name.trim() || !form.subject.trim()) return;
    const { error } = await supabase.from("email_automations").insert(form);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Automatizáció létrehozva" }); setShowForm(false); setForm({ name: "", trigger_type: "welcome", delay_minutes: 0, subject: "", body_html: "" }); fetchData(); }
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("email_automations").update({ is_active: active }).eq("id", id);
    fetchData();
  };

  const remove = async (id: string) => {
    await supabase.from("email_automations").delete().eq("id", id);
    toast({ title: "Törölve" }); fetchData();
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Mail className="w-5 h-5" /><h2 className="font-bold text-lg">E-mail automatizálás</h2></div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Új automatizáció</Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Név</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Trigger</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.trigger_type} onChange={e => setForm({ ...form, trigger_type: e.target.value })}>
                {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div><Label>Tárgy</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label>Késleltetés (perc)</Label><Input type="number" value={form.delay_minutes} onChange={e => setForm({ ...form, delay_minutes: Number(e.target.value) })} /></div>
          </div>
          <div><Label>E-mail szövege (HTML)</Label><Textarea value={form.body_html} onChange={e => setForm({ ...form, body_html: e.target.value })} rows={5} placeholder="<h1>Üdvözlünk!</h1><p>Köszönjük a regisztrációdat...</p>" /></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addAutomation}>Mentés</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Mégse</Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader><TableRow><TableHead>Név</TableHead><TableHead>Trigger</TableHead><TableHead>Tárgy</TableHead><TableHead>Késleltetés</TableHead><TableHead>Küldve</TableHead><TableHead>Aktív</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {automations.map(a => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell><Badge variant="outline">{TRIGGERS.find(t => t.value === a.trigger_type)?.label || a.trigger_type}</Badge></TableCell>
              <TableCell className="text-sm">{a.subject}</TableCell>
              <TableCell>{a.delay_minutes > 0 ? `${a.delay_minutes} perc` : "Azonnal"}</TableCell>
              <TableCell>{a.sent_count}</TableCell>
              <TableCell><Switch checked={a.is_active} onCheckedChange={v => toggle(a.id, v)} /></TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {automations.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek e-mail automatizációk.</p>}
    </div>
  );
};

export default AdminEmailAutomationTab;

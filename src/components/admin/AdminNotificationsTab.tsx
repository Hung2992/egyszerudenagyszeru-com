import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Plus, Trash2, Save } from "lucide-react";

const EVENT_TYPES = [
  { key: "order_created", label: "Új rendelés" },
  { key: "order_status_changed", label: "Rendelés státusz változás" },
  { key: "low_stock", label: "Alacsony készlet" },
  { key: "new_registration", label: "Új regisztráció" },
  { key: "new_review", label: "Új vélemény" },
  { key: "return_request", label: "Visszáru kérés" },
  { key: "support_ticket", label: "Új ticket" },
];

interface Rule {
  id: string;
  event_type: string;
  name: string;
  email_template: string | null;
  is_active: boolean;
  channels: string[];
}

interface LogEntry {
  id: string;
  recipient_email: string | null;
  channel: string;
  status: string;
  created_at: string;
}

const AdminNotificationsTab = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", event_type: "order_created", email_template: "" });
  const [view, setView] = useState<"rules" | "log">("rules");

  const fetchData = async () => {
    const [rulesRes, logsRes] = await Promise.all([
      supabase.from("notification_rules").select("*").order("created_at"),
      supabase.from("notification_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (rulesRes.data) setRules(rulesRes.data as Rule[]);
    if (logsRes.data) setLogs(logsRes.data as LogEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addRule = async () => {
    if (!form.name.trim()) return;
    const { error } = await supabase.from("notification_rules").insert({
      name: form.name,
      event_type: form.event_type,
      email_template: form.email_template || null,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Szabály létrehozva" }); setShowForm(false); setForm({ name: "", event_type: "order_created", email_template: "" }); fetchData(); }
  };

  const toggleRule = async (id: string, active: boolean) => {
    await supabase.from("notification_rules").update({ is_active: !active }).eq("id", id);
    fetchData();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("notification_rules").delete().eq("id", id);
    toast({ title: "Törölve" }); fetchData();
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h2 className="font-bold text-lg">Értesítések</h2>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "rules" ? "default" : "outline"} size="sm" onClick={() => setView("rules")}>Szabályok</Button>
          <Button variant={view === "log" ? "default" : "outline"} size="sm" onClick={() => setView("log")}>Napló</Button>
        </div>
      </div>

      {view === "rules" && (
        <>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Új szabály</Button>
          {showForm && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label>Név</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Esemény</Label>
                  <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EVENT_TYPES.map(e => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>E-mail sablon</Label><Input value={form.email_template} onChange={e => setForm({ ...form, email_template: e.target.value })} placeholder="opcionális" /></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addRule}><Save className="w-4 h-4 mr-1" /> Mentés</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Mégse</Button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {rules.map(r => (
              <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <Badge variant="outline">{EVENT_TYPES.find(e => e.key === r.event_type)?.label || r.event_type}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={r.is_active} onCheckedChange={() => toggleRule(r.id, r.is_active)} />
                  <Button variant="ghost" size="icon" onClick={() => deleteRule(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
            {rules.length === 0 && <p className="text-sm text-muted-foreground">Nincs értesítési szabály.</p>}
          </div>
        </>
      )}

      {view === "log" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Címzett</TableHead>
              <TableHead>Csatorna</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead>Dátum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(l => (
              <TableRow key={l.id}>
                <TableCell className="text-sm">{l.recipient_email || "-"}</TableCell>
                <TableCell><Badge variant="outline">{l.channel}</Badge></TableCell>
                <TableCell><Badge variant={l.status === "sent" ? "default" : "destructive"}>{l.status}</Badge></TableCell>
                <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("hu")}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nincs értesítés napló.</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AdminNotificationsTab;

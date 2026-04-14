import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, AlertTriangle, ScrollText, Save } from "lucide-react";

interface MaintenanceMode {
  id: string;
  is_active: boolean;
  message: string;
  planned_end: string | null;
}

interface SystemLog {
  id: string;
  event_type: string;
  message: string;
  level: string;
  created_at: string;
  metadata: any;
}

const LEVEL_COLORS: Record<string, string> = {
  info: "default",
  warning: "secondary",
  error: "destructive",
};

const AdminSystemTab = () => {
  const [maintenance, setMaintenance] = useState<MaintenanceMode | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logFilter, setLogFilter] = useState("all");

  const fetchData = async () => {
    const [mRes, lRes] = await Promise.all([
      supabase.from("maintenance_mode").select("*").limit(1).maybeSingle(),
      supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (mRes.data) {
      setMaintenance(mRes.data as MaintenanceMode);
    } else {
      const { data: newM } = await supabase.from("maintenance_mode").insert({}).select().single();
      if (newM) setMaintenance(newM as MaintenanceMode);
    }
    if (lRes.data) setLogs(lRes.data as SystemLog[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const saveMaintenance = async () => {
    if (!maintenance) return;
    const { error } = await supabase.from("maintenance_mode").update({
      is_active: maintenance.is_active,
      message: maintenance.message,
      planned_end: maintenance.planned_end || null,
    }).eq("id", maintenance.id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Karbantartási beállítások mentve" });
  };

  const filteredLogs = logFilter === "all" ? logs : logs.filter(l => l.level === logFilter);

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-8">
      {/* Karbantartási mód */}
      <div className="space-y-4">
        <div className="flex items-center gap-2"><Wrench className="w-5 h-5" /><h2 className="font-bold text-lg">Karbantartási mód</h2></div>
        
        {maintenance && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Karbantartási mód</p>
                <p className="text-xs text-muted-foreground">Bekapcsoláskor a webshop nem elérhető a látogatók számára</p>
              </div>
              <div className="flex items-center gap-2">
                {maintenance.is_active && <Badge variant="destructive">AKTÍV</Badge>}
                <Switch checked={maintenance.is_active} onCheckedChange={v => setMaintenance({ ...maintenance, is_active: v })} />
              </div>
            </div>
            <div>
              <Label>Üzenet a látogatóknak</Label>
              <Textarea value={maintenance.message} onChange={e => setMaintenance({ ...maintenance, message: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Tervezett befejezés</Label>
              <Input type="datetime-local" value={maintenance.planned_end?.slice(0, 16) || ""}
                onChange={e => setMaintenance({ ...maintenance, planned_end: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
            <Button onClick={saveMaintenance}><Save className="w-4 h-4 mr-1" /> Mentés</Button>
          </div>
        )}
      </div>

      {/* Rendszernapló */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><ScrollText className="w-5 h-5" /><h2 className="font-bold text-lg">Rendszernapló</h2></div>
          <div className="flex gap-1">
            {["all", "info", "warning", "error"].map(level => (
              <Button key={level} size="sm" variant={logFilter === level ? "default" : "ghost"}
                onClick={() => setLogFilter(level)} className="text-xs h-7 px-2">
                {level === "all" ? "Mind" : level}
              </Button>
            ))}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Idő</TableHead><TableHead>Szint</TableHead><TableHead>Típus</TableHead><TableHead>Üzenet</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString("hu")}</TableCell>
                  <TableCell>
                    <Badge variant={LEVEL_COLORS[l.level] as any || "default"} className="text-xs">{l.level}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{l.event_type}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{l.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredLogs.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nincsenek naplóbejegyzések.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminSystemTab;

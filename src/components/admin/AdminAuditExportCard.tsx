import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2, FileText } from "lucide-react";

const today = new Date();
const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

const AdminAuditExportCard = () => {
  const [month, setMonth] = useState(defaultMonth);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      toast({ title: "Érvénytelen hónap", variant: "destructive" });
      return;
    }
    setBusy(true);
    const [y, m] = month.split("-").map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
    const to = new Date(Date.UTC(y, m, 1)).toISOString();
    const { data, error } = await supabase.rpc("admin_export_accountant_audit", { _from: from, _to: to });
    setBusy(false);
    if (error) { toast({ title: "Sikertelen", description: error.message, variant: "destructive" }); return; }
    const rows: any[] = (data as any[]) ?? [];
    const header = ["Idopont", "Email", "User ID", "Muvelet", "Eroforras", "IP cim", "Bongeszo", "Metaadat"];
    const csv = [header, ...rows.map(r => [
      new Date(r.created_at).toLocaleString("hu-HU"),
      r.user_email ?? "",
      r.user_id ?? "",
      r.action ?? "",
      r.resource ?? "",
      r.ip_address ?? "",
      r.user_agent ?? "",
      JSON.stringify(r.metadata ?? {}),
    ])].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `konyvelo_audit_${month}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "Audit napló letöltve", description: `${rows.length} bejegyzés` });
  };

  return (
    <div className="border border-border p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 bg-accent/10 border border-accent flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">Könyvelői audit napló — havi CSV</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Letölthető teljes audit napló (belépések, exportok, lekérdezések) IP-vel és böngészővel ellenőrzéshez.
          </p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="md:w-48" />
        <Button onClick={download} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          CSV letöltés
        </Button>
      </div>
    </div>
  );
};

export default AdminAuditExportCard;

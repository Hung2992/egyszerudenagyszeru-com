import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2, FileText, FileSpreadsheet } from "lucide-react";

const today = new Date();
const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

const AdminAuditExportCard = () => {
  const [month, setMonth] = useState(defaultMonth);
  const [busy, setBusy] = useState<"csv" | "xlsx" | null>(null);

  const fetchRows = async (): Promise<any[]> => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      toast({ title: "Érvénytelen hónap", variant: "destructive" });
      return [];
    }
    const [y, m] = month.split("-").map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
    const to = new Date(Date.UTC(y, m, 1)).toISOString();
    const { data, error } = await supabase.rpc("admin_export_accountant_audit", { _from: from, _to: to });
    if (error) { toast({ title: "Sikertelen", description: error.message, variant: "destructive" }); return []; }
    return (data as any[]) ?? [];
  };

  const downloadCsv = async () => {
    setBusy("csv");
    const rows = await fetchRows();
    setBusy(null);
    if (!rows.length && rows !== undefined) { /* still allow empty download */ }
    const header = ["Idopont", "Email", "User ID", "Muvelet", "Eroforras", "IP cim", "Bongeszo", "Metaadat"];
    const csv = [header, ...rows.map(r => [
      new Date(r.created_at).toLocaleString("hu-HU"),
      r.user_email ?? "", r.user_id ?? "", r.action ?? "", r.resource ?? "",
      r.ip_address ?? "", r.user_agent ?? "", JSON.stringify(r.metadata ?? {}),
    ])].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `konyvelo_audit_${month}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "Audit napló letöltve", description: `${rows.length} bejegyzés (CSV)` });
  };

  const downloadXlsx = async () => {
    setBusy("xlsx");
    const rows = await fetchRows();
    setBusy(null);
    const sheet = XLSX.utils.json_to_sheet(rows.map(r => ({
      Időpont: new Date(r.created_at).toLocaleString("hu-HU"),
      Email: r.user_email ?? "",
      "User ID": r.user_id ?? "",
      Művelet: r.action ?? "",
      Erőforrás: r.resource ?? "",
      "IP cím": r.ip_address ?? "",
      Böngésző: r.user_agent ?? "",
      Metaadat: JSON.stringify(r.metadata ?? {}),
    })));
    sheet["!cols"] = [{ wch: 20 }, { wch: 28 }, { wch: 38 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 40 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Audit napló");
    // Summary sheet by action
    const byAction: Record<string, number> = {};
    rows.forEach((r) => { byAction[r.action ?? "—"] = (byAction[r.action ?? "—"] ?? 0) + 1; });
    const summary = XLSX.utils.json_to_sheet(Object.entries(byAction).map(([action, count]) => ({ Művelet: action, Darab: count })));
    XLSX.utils.book_append_sheet(wb, summary, "Összesítő");
    XLSX.writeFile(wb, `konyvelo_audit_${month}.xlsx`);
    toast({ title: "Audit napló letöltve", description: `${rows.length} bejegyzés (XLSX, NAV-kompatibilis)` });
  };

  return (
    <div className="border border-border p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 bg-accent/10 border border-accent flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">Könyvelői audit napló — havi export</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Letölthető teljes audit napló (belépések, exportok, lekérdezések) IP-vel és böngészővel. NAV-ellenőrzéshez XLSX is elérhető.
          </p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="md:w-48" />
        <Button onClick={downloadCsv} disabled={!!busy} variant="outline">
          {busy === "csv" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          CSV
        </Button>
        <Button onClick={downloadXlsx} disabled={!!busy}>
          {busy === "xlsx" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />}
          XLSX (NAV)
        </Button>
      </div>
    </div>
  );
};

export default AdminAuditExportCard;

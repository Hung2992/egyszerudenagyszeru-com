import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Megaphone, Send, Loader2, RefreshCw, Download, RotateCw } from "lucide-react";

interface Recipient {
  user_id: string;
  email: string;
  name: string;
  status: "eligible" | "already_sent" | "already_redeemed" | "has_order" | "no_coupon";
}

interface LogRow {
  id: string;
  email: string;
  status: string;
  reason: string | null;
  error: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  eligible: { label: "Küldhető", variant: "default" },
  already_sent: { label: "Már megkapta", variant: "secondary" },
  already_redeemed: { label: "Már beváltotta", variant: "secondary" },
  has_order: { label: "Nem első vásárló", variant: "outline" },
  no_coupon: { label: "Kupon hiányzik", variant: "destructive" },
};

const AdminWelcome20Blast = () => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [filter, setFilter] = useState<string>("eligible");

  const loadLog = async () => {
    const { data } = await supabase
      .from("welcome20_send_log" as any)
      .select("id,email,status,reason,error,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setLog((data as unknown as LogRow[]) || []);
  };

  useEffect(() => { loadLog(); }, []);

  const exportCsv = () => {
    const header = ["timestamp", "email", "status", "reason", "error"];
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = log.map((l) => [l.created_at, l.email, l.status, l.reason || "", l.error || ""].map(escape).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `welcome20-send-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resendFailed = async (email: string) => {
    if (!confirm(`Újraküldöd a WELCOME20 kupont ${email} címre?`)) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-welcome20-blast", {
      body: { retry_failed: true, emails: [email] },
    });
    setSending(false);
    const r = data as any;
    if (error || r?.error) {
      toast({ title: "Sikertelen újraküldés", description: error?.message || r?.error, variant: "destructive" });
    } else {
      toast({ title: r.sent > 0 ? "✅ Újraküldve" : "Nem küldhető", description: `${r.sent} sikeres / ${r.failed} sikertelen` });
    }
    await loadLog();
  };


  const preview = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("send-welcome20-blast", { body: { dry_run: true } });
    setLoading(false);
    const r = data as any;
    if (error || r?.error) {
      toast({ title: "Hiba", description: error?.message || r?.error, variant: "destructive" });
      return;
    }
    setRecipients(r.recipients as Recipient[]);
    setSummary(r.summary as Record<string, number>);
  };

  const send = async () => {
    const eligibleCount = (summary?.eligible || recipients?.filter((r) => r.status === "eligible").length) ?? 0;
    if (eligibleCount === 0) {
      toast({ title: "Nincs jogosult címzett", description: "Futtass előbb előnézetet.", variant: "destructive" });
      return;
    }
    if (!confirm(`Biztosan kiküldöd a WELCOME20 kupont ${eligibleCount} jogosult vásárlónak?\n(A többiek automatikusan ki lesznek hagyva.)`)) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-welcome20-blast", { body: {} });
    setSending(false);
    const r = data as any;
    if (error || r?.error) {
      toast({ title: "Hiba a küldés során", description: error?.message || r?.error, variant: "destructive" });
      return;
    }
    toast({
      title: "✅ Kuponok kiküldve",
      description: `${r.sent} sikeres, ${r.failed} sikertelen (${r.eligible} jogosult / ${r.total} összesen)`,
    });
    await Promise.all([preview(), loadLog()]);
  };

  const filtered = recipients?.filter((r) => (filter === "all" ? true : r.status === filter)) || [];

  return (
    <div className="border border-accent/40 bg-accent/5 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Nyitó akció — WELCOME20 körlevél</h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={preview} disabled={loading || sending}>
            {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Előnézet
          </Button>
          <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={send} disabled={loading || sending || !recipients}>
            {sending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
            Kupon kiküldése most
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        20% kedvezmény, felhasználónként egyszer beváltható. <strong>Csak első vásárlók</strong> kapják (akik még nem rendeltek).
        Aki már megkapta vagy beváltotta, automatikusan ki lesz hagyva. A kupont a checkout automatikusan alkalmazza a jogosultaknál.
      </p>

      {summary && (
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(summary).map(([k, v]) => (
            <button key={k} onClick={() => setFilter(k)} className={`border px-2 py-1 ${filter === k ? "bg-foreground text-background" : ""}`}>
              {STATUS_LABEL[k]?.label || k}: <strong>{v}</strong>
            </button>
          ))}
          <button onClick={() => setFilter("all")} className={`border px-2 py-1 ${filter === "all" ? "bg-foreground text-background" : ""}`}>
            Összes: <strong>{recipients?.length || 0}</strong>
          </button>
        </div>
      )}

      {recipients && (
        <div className="border max-h-80 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="text-[10px] uppercase">Név</TableHead>
                <TableHead className="text-[10px] uppercase">Email</TableHead>
                <TableHead className="text-[10px] uppercase">Státusz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 500).map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell className="text-xs">{r.name}</TableCell>
                  <TableCell className="text-xs font-mono">{r.email}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_LABEL[r.status]?.variant || "outline"} className="text-[10px] rounded-none">
                      {STATUS_LABEL[r.status]?.label || r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">Nincs találat ebben a kategóriában.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {log.length > 0 && (
        <details className="border" open>
          <summary className="cursor-pointer p-2 text-xs uppercase tracking-wider bg-muted/30 flex items-center justify-between gap-2">
            <span>Kiküldési napló ({log.length})</span>
            <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-[10px] h-6" onClick={(e) => { e.preventDefault(); exportCsv(); }}>
              <Download className="w-3 h-3 mr-1" /> CSV export
            </Button>
          </summary>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="text-[10px] uppercase">Időpont</TableHead>
                  <TableHead className="text-[10px] uppercase">Email</TableHead>
                  <TableHead className="text-[10px] uppercase">Státusz</TableHead>
                  <TableHead className="text-[10px] uppercase">Megjegyzés</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Művelet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const alreadySent = new Set(log.filter((x) => x.status === "sent").map((x) => x.email.toLowerCase()));
                  return log.map((l) => {
                    const canRetry = l.status === "failed" && !alreadySent.has(l.email.toLowerCase());
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-[10px] font-mono">{new Date(l.created_at).toLocaleString("hu-HU")}</TableCell>
                        <TableCell className="text-xs font-mono">{l.email}</TableCell>
                        <TableCell>
                          <Badge variant={l.status === "sent" ? "default" : l.status === "failed" ? "destructive" : "secondary"} className="text-[10px] rounded-none">
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{l.error || l.reason || "—"}</TableCell>
                        <TableCell className="text-right">
                          {canRetry ? (
                            <Button size="sm" variant="outline" className="rounded-none text-[10px] h-6" disabled={sending} onClick={() => resendFailed(l.email)}>
                              <RotateCw className="w-3 h-3 mr-1" /> Újraküldés
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </div>
        </details>
      )}
    </div>
  );
};

export default AdminWelcome20Blast;

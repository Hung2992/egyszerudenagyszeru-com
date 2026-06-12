import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Loader2, ChevronDown, ChevronUp, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteRow {
  id: string; email: string; invited_at: string; accepted_at: string | null;
  expires_at: string | null; resend_count: number | null; last_sent_at: string | null;
}

interface LogRow {
  id: string; created_at: string; action: string; resource: string | null;
  ip_address: string | null; metadata: any;
}

const ACTION_LABEL: Record<string, string> = {
  invite_sent: "Meghívás elküldve",
  invite_resent: "Újraküldés",
  invite_failed: "Hibás email küldés",
  totp_verified: "TOTP belépés",
  totp_backup_viewed: "Backup kódok megtekintve",
  totp_backup_regenerated: "Backup kódok újragenerálva",
  totp_backup_access_denied: "Backup hozzáférés elutasítva",
  view_month: "Hónap lekérdezés",
  export_csv: "CSV export",
  export_xlsx: "XLSX export",
};

const AdminInviteMonitor = () => {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [logs, setLogs] = useState<Record<string, LogRow[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pending_accountant_invites")
        .select("id,email,invited_at,accepted_at,expires_at,resend_count,last_sent_at")
        .order("invited_at", { ascending: false }).limit(50);
      setInvites((data as InviteRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const toggle = async (id: string, email: string) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    if (logs[id]) return;
    const { data } = await supabase
      .from("accountant_access_log")
      .select("id,created_at,action,resource,ip_address,metadata")
      .or(`resource.eq.${email},action.in.(invite_sent,invite_resent,invite_failed)`)
      .order("created_at", { ascending: false }).limit(30);
    const rows = ((data as LogRow[]) ?? []).filter(r =>
      r.resource === email || (r.metadata && JSON.stringify(r.metadata).includes(email))
    );
    setLogs(prev => ({ ...prev, [id]: rows }));
  };

  const statusBadge = (i: InviteRow) => {
    if (i.accepted_at) return <span className="text-[10px] uppercase tracking-wide bg-accent/15 text-accent px-2 py-0.5">Elfogadva</span>;
    if (i.expires_at && new Date(i.expires_at) < new Date()) return <span className="text-[10px] uppercase tracking-wide bg-destructive/15 text-destructive px-2 py-0.5">Lejárt</span>;
    return <span className="text-[10px] uppercase tracking-wide bg-secondary px-2 py-0.5">Függő</span>;
  };

  return (
    <div className="border border-border">
      <div className="p-4 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-bold uppercase tracking-wide">Meghívó monitor — státusz és audit események</h3>
        <p className="text-[11px] text-muted-foreground mt-1">Soronként kibontható: last_sent_at, resend_count, email küldési/hibás események.</p>
      </div>
      {loading ? <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" /></div> : (
        invites.length === 0
          ? <p className="p-6 text-xs text-muted-foreground text-center">Nincs meghívás</p>
          : <table className="w-full text-xs">
              <thead className="bg-secondary/20 text-left">
                <tr>
                  <th className="p-3">Email</th><th className="p-3">Státusz</th>
                  <th className="p-3">Utolsó küldés</th><th className="p-3 text-center">Küldés</th>
                  <th className="p-3">Lejárat</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {invites.map(i => {
                  const isOpen = open === i.id;
                  const evts = logs[i.id] ?? [];
                  return (
                    <>
                      <tr key={i.id} className="border-t border-border">
                        <td className="p-3 font-bold">{i.email}</td>
                        <td className="p-3">{statusBadge(i)}</td>
                        <td className="p-3 text-muted-foreground">{i.last_sent_at ? new Date(i.last_sent_at).toLocaleString("hu-HU") : "—"}</td>
                        <td className="p-3 text-center font-mono">{(i.resend_count ?? 0) + 1}×</td>
                        <td className="p-3 text-muted-foreground">{i.expires_at ? new Date(i.expires_at).toLocaleDateString("hu-HU") : "—"}</td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => toggle(i.id, i.email)}>
                            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-border bg-secondary/10">
                          <td colSpan={6} className="p-3">
                            {evts.length === 0 ? <p className="text-[11px] text-muted-foreground">Nincs audit esemény ehhez a címhez.</p> : (
                              <ul className="space-y-1">
                                {evts.map(e => {
                                  const failed = e.action === "invite_failed" || e.action.includes("denied");
                                  const Icon = failed ? AlertCircle : (e.action.includes("invite") ? Mail : CheckCircle2);
                                  return (
                                    <li key={e.id} className="flex items-start gap-2 text-[11px] border border-border bg-background p-2">
                                      <Icon className={`h-3.5 w-3.5 mt-0.5 ${failed ? "text-destructive" : "text-accent"}`} />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold">{ACTION_LABEL[e.action] ?? e.action}</span>
                                          <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("hu-HU")}</span>
                                          {e.ip_address && <span className="text-muted-foreground font-mono">{e.ip_address}</span>}
                                        </div>
                                        {e.metadata && Object.keys(e.metadata).length > 0 && (
                                          <code className="block mt-1 text-[10px] text-muted-foreground bg-secondary/30 p-1 truncate">{JSON.stringify(e.metadata)}</code>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
      )}
    </div>
  );
};

export default AdminInviteMonitor;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Clock, User, Plus, Pencil, Send, Trash2, CalendarClock } from "lucide-react";

interface AuditEntry {
  id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  action: string;
  actor_email: string | null;
  status_from: string | null;
  status_to: string | null;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; icon: any; className: string }> = {
  create: { label: "Létrehozva", icon: Plus, className: "text-accent" },
  update: { label: "Módosítva", icon: Pencil, className: "text-muted-foreground" },
  schedule: { label: "Ütemezve", icon: CalendarClock, className: "text-blue-400" },
  send: { label: "Elküldve", icon: Send, className: "text-accent" },
  delete: { label: "Törölve", icon: Trash2, className: "text-destructive" },
};

const MarketingAuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("marketing_campaign_audit_log")
      .select("id, campaign_id, campaign_name, action, actor_email, status_from, status_to, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setEntries(data as any);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  return (
    <div className="border bg-card">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-3 text-xs font-bold uppercase tracking-widest hover:bg-muted/40"
      >
        <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Audit napló</span>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t divide-y max-h-96 overflow-auto">
          {entries.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">Nincs bejegyzés.</p>
          )}
          {entries.map(e => {
            const meta = ACTION_META[e.action] ?? ACTION_META.update;
            const Icon = meta.icon;
            return (
              <div key={e.id} className="flex items-start gap-3 p-3 text-xs">
                <Icon className={`h-3.5 w-3.5 mt-0.5 ${meta.className}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-bold uppercase tracking-wider ${meta.className}`}>{meta.label}</span>
                    <span className="font-semibold truncate">{e.campaign_name ?? "—"}</span>
                    {e.status_from && e.status_to && e.status_from !== e.status_to && (
                      <span className="text-[10px] text-muted-foreground">
                        {e.status_from} → {e.status_to}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-2.5 w-2.5" />{e.actor_email ?? "rendszer"}</span>
                    <span>{new Date(e.created_at).toLocaleString("hu-HU")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MarketingAuditLog;

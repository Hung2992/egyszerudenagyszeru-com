// Egy AI intézkedés teljes auditnaplója: ki, mikor, mit, előtte/utána.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Props { actionId: string }

interface AuditRow {
  id: string;
  event_type: string;
  risk_level: string | null;
  actor_email: string | null;
  actor_role: string | null;
  details: Record<string, unknown> | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  correlation_id: string | null;
  created_at: string;
}

const EVENT_LABEL: Record<string, string> = {
  proposed: "📋 Terv elkészült",
  autopilot_proposed: "🚀 Autopilot terv",
  approved: "👤 Jóváhagyva",
  step_executed: "⚙️ Lépés végrehajtva",
  step_failed: "⚠️ Lépés hibára futott",
  measured: "📊 Eredmény mérve",
  rolled_back: "↩️ Visszavonva",
  discarded: "🗑️ Elvetve",
};

const PartnerActionAuditTrail = ({ actionId }: Props) => {
  const [rows, setRows] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from("partner_action_audit").select("*")
        .eq("action_id", actionId).order("created_at", { ascending: true }).limit(100);
      if (alive) setRows((data as AuditRow[]) || []);
    })();
    return () => { alive = false; };
  }, [actionId]);

  if (rows === null) {
    return <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Napló betöltése…</p>;
  }
  if (!rows.length) return <p className="text-xs text-muted-foreground">Nincs naplóbejegyzés.</p>;

  return (
    <div className="space-y-2">
      {rows[0]?.correlation_id && (
        <p className="text-[10px] text-muted-foreground font-mono">Correlation ID: {rows[0].correlation_id}</p>
      )}
      {rows.map((r) => (
        <div key={r.id} className="border-l-2 border-border pl-3 py-1 text-xs space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{EVENT_LABEL[r.event_type] || r.event_type}</span>
            <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("hu-HU")}</span>
            {r.risk_level && <Badge variant="outline" className="rounded-none text-[10px]">{r.risk_level}</Badge>}
            {r.actor_role && <Badge variant="secondary" className="rounded-none text-[10px]">{r.actor_role}</Badge>}
          </div>
          {r.actor_email && <p className="text-muted-foreground">Felelős: {r.actor_email}</p>}
          {r.details && Object.keys(r.details).length > 0 && (
            <pre className="bg-muted/40 p-2 overflow-x-auto text-[10px] whitespace-pre-wrap">{JSON.stringify(r.details, null, 1)}</pre>
          )}
          {r.before_state && Object.keys(r.before_state).length > 0 && (
            <details>
              <summary className="cursor-pointer text-muted-foreground">Előtte / utána állapot</summary>
              <pre className="bg-muted/40 p-2 overflow-x-auto text-[10px] whitespace-pre-wrap">
{JSON.stringify({ elotte: r.before_state, utana: r.after_state }, null, 1)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
};

export default PartnerActionAuditTrail;

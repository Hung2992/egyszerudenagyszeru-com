import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props { partnerId?: string; storefrontId?: string; adminView?: boolean; }

const ACTION_LABEL: Record<string, string> = {
  update: "Szerkesztés",
  publish_request: "Publikálási kérés",
  publish_approved: "Publikáció jóváhagyva",
  publish_rejected: "Publikáció elutasítva",
  restore_version: "Verzió visszaállítva",
  domain_request: "Domain kérés",
  domain_status_approved: "Domain jóváhagyva",
  domain_status_rejected: "Domain elutasítva",
  domain_status_verifying: "Domain ellenőrzés alatt",
  domain_status_active: "Domain aktív",
  token_created: "Előnézet token létrehozva",
  token_revoked: "Előnézet token visszavonva",
};

const PartnerStorefrontAuditLogTab = ({ partnerId, storefrontId, adminView }: Props) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("partner_storefront_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (storefrontId) q = q.eq("storefront_id", storefrontId);
      else if (partnerId) q = q.eq("partner_id", partnerId);
      const { data } = await q;
      setRows(data || []);
      setLoading(false);
    })();
  }, [partnerId, storefrontId]);

  const filtered = rows.filter(r => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (r.action || "").toLowerCase().includes(f)
      || JSON.stringify(r.changed_fields || []).toLowerCase().includes(f)
      || (r.note || "").toLowerCase().includes(f);
  });

  return (
    <div className="space-y-3">
      <Input className="rounded-none" placeholder="Szűrés (akció, mező, megjegyzés)" value={filter} onChange={e => setFilter(e.target.value)} />
      {loading ? <p className="text-sm text-muted-foreground">Betöltés…</p> :
        filtered.length === 0 ? <p className="text-sm text-muted-foreground">Nincs napló bejegyzés.</p> :
        <ScrollArea className="h-[60vh] border border-foreground/20">
          <div className="divide-y divide-foreground/10">
            {filtered.map(r => {
              const changed: string[] = Array.isArray(r.changed_fields) ? r.changed_fields : [];
              return (
                <div key={r.id} className="p-3 space-y-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="rounded-none uppercase">{ACTION_LABEL[r.action] || r.action}</Badge>
                    <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("hu-HU")}</span>
                    {adminView && r.actor_user_id && <span className="font-mono text-muted-foreground">{String(r.actor_user_id).slice(0, 8)}</span>}
                    {r.ip && <span className="font-mono text-muted-foreground">{r.ip}</span>}
                  </div>
                  {changed.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {changed.map(c => <span key={c} className="px-1.5 py-0.5 bg-muted font-mono">{c}</span>)}
                    </div>
                  )}
                  {r.note && <div className="italic">{r.note}</div>}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      }
    </div>
  );
};

export default PartnerStorefrontAuditLogTab;

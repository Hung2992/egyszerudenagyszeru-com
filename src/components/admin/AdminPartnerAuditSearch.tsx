import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Search } from "lucide-react";

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

const fmt = (s?: string | null) => s ? new Date(s).toLocaleString("hu-HU") : "";

const csvCell = (v: any) => {
  const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const AdminPartnerAuditSearch = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [partnerId, setPartnerId] = useState<string>("");
  const [domain, setDomain] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("partners").select("id, full_name, company_name, email").order("full_name");
      setPartners(p || []);
      const { data: d } = await supabase.from("partner_domain_requests").select("id, partner_id, requested_domain").order("created_at", { ascending: false }).limit(500);
      setDomains(d || []);
    })();
  }, []);

  const run = async () => {
    setLoading(true);
    let q = supabase.from("partner_storefront_audit_log").select("*, partners(full_name, company_name, email)").order("created_at", { ascending: false }).limit(1000);
    if (partnerId) q = q.eq("partner_id", partnerId);
    if (action) q = q.eq("action", action);
    if (from) q = q.gte("created_at", new Date(from).toISOString());
    if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());
    const { data } = await q;
    let result = data || [];
    if (domain) {
      const f = domain.toLowerCase();
      result = result.filter((r: any) => JSON.stringify(r.before || {}).toLowerCase().includes(f) || JSON.stringify(r.after || {}).toLowerCase().includes(f) || (r.note || "").toLowerCase().includes(f));
    }
    if (text) {
      const f = text.toLowerCase();
      result = result.filter((r: any) =>
        JSON.stringify(r.changed_fields || []).toLowerCase().includes(f)
        || (r.note || "").toLowerCase().includes(f)
        || (r.action || "").toLowerCase().includes(f)
      );
    }
    setRows(result);
    setLoading(false);
  };

  useEffect(() => { void run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const actions = useMemo(() => Object.entries(ACTION_LABEL), []);

  const exportCsv = () => {
    const headers = ["created_at", "action", "partner", "actor_user_id", "ip", "changed_fields", "note"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      const partner = r.partners?.company_name || r.partners?.full_name || r.partner_id;
      lines.push([
        csvCell(r.created_at),
        csvCell(r.action),
        csvCell(partner),
        csvCell(r.actor_user_id),
        csvCell(r.ip),
        csvCell((r.changed_fields || []).join("|")),
        csvCell(r.note),
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `partner-audit-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <Card className="rounded-none border-foreground/20 p-3 grid gap-2 md:grid-cols-3">
        <div>
          <label className="text-[10px] uppercase">Partner</label>
          <select className="w-full border border-foreground/20 rounded-none p-1 text-sm bg-background" value={partnerId} onChange={e => setPartnerId(e.target.value)}>
            <option value="">— összes —</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.company_name || p.full_name} ({p.email})</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase">Domain (szabadszöveges)</label>
          <Input className="rounded-none" list="domains-dl" placeholder="pl. myshop.hu" value={domain} onChange={e => setDomain(e.target.value)} />
          <datalist id="domains-dl">
            {domains.map(d => <option key={d.id} value={d.requested_domain} />)}
          </datalist>
        </div>
        <div>
          <label className="text-[10px] uppercase">Akció</label>
          <select className="w-full border border-foreground/20 rounded-none p-1 text-sm bg-background" value={action} onChange={e => setAction(e.target.value)}>
            <option value="">— összes —</option>
            {actions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase">Dátum -tól</label>
          <Input type="date" className="rounded-none" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] uppercase">Dátum -ig</label>
          <Input type="date" className="rounded-none" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] uppercase">Szöveg</label>
          <Input className="rounded-none" placeholder="mező / megjegyzés" value={text} onChange={e => setText(e.target.value)} />
        </div>
        <div className="md:col-span-3 flex gap-2">
          <Button size="sm" className="rounded-none" onClick={run}><Search className="h-3 w-3 mr-1" /> Keresés</Button>
          <Button size="sm" variant="outline" className="rounded-none" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-3 w-3 mr-1" /> CSV ({rows.length})
          </Button>
        </div>
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Betöltés…</p> :
        rows.length === 0 ? <p className="text-sm text-muted-foreground">Nincs találat.</p> :
        <ScrollArea className="h-[60vh] border border-foreground/20">
          <div className="divide-y divide-foreground/10">
            {rows.map(r => {
              const changed: string[] = Array.isArray(r.changed_fields) ? r.changed_fields : [];
              const partner = r.partners?.company_name || r.partners?.full_name;
              return (
                <div key={r.id} className="p-3 space-y-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="rounded-none uppercase">{ACTION_LABEL[r.action] || r.action}</Badge>
                    <span className="text-muted-foreground">{fmt(r.created_at)}</span>
                    {partner && <span className="font-bold">{partner}</span>}
                    {r.actor_user_id && <span className="font-mono text-muted-foreground">{String(r.actor_user_id).slice(0, 8)}</span>}
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

export default AdminPartnerAuditSearch;

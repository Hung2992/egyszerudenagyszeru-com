import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, ShieldAlert, GitCompare, FileText } from "lucide-react";

interface Props { requestId: string; }

const DNS_LABEL: Record<string, string> = {
  not_checked: "Még nem ellenőrzött",
  self_reported: "Partner: beállítva",
  verified: "Sikeres ellenőrzés",
  failed: "Sikertelen ellenőrzés",
};

const fmt = (s: string | null | undefined) => s ? new Date(s).toLocaleString("hu-HU") : "—";

const DomainProofTimeline = ({ requestId }: Props) => {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<{ a?: string; b?: string }>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("partner_domain_proof_versions")
        .select("*")
        .eq("request_id", requestId)
        .order("version_no", { ascending: false });
      setVersions(data || []);
      setLoading(false);
    })();
  }, [requestId]);

  const byId = useMemo(() => Object.fromEntries(versions.map(v => [v.id, v])), [versions]);
  const va = pick.a ? byId[pick.a] : null;
  const vb = pick.b ? byId[pick.b] : null;

  const rows: Array<{ k: string; label: string; a?: any; b?: any }> = useMemo(() => {
    if (!va || !vb) return [];
    const keys: Array<[string, string]> = [
      ["dns_check_status", "DNS állapot"],
      ["partner_self_reported", "Partner beállítás"],
      ["dns_proof_url", "Bizonyíték URL"],
    ];
    return keys.map(([k, label]) => ({ k, label, a: (va as any)[k], b: (vb as any)[k] }));
  }, [va, vb]);

  if (loading) return <p className="text-sm text-muted-foreground">Betöltés…</p>;
  if (!versions.length) return <p className="text-sm text-muted-foreground">Még nincs verzió.</p>;

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <GitCompare className="h-3 w-3" /> Jelöld ki a két verziót az összehasonlításhoz.
      </div>
      <ScrollArea className="max-h-64 border border-foreground/20">
        <div className="divide-y divide-foreground/10">
          {versions.map(v => {
            const isA = pick.a === v.id, isB = pick.b === v.id;
            return (
              <div key={v.id} className="p-2 flex items-center gap-2 text-xs flex-wrap">
                <span className="font-mono font-bold">v{v.version_no}</span>
                <Badge variant={v.dns_check_status === "verified" ? "default" : v.dns_check_status === "failed" ? "destructive" : "secondary"} className="rounded-none uppercase text-[10px]">
                  {v.dns_check_status === "verified" ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
                  {DNS_LABEL[v.dns_check_status] || v.dns_check_status}
                </Badge>
                {v.partner_self_reported && <Badge variant="outline" className="rounded-none uppercase text-[10px]">partner</Badge>}
                {v.dns_proof_url && <FileText className="h-3 w-3" />}
                <span className="text-muted-foreground">{fmt(v.created_at)}</span>
                <div className="ml-auto flex gap-1">
                  <Button size="sm" variant={isA ? "default" : "outline"} className="rounded-none h-6 px-2 text-[10px]" onClick={() => setPick(p => ({ ...p, a: v.id }))}>A</Button>
                  <Button size="sm" variant={isB ? "default" : "outline"} className="rounded-none h-6 px-2 text-[10px]" onClick={() => setPick(p => ({ ...p, b: v.id }))}>B</Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {va && vb && (
        <Card className="rounded-none border-foreground/20 p-3 text-xs space-y-2">
          <div className="font-bold uppercase">Összehasonlítás v{va.version_no} (A) ↔ v{vb.version_no} (B)</div>
          {rows.map(r => {
            const changed = JSON.stringify(r.a) !== JSON.stringify(r.b);
            return (
              <div key={r.k} className={`grid grid-cols-3 gap-2 p-2 ${changed ? "bg-amber-50 dark:bg-amber-950/40" : "bg-muted/40"}`}>
                <div className="font-mono uppercase">{r.label}</div>
                <div className="font-mono break-all">{String(r.a ?? "—")}</div>
                <div className="font-mono break-all">{String(r.b ?? "—")}</div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
};

export default DomainProofTimeline;

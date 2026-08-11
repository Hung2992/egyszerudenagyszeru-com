import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Copy, KeyRound, Download, GraduationCap, CalendarClock, Sparkles,
  RefreshCw, ShieldAlert, History, Loader2,
} from "lucide-react";
import FulfillmentHealthPanel, { type Health } from "./FulfillmentHealthPanel";


interface Props { partnerId: string }

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("hu-HU") : "—");

type Issue = {
  severity: "error" | "warning" | "info";
  domain: string;
  action_key: string;
  title: string;
  targets: { id: string; type: string; email?: string | null }[];
};

const sevStyle: Record<string, string> = {
  error: "border-l-4 border-l-destructive",
  warning: "border-l-4 border-l-yellow-500",
  info: "border-l-4 border-l-muted-foreground",
};
const sevIcon: Record<string, string> = { error: "⛔", warning: "⚠️", info: "ℹ️" };

// A jóváhagyást igénylő (adatot módosító) AI javaslatok
const AUTO_FIXABLE: Record<string, { action: string; label: string; payload?: Record<string, unknown> }> = {
  expire_access: { action: "expire_access", label: "Lejártra állítás" },
  reset_limit: { action: "reset_limit", label: "Limit nullázása" },
  issue_certificate: { action: "issue_certificate", label: "Oklevél kiadása" },
  complete_appointment: { action: "complete_appointment", label: "Lezárás teljesítettként" },
  extend_access: { action: "extend_access", label: "+30 nap hosszabbítás", payload: { days: 30 } },
};

export default function PartnerDigitalDeliveryTab({ partnerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const [diagnosing, setDiagnosing] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [summary, setSummary] = useState("");
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [health, setHealth] = useState<Health | null>(null);


  const load = useCallback(async () => {
    setLoading(true);
    const [l, d, e, a, au] = await Promise.all([
      supabase.from("partner_license_keys").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(200),
      supabase.from("partner_download_access").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(200),
      supabase.from("partner_course_enrollments").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(200),
      supabase.from("partner_appointments").select("*").eq("partner_id", partnerId).order("starts_at", { ascending: true }).limit(200),
      supabase.from("partner_fulfillment_audit").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(100),
    ]);
    setLicenses(l.data || []);
    setDownloads(d.data || []);
    setEnrollments(e.data || []);
    setAppointments(a.data || []);
    setAuditLog(au.data || []);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => { if (partnerId) load(); }, [partnerId, load]);

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Vágólapra másolva"); };

  // Minden módosítás szerveroldalon, auditálva fut
  const run = async (action: string, payload: Record<string, unknown> = {}, key?: string) => {
    setBusy(key ?? action);
    const { data, error } = await supabase.functions.invoke("partner-fulfillment-center", {
      body: { partner_id: partnerId, action, ...payload },
    });
    setBusy(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Sikertelen művelet");
      return false;
    }
    toast.success("Kész — a művelet naplózva");
    await load();
    return true;
  };

  const diagnose = async () => {
    setDiagnosing(true);
    const { data, error } = await supabase.functions.invoke("partner-fulfillment-center", {
      body: { partner_id: partnerId, action: "diagnose" },
    });
    setDiagnosing(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Az AI diagnózis nem sikerült");
      return;
    }
    setIssues(((data as any).issues || []) as Issue[]);
    setSummary((data as any).summary || "");
    setStats((data as any).stats || null);
    setHealth((data as any).health || null);
  };


  const handleIssue = async (issue: Issue) => {
    const fix = AUTO_FIXABLE[issue.action_key];
    if (!fix) { toast.info("Ehhez nincs automatikus művelet — kezeld kézzel a füleken."); return; }
    setBusy(issue.action_key);
    let ok = 0;
    for (const t of issue.targets) {
      const { data } = await supabase.functions.invoke("partner-fulfillment-center", {
        body: { partner_id: partnerId, action: fix.action, target_id: t.id, target_type: t.type, reason: `AI: ${issue.title}`, ...(fix.payload || {}) },
      });
      if ((data as any)?.ok) ok++;
    }
    setBusy(null);
    toast.success(`${ok}/${issue.targets.length} művelet végrehajtva és naplózva`);
    await load();
    await diagnose();
  };

  const upcoming = useMemo(
    () => appointments.filter((a) => a.starts_at && new Date(a.starts_at).getTime() > Date.now() && a.status !== "cancelled"),
    [appointments],
  );

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-none" />)}</div>;

  const stat = (Icon: any, label: string, value: number | string, sub?: string) => (
    <Card className="rounded-none">
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );

  const spin = (k: string) => busy === k;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Kiszolgálási parancsnoki központ</h2>
          <p className="text-xs text-muted-foreground">Digitális · Kurzus · Szolgáltatás — minden művelet szerveroldalon, auditálva.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-none" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Frissítés
          </Button>
          <Button size="sm" className="rounded-none" onClick={diagnose} disabled={diagnosing}>
            {diagnosing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Mutasd, hol van probléma
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stat(KeyRound, "Licenckulcs", licenses.length, `${licenses.filter((l) => l.status === "active").length} aktív`)}
        {stat(Download, "Letöltés", downloads.length, `${downloads.filter((d) => d.status === "active").length} aktív`)}
        {stat(GraduationCap, "Beiratkozás", enrollments.length, `${stats?.avg_progress ?? Math.round(enrollments.reduce((s, e) => s + (e.progress_percent || 0), 0) / (enrollments.length || 1))}% átlag haladás`)}
        {stat(CalendarClock, "Időpont", appointments.length, `${upcoming.length} közelgő`)}
      </div>

      <FulfillmentHealthPanel
        partnerId={partnerId}
        health={health}
        issues={issues}
        onExecuted={async () => { await load(); await diagnose(); }}
      />



      {(summary || issues.length > 0) && (
        <Card className="rounded-none border-primary/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4" /> AI Fulfillment Assistant</div>
            {summary && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{summary}</p>}
            {issues.length === 0 && <p className="text-sm">✅ Nem találtam beavatkozást igénylő problémát.</p>}
            <div className="space-y-2">
              {issues.map((i) => (
                <div key={i.action_key} className={`p-3 bg-muted/30 flex flex-wrap items-center justify-between gap-2 ${sevStyle[i.severity]}`}>
                  <div className="text-sm">
                    <div>{sevIcon[i.severity]} {i.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.targets.slice(0, 3).map((t) => t.email || t.id.slice(0, 8)).join(", ")}
                      {i.targets.length > 3 && ` +${i.targets.length - 3}`}
                    </div>
                  </div>
                  {AUTO_FIXABLE[i.action_key] && (
                    <Button size="sm" className="rounded-none" disabled={spin(i.action_key)} onClick={() => handleIssue(i)}>
                      {spin(i.action_key) && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Kezeld — {AUTO_FIXABLE[i.action_key].label}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="licenses">
        <TabsList className="rounded-none flex-wrap h-auto">
          <TabsTrigger value="licenses" className="rounded-none">Licenckulcsok</TabsTrigger>
          <TabsTrigger value="downloads" className="rounded-none">Letöltések</TabsTrigger>
          <TabsTrigger value="courses" className="rounded-none">Kurzusok</TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-none">Időpontok</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-none">Audit napló</TabsTrigger>
        </TabsList>

        <TabsContent value="licenses" className="mt-4 space-y-2">
          {licenses.length === 0 && <p className="text-sm text-muted-foreground">Még nincs kiadott licenckulcs.</p>}
          {licenses.map((l) => (
            <Card key={l.id} className="rounded-none">
              <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-mono font-bold">{l.license_key}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.customer_email || "—"} · {l.license_type} · {l.activations}/{l.seats} aktiválás · lejár: {fmt(l.expires_at)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={l.status === "active" ? "default" : "secondary"} className="rounded-none">{l.status}</Badge>
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => copy(l.license_key)}><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" className="rounded-none" disabled={spin(`ext-${l.id}`)}
                    onClick={() => run("extend_access", { target_id: l.id, target_type: "license", days: 30 }, `ext-${l.id}`)}>+30 nap</Button>
                  <Button size="sm" variant="outline" className="rounded-none" disabled={spin(`rot-${l.id}`)}
                    onClick={() => run("rotate_license", { target_id: l.id }, `rot-${l.id}`)}>Új kulcs</Button>
                  <Button size="sm" variant="outline" className="rounded-none" disabled={spin(`rev-${l.id}`)}
                    onClick={() => run(l.status === "active" ? "revoke_license" : "reactivate_license", { target_id: l.id }, `rev-${l.id}`)}>
                    {l.status === "active" ? "Visszavonás" : "Aktiválás"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="downloads" className="mt-4 space-y-2">
          {downloads.length === 0 && <p className="text-sm text-muted-foreground">Még nincs letöltési hozzáférés.</p>}
          {downloads.map((d) => (
            <Card key={d.id} className="rounded-none">
              <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-medium">{d.file_name || "Fájl"}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.customer_email || "—"} · {d.downloads_used}/{d.download_limit ?? "∞"} letöltés · lejár: {fmt(d.expires_at)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={d.status === "active" ? "default" : "secondary"} className="rounded-none">{d.status}</Badge>
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => copy(d.token)}>Token</Button>
                  <Button size="sm" variant="outline" className="rounded-none" disabled={spin(`lim-${d.id}`)}
                    onClick={() => run("reset_limit", { target_id: d.id }, `lim-${d.id}`)}>Limit nullázása</Button>
                  <Button size="sm" variant="outline" className="rounded-none" disabled={spin(`tok-${d.id}`)}
                    onClick={() => run("rotate_token", { target_id: d.id }, `tok-${d.id}`)}>Új token</Button>
                  <Button size="sm" variant="outline" className="rounded-none" disabled={spin(`dext-${d.id}`)}
                    onClick={() => run("extend_access", { target_id: d.id, target_type: "download", days: 30 }, `dext-${d.id}`)}>+30 nap</Button>
                  <Button size="sm" variant="outline" className="rounded-none" disabled={spin(`drev-${d.id}`)}
                    onClick={() => run("revoke_download", { target_id: d.id }, `drev-${d.id}`)}>Visszavonás</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="courses" className="mt-4 space-y-2">
          {enrollments.length === 0 && <p className="text-sm text-muted-foreground">Még nincs beiratkozás.</p>}
          {enrollments.map((e) => (
            <Card key={e.id} className="rounded-none">
              <CardContent className="p-3 space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{e.customer_email || "Tanuló"}</div>
                    <div className="text-xs text-muted-foreground">
                      Hozzáférés: {fmt(e.access_until)} · utolsó aktivitás: {fmt(e.updated_at || e.created_at)} · oklevél: {e.certificate_issued ? "kiadva" : "nincs"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="number" min={0} max={100} defaultValue={e.progress_percent} className="rounded-none w-20 h-8"
                      onBlur={(ev) => {
                        const v = Math.max(0, Math.min(100, Number(ev.target.value)));
                        if (v !== e.progress_percent) run("set_progress", { target_id: e.id, progress: v }, `pr-${e.id}`);
                      }} />
                    <Button size="sm" variant="outline" className="rounded-none" disabled={spin(`cext-${e.id}`)}
                      onClick={() => run("extend_access", { target_id: e.id, target_type: "enrollment", days: 30 }, `cext-${e.id}`)}>+30 nap</Button>
                    <Button size="sm" variant="outline" className="rounded-none" disabled={e.certificate_issued || spin(`cert-${e.id}`)}
                      onClick={() => run("issue_certificate", { target_id: e.id }, `cert-${e.id}`)}>Oklevél</Button>
                  </div>
                </div>
                <Progress value={e.progress_percent ?? 0} className="h-2 rounded-none" />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="appointments" className="mt-4 space-y-2">
          {appointments.length === 0 && <p className="text-sm text-muted-foreground">Még nincs időpont.</p>}
          {appointments.map((a) => (
            <Card key={a.id} className="rounded-none">
              <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-medium">{a.customer_name || a.customer_email || "Ügyfél"}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmt(a.starts_at)} · {a.duration_min ?? "—"} perc · {a.location || "helyszín nincs megadva"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="datetime-local" className="rounded-none w-52 h-8"
                    defaultValue={a.starts_at ? new Date(a.starts_at).toISOString().slice(0, 16) : ""}
                    onBlur={(ev) => ev.target.value && run("reschedule_appointment", { target_id: a.id, starts_at: new Date(ev.target.value).toISOString() }, `rs-${a.id}`)} />
                  <Badge variant="outline" className="rounded-none">{a.status}</Badge>
                  <Button size="sm" variant="outline" className="rounded-none" disabled={spin(`ok-${a.id}`)}
                    onClick={() => run("complete_appointment", { target_id: a.id }, `ok-${a.id}`)}>Teljesítve</Button>
                  <Button size="sm" variant="outline" className="rounded-none" disabled={spin(`cx-${a.id}`)}
                    onClick={() => run("cancel_appointment", { target_id: a.id }, `cx-${a.id}`)}>Lemondás</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="audit" className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="h-4 w-4" /> A licenckulcsokat és letöltési tokeneket kizárólag a szerver generálja — minden művelet itt naplózva.
          </div>
          {auditLog.length === 0 && <p className="text-sm text-muted-foreground">Még nincs naplózott művelet.</p>}
          {auditLog.map((a) => (
            <Card key={a.id} className="rounded-none">
              <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{a.action} · {a.resource_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.customer_email || "—"} · {fmt(a.created_at)}{a.reason ? ` · ${a.reason}` : ""}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      action_id: {a.action_id?.slice(0, 8) || "—"}{a.plan_id ? ` · plan: ${a.plan_id.slice(0, 8)}` : ""} · {a.result || "success"}
                    </div>
                  </div>
                </div>
                <Badge variant={String(a.result || "success").startsWith("failed") ? "destructive" : "outline"} className="rounded-none font-mono text-[10px]">{a.resource_id?.slice(0, 8)}</Badge>

              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

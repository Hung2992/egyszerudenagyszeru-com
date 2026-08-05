import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Send, Loader2, Plus, Bot, User as UserIcon, Brain, Check, AlertTriangle, Wand2, Rocket, History, Undo2, BookOpen } from "lucide-react";

interface Props {
  partnerId: string;
  onApplied: (patch: Record<string, any>) => void;
}

interface QaCheck {
  name: string;
  squad?: string;
  weight: number;
  severity: "critical" | "high" | "low";
  ok: boolean;
  note: string;
}

interface QaSquad {
  squad: string;
  label: string;
  icon: string;
  score: number;
  benchmark: number;
  delta: number;
  failed: number;
}

interface QaDevice {
  device: string;
  width: number;
  score: number;
  ok: boolean;
  issues: string[];
}

interface QaTier {
  key: string;
  label: string;
  icon: string;
  min: number;
}

interface Msg {
  id?: string;
  role: string;
  content: string;
  agent_plan?: any[];
  patch?: Record<string, any> | null;
  applied?: boolean;
  created_at?: string;
  quality_score?: number;
  quality_passed?: boolean;
  quality_checks?: QaCheck[];
  quality_blockers?: string[];
  quality_tier?: QaTier;
  quality_squads?: QaSquad[];
  quality_devices?: QaDevice[];
  quality_device_score?: number;
  optimize_stats?: {
    clicks: number; conversions: number; ctr: number; benchmark_ctr: number;
    delta_pct: number; mobile_share: number; button_events: Record<string, number>;
  } | null;

}


const QUICK = [
  "Készíts egy prémium autóalkatrész-webshopot.",
  "Készíts egy vállalati weboldalt egy építőipari cégnek.",
  "Csinálj éttermi rendelő oldalt étlappal és kiszállítással.",
  "A fejléc legyen kisebb és a hero középre igazított.",
  "Optimalizáld a SEO-t: meta cím és leírás magyarul.",
];

const PROJECT_TYPES: { id: string; label: string }[] = [
  { id: "", label: "Automatikus" },
  { id: "webshop", label: "🛒 Webshop" },
  { id: "corporate", label: "🏢 Vállalati oldal" },
  { id: "restaurant", label: "🍽️ Éttermi rendelő" },
  { id: "booking", label: "📅 Időpontfoglaló" },
  { id: "crm", label: "📇 CRM" },
  { id: "erp", label: "📦 ERP" },
  { id: "portal", label: "🤝 Partnerportál" },
  { id: "saas", label: "☁️ SaaS" },
  { id: "mobile_backend", label: "📱 Mobil háttér" },
];

const AGENT_ICON: Record<string, string> = {
  architect: "🧠", designer: "🎨", frontend: "💻", backend: "⚙️", commerce: "🛒",
  seo: "🔍", content: "📝", media: "🖼️", qa: "🧪", deploy: "🚀",
};

interface LiveStep {
  agent: string;
  action: string;
  target?: string | null;
  kind?: string | null;
  fields?: string[];
  status: "pending" | "running" | "done" | "warn";
}

const scoreColor = (s: number) => (s >= 95 ? "text-cyan-400" : s >= 85 ? "text-emerald-500" : s >= 70 ? "text-amber-500" : "text-destructive");
const scoreBg = (s: number) => (s >= 95 ? "border-cyan-400/50 bg-cyan-400/5" : s >= 85 ? "border-emerald-500/40 bg-emerald-500/5" : s >= 70 ? "border-amber-500/40 bg-amber-500/5" : "border-destructive/40 bg-destructive/5");
const tierOf = (s: number): QaTier =>
  s >= 95 ? { key: "platinum", label: "Platinum AI Quality", icon: "💎", min: 95 }
  : s >= 85 ? { key: "premium", label: "Prémium", icon: "🟩", min: 85 }
  : s >= 70 ? { key: "good", label: "Jó", icon: "🟨", min: 70 }
  : { key: "fix", label: "Javítás szükséges", icon: "🟥", min: 0 };
const scoreLabel = (s: number) => tierOf(s).label;
const deviceIcon = (d: string) => (d === "Desktop" ? "🖥️" : d === "Tablet" ? "📲" : d === "Android" ? "🤖" : "📱");


const AiWebCreatorChat = ({ partnerId, onApplied }: Props) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [refining, setRefining] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const [autoApply, setAutoApply] = useState(true);
  const [memory, setMemory] = useState<any>(null);
  const [projectType, setProjectType] = useState("");
  const [liveSteps, setLiveSteps] = useState<LiveStep[]>([]);
  const [pmIntro, setPmIntro] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);


  const loadSessions = async () => {
    const { data } = await supabase
      .from("partner_ai_builder_sessions")
      .select("id, title, updated_at")
      .eq("partner_id", partnerId)
      .order("updated_at", { ascending: false })
      .limit(20);
    setSessions(data || []);
    if (!sessionId && data?.length) setSessionId(data[0].id);
    if (!data?.length) await newSession(false);
  };

  const loadMemory = async () => {
    const { data } = await supabase
      .from("partner_brand_memory").select("memory").eq("partner_id", partnerId).maybeSingle();
    setMemory(data?.memory ?? null);
  };

  const loadMessages = async (sid: string) => {
    const { data } = await supabase
      .from("partner_ai_builder_messages")
      .select("id, role, content, agent_plan, patch, applied, created_at")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });
    setMessages((data as Msg[]) || []);
  };

  const newSession = async (notify = true) => {
    const { data, error } = await supabase
      .from("partner_ai_builder_sessions")
      .insert({ partner_id: partnerId, title: "Új beszélgetés" })
      .select("id, title, updated_at")
      .maybeSingle();
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setSessions((s) => [data, ...s]);
      setSessionId(data.id);
      setMessages([]);
      if (notify) toast({ title: "Új beszélgetés" });
    }
  };

  useEffect(() => { void loadSessions(); void loadMemory(); /* eslint-disable-next-line */ }, [partnerId]);
  useEffect(() => { if (sessionId) void loadMessages(sessionId); }, [sessionId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !sessionId || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setSending(true);
    setLiveSteps([]);
    setPmIntro("");
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      // 1) Architect / Projektmenedzser — élő terv
      const planRes = await supabase.functions.invoke("partner-web-agent", {
        body: {
          partner_id: partnerId, session_id: sessionId, message: msg,
          stage: "plan", project_type: projectType,
        },
      });
      if (planRes.error) throw new Error(planRes.error.message);
      if (planRes.data?.error) throw new Error(planRes.data.error);

      const plan: any[] = planRes.data?.plan || [];
      setPmIntro(planRes.data?.pm_intro || "");
      setLiveSteps(
        plan.map((p, i) => ({
          agent: p.agent, action: p.task || p.action || "", target: p.target, kind: p.kind,
          status: i === 0 ? "running" : "pending",
        })),
      );

      let idx = 0;
      timer = setInterval(() => {
        setLiveSteps((s) => {
          if (!s.length) return s;
          const next = [...s];
          if (idx < next.length) next[idx] = { ...next[idx], status: "done" };
          idx += 1;
          if (idx < next.length) next[idx] = { ...next[idx], status: "running" };
          return next;
        });
      }, 1400);

      // 2) Ügynökcsapat — tényleges építés
      const { data, error } = await supabase.functions.invoke("partner-web-agent", {
        body: {
          partner_id: partnerId, session_id: sessionId, message: msg,
          stage: "build", auto_apply: autoApply, project_type: projectType,
          plan, pm_intro: planRes.data?.pm_intro,
        },
      });
      if (timer) clearInterval(timer);
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setLiveSteps([]);
      setMessages((m) => [...m, {
        role: "assistant",
        content: [planRes.data?.pm_intro, data.reply, data.pm_summary].filter(Boolean).join("\n\n"),
        agent_plan: data.agent_log || [],
        patch: data.patch,
        applied: data.applied,
        quality_score: data.quality_score,
        quality_passed: data.quality_passed,
        quality_checks: data.quality_checks,
        quality_blockers: data.quality_blockers,
        quality_tier: data.quality_tier,
        quality_squads: data.quality_squads,
        quality_devices: data.quality_devices,
        quality_device_score: data.quality_device_score,

      }]);

      if (data.applied && data.patch) {
        onApplied(data.patch);
        toast({ title: "Projekt frissítve", description: `${Object.keys(data.patch).length} beállítás módosult. Minőség: ${data.quality_score}/100` });
      } else if (data.patch && !data.applied && !data.quality_passed) {
        toast({ title: "QA elbukott", description: `Minőség: ${data.quality_score}/100. Javítsd vagy alkalmazd kézzel.`, variant: "destructive" });
      }
      void loadMemory();
      if (messages.length === 0) {
        await supabase.from("partner_ai_builder_sessions")
          .update({ title: msg.slice(0, 48) }).eq("id", sessionId);
        void loadSessions();
      }
    } catch (e: any) {
      if (timer) clearInterval(timer);
      setLiveSteps([]);
      toast({ title: "Hiba", description: e?.message || "Nem sikerült.", variant: "destructive" });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // RÉTEG 3: QA visszacsatolás — a partner kéri a javítást, az AI újrapróbálja
  const refine = async (msgIdx: number) => {
    const m = messages[msgIdx];
    if (!m?.patch || !sessionId || refining) return;
    setRefining(true);
    try {
      const failedChecks = (m.quality_checks || []).filter((c) => !c.ok);
      const feedback = {
        score: m.quality_score,
        blockers: m.quality_blockers || [],
        failed_checks: failedChecks.map((c) => ({ name: c.name, note: c.note, severity: c.severity })),
      };
      const { data, error } = await supabase.functions.invoke("partner-web-agent", {
        body: {
          partner_id: partnerId, session_id: sessionId,
          stage: "build", auto_apply: autoApply, project_type: projectType,
          refine_feedback: feedback,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setMessages((prev) => {
        const next = [...prev];
        next[msgIdx] = {
          ...m,
          patch: data.patch,
          applied: data.applied,
          quality_score: data.quality_score,
          quality_passed: data.quality_passed,
          quality_checks: data.quality_checks,
          quality_blockers: data.quality_blockers,
          quality_tier: data.quality_tier,
          quality_squads: data.quality_squads,
          quality_devices: data.quality_devices,
          quality_device_score: data.quality_device_score,

          agent_plan: data.agent_log || m.agent_plan,
        };
        return next;
      });
      if (data.applied && data.patch) {
        onApplied(data.patch);
        toast({ title: "Javítva és alkalmazva", description: `Minőség: ${data.quality_score}/100` });
      } else if (data.quality_passed && data.patch) {
        toast({ title: "Javítva", description: `Minőség: ${data.quality_score}/100. Alkalmazd a gombbal.` });
      } else {
        toast({ title: "További javítás kell", description: `Minőség: ${data.quality_score}/100`, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Javítás sikertelen", description: e?.message, variant: "destructive" });
    } finally {
      setRefining(false);
      inputRef.current?.focus();
    }
  };

  // 🚀 AI OPTIMALIZÁLÓ — publikálás utáni élő teljesítmény alapján új verzió (jóváhagyással)
  const optimize = async () => {
    if (!sessionId || optimizing) return;
    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-web-agent", {
        body: { partner_id: partnerId, session_id: sessionId, stage: "optimize", project_type: projectType },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.reply,
        agent_plan: data.agent_log,
        patch: data.patch,
        applied: false,
        quality_score: data.quality_score,
        quality_passed: data.quality_passed,
        quality_checks: data.quality_checks,
        quality_blockers: data.quality_blockers,
        quality_tier: data.quality_tier,
        quality_squads: data.quality_squads,
        quality_devices: data.quality_devices,
        quality_device_score: data.quality_device_score,
        optimize_stats: data.optimize_stats,
      }]);
      toast({
        title: "AI Optimalizáló javaslat kész",
        description: `Minőség: ${data.quality_score}/100 — a változás jóváhagyásra vár.`,
      });
    } catch (e: any) {
      toast({ title: "Optimalizálás sikertelen", description: e?.message, variant: "destructive" });
    } finally {
      setOptimizing(false);
    }
  };


  const applyPatch = async (patch: Record<string, any>) => {
    const { data: existing } = await supabase
      .from("partner_storefronts").select("id").eq("partner_id", partnerId).maybeSingle();
    const res = existing?.id
      ? await supabase.from("partner_storefronts").update(patch).eq("id", existing.id)
      : await supabase.from("partner_storefronts").insert({ partner_id: partnerId, ...patch });
    if (res.error) { toast({ title: "Mentés sikertelen", description: res.error.message, variant: "destructive" }); return; }
    onApplied(patch);
    toast({ title: "Alkalmazva" });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      {/* Beszélgetések */}
      <div className="space-y-2">
        <Button onClick={() => newSession()} variant="outline" className="rounded-none w-full">
          <Plus className="h-4 w-4 mr-2" /> Új beszélgetés
        </Button>
        <div className="space-y-1 max-h-[280px] overflow-auto">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSessionId(s.id)}
              className={`w-full text-left text-xs px-3 py-2 border transition-colors ${
                s.id === sessionId ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
        {memory && (
          <Card className="rounded-none border-border p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium"><Brain className="h-3.5 w-3.5" /> Márka-memória</div>
            {Object.entries(memory).slice(0, 6).map(([k, v]) => (
              <div key={k} className="text-[11px] text-muted-foreground truncate">
                <span className="uppercase">{k}</span>: {Array.isArray(v) ? v.join(", ") : String(v)}
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Chat */}
      <Card className="rounded-none border-border flex flex-col h-[620px]">
        <div className="border-b border-border p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="font-heading text-sm">AI fejlesztőcsapat — beszélj, és megépíti</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="h-8 border border-border bg-background text-xs px-2"
              aria-label="Projekt típusa"
            >
              {PROJECT_TYPES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Switch id="autoapply" checked={autoApply} onCheckedChange={setAutoApply} />
              <Label htmlFor="autoapply" className="text-xs text-muted-foreground">Automatikus alkalmazás</Label>
            </div>
            <Button
              type="button" size="sm" variant="outline"
              className="rounded-none h-8 text-xs ml-auto"
              onClick={optimize} disabled={optimizing || sending}
            >
              {optimizing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Rocket className="h-3 w-3 mr-1" />}
              AI Optimalizáló
            </Button>

          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Írd le magyarul, mit szeretnél — nem csak webshopot: vállalati oldalt, éttermi rendelőt, időpontfoglalót, CRM-et, ERP-t,
                partnerportált vagy SaaS-t is. Az Architect kiosztja a feladatokat, a Designer / Frontend / Backend / Commerce / SEO /
                Content / Media / QA / Deploy ügynökök pedig élőben dolgoznak. Minden kimenet QA-validált (pontszám 0–100).
              </p>

              <div className="flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => void send(q)}
                    className="text-xs border border-border px-2 py-1 text-muted-foreground hover:text-foreground hover:border-primary text-left">
                    {q.slice(0, 52)}…
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={m.id || i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role !== "user" && <Bot className="h-4 w-4 mt-1 text-primary shrink-0" />}
              <div className={`max-w-[80%] space-y-2 ${m.role === "user" ? "text-right" : ""}`}>
                <div className={m.role === "user"
                  ? "inline-block bg-primary text-primary-foreground px-3 py-2 text-sm text-left"
                  : "text-sm whitespace-pre-wrap"}>
                  {m.content}
                </div>

                {!!m.agent_plan?.length && (
                  <div className="border border-border divide-y divide-border text-left">
                    {m.agent_plan.map((a: any, idx: number) => (
                      <div key={idx} className="px-2 py-1.5 flex items-start gap-2">
                        <span className="text-[11px]">{AGENT_ICON[a.agent] || "🤖"}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-medium capitalize">
                            {a.agent}
                            {a.target ? <span className="text-muted-foreground font-normal"> → {String(a.target).slice(0, 40)}</span> : null}
                          </div>
                          {a.action && <div className="text-[11px] text-muted-foreground">{String(a.action).slice(0, 140)}</div>}
                          {!!a.fields?.length && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {a.fields.slice(0, 6).map((f: string) => (
                                <span key={f} className="text-[9px] border border-border px-1 text-muted-foreground">{f}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] shrink-0 ${a.status === "warn" ? "text-destructive" : a.status === "pending" ? "text-muted-foreground" : "text-primary"}`}>
                          {a.status === "pending" ? "vár" : a.status === "warn" ? "figyelem" : "kész"}
                        </span>
                      </div>
                    ))}
                    <div className="px-2 py-1 text-[10px] text-muted-foreground">🛰️ Agent Bus: partner.site.updated</div>
                  </div>
                )}


                {m.patch && Object.keys(m.patch).length > 0 && (
                  <div className="border border-border p-2 space-y-2 text-left">
                    {/* 🚀 AI OPTIMALIZÁLÓ — élő teljesítmény */}
                    {m.optimize_stats && (
                      <div className="border border-primary/40 bg-primary/5 px-2 py-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Rocket className="h-3.5 w-3.5 text-primary" /> AI Optimalizáló — 30 napos élő adat
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                          <span>Kattintás: <span className="text-foreground">{m.optimize_stats.clicks}</span></span>
                          <span>Konverzió: <span className="text-foreground">{m.optimize_stats.conversions}</span></span>
                          <span>CTR: <span className={m.optimize_stats.delta_pct >= 0 ? "text-emerald-500" : "text-destructive"}>{m.optimize_stats.ctr}%</span> (benchmark {m.optimize_stats.benchmark_ctr}%)</span>
                          <span>Mobil arány: <span className="text-foreground">{m.optimize_stats.mobile_share}%</span></span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          A hero CTR-je {Math.abs(m.optimize_stats.delta_pct)}%-kal {m.optimize_stats.delta_pct >= 0 ? "jobb" : "gyengébb"} az átlagosnál — az új verzió jóváhagyásra vár.
                        </p>
                      </div>
                    )}

                    {/* MINŐSÉGI PONTSZÁM + QA ELLENŐRZÉSEK */}

                    {typeof m.quality_score === "number" && (
                      <div className={`border ${scoreBg(m.quality_score)} px-2 py-2 space-y-2`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {m.quality_passed ? <Check className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                            <span className="text-xs font-medium">Minőségi pontszám</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-heading text-lg font-bold ${scoreColor(m.quality_score)}`}>{m.quality_score}<span className="text-xs font-normal text-muted-foreground">/100</span></span>
                            <span className={`text-[10px] border px-1.5 py-0.5 ${scoreColor(m.quality_score)} border-current`}>
                              {(m.quality_tier?.icon ?? tierOf(m.quality_score).icon)} {(m.quality_tier?.label ?? scoreLabel(m.quality_score))}
                            </span>
                          </div>
                        </div>

                        {/* QA ÜGYNÖKÖK + BENCHMARK */}
                        {!!m.quality_squads?.length && (
                          <div className="grid gap-1 border-t border-border/40 pt-1.5">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">QA ügynökök · benchmark</div>
                            {m.quality_squads.map((sq) => (
                              <div key={sq.squad} className="flex items-center gap-2 text-[10px]">
                                <span className="w-28 shrink-0 truncate">{sq.icon} {sq.label}</span>
                                <div className="relative h-1.5 flex-1 bg-muted">
                                  <div
                                    className={`h-full ${sq.score >= 95 ? "bg-cyan-400" : sq.score >= 85 ? "bg-emerald-500" : sq.score >= 70 ? "bg-amber-500" : "bg-destructive"}`}
                                    style={{ width: `${Math.max(2, sq.score)}%` }}
                                  />
                                  <div className="absolute top-[-2px] h-2.5 w-px bg-foreground/60" style={{ left: `${sq.benchmark}%` }} title={`Benchmark: ${sq.benchmark}`} />
                                </div>
                                <span className={`w-8 shrink-0 text-right ${scoreColor(sq.score)}`}>{sq.score}</span>
                                <span className={`w-9 shrink-0 text-right ${sq.delta >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                                  {sq.delta >= 0 ? "+" : ""}{sq.delta}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* VALÓDI ESZKÖZTESZT */}
                        {!!m.quality_devices?.length && (
                          <div className="border-t border-border/40 pt-1.5 space-y-1">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Eszközteszt {typeof m.quality_device_score === "number" && `— ${m.quality_device_score}/100`}
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              {m.quality_devices.map((d) => (
                                <div key={d.device} className={`border px-1.5 py-1 text-[10px] ${d.ok ? "border-emerald-500/30" : "border-amber-500/40"}`}>
                                  <div className="flex items-center justify-between">
                                    <span>{deviceIcon(d.device)} {d.device} <span className="text-muted-foreground">{d.width}px</span></span>
                                    <span className={scoreColor(d.score)}>{d.score}</span>
                                  </div>
                                  {!d.ok && (
                                    <ul className="mt-0.5 text-muted-foreground">
                                      {d.issues.slice(0, 3).map((i, ii) => <li key={ii}>• {i}</li>)}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!!m.quality_checks?.length && (
                          <div className="grid gap-1 border-t border-border/40 pt-1.5">
                            {m.quality_checks.map((c, ci) => (
                              <div key={ci} className="flex items-start gap-1.5 text-[10px]">
                                <span className={c.ok ? "text-emerald-500" : c.severity === "critical" ? "text-destructive" : "text-amber-500"}>
                                  {c.ok ? "✓" : c.severity === "critical" ? "✗" : "⚠"}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className={c.ok ? "text-muted-foreground" : "text-foreground font-medium"}>{c.name}</span>
                                  <span className="text-muted-foreground"> — {c.note}</span>
                                </div>
                                <span className={`shrink-0 px-1 ${c.severity === "critical" ? "text-destructive" : c.severity === "high" ? "text-amber-500" : "text-muted-foreground"}`}>
                                  {c.severity === "critical" ? "kritikus" : c.severity === "high" ? "fontos" : "apró"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {!m.quality_passed && !!m.quality_blockers?.length && (
                          <div className="text-[10px] text-destructive border-t border-destructive/20 pt-1">
                            Blokkolók: {m.quality_blockers.join(", ")}
                          </div>
                        )}

                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {Object.keys(m.patch).slice(0, 12).map((k) => (
                        <span key={k} className="text-[10px] border border-border px-1.5 py-0.5 text-muted-foreground">{k}</span>
                      ))}
                    </div>

                    {m.applied ? (
                      <div className="flex items-center gap-1 text-[11px] text-primary"><Check className="h-3 w-3" /> Alkalmazva a webshopra</div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="rounded-none h-7 text-xs"
                          onClick={() => applyPatch(m.patch!)}>
                          Alkalmazom
                        </Button>
                        {!m.quality_passed && (
                          <Button size="sm" variant="outline" className="rounded-none h-7 text-xs"
                            disabled={refining}
                            onClick={() => void refine(i)}>
                            {refining ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                            AI javítása
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {m.role === "user" && <UserIcon className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />}
            </div>
          ))}

          {sending && (
            <div className="space-y-2">
              {pmIntro && (
                <div className="text-sm flex gap-2"><span>🧠</span><span>{pmIntro}</span></div>
              )}
              {liveSteps.length > 0 ? (
                <div className="border border-border divide-y divide-border">
                  {liveSteps.map((s, i) => (
                    <div key={i} className="px-2 py-1.5 flex items-start gap-2">
                      <span className="text-[11px]">{AGENT_ICON[s.agent] || "🤖"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium capitalize">
                          {s.agent}
                          {s.target ? <span className="text-muted-foreground font-normal"> → {String(s.target).slice(0, 40)}</span> : null}
                        </div>
                        {s.action && <div className="text-[11px] text-muted-foreground">{s.action}</div>}
                      </div>
                      <span className="text-[10px] shrink-0">
                        {s.status === "running" ? <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          : s.status === "done" ? <Check className="h-3 w-3 text-primary" />
                          : <span className="text-muted-foreground">vár</span>}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> 🧠 Architect tervezi a projektet…
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3 flex gap-2">
          <Textarea
            ref={inputRef}
            rows={2}
            className="rounded-none resize-none"
            placeholder="Pl.: Készíts luxus ékszer webshopot fekete-arany dizájnnal…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          />
          <Button onClick={() => void send()} disabled={sending || !input.trim()} className="rounded-none self-end">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AiWebCreatorChat;

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Send, Loader2, Plus, Bot, User as UserIcon, Brain, Check } from "lucide-react";

interface Props {
  partnerId: string;
  onApplied: (patch: Record<string, any>) => void;
}

interface Msg {
  id?: string;
  role: string;
  content: string;
  agent_plan?: any[];
  patch?: Record<string, any> | null;
  applied?: boolean;
  created_at?: string;
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

const AiWebCreatorChat = ({ partnerId, onApplied }: Props) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
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

      // Lépések élő „haladása”, amíg a csapat dolgozik
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
      }]);

      if (data.applied && data.patch) {
        onApplied(data.patch);
        toast({ title: "Projekt frissítve", description: `${Object.keys(data.patch).length} beállítás módosult.` });
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
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Írd le magyarul, mit szeretnél — nem csak webshopot: vállalati oldalt, éttermi rendelőt, időpontfoglalót, CRM-et, ERP-t,
                partnerportált vagy SaaS-t is. Az Architect kiosztja a feladatokat, a Designer / Frontend / Backend / Commerce / SEO /
                Content / Media / QA / Deploy ügynökök pedig élőben dolgoznak — és látod, ki mit módosít.
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
                  <div className="flex flex-wrap gap-1">
                    {m.agent_plan.map((a: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="rounded-none text-[10px]">
                        {a.agent}{a.action ? `: ${String(a.action).slice(0, 40)}` : ""}
                      </Badge>
                    ))}
                  </div>
                )}

                {m.patch && Object.keys(m.patch).length > 0 && (
                  <div className="border border-border p-2 space-y-2 text-left">
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(m.patch).slice(0, 12).map((k) => (
                        <span key={k} className="text-[10px] border border-border px-1.5 py-0.5 text-muted-foreground">{k}</span>
                      ))}
                    </div>
                    {m.applied ? (
                      <div className="flex items-center gap-1 text-[11px] text-primary"><Check className="h-3 w-3" /> Alkalmazva a webshopra</div>
                    ) : (
                      <Button size="sm" variant="outline" className="rounded-none h-7 text-xs"
                        onClick={() => applyPatch(m.patch!)}>Alkalmazom</Button>
                    )}
                  </div>
                )}
              </div>
              {m.role === "user" && <UserIcon className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />}
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Az ügynökcsapat dolgozik…
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

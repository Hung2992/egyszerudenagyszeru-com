import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Mic, MicOff, Send, Volume2, VolumeX, Trash2, Network, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkforceTeamPanel } from "@/components/admin/WorkforceTeamPanel";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { departments } from "@/lib/ai-world";

type Msg = { role: "user" | "assistant"; content: string };
const KEY = (id: string) => `wf-assistant-${id}`;
const load = (id: string): Msg[] => { try { return JSON.parse(localStorage.getItem(KEY(id)) || "[]"); } catch { return []; } };

const AiAssistantChat = () => {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();
  const { deptId } = useParams();
  const dept = departments.find((d) => d.id === deptId);

  const [msgs, setMsgs] = useState<Msg[]>(() => (dept ? load(dept.id) : []));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [shareDraft, setShareDraft] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const rec = useRef<any>(null);

  useEffect(() => { if (!loading && !isAdmin) navigate("/"); }, [loading, isAdmin, navigate]);
  useEffect(() => { if (!loading && isAdmin && !dept) navigate("/admin/ai-asszisztensek"); }, [loading, isAdmin, dept, navigate]);
  useEffect(() => { if (dept) { localStorage.setItem(KEY(dept.id), JSON.stringify(msgs)); end.current?.scrollIntoView({ behavior: "smooth" }); } }, [msgs, dept]);
  useEffect(() => { if (!busy) ta.current?.focus(); }, [busy]);

  if (loading || !isAdmin || !dept) return null;

  const say = (t: string) => {
    if (!speak || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(t.replace(/[#*_`>|-]/g, " ")); u.lang = "hu-HU";
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  };

  const send = async (text: string) => {
    const t = text.trim(); if (!t || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(next); setInput(""); setBusy(true); setErr("");
    try {
      const { data: s } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workforce-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ departmentId: dept.id, department: dept.name, roles: dept.roles, messages: next.filter(m => m.content.trim()).slice(-30) }),
      });
      if (!r.ok || !r.body) throw new Error((await r.json().catch(() => ({}))).error || "Hiba történt");
      const reader = r.body.getReader(); const dec = new TextDecoder();
      let buf = "", out = "";
      setMsgs([...next, { role: "assistant", content: "" }]);
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const l of lines) {
          if (!l.startsWith("data: ") || l.includes("[DONE]")) continue;
          let frame;
          try { frame = JSON.parse(l.slice(6)); } catch { continue; }
          if (frame.error) throw new Error("Az AI válasza megszakadt. Próbáld újra később.");
          const d = frame.choices?.[0]?.delta?.content; if (d) { out += d; setMsgs([...next, { role: "assistant", content: out }]); }
        }
      }
      say(out);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setErr("Ez a böngésző nem támogatja a hangfelismerést."); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new SR(); r.lang = "hu-HU"; r.interimResults = false;
    r.onresult = (e: any) => { setSpeak(true); send(e.results[0][0].transcript); };
    r.onend = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Link to="/admin/ai-asszisztensek" aria-label="Vissza"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="h-9 w-9 flex items-center justify-center bg-primary text-primary-foreground font-mono text-sm">{dept.id}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display">{dept.name} asszisztens</div>
          <div className="text-[11px] text-muted-foreground truncate">{dept.roles.join(" · ")}</div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => { setSpeak(!speak); window.speechSynthesis?.cancel(); }} aria-label="Felolvasás" title="Felolvasás">{speak ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}</Button>
        <Button size="icon" variant="ghost" onClick={() => setMsgs([])} aria-label="Új beszélgetés" title="Új beszélgetés"><Trash2 className="h-4 w-4" /></Button>
      </header>
      <Button variant="secondary" className="rounded-none justify-start shrink-0" onClick={() => setTeamOpen(!teamOpen)} aria-expanded={teamOpen}><Network />{teamOpen ? "Beszélgetéshez vissza" : "Csapat · közös adatok és átadások"}</Button>
      <div className="flex-1 overflow-y-auto min-h-0">
      {teamOpen && <WorkforceTeamPanel departmentId={dept.id} draft={shareDraft} />}
      <div className="p-4 space-y-4">
        {!msgs.length && <p className="text-sm text-muted-foreground">{dept.name} · munkák, csapatadatok, átadások</p>}
        {msgs.map((m, i) => m.role === "user"
          ? <div key={i} className="ml-auto max-w-[85%] w-fit bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap">{m.content}</div>
          : <div key={i} className="space-y-2"><div className="prose prose-sm prose-invert max-w-none text-sm break-words"><ReactMarkdown>{m.content || "…"}</ReactMarkdown></div>{m.content && !busy && <Button size="sm" variant="ghost" className="rounded-none" onClick={() => { setShareDraft(m.content); setTeamOpen(true); }}><Share2 />Átadás / közös adat</Button>}</div>)}
        {busy && msgs[msgs.length - 1]?.role === "user" && <div className="text-sm text-muted-foreground animate-pulse">gépel…</div>}
        {err && <div className="text-sm text-destructive">{err}</div>}
        <div ref={end} />
      </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 p-3 pr-20 border-t border-border">
        <Button type="button" size="icon" variant={listening ? "destructive" : "outline"} onClick={toggleMic} aria-label="Mikrofon" className="rounded-none shrink-0">{listening ? <MicOff /> : <Mic />}</Button>
        <textarea ref={ta} value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Írj üzenetet…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          className="flex-1 min-w-0 resize-none bg-muted px-3 py-2 text-sm outline-none" />
        <Button size="icon" type="submit" disabled={busy || !input.trim()} aria-label="Küldés" className="rounded-none shrink-0"><Send /></Button>
      </form>
    </div>
  );
};

export default AiAssistantChat;

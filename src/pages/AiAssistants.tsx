import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Mic, MicOff, Send, Volume2, VolumeX, Trash2 } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { departments } from "@/lib/ai-world";

type Msg = { role: "user" | "assistant"; content: string };
const KEY = (id: string) => `wf-assistant-${id}`;
const load = (id: string): Msg[] => { try { return JSON.parse(localStorage.getItem(KEY(id)) || "[]"); } catch { return []; } };

const AiAssistants = () => {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();
  const { deptId } = useParams();
  useEffect(() => { if (!loading && !isAdmin) navigate("/"); }, [loading, isAdmin, navigate]);
  if (loading || !isAdmin) return null;
  const dept = departments.find((d) => d.id === deptId);
  return (
    <div className="flex h-[100dvh] bg-background text-foreground">
      <aside className={`${dept ? "hidden md:flex" : "flex"} w-full md:w-72 flex-col border-r border-border`}>
        <div className="p-4 border-b border-border">
          <Link to="/admin/ai-workforce" className="flex items-center gap-2 text-xs text-muted-foreground"><ArrowLeft className="h-3 w-3" /> AI WORKFORCE</Link>
          <h1 className="mt-2 font-display text-lg">AI asszisztensek</h1>
          <p className="text-xs text-muted-foreground">{departments.length} sziget · AEGIS őr alatt</p>
        </div>
        <nav className="flex-1 overflow-y-auto">
          {departments.map((d) => (
            <Link key={d.id} to={`/admin/ai-asszisztensek/${d.id}`}
              className={`block px-4 py-3 border-b border-border text-sm hover:bg-muted ${d.id === deptId ? "bg-muted border-l-2 border-l-primary" : ""}`}>
              <span className="text-primary font-mono mr-2">{d.id}</span>{d.name}
              <div className="text-[11px] text-muted-foreground truncate">{d.roles.slice(0, 3).join(", ")}</div>
            </Link>
          ))}
        </nav>
      </aside>
      {dept ? <Chat key={dept.id} dept={dept} /> : (
        <main className="hidden md:flex flex-1 items-center justify-center text-muted-foreground text-sm">Válassz egy munkatársat a listából.</main>
      )}
    </div>
  );
};

function Chat({ dept }: { dept: (typeof departments)[number] }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => load(dept.id));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const rec = useRef<any>(null);
  useEffect(() => { localStorage.setItem(KEY(dept.id), JSON.stringify(msgs)); end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, dept.id]);
  useEffect(() => { if (!busy) ta.current?.focus(); }, [busy]);

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
        body: JSON.stringify({ department: dept.name, roles: dept.roles, messages: next }),
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
          try { const d = JSON.parse(l.slice(6)).choices?.[0]?.delta?.content; if (d) { out += d; setMsgs([...next, { role: "assistant", content: out }]); } } catch { /* partial */ }
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
    <main className="flex flex-1 flex-col min-w-0">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Link to="/admin/ai-asszisztensek" className="md:hidden"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="h-9 w-9 flex items-center justify-center bg-primary text-primary-foreground font-mono text-sm">{dept.id}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display">{dept.name} asszisztens</div>
          <div className="text-[11px] text-muted-foreground truncate">{dept.roles.join(" · ")}</div>
        </div>
        <button onClick={() => { setSpeak(!speak); speechSynthesis?.cancel(); }} aria-label="Felolvasás" className="p-2 hover:bg-muted">{speak ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}</button>
        <button onClick={() => setMsgs([])} aria-label="Új beszélgetés" className="p-2 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!msgs.length && <p className="text-sm text-muted-foreground">Kérdezd a {dept.name.toLowerCase()} munkáiról, lépéseiről, határidőkről. Írhatsz vagy beszélhetsz is (mikrofon gomb).</p>}
        {msgs.map((m, i) => m.role === "user"
          ? <div key={i} className="ml-auto max-w-[85%] w-fit bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap">{m.content}</div>
          : <div key={i} className="prose prose-sm prose-invert max-w-none text-sm"><ReactMarkdown>{m.content || "…"}</ReactMarkdown></div>)}
        {busy && msgs[msgs.length - 1]?.role === "user" && <div className="text-sm text-muted-foreground animate-pulse">gépel…</div>}
        {err && <div className="text-sm text-destructive">{err}</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 p-3 border-t border-border">
        <button type="button" onClick={toggleMic} aria-label="Mikrofon" className={`p-3 border border-border ${listening ? "bg-destructive text-destructive-foreground" : ""}`}>{listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
        <textarea ref={ta} value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Írj üzenetet…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          className="flex-1 resize-none bg-muted px-3 py-2 text-sm outline-none" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Küldés" className="p-3 bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </form>
    </main>
  );
}
export default AiAssistants;

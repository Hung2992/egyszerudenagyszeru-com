// 🤖 Drop Copilot — admin chat asszisztens drop-tervezéshez
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Tervezek egy új fekete sneaker dropot. Mennyi darabbal induljak?",
  "Mikor érdemes elindítani a következő dropot?",
  "Mi működött a legjobban az utolsó dropokban?",
  "Raffle vagy first-come lenne jobb a következőre?",
];

export default function DropCopilotPanel({ focusDropId }: { focusDropId?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("drop-copilot", {
        body: { messages: next, focus_drop_id: focusDropId ?? null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const reply = (data as any)?.reply ?? "Nincs válasz.";
      setMessages([...next, { role: "assistant", content: reply }]);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }), 50);
    } catch (e: any) {
      toast.error(e?.message ?? "Nem sikerült válaszolni");
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setMessages([]); setInput(""); };

  return (
    <Card className="p-4 border-primary/40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-bold uppercase tracking-widest text-sm">Drop Copilot</h3>
          <span className="text-[10px] px-2 py-0.5 border uppercase tracking-widest">AI</span>
        </div>
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" onClick={reset}>
            <RotateCcw className="h-3 w-3 mr-1" />Új
          </Button>
        )}
      </div>

      {messages.length === 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs text-muted-foreground">Kérdezz bármit a drop-tervezésről. Az adatod alapján válaszolok.</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                className="text-xs border px-3 py-1.5 hover:bg-muted transition text-left"
              >{s}</button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-[400px] overflow-y-auto space-y-3 mb-3 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={`max-w-[85%] px-3 py-2 text-sm ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-2 dark:prose-invert">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Copilot gondolkodik...
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Kérdezd a Copilotot... (pl. Mennyi készlettel induljak?)"
          rows={2}
          disabled={loading}
          className="resize-none"
        />
        <Button onClick={() => send()} disabled={loading || !input.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}

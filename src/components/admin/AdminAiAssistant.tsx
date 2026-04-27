import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, X, Loader2, Sparkles, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/untyped-client";

type Msg = {
  role: "user" | "assistant";
  content: string;
  reflectionId?: string;
  feedbackGiven?: 1 | -1;
  strategyId?: string;
  strategyName?: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;

const QUICK_PROMPTS = [
  "Szia! Mi a helyzet? 👋",
  "Mit javasolsz most?",
  "Mai profit & teendők",
  "Mire figyeljek ma?",
  "Beszélgessünk egy kicsit",
  "Adj egy üzleti tippet",
];

const AdminAiAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    const updateAssistant = (content: string) => {
      assistantSoFar += content;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Nincs bejelentkezve – jelentkezz be admin fiókkal.");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Hiba történt" }));
        toast({ title: "AI Hiba", description: errData.error || `Hiba: ${resp.status}`, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // 🧬 Stratégia ID a header-ben (evolúciós tanuláshoz)
      const strategyId = resp.headers.get("x-ai-strategy-id") || undefined;
      const strategyName = resp.headers.get("x-ai-strategy-name") || undefined;

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      toast({ title: "Hiba", description: err.message || "AI kapcsolódási hiba", variant: "destructive" });
    } finally {
      setIsLoading(false);

      // 🧠 ÖNTANULÁS: háttérben kinyerjük és lementjük a tartós tudást a RAG-ba
      if (assistantSoFar.length > 50) {
        supabase.functions.invoke("ai-self-learn", {
          body: { userMessage: text.trim(), assistantMessage: assistantSoFar },
        }).then(({ data }) => {
          // 🌌 META-KONSZOLIDÁCIÓ: minden 5. új tanulás után átszervezi a tudást
          if (data?.learned) {
            const key = "ai_learn_counter";
            const count = parseInt(localStorage.getItem(key) || "0", 10) + 1;
            localStorage.setItem(key, String(count));
            if (count % 5 === 0) {
              supabase.functions.invoke("ai-knowledge-consolidate", { body: {} })
                .catch(() => { /* háttérben, csendben */ });
            }
          }
        }).catch(() => { /* csendben hibatűrő */ });

        // 🪞 REFLEXIÓ: az AI kiértékeli a saját válaszát és tanul belőle
        supabase.functions.invoke("ai-self-reflect", {
          body: {
            user_question: text.trim(),
            ai_response: assistantSoFar,
          },
        }).then(({ data }) => {
          if (data?.reflection_id) {
            // hozzáfűzöm a reflexió ID-t az utolsó asszisztens üzenethez (👍/👎-hoz)
            setMessages(prev => prev.map((m, i) =>
              i === prev.length - 1 && m.role === "assistant"
                ? { ...m, reflectionId: data.reflection_id }
                : m
            ));
          }
        }).catch(() => { /* csendben */ });
      }
    }
  };

  const sendFeedback = async (msgIdx: number, rating: 1 | -1) => {
    const msg = messages[msgIdx];
    if (!msg?.reflectionId || msg.feedbackGiven) return;
    setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, feedbackGiven: rating } : m));
    try {
      await supabase.from("ai_response_feedback" as any).insert({
        reflection_id: msg.reflectionId,
        rating,
      });
      toast({
        title: rating === 1 ? "Köszi! 💙" : "Köszi a visszajelzést",
        description: rating === 1 ? "Megjegyzem, hogy ez segített." : "Tanulok belőle, legközelebb jobb leszek.",
      });
    } catch {
      // csendben
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-2xl hover:scale-110 hover:shadow-primary/50 transition-all duration-300 border-2 border-primary/30 group"
        title="AI Partnered & Barátod"
      >
        <Bot className="w-7 h-7 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-card border border-border shadow-2xl flex flex-col rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 via-accent/30 to-primary/10">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wide">Partnered & Barátod</span>
            <span className="text-[10px] text-muted-foreground">Mindig itt vagyok neked 💙</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMessages([])} title="Törlés">
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center space-y-4 py-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Szia! Itt vagyok 💙</p>
              <p className="text-xs text-muted-foreground px-4">
                Partnered, barátod és jobbkezed egyben. Beszélgessünk, vagy mondd el mire van szükséged!
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center px-2">
              {QUICK_PROMPTS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-[11px] border border-border rounded-full px-3 py-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[90%] text-xs px-3 py-2 ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                  : "bg-muted text-foreground border border-border"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-xs prose-invert max-w-none [&_table]:text-[10px] [&_table]:w-full [&_th]:px-1 [&_th]:py-0.5 [&_td]:px-1 [&_td]:py-0.5 [&_th]:text-left [&_th]:border-b [&_th]:border-border [&_td]:border-b [&_td]:border-border/50 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_h2]:text-xs [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:mt-1 [&_h3]:mb-0.5 [&_strong]:text-primary">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
            {m.role === "assistant" && m.reflectionId && (
              <div className="flex gap-1 mt-1 ml-1">
                <button
                  onClick={() => sendFeedback(i, 1)}
                  disabled={!!m.feedbackGiven}
                  className={`p-1 rounded hover:bg-muted transition-colors ${m.feedbackGiven === 1 ? "text-green-500" : "text-muted-foreground"} disabled:opacity-50`}
                  title="Hasznos volt"
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => sendFeedback(i, -1)}
                  disabled={!!m.feedbackGiven}
                  className={`p-1 rounded hover:bg-muted transition-colors ${m.feedbackGiven === -1 ? "text-red-500" : "text-muted-foreground"} disabled:opacity-50`}
                  title="Nem volt jó"
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-muted border border-border px-3 py-2 text-xs flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-muted-foreground">Gondolkodom...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 flex gap-2">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          placeholder="Írj nekem bármit... 💙"
          rows={1}
          className="flex-1 text-xs resize-none min-h-[36px] max-h-[80px]"
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="h-9 w-9 rounded-none shrink-0"
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default AdminAiAssistant;

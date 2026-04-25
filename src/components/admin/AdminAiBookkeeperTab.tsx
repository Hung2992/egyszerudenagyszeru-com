import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Sparkles,
  Send,
  Calculator,
  FileSpreadsheet,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Banknote,
  Brain,
  Loader2,
  Trash2,
  Copy,
  Bot,
  User as UserIcon,
  ShieldCheck,
  Percent,
  FileDown,
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; ts: number };

const QUICK_PROMPTS: { icon: any; label: string; prompt: string }[] = [
  {
    icon: Receipt,
    label: "Havi ÁFA összesítő",
    prompt:
      "Készíts részletes havi ÁFA összesítőt: bruttó bevétel, nettó bevétel, fizetendő ÁFA bontásban (27%, 18%, 5%, AAM), és add meg a NAV bevallás kitöltéséhez szükséges sorokat.",
  },
  {
    icon: TrendingUp,
    label: "Eredménykimutatás",
    prompt:
      "Csinálj egyszerűsített eredménykimutatást: bevételek, közvetlen önköltség (COGS), bruttó nyereség, árrés %, becsült működési költségek, adózás előtti eredmény. Magyar számviteli stílusban.",
  },
  {
    icon: Banknote,
    label: "Cash flow előrejelzés",
    prompt:
      "Készíts 30/60/90 napos cash flow előrejelzést: várható bejövő pénz (függő rendelések), kifizetendő beszerzések, nettó cash pozíció, és figyelmeztess a likviditási kockázatokra.",
  },
  {
    icon: AlertTriangle,
    label: "Anomália / hibakeresés",
    prompt:
      "Nézd át a könyvelési adatokat és keress anomáliákat: gyanúsan magas/alacsony árrés, kifizetetlen régi számlák, rendelés-beszerzés eltérések, hiányzó dokumentumok. Listázd kockázat szerint.",
  },
  {
    icon: FileSpreadsheet,
    label: "Naplófőkönyv tételek",
    prompt:
      "Az utolsó 10 rendeléshez generálj javasolt könyvelési naplótételeket (T/K számlaszám-osztályokkal, magyar kontírozási standard szerint: 311, 466, 91, 814).",
  },
  {
    icon: Percent,
    label: "Árrés és nyereség elemzés",
    prompt:
      "Bontsd le termékenként és beszállítónként a nyereségességet. Melyik 5 termék hozza a legtöbb profitot, és melyik 5 a veszteséges? Adj konkrét cselekvési javaslatot.",
  },
  {
    icon: ShieldCheck,
    label: "Adóoptimalizálás",
    prompt:
      "Adj 5 konkrét, jogszerű adóoptimalizálási javaslatot a jelenlegi forgalom és költségstruktúra alapján (KATA/KIVA/TAO megfontolások, költségelszámolás, ÁFA-rendszerek).",
  },
  {
    icon: FileDown,
    label: "NAV export csekklista",
    prompt:
      "Készíts ellenőrzőlistát: mely adatok hiányoznak ahhoz, hogy NAV-kompatibilis online számla XML exportot tudjak generálni? Mutasd meg pontosan mit kell kitölteni.",
  },
];

const STORAGE_KEY = "admin_ai_bookkeeper_history_v1";

const AdminAiBookkeeperTab = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {}
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Msg = { role: "user", content: trimmed, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      // A meglévő admin-ai-assistant edge function-t hívjuk, könyvelő módban
      const payload = {
        mode: "bookkeeper",
        messages: [
          {
            role: "system",
            content:
              "Te egy magyar nyelvű, NAV-kompatibilis számviteli és könyvelési AI asszisztens vagy. Mindig magyarul válaszolj, használj magyar számviteli kifejezéseket (ÁFA, AAM, KATA, KIVA, TAO, naplófőkönyv, főkönyvi szám, vevő/szállító folyószámla). Számoláskor mindig mutasd a képletet és a végeredményt is. Ha valamihez nincs elég adat, mondd meg pontosan mi hiányzik. Adj konkrét, cselekvésre kész javaslatokat.",
          },
          ...next.map((m) => ({ role: m.role, content: m.content })),
        ],
      };

      const { data, error } = await supabase.functions.invoke("admin-ai-assistant", {
        body: payload,
      });

      if (error) throw error;
      const reply =
        data?.reply ||
        data?.message ||
        data?.choices?.[0]?.message?.content ||
        "Nincs válasz az AI-tól.";

      setMessages((m) => [...m, { role: "assistant", content: reply, ts: Date.now() }]);
    } catch (err: any) {
      toast({
        title: "AI hiba",
        description: err?.message || "Nem sikerült elérni a könyvelő AI-t.",
        variant: "destructive",
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "⚠️ Hiba történt a kérés során. Próbáld újra pár másodperc múlva.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: "Beszélgetés törölve" });
  };

  const copyMsg = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Másolva a vágólapra" });
  };

  const stats = useMemo(() => {
    const userMsgs = messages.filter((m) => m.role === "user").length;
    const aiMsgs = messages.filter((m) => m.role === "assistant").length;
    return { userMsgs, aiMsgs, total: messages.length };
  }, [messages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Brain className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-black uppercase tracking-widest">AI Könyvelő Asszisztens</h2>
            <Badge className="rounded-none bg-accent text-accent-foreground uppercase tracking-wider text-[10px]">
              <Sparkles className="h-3 w-3 mr-1" /> Élő adatokkal
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Profi szintű könyvelési segéd: ÁFA bevallás, eredménykimutatás, cash flow, naplótételek,
            anomália felderítés. A teljes rendelés- és beszerzési adatbázist élesben látja.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="rounded-none uppercase tracking-wider text-[10px]">
            {stats.total} üzenet
          </Badge>
          {messages.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-none uppercase tracking-wider text-xs"
              onClick={clearHistory}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Új beszélgetés
            </Button>
          )}
        </div>
      </div>

      {/* Quick prompts */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2 flex items-center gap-2">
          <Calculator className="h-3.5 w-3.5" /> Gyors munkafolyamatok
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {QUICK_PROMPTS.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.label}
                disabled={loading}
                onClick={() => ask(q.prompt)}
                className="border border-border hover:border-accent hover:bg-accent/5 transition-colors p-3 text-left disabled:opacity-50 group"
              >
                <Icon className="h-4 w-4 text-accent mb-2" />
                <div className="text-xs font-bold uppercase tracking-wider leading-tight">
                  {q.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat */}
      <div className="border-2 border-border bg-background flex flex-col h-[60vh] min-h-[400px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
              <Bot className="h-12 w-12 mb-3 opacity-40" />
              <div className="text-sm font-bold uppercase tracking-wider">
                Kérdezz bármit a könyveléssel kapcsolatban
              </div>
              <div className="text-xs mt-2 max-w-md">
                Pl.: „Mennyi ÁFÁ-t kell befizetnem ebben a hónapban?", „Készíts eredménykimutatást
                a Q1-re", „Mely beszállítók a legjövedelmezőbbek?"
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="h-8 w-8 shrink-0 border-2 border-accent flex items-center justify-center bg-accent/10">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
              )}
              <div
                className={`max-w-[80%] border p-3 group relative ${
                  m.role === "user"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                <button
                  onClick={() => copyMsg(m.content)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background/20"
                  title="Másolás"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              {m.role === "user" && (
                <div className="h-8 w-8 shrink-0 border-2 border-foreground flex items-center justify-center">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 shrink-0 border-2 border-accent flex items-center justify-center bg-accent/10">
                <Bot className="h-4 w-4 text-accent animate-pulse" />
              </div>
              <div className="border border-border bg-muted/30 p-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Az AI könyvelő dolgozik…
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 bg-muted/20">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              placeholder="Írd ide a könyvelési kérdést… (Enter = küldés, Shift+Enter = új sor)"
              className="rounded-none min-h-[60px] resize-none flex-1"
              disabled={loading}
            />
            <Button
              onClick={() => ask(input)}
              disabled={loading || !input.trim()}
              className="rounded-none h-[60px] px-4 uppercase tracking-wider text-xs"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" /> Küldés
                </>
              )}
            </Button>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">
            Az AI hozzáfér a rendelésekhez, beszerzésekhez, termékadatokhoz és bolt beállításokhoz.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAiBookkeeperTab;

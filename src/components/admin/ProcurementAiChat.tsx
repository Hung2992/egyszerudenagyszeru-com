import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Bot, Send, Loader2, Sparkles, Trash2, ChevronDown, ChevronUp, Copy, Check, Zap, TrendingUp, DollarSign, Package, Truck, BarChart3, Calculator, AlertTriangle, Download, Search, MapPin, Target, ShoppingBag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;
const STORAGE_KEY = "procurement-ai-chat";

const PROCUREMENT_PROMPTS = [
  { label: "⚡ Napi briefing", prompt: "Adj napi beszerzési briefinget: prioritásos teendők, sürgős beszerzések, elakadások, alacsony készlet, profit, cash flow, hatékonysági score. Röviden, lényegre törően.", icon: Zap, primary: true },
  { label: "📊 Összesítő", prompt: "Adj részletes beszerzési összesítőt: beszállítók, költségek, státuszok, fizetési állapotok táblázatos formában.", icon: BarChart3 },
  { label: "🏭 Beszállító scorecard", prompt: "Rangsorold a beszállítókat scorecard rendszerben: ár, szállítási idő, megbízhatóság, időben érkezés%, profit. Ki a legjobb és legrosszabb?", icon: TrendingUp },
  { label: "⏳ Beszerzésre váró", prompt: "Listázd a beszerzésre váró vásárlói rendeléseket tételesen: mit kell rendelni, kitől, mennyibe kerülne? Adj beszerzési tervet.", icon: Package },
  { label: "⚠️ Készlet riasztás", prompt: "Mutasd az alacsony készletű és kifogyott termékeket, demand velocity alapján javasolj beszerzési tervet: mit, mennyit, kitől, mennyi időre elég.", icon: AlertTriangle },
  { label: "💰 Profit elemzés", prompt: "Részletes profit elemzés: TOP 5 legjövedelmezőbb és TOP 5 leggyengébb margin termék. Hol kell árat emelni? 3 szintű javaslat.", icon: DollarSign },
  { label: "🎯 ABC elemzés", prompt: "ABC elemzés a termékekről: melyik termék adja a bevétel 80%-át (A), 95%-át (B) és a maradékot (C)? Milyen stratégiát javasoltok osztályonként?", icon: Target },
  { label: "👥 Vásárlói hűség", prompt: "Vásárlói hűség elemzés: visszatérő vásárlók aránya, top vásárlók, átlagos rendelés/vásárló. Hogyan növelhető a visszatérési arány?", icon: ShoppingBag },
  { label: "⚙️ Hatékonyság", prompt: "Beszerzési hatékonysági score részletes elemzése: hol veszítünk pontokat? Konkrét javítási terv a 100/100 eléréséhez.", icon: Target },
  { label: "🏅 Termék rangsor", prompt: "Termék teljesítmény rangsor: melyik a legjobb és legrosszabb termék eladás, margin és készlet alapján? Alulteljesítők azonosítása + javaslat.", icon: BarChart3 },
  { label: "💵 Cash flow", prompt: "Cash flow előrejelzés: várakozó bevétel, kifizetetlen költség, nettó kilátás. Mikor lesz szükség tőkére?", icon: DollarSign },
  { label: "🔴 Elakadt beszerzések", prompt: "Van-e elakadt beszerzés (>14 nap)? Listázd tracking számokkal és javasolj teendőt.", icon: AlertTriangle },
  { label: "📅 Havi trend", prompt: "Adj havi összehasonlító riportot: bevétel, költség, profit trend az elmúlt 6 hónapra. Napi bevétel trend az elmúlt 14 napra.", icon: BarChart3 },
  { label: "🌍 Deviza elemzés", prompt: "Deviza összesítő: EUR és USD költés, HUF átváltás, melyik devizában olcsóbb a beszerzés?", icon: TrendingUp },
  { label: "📦 Szállítás + logisztika", prompt: "Szállítási teljesítmény beszállítónként + TOP városok ahonnan a legtöbb rendelés jön. Logisztikai optimalizálás.", icon: Truck },
  { label: "🔄 Újrarendelési terv", prompt: "Kereslet-előrejelzés alapján melyik termékből mennyit rendelni 30 napra? Konkrét lista beszállítónként + tömeges rendelési lehetőségek.", icon: ShoppingBag },
  { label: "🧠 Komplett optimalizálás", prompt: "Komplett beszerzési optimalizálás: ABC elemzés, beszállító váltás, áremelés, hatékonysági javítás, termék rangsor. 3 szintű stratégia terv.", icon: Sparkles },
];

const CONTEXT_FOLLOW_UPS: Record<string, string[]> = {
  profit: ["Melyik beszállítóra váltsak?", "Hogyan növelhetem a margint?", "Áremelési javaslat", "ABC elemzés a termékekre"],
  supplier: ["Ár összehasonlítás", "Szállítási idő elemzés", "Megbízhatósági rangsor", "Cross-supplier összehasonlítás"],
  stock: ["Sürgős rendelési lista", "Demand forecast 30 napra", "ABC elemzés", "Készletoptimalizálás"],
  cash: ["Mikor lesz cash flow pozitív?", "Fizetési ütemezés terv", "Tőkeigény előrejelzés", "Költségcsökkentési terv"],
  logistics: ["Top városok elemzés", "Szállítási idő optimalizálás", "Teljesítési ráta javítás", "Regionális stratégia"],
  abc: ["A kategóriás termék fókusz", "C kategória kivezetése?", "Beszállító váltás A termékekre", "Áremelési stratégia"],
  efficiency: ["Tracking számok hozzáadása", "Eladási árak kitöltése", "Fizetési lezárások", "Hatékonysági terv"],
  customer: ["VIP program javaslat", "Visszatérő vásárlók növelése", "Top vásárlók kedvezménye", "Hűségprogram ötletek"],
  default: ["Javasolj optimalizálást", "Adj részletesebb bontást", "Mi a legfontosabb teendő?", "3 szintű stratégia terv", "ABC elemzés", "Hatékonysági javítás"],
};

function getContextFollowUps(lastMessage: string): string[] {
  const lower = lastMessage.toLowerCase();
  if (lower.includes('abc') || lower.includes('osztály') || lower.includes('kategóriás')) return CONTEXT_FOLLOW_UPS.abc;
  if (lower.includes('hatékony') || lower.includes('score') || lower.includes('pontszám')) return CONTEXT_FOLLOW_UPS.efficiency;
  if (lower.includes('vásárló') || lower.includes('hűség') || lower.includes('visszatér')) return CONTEXT_FOLLOW_UPS.customer;
  if (lower.includes('profit') || lower.includes('margin') || lower.includes('árrés')) return CONTEXT_FOLLOW_UPS.profit;
  if (lower.includes('beszállító') || lower.includes('supplier') || lower.includes('shein') || lower.includes('zara')) return CONTEXT_FOLLOW_UPS.supplier;
  if (lower.includes('készlet') || lower.includes('stock') || lower.includes('kifogy')) return CONTEXT_FOLLOW_UPS.stock;
  if (lower.includes('cash') || lower.includes('pénz') || lower.includes('tőke') || lower.includes('fizetés')) return CONTEXT_FOLLOW_UPS.cash;
  if (lower.includes('város') || lower.includes('szállít') || lower.includes('logiszt') || lower.includes('teljesít')) return CONTEXT_FOLLOW_UPS.logistics;
  return CONTEXT_FOLLOW_UPS.default;
}

// ═══════ INLINE PRICE CALCULATOR ═══════
const PriceCalculator = ({ onSendMessage }: { onSendMessage: (msg: string) => void }) => {
  const [buyPrice, setBuyPrice] = useState("");
  const [currency, setCurrency] = useState<"EUR" | "USD" | "HUF">("EUR");
  const [showCalc, setShowCalc] = useState(false);

  const fxRates: Record<string, number> = { HUF: 1, EUR: 400, USD: 370 };
  const buyHuf = Number(buyPrice) * (fxRates[currency] || 1);
  const isValid = buyPrice && Number(buyPrice) > 0;

  const multipliers = [
    { label: "2x", factor: 2 },
    { label: "2.5x", factor: 2.5 },
    { label: "3x", factor: 3 },
  ];

  if (!showCalc) {
    return (
      <button
        onClick={() => setShowCalc(true)}
        className="w-full flex items-center gap-2 border border-border bg-accent/20 px-3 py-1.5 hover:bg-accent/40 transition-colors text-left"
      >
        <Calculator className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Gyors árkalkulátor</span>
      </button>
    );
  }

  return (
    <div className="border border-border bg-accent/10 p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">⚡ Árkalkulátor</span>
        <button onClick={() => setShowCalc(false)} className="text-[9px] text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <div className="flex gap-1.5">
        <Input
          type="number"
          placeholder="Beszerzési ár"
          value={buyPrice}
          onChange={e => setBuyPrice(e.target.value)}
          className="h-7 text-xs flex-1"
        />
        <select
          value={currency}
          onChange={e => setCurrency(e.target.value as "EUR" | "USD" | "HUF")}
          className="h-7 text-xs bg-background border border-border px-1.5"
        >
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="HUF">HUF</option>
        </select>
      </div>

      {isValid && (
        <div className="space-y-1">
          {currency !== "HUF" && (
            <div className="text-[9px] text-muted-foreground">
              = {buyHuf.toLocaleString('hu-HU')} Ft (1 {currency} ≈ {fxRates[currency]} Ft)
            </div>
          )}
          <div className="grid grid-cols-3 gap-1">
            {multipliers.map(m => {
              const sellPrice = Math.round(buyHuf * m.factor);
              const profit = sellPrice - buyHuf;
              const marginPct = ((profit / sellPrice) * 100).toFixed(0);
              return (
                <div key={m.label} className="border border-border/50 bg-background p-1.5 text-center">
                  <div className="text-[9px] text-muted-foreground">{m.label} árrés</div>
                  <div className="text-xs font-bold text-primary">{sellPrice.toLocaleString('hu-HU')} Ft</div>
                  <div className="text-[8px] text-muted-foreground">+{profit.toLocaleString('hu-HU')} Ft ({marginPct}%)</div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onSendMessage(`Beszerzési ár: ${buyPrice} ${currency} (${buyHuf.toFixed(0)} Ft). Adj részletes árazási javaslatot: milyen eladási árat javasoltok 2x, 2.5x, 3x árrés variációkkal? Milyen hasonló termékek vannak és azok mennyibe kerülnek?`)}
            className="w-full text-[9px] border border-primary/30 text-primary py-1 hover:bg-primary/10 transition-colors"
          >
            🧠 AI részletes árazási javaslat kérése
          </button>
        </div>
      )}
    </div>
  );
};

const ProcurementAiChat = () => {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus();
  }, [expanded]);

  const copyToClipboard = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
      toast({ title: "Másolva!", description: "Válasz a vágólapra másolva" });
    } catch {
      toast({ title: "Hiba", description: "Másolás sikertelen", variant: "destructive" });
    }
  }, []);

  const exportChat = useCallback(() => {
    if (messages.length === 0) return;
    const text = messages.map(m => `[${m.role === 'user' ? 'Kérdés' : 'AI Válasz'}]\n${m.content}`).join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beszerzesi-elemzes-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportálva!", description: "Chat mentve Markdown fájlként" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, mode: "procurement" }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Hiba történt" }));
        toast({ title: "AI Hiba", description: errData.error || `Hiba: ${resp.status}`, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

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
          } catch {}
        }
      }
    } catch (err: any) {
      toast({ title: "Hiba", description: err.message || "AI kapcsolódási hiba", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const hasAssistantResponse = messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && !isLoading;
  const lastAssistantMsg = hasAssistantResponse ? messages[messages.length - 1].content : "";
  const followUps = getContextFollowUps(lastAssistantMsg);
  const messageCount = messages.filter(m => m.role === "assistant").length;
  const primaryPrompt = PROCUREMENT_PROMPTS.find(p => p.primary);
  const secondaryPrompts = PROCUREMENT_PROMPTS.filter(p => !p.primary);

  // Filter messages by search
  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="border border-primary/20 bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider">AI Beszerzési Asszisztens</span>
          {messageCount > 0 && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5">{messageCount} válasz</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={e => { e.stopPropagation(); setShowSearch(!showSearch); }} title="Keresés">
                <Search className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={e => { e.stopPropagation(); exportChat(); }} title="Export">
                <Download className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={e => { e.stopPropagation(); setMessages([]); }} title="Törlés">
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Search bar */}
          {showSearch && (
            <div className="p-2 border-b border-border/50">
              <Input
                placeholder="Keresés a válaszokban..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-7 text-xs"
              />
              {searchQuery && (
                <span className="text-[9px] text-muted-foreground mt-1 block">
                  {filteredMessages.length} találat
                </span>
              )}
            </div>
          )}

          {/* Quick prompts + calculator when no messages */}
          {messages.length === 0 && (
            <div className="p-3 space-y-2 border-b border-border/50">
              {primaryPrompt && (
                <button
                  onClick={() => sendMessage(primaryPrompt.prompt)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2 border border-primary/40 bg-primary/5 px-3 py-2.5 hover:bg-primary/10 transition-colors text-left disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-primary">{primaryPrompt.label}</span>
                    <p className="text-[9px] text-muted-foreground">Teendők, készlet, profit, cash flow, teljesítmény</p>
                  </div>
                </button>
              )}

              {/* Inline calculator */}
              <PriceCalculator onSendMessage={sendMessage} />

              <div className="flex items-center gap-2 mt-2">
                <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Vagy válassz elemzést</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {secondaryPrompts.map(q => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={q.label}
                      onClick={() => sendMessage(q.prompt)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-[9px] border border-border px-2 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors text-left disabled:opacity-50"
                    >
                      <Icon className="w-3 h-3 shrink-0 text-muted-foreground" />
                      <span>{q.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="max-h-[550px] overflow-y-auto p-3 space-y-3">
            {filteredMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`relative group max-w-[95%] text-xs px-3 py-2 ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                    : "bg-muted text-foreground border border-border"
                }`}>
                  {m.role === "assistant" ? (
                    <>
                      <div className="prose prose-xs prose-invert max-w-none [&_table]:text-[10px] [&_table]:w-full [&_table]:border-collapse [&_th]:px-1.5 [&_th]:py-0.5 [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:text-left [&_th]:border-b [&_th]:border-border [&_th]:font-bold [&_td]:border-b [&_td]:border-border/50 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_h2]:text-xs [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-0.5 [&_strong]:text-primary [&_hr]:my-2 [&_hr]:border-border/30 [&_code]:text-primary [&_code]:bg-primary/10 [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                      <button
                        onClick={() => copyToClipboard(m.content, i)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent/50 rounded"
                        title="Másolás"
                      >
                        {copiedIdx === i ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                      </button>
                    </>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border px-3 py-2 text-xs flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-muted-foreground">Adatok elemzése és kalkuláció...</span>
                </div>
              </div>
            )}

            {/* Context-aware follow-ups */}
            {hasAssistantResponse && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Továbbfejlesztés:</span>
                <div className="flex flex-wrap gap-1">
                  {followUps.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-[9px] border border-primary/30 text-primary/80 px-1.5 py-0.5 hover:bg-primary/10 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {/* Show calculator after response too */}
                <PriceCalculator onSendMessage={sendMessage} />
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
              placeholder="Pl: 5 EUR-s póló → ár? / Melyik város rendel legtöbbet?"
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
      )}
    </div>
  );
};

export default ProcurementAiChat;

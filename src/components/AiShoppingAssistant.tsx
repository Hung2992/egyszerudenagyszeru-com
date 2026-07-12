// AI Shopping Assistant - vásárlói chat widget
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, X, Loader2, ShoppingBag, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { trackAiEvent } from "@/lib/ai-analytics";

type Msg = { role: "user" | "assistant"; content: string; products?: any[] };

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopping-assistant`;

const QUICK = [
  "20 000 Ft alatti pólót keresek",
  "Fekete cipő 44-es méret",
  "Mi trendi most?",
  "Ajánlj egy szettet",
];

const AiShoppingAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addItem } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { if (open) { inputRef.current?.focus(); trackAiEvent("assistant_open", "shopping_assistant"); } }, [open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const all = [...messages, userMsg];
    setMessages(all);
    setInput("");
    setLoading(true);
    trackAiEvent("assistant_message", "shopping_assistant", { length: text.length });

    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: all.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast({ title: "Hiba", description: err.error || "AI kapcsolódási hiba", variant: "destructive" });
        setLoading(false);
        return;
      }

      const data = await resp.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply || "Nem sikerült választ generálni.",
        products: data.products || [],
      }]);
    } catch (err: any) {
      toast({ title: "Hiba", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (p: any) => {
    navigate(`/product/${p.id}`);
    setOpen(false);
  };

  const handleQuickAdd = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const size = p.sizes?.[0] || "M";
    const color = p.colors?.[0] || "fekete";
    addItem({
      productId: p.id,
      name: p.name,
      price: p.price,
      image_url: p.image_url,
      size, color,
    }, 1);
    toast({ title: "Kosárba téve!", description: p.name });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-foreground text-background flex items-center justify-center shadow-2xl hover:scale-105 transition-all border border-foreground group"
        title="AI vásárlási asszisztens"
        aria-label="AI vásárlási asszisztens megnyitása"
      >
        <MessageCircle className="w-6 h-6 group-hover:rotate-6 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[380px] h-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-background border border-foreground shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-foreground bg-foreground text-background">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest">AI Asszisztens</p>
            <p className="text-[10px] opacity-70">Segítek megtalálni a tökéletes darabot</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 hover:opacity-70" aria-label="Bezárás">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-background">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 mx-auto bg-foreground text-background flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider">Szia! 👋</p>
              <p className="text-xs text-muted-foreground mt-1 px-4">
                Írd le mit keresel, én megtalálom neked. Például méret, szín, ár szerint.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center px-4">
              {QUICK.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-[10px] border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background transition-all uppercase tracking-wider">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] text-xs px-3 py-2 ${
              m.role === "user"
                ? "bg-foreground text-background"
                : "bg-muted text-foreground border border-border"
            } whitespace-pre-wrap`}>
              {m.content}
            </div>
            {m.products && m.products.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                {m.products.slice(0, 4).map((p: any) => (
                  <button key={p.id} onClick={() => handleProductClick(p)}
                    className="border border-border bg-card hover:border-foreground transition-all text-left">
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} className="w-full aspect-square object-cover" />
                    )}
                    <div className="p-2 space-y-1">
                      <p className="text-[10px] font-semibold truncate">{p.name}</p>
                      <p className="text-[11px] font-bold text-accent">{Number(p.price).toLocaleString()} Ft</p>
                      <button
                        onClick={(e) => handleQuickAdd(p, e)}
                        className="w-full text-[9px] uppercase tracking-wider bg-foreground text-background py-1 hover:bg-accent hover:text-accent-foreground transition-all"
                      >
                        + Kosárba
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Keresek...</span>
          </div>
        )}
      </div>

      <div className="border-t border-foreground p-2 flex gap-2 bg-background">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Mit keresel?"
          rows={1}
          disabled={loading}
          className="flex-1 text-xs resize-none min-h-[36px] max-h-[80px] rounded-none"
        />
        <Button
          size="icon"
          className="h-9 w-9 rounded-none shrink-0 bg-foreground text-background hover:bg-accent hover:text-accent-foreground"
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          aria-label="Küldés"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default AiShoppingAssistant;

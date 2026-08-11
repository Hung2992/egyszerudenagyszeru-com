// A partner saját AI csapata: minden ügynök a saját szakterületén válaszol a partner adatai alapján.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Bot, Send } from "lucide-react";

interface Props { partnerId: string }

interface Agent {
  key: string;
  emoji: string;
  name: string;
  role: string;
  watches: string;
  sample: string;
}

const AGENTS: Agent[] = [
  { key: "ceo", emoji: "🧠", name: "CEO AI", role: "Stratégia", watches: "Bevétel, növekedés, célok", sample: "Mire fókuszáljak a következő 30 napban?" },
  { key: "commerce", emoji: "🛍️", name: "Commerce AI", role: "Webshop", watches: "Termékek, kosár, checkout", sample: "Hogyan javítsam a termékoldalaimat?" },
  { key: "marketing", emoji: "📣", name: "Marketing AI", role: "Kampány", watches: "Kampányok, posztok, hirdetések", sample: "Hogyan növelhetném a bevételem?" },
  { key: "finance", emoji: "💰", name: "Finance AI", role: "Pénzügy", watches: "Árrés, jutalék, profit", sample: "Melyik termékemen keresek a legtöbbet?" },
  { key: "sales", emoji: "📈", name: "Sales AI", role: "Értékesítés", watches: "Konverzió, kosárelhagyás", sample: "Miért nem vásárolnak, akik megnézik a termékeimet?" },
  { key: "seo", emoji: "🔍", name: "SEO AI", role: "Keresőoptimalizálás", watches: "Meta adatok, kulcsszavak", sample: "Mely termékeknél hiányzik SEO leírás?" },
  { key: "content", emoji: "📝", name: "Content AI", role: "Tartalom", watches: "Leírások, blog, e-mail", sample: "Írj prémium leírást a legjobb termékemhez." },
  { key: "lawyer", emoji: "⚖️", name: "Lawyer AI", role: "Jogi segítség", watches: "ÁSZF, adatvédelem, elállás", sample: "Milyen kötelező tájékoztatók kellenek a webshopomba?" },
];

const PartnerAiTeamTab = ({ partnerId }: Props) => {
  const [active, setActive] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const ask = async (agent: Agent, q: string) => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-business-advisor", {
        body: {
          partner_id: partnerId,
          action: "ask",
          question: `Te a(z) ${agent.name} ügynök vagy, a szakterületed: ${agent.role} (${agent.watches}). Csak ebből a nézőpontból válaszolj.\n\nKÉRDÉS: ${q}`,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setAnswers((prev) => ({ ...prev, [agent.key]: data?.answer || "—" }));
    } catch (e: any) {
      const msg = String(e?.message || "");
      toast({
        title: "AI hiba",
        description: msg.includes("rate_limit") ? "Túl sok kérés – próbáld később."
          : msg.includes("credits") ? "Elfogytak az AI kreditek." : msg || "Nem sikerült válaszolni.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-none p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">🤖 AI Csapatom</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Minden ügynök a te valós webshop-adataidat látja. Kattints egy ügynökre és kérdezd meg.
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        {AGENTS.map((a) => {
          const open = active === a.key;
          return (
            <Card key={a.key} className="rounded-none p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{a.emoji} {a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.watches}</p>
                </div>
                <Badge variant="secondary" className="rounded-none text-[10px]">{a.role}</Badge>
              </div>

              {answers[a.key] && (
                <div className="border border-border p-3 text-sm whitespace-pre-wrap">{answers[a.key]}</div>
              )}

              {open ? (
                <div className="space-y-2">
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={a.sample}
                    className="rounded-none min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-none" disabled={busy || !question.trim()} onClick={() => void ask(a, question)}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Kérdezem
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-none" onClick={() => setActive(null)}>Bezár</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => { setActive(a.key); setQuestion(""); }}>
                    Kérdezek tőle
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-none" disabled={busy} onClick={() => void ask(a, a.sample)}>
                    „{a.sample.length > 34 ? a.sample.slice(0, 34) + "…" : a.sample}”
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PartnerAiTeamTab;

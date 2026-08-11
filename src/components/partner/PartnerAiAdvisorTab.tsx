// AI üzleti asszisztens a partnernek: napi javaslatok a saját adatai alapján.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb, MessageSquare } from "lucide-react";

interface Props { partnerId: string }

interface Advice {
  summary: string;
  health_score: number;
  actions: { title: string; why: string; impact: "magas" | "közepes" | "alacsony"; effort: string }[];
  risks: string[];
  opportunities: string[];
}

const IMPACT_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  magas: "default", közepes: "secondary", alacsony: "outline",
};

const PartnerAiAdvisorTab = ({ partnerId }: Props) => {
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const run = async (action: "daily_advice" | "ask", q?: string) => {
    const setBusy = action === "ask" ? setAsking : setLoading;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-business-advisor", {
        body: { partner_id: partnerId, action, question: q },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (action === "ask") setAnswer(data?.answer || "—");
      else setAdvice(data as Advice);
    } catch (e: any) {
      const msg = String(e?.message || "");
      toast({
        title: "AI hiba",
        description: msg.includes("rate_limit")
          ? "Túl sok kérés – próbáld pár perc múlva."
          : msg.includes("credits") ? "Elfogytak az AI kreditek." : msg || "Nem sikerült elemezni.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (partnerId) void run("daily_advice"); /* eslint-disable-next-line */ }, [partnerId]);

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-border p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h3 className="font-heading text-lg">AI üzleti asszisztens</h3>
            <Badge variant="outline" className="rounded-none">a te adataid alapján</Badge>
          </div>
          <Button className="rounded-none" disabled={loading} onClick={() => void run("daily_advice")}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {loading ? "Elemzés…" : "Új elemzés"}
          </Button>
        </div>

        {loading && !advice ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-none" />)}</div>
        ) : advice ? (
          <>
            <div className="flex items-center gap-4">
              <div className="border border-border px-4 py-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Üzlet-egészség</div>
                <div className="text-3xl font-bold">{Math.round(advice.health_score || 0)}<span className="text-base text-muted-foreground">/100</span></div>
              </div>
              <p className="text-sm text-muted-foreground flex-1">{advice.summary}</p>
            </div>

            {!!advice.actions?.length && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" />Mit csinálj most</h4>
                {advice.actions.map((a, i) => (
                  <div key={i} className="border border-border p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-medium text-sm">{a.title}</span>
                      <div className="flex gap-2">
                        <Badge variant={IMPACT_VARIANT[a.impact] || "outline"} className="rounded-none text-[10px]">hatás: {a.impact}</Badge>
                        <Badge variant="outline" className="rounded-none text-[10px]">{a.effort}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.why}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {!!advice.risks?.length && (
                <div className="border border-border p-3">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-destructive" />Kockázatok</h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    {advice.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {!!advice.opportunities?.length && (
                <div className="border border-border p-3">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2"><Lightbulb className="h-4 w-4 text-accent" />Lehetőségek</h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    {advice.opportunities.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Indíts egy elemzést a fenti gombbal.</p>
        )}
      </Card>

      <Card className="rounded-none border-border p-5 space-y-3">
        <h4 className="font-heading flex items-center gap-2"><MessageSquare className="h-4 w-4" />Kérdezz az üzletedről</h4>
        <Textarea
          rows={3} className="rounded-none"
          placeholder="Pl.: Miért nem vásárolnak a látogatók? Mennyiért adjam a legnépszerűbb termékem?"
          value={question} onChange={(e) => setQuestion(e.target.value)}
        />
        <Button className="rounded-none" disabled={asking || question.trim().length < 5} onClick={() => void run("ask", question)}>
          {asking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Kérdés elküldése
        </Button>
        {answer && <div className="border border-border p-3 text-sm whitespace-pre-wrap">{answer}</div>}
      </Card>
    </div>
  );
};

export default PartnerAiAdvisorTab;

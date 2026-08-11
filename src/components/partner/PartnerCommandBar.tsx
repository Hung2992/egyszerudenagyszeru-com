// Állandó AI parancsmező a Partner Portál tetején: "Mit szeretnél elintézni?"
import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2, ArrowRight, ShieldCheck, Bot } from "lucide-react";

interface Props {
  partnerId: string;
  onNavigate: (tab: string) => void;
}

interface CommandResult {
  intent: string;
  target_tab: string;
  title: string;
  answer: string;
  steps: string[];
  agents: string[];
  needs_approval: boolean;
  cta_label: string;
}

const EXAMPLES = [
  "Szeretnék 20%-kal több rendelést",
  "Miért esett vissza a bevételem?",
  "Építs egy fekete-arany kampányoldalt",
  "Készíts akciót a lassan fogyó termékekre",
  "Mennyi volt a havi jutalékom?",
];

const PartnerCommandBar = ({ partnerId, onNavigate }: Props) => {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);

  const run = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("partner-command-router", {
        body: { partner_id: partnerId, prompt: q },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setResult(data as CommandResult);
    } catch (e: any) {
      const msg = String(e?.message || "");
      toast({
        title: "AI hiba",
        description: msg.includes("rate_limit")
          ? "Túl sok kérés – próbáld pár perc múlva."
          : msg.includes("credits") ? "Elfogytak az AI kreditek." : msg || "Nem sikerült feldolgozni a kérést.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="rounded-none border-primary/40 p-4 md:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-lg">Mit szeretnél elintézni?</h2>
      </div>

      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => { e.preventDefault(); void run(prompt); }}
      >
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Írd le magyarul, mit szeretnél – az AI elindítja a megfelelő csapatot…"
          className="rounded-none"
          disabled={busy}
        />
        <Button type="submit" className="rounded-none" disabled={busy || !prompt.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Indítsd el
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => { setPrompt(ex); void run(ex); }}
            disabled={busy}
            className="text-xs border border-border px-2 py-1 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      {result && (
        <div className="border border-border p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold">{result.title}</p>
              <Badge variant="secondary" className="rounded-none mt-1 text-[10px]">{result.intent}</Badge>
            </div>
            {result.needs_approval && (
              <Badge variant="outline" className="rounded-none gap-1">
                <ShieldCheck className="h-3 w-3" /> Jóváhagyás szükséges
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.answer}</p>

          {result.steps.length > 0 && (
            <ol className="text-sm space-y-1 list-decimal pl-5">
              {result.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}

          {result.agents.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <Bot className="h-4 w-4 text-muted-foreground" />
              {result.agents.map((a) => (
                <Badge key={a} variant="secondary" className="rounded-none text-[10px]">{a}</Badge>
              ))}
            </div>
          )}

          <Button
            size="sm"
            className="rounded-none"
            onClick={() => onNavigate(result.target_tab)}
          >
            {result.cta_label} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </Card>
  );
};

export default PartnerCommandBar;

import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Sparkles, RefreshCw, CalendarClock } from "lucide-react";

interface Props { partnerId: string; onCreated?: () => void; }

const TYPES = [
  { value: "digital", label: "💾 Digitális termék", hint: "e-book, sablon, letölthető fájl, licenc" },
  { value: "course", label: "🎓 Oktatás / kurzus", hint: "online tananyag, élő képzés, mentorprogram" },
  { value: "service", label: "🛠️ Szolgáltatás", hint: "időpontos munka, tanácsadás, kiszállás" },
];

const DAYS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

// AI Product Studio – digitális termék / kurzus / szolgáltatás generálása naptár-beállításokkal
const AiServiceProductGenerator = ({ partnerId, onCreated }: Props) => {
  const [type, setType] = useState<string>("service");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    if (prompt.trim().length < 3) {
      toast({ title: "Írd le, mit szeretnél eladni", variant: "destructive" });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-studio", {
        body: { action: "service_product", input: { prompt, product_type: type } },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "AI hiba");
      setResult((data as any).product);
      setPrompt("");
      toast({
        title: "Elkészült",
        description: `„${(data as any)?.product?.title}” piszkozatként létrejött – nézd át a Termékek fülön.`,
      });
      onCreated?.();
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message || "Ismeretlen hiba", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const attrs = result?.attributes || {};
  const workDays: number[] = Array.isArray(attrs.work_days) ? attrs.work_days : [];

  return (
    <Card className="rounded-none border-foreground/20 p-6 space-y-5">
      <div>
        <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" /> AI termék & szolgáltatás készítő
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Írd le, mit szeretnél eladni – az AI megírja a leírást, árat javasol, és szolgáltatásnál/kurzusnál
          a naptár-beállításokat (munkanapok, nyitvatartás, előleg, lemondás) is kitölti.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`border p-3 text-left ${type === t.value ? "border-accent" : "border-foreground/20 hover:border-foreground/40"}`}
          >
            <div className="text-sm font-bold">{t.label}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{t.hint}</div>
          </button>
        ))}
      </div>

      <Textarea
        className="rounded-none"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="pl. 60 perces üzleti tanácsadás online, hétköznap délután, 25.000 Ft, 30% előleggel, 24 órán belüli lemondás díjköteles"
      />

      <Button className="rounded-none" onClick={generate} disabled={busy}>
        {busy ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
        {busy ? "AI dolgozik…" : "Elkészítés AI-val"}
      </Button>

      {result && (
        <div className="border border-foreground/15 p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">{result.title}</span>
            <Badge variant="outline" className="rounded-none text-[10px]">{result.product_type}</Badge>
            <Badge variant="outline" className="rounded-none text-[10px]">Piszkozat</Badge>
            {result.price_huf > 0 && (
              <span className="text-sm text-accent font-bold">{Number(result.price_huf).toLocaleString("hu-HU")} Ft</span>
            )}
          </div>
          {result.description && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">{result.description}</p>
          )}
          {attrs.booking_enabled && (
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                <CalendarClock className="h-3 w-3" /> Naptár-beállítás
              </div>
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d, i) => (
                  <span
                    key={d}
                    className={`px-2 py-0.5 border text-[11px] ${workDays.includes(i + 1) ? "border-accent text-accent" : "border-foreground/20 text-muted-foreground"}`}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="text-muted-foreground">
                {attrs.work_from || "09:00"}–{attrs.work_to || "17:00"}
                {attrs.service_duration ? ` · ${attrs.service_duration}` : ""}
                {attrs.min_notice_hours ? ` · min. ${attrs.min_notice_hours} óra előre` : ""}
                {attrs.deposit_percent ? ` · ${attrs.deposit_percent}% előleg` : ""}
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            A termék piszkozatként mentve – a Termékek fülön nézd át, majd egy kattintással élesítsd.
          </p>
        </div>
      )}
    </Card>
  );
};

export default AiServiceProductGenerator;

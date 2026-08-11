// 💎 AI Product Studio — ötletből prémium digitális termék / kurzus / szolgáltatás.
// Lánc: Architect → Content → Pricing → Checkout → Access/License → QA → Premium Score
import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Check, AlertTriangle } from "lucide-react";
import { uploadPartnerMedia } from "@/lib/partner-storage";
import { fulfillmentIcon, fulfillmentLabel, defaultTypeOf } from "@/lib/product-schema";

type StudioFulfillment = "digital" | "course" | "service";

interface Props {
  partnerId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialFulfillment?: StudioFulfillment;
  onApply: (patch: Record<string, any>) => void;
}

const PIPELINE = [
  "💡 Ötlet feldolgozása",
  "🧠 Product Architect",
  "📝 Content AI",
  "🎨 Media AI",
  "💰 Pricing AI",
  "🛒 Checkout AI",
  "🔐 Access / License Engine",
  "🧪 QA Agent",
  "💎 Premium Score",
];

const SCORE_LABELS: Record<string, string> = {
  content: "Tartalom",
  product_page: "Termékoldal",
  checkout: "Checkout",
  seo: "SEO",
  experience: "Vásárlói élmény",
  upsell: "Upsell",
};

const dataUrlToFile = (dataUrl: string, name: string) => {
  const [head, b64] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(head)?.[1] || "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
};

const AiProductBuilderDialog = ({ partnerId, open, onOpenChange, initialFulfillment = "digital", onApply }: Props) => {
  const [idea, setIdea] = useState("");
  const [price, setPrice] = useState("");
  const [ff, setFf] = useState<StudioFulfillment>(initialFulfillment);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [improving, setImproving] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [changes, setChanges] = useState<{ area: string; what: string }[]>([]);

  const run = async () => {
    if (idea.trim().length < 10) { toast({ title: "Írd le bővebben az ötleted", variant: "destructive" }); return; }
    setLoading(true); setResult(null); setStep(1); setHistory([]); setChanges([]);
    const timer = setInterval(() => setStep((s) => (s < PIPELINE.length - 1 ? s + 1 : s)), 1400);
    const { data, error } = await supabase.functions.invoke("partner-product-builder", {
      body: { partner_id: partnerId, fulfillment: ff, idea: idea.trim(), price_huf: Number(price) || 0 },
    });
    clearInterval(timer);
    setLoading(false);
    if (error || data?.error) {
      setStep(0);
      toast({ title: "AI hiba", description: (data?.error as string) || error?.message || "Ismeretlen hiba", variant: "destructive" });
      return;
    }
    setStep(PIPELINE.length);
    setResult(data);
    setHistory([Number(data?.qa?.total ?? 0)]);
  };

  // 💎 Premium Auto-Improve: QA → gyenge területek → AI javítás → újra QA → új score
  const autoImprove = async () => {
    if (!result?.spec) return;
    setImproving(true);
    const { data, error } = await supabase.functions.invoke("partner-product-builder", {
      body: {
        partner_id: partnerId,
        mode: "improve",
        fulfillment: ff,
        spec: result.spec,
        qa: result.qa,
        target_score: 90,
        max_rounds: 3,
      },
    });
    setImproving(false);
    if (error || data?.error) {
      toast({ title: "A javítás nem sikerült", description: (data?.error as string) || error?.message || "Ismeretlen hiba", variant: "destructive" });
      return;
    }
    const rounds = (data?.rounds || []) as any[];
    setResult({ ...result, spec: data.spec, qa: data.qa });
    setHistory((h) => [...h, ...rounds.slice(1).map((r) => Number(r.total ?? 0))]);
    setChanges(rounds.flatMap((r) => r.changes || []));
    const newTotal = Number(data?.qa?.total ?? 0);
    toast({
      title: data?.reached ? `💎 Elérte a prémium szintet: ${newTotal}/100` : `Javítva: ${newTotal}/100`,
      description: data?.reached ? "A termék készen áll a publikálásra." : "Futtathatsz még egy javítási kört.",
    });
  };


  const apply = async () => {
    if (!result?.spec) return;
    setApplying(true);
    const s = result.spec;
    const images: string[] = [];
    if (result.cover?.startsWith("data:")) {
      const path = await uploadPartnerMedia("partner-product-images", partnerId, dataUrlToFile(result.cover, `ai-cover-${Date.now()}.png`));
      if (path) images.push(path);
    }
    const attrs = { ...(s.attributes || {}) };
    if (s.bullets) attrs.ai_bullets = s.bullets;
    if (s.faq) attrs.ai_faq = s.faq;
    if (s.upsell) attrs.ai_upsell = s.upsell;
    if (s.seo) attrs.ai_seo = s.seo;
    if (s.checkout) attrs.ai_checkout = s.checkout;
    attrs.ai_premium_score = result.qa?.total ?? null;
    attrs.ai_generated = true;

    onApply({
      fulfillment_type: ff,
      product_type: defaultTypeOf(ff),
      title: s.title || "",
      slug: s.slug || "",
      description: s.description || "",
      category: s.category || "",
      price_huf: Number(s.price_huf) || Number(price) || 0,
      compare_price_huf: s.compare_price_huf ? Number(s.compare_price_huf) : null,
      attributes: attrs,
      ...(images.length ? { images } : {}),
    });
    setApplying(false);
    toast({ title: "AI termék betöltve a szerkesztőbe" });
    onOpenChange(false);
    setResult(null); setIdea(""); setPrice(""); setStep(0); setHistory([]); setChanges([]);
  };

  const total = Number(result?.qa?.total ?? 0);
  const grade = total >= 90 ? "💎 Prémium" : total >= 75 ? "🥇 Erős" : total >= 60 ? "🥈 Elfogadható" : "⚠️ Gyenge";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest">💎 AI Product Studio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Mit szeretnél eladni?</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(["digital", "course", "service"] as StudioFulfillment[]).map((k) => (
                <button key={k} type="button" onClick={() => setFf(k)}
                  className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border ${ff === k ? "bg-accent text-accent-foreground border-accent" : "border-foreground/20 hover:border-foreground"}`}>
                  {fulfillmentIcon[k]} {fulfillmentLabel[k]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Az ötleted</Label>
            <Textarea rows={3} className="rounded-none" value={idea} onChange={(e) => setIdea(e.target.value)}
              placeholder={ff === "service" ? "pl. Webshop audit – 60 perc – 29 900 Ft" : ff === "course" ? "pl. Mini-kurzus kezdő webshop tulajdonosoknak" : "pl. Prémium kezdő vállalkozói csomag 9 990 Ft-ért"} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Célár (Ft, opcionális)</Label>
              <Input type="number" className="rounded-none" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="AI javasol, ha üres" />
            </div>
            <div className="flex items-end">
              <Button className="rounded-none w-full uppercase tracking-wider" onClick={run} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Készíts nekem terméket
              </Button>
            </div>
          </div>

          {(loading || result) && (
            <div className="border border-foreground/20 p-3 space-y-1">
              {PIPELINE.map((p, i) => (
                <div key={p} className={`text-xs flex items-center gap-2 ${i < step ? "" : "text-muted-foreground"}`}>
                  {i < step ? <Check className="h-3 w-3 text-accent" /> : loading && i === step ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-3 w-3" />}
                  {p}
                </div>
              ))}
            </div>
          )}

          {result?.spec && (
            <div className="space-y-3">
              <div className="border border-foreground/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Premium Product Score</div>
                  <Badge variant="outline" className="rounded-none">{grade}</Badge>
                </div>
                <div className="text-3xl font-bold mt-1">{total}/100</div>
                <Progress value={total} className="h-2 rounded-none mt-2" />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {Object.entries(result.qa?.scores || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs border border-foreground/10 px-2 py-1">
                      <span>{Number(v) >= 85 ? "✅" : "⚠️"} {SCORE_LABELS[k] || k}</span>
                      <span className="font-bold">{String(v)}</span>
                    </div>
                  ))}
                </div>
                {result.qa?.verdict && <p className="text-xs text-muted-foreground mt-2">{result.qa.verdict}</p>}
              </div>

              {(result.qa?.issues || []).length > 0 && (
                <div className="border border-foreground/20 p-3 space-y-1">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">QA észrevételek</div>
                  {result.qa.issues.map((it: any, i: number) => (
                    <div key={i} className="text-xs flex gap-2">
                      <AlertTriangle className={`h-3 w-3 mt-0.5 shrink-0 ${it.severity === "error" ? "text-destructive" : "text-muted-foreground"}`} />
                      <span><b>{it.area}:</b> {it.message} {it.fix && <em className="text-muted-foreground">— {it.fix}</em>}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-foreground/20 p-3 space-y-2">
                <div className="flex gap-3">
                  {result.cover && <img src={result.cover} alt={result.spec.title} className="w-28 h-28 object-cover border border-foreground/20" />}
                  <div className="min-w-0">
                    <div className="font-bold">{result.spec.title}</div>
                    <div className="text-xs text-muted-foreground">{result.spec.short_pitch}</div>
                    <div className="text-sm font-bold mt-1">
                      {Number(result.spec.price_huf || 0).toLocaleString("hu-HU")} Ft
                      {result.spec.compare_price_huf && <span className="text-xs line-through text-muted-foreground ml-2">{Number(result.spec.compare_price_huf).toLocaleString("hu-HU")} Ft</span>}
                    </div>
                  </div>
                </div>
                <p className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">{result.spec.description}</p>
                <div className="flex flex-wrap gap-1">
                  {(result.spec.bullets || []).map((b: string, i: number) => (
                    <Badge key={i} variant="outline" className="rounded-none text-[10px]">{b}</Badge>
                  ))}
                </div>
              </div>

              <Button className="rounded-none w-full uppercase tracking-wider" onClick={apply} disabled={applying}>
                {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Betöltés a termékszerkesztőbe
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiProductBuilderDialog;

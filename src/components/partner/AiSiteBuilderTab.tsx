import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Wand2, Check, Loader2 } from "lucide-react";

interface Props {
  partnerId: string;
  onApplied: (patch: Record<string, any>) => void;
}

const EXAMPLES = [
  "Sötét, prémium streetwear márka fiataloknak, arany kiemeléssel, limitált drop hangulattal.",
  "Világos, letisztult telefontok webshop, gyors szállítás és 2 év garancia hangsúlyozva.",
  "Kézműves ékszer márka, meleg pasztell színek, mesélős hangvétel, vásárlói vélemények.",
];

const AiSiteBuilderTab = ({ partnerId, onApplied }: Props) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [applying, setApplying] = useState(false);

  const generate = async () => {
    if (prompt.trim().length < 5) {
      toast({ title: "Írd le mit szeretnél", description: "Pár mondat is elég.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("partner-site-builder", {
        body: { prompt, partner_id: partnerId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast({ title: "Kész a terv", description: data?.explanation?.slice(0, 120) });
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message || "Nem sikerült generálni.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!result?.patch) return;
    setApplying(true);
    try {
      const { data: existing } = await supabase
        .from("partner_storefronts").select("id").eq("partner_id", partnerId).maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from("partner_storefronts").update(result.patch).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partner_storefronts").insert({ partner_id: partnerId, ...result.patch });
        if (error) throw error;
      }
      onApplied(result.patch);
      toast({ title: "Alkalmazva", description: "A webshop beállításai frissültek. Nézd meg az Élő előnézetet!" });
    } catch (e: any) {
      toast({ title: "Mentés sikertelen", description: e?.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg">AI Webshop Építő</h3>
          <Badge variant="outline" className="rounded-none">szövegből teljes oldal</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Írd le pár mondatban, milyen márkát és webshopot szeretnél — az AI elkészíti a színeket, hero szekciót,
          szövegeket, véleményeket, footert és a SEO adatokat.
        </p>
        <Textarea
          rows={5}
          className="rounded-none"
          placeholder="Pl.: Sötét, prémium streetwear márka 18-30 éves férfiaknak, arany kiemelés, limitált drop hangulat…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="text-xs border border-border px-2 py-1 text-muted-foreground hover:text-foreground hover:border-primary transition-colors text-left"
            >
              {ex.slice(0, 48)}…
            </button>
          ))}
        </div>
        <Button onClick={generate} disabled={loading} className="rounded-none">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          {loading ? "Építés…" : "Webshop generálása"}
        </Button>
      </Card>

      {result?.patch && (
        <Card className="rounded-none border-border p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h4 className="font-heading">AI javaslat</h4>
            <Button onClick={apply} disabled={applying} className="rounded-none">
              {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Alkalmazom a webshopra
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{result.explanation}</p>

          <div className="flex flex-wrap gap-2">
            {["bg_color", "primary_color", "accent_color", "text_color"].map((k) =>
              result.patch[k] ? (
                <div key={k} className="flex items-center gap-2 border border-border px-2 py-1">
                  <span className="h-4 w-4 border border-border" style={{ background: result.patch[k] }} />
                  <span className="text-xs text-muted-foreground">{k}: {result.patch[k]}</span>
                </div>
              ) : null,
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(result.patch)
              .filter(([, v]) => typeof v === "string" && String(v).trim() !== "")
              .slice(0, 16)
              .map(([k, v]) => (
                <div key={k} className="border border-border p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</div>
                  <div className="text-sm mt-1 line-clamp-3">{String(v)}</div>
                </div>
              ))}
          </div>

          {!!result.product_ideas?.length && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Termékötletek</h5>
              <div className="grid gap-2 md:grid-cols-2">
                {result.product_ideas.map((p: any, i: number) => (
                  <div key={i} className="border border-border p-3">
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                    {p.suggested_price_huf ? (
                      <div className="text-xs mt-1">{Number(p.suggested_price_huf).toLocaleString("hu-HU")} Ft</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AiSiteBuilderTab;

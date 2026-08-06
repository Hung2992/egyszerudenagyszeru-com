import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FlaskConical, Sparkles, Trophy, BarChart3, Loader2, Check } from "lucide-react";

interface Props { partnerId: string | null; storefrontId?: string | null }

const TEST_TYPES: Record<string, { label: string; field: string }> = {
  hero: { label: "Hero cím", field: "hero_title" },
  subtitle: { label: "Hero alcím", field: "hero_subtitle" },
  cta: { label: "CTA gomb szöveg", field: "cta_text" },
  about: { label: "Bemutatkozó szöveg", field: "about_text" },
};

const rate = (c: number, n: number) => (n > 0 ? (c / n) * 100 : 0);

const PartnerAbTestsTab = ({ partnerId, storefrontId }: Props) => {
  const [tests, setTests] = useState<any[]>([]);
  const [type, setType] = useState("hero");
  const [goal, setGoal] = useState("magasabb konverzió");
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!partnerId) return;
    const { data } = await supabase.from("partner_ab_tests").select("*")
      .eq("partner_id", partnerId).order("created_at", { ascending: false });
    setTests(data || []);
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    if (!partnerId) return;
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("partner-workflow-engine", {
      body: { action: "ab_generate", test_type: type, goal },
    });
    if (error || data?.error) {
      setGenerating(false);
      toast({ title: "Hiba", description: data?.error ?? error?.message, variant: "destructive" });
      return;
    }
    const t = data.test ?? {};
    const { error: insErr } = await supabase.from("partner_ab_tests").insert({
      partner_id: partnerId,
      storefront_id: storefrontId ?? null,
      name: t.name || `${TEST_TYPES[type].label} teszt`,
      test_type: type,
      target_field: t.target_field || TEST_TYPES[type].field,
      variant_a: t.variant_a ?? {},
      variant_b: t.variant_b ?? {},
      status: "running",
    });
    setGenerating(false);
    if (insErr) { toast({ title: "Hiba", description: insErr.message, variant: "destructive" }); return; }
    toast({ title: "A/B teszt elindítva", description: t.hypothesis ?? "Két variáns fut párhuzamosan." });
    void load();
  };

  const evaluate = async (t: any) => {
    setBusy(t.id);
    const { data, error } = await supabase.functions.invoke("partner-workflow-engine", {
      body: { action: "ab_evaluate", test_id: t.id },
    });
    setBusy(null);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Kiértékelve", description: data.recommendation });
    void load();
  };

  const applyWinner = async (t: any) => {
    if (!t.winner || !t.storefront_id) {
      toast({ title: "Nem alkalmazható", description: "Nincs nyertes vagy hiányzik a webshop kapcsolat.", variant: "destructive" });
      return;
    }
    const field = t.target_field || TEST_TYPES[t.test_type]?.field;
    const value = (t.winner === "b" ? t.variant_b : t.variant_a)?.value;
    if (!field || value == null) { toast({ title: "Hiányzó adat", variant: "destructive" }); return; }
    const { error } = await supabase.from("partner_storefronts").update({ [field]: value }).eq("id", t.storefront_id);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    await supabase.from("partner_ab_tests").update({ applied_at: new Date().toISOString(), status: "applied" }).eq("id", t.id);
    toast({ title: "Nyertes átvéve", description: `${field} frissítve a webshopon.` });
    void load();
  };

  if (!partnerId) return <p className="text-sm text-muted-foreground">Partner profil szükséges.</p>;

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-foreground/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent" />
          <h3 className="font-bold uppercase tracking-widest text-sm">AI A/B tesztelés</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Az AI két változatot készít, a rendszer méri a megjelenéseket, kattintásokat és konverziót — a nyertest egy kattintással átveheted.
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TEST_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="rounded-none md:col-span-2" value={goal} onChange={e => setGoal(e.target.value)} placeholder="Cél (pl. több kosárba helyezés)" />
        </div>
        <Button className="rounded-none" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Variánsok generálása és teszt indítása
        </Button>
      </Card>

      <div className="space-y-3">
        {tests.length === 0 && <p className="text-sm text-muted-foreground">Még nincs futó teszted.</p>}
        {tests.map(t => {
          const nA = t.variant_a_impressions || t.variant_a_clicks || 0;
          const nB = t.variant_b_impressions || t.variant_b_clicks || 0;
          const rA = rate(t.variant_a_conversions || 0, nA);
          const rB = rate(t.variant_b_conversions || 0, nB);
          return (
            <Card key={t.id} className="rounded-none border-foreground/20 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{TEST_TYPES[t.test_type]?.label ?? t.test_type} · {new Date(t.created_at).toLocaleDateString("hu-HU")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="rounded-none" variant={t.status === "running" ? "secondary" : "default"}>{t.status}</Badge>
                  {t.winner && <Badge className="rounded-none"><Trophy className="h-3 w-3 mr-1" />{String(t.winner).toUpperCase()}</Badge>}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {(["a", "b"] as const).map(v => {
                  const variant = v === "a" ? t.variant_a : t.variant_b;
                  const n = v === "a" ? nA : nB;
                  const conv = v === "a" ? rA : rB;
                  return (
                    <div key={v} className={`border p-3 ${t.winner === v ? "border-accent" : "border-foreground/15"}`}>
                      <div className="text-xs font-bold uppercase tracking-widest mb-1">{v} variáns</div>
                      <p className="text-sm">{variant?.value ?? "—"}</p>
                      {variant?.rationale && <p className="text-[11px] text-muted-foreground mt-1">{variant.rationale}</p>}
                      <div className="mt-2 text-xs text-muted-foreground">{n} megjelenés · {conv.toFixed(1)}% konverzió</div>
                      <Progress value={Math.min(100, conv * 5)} className="h-1 mt-1 rounded-none" />
                    </div>
                  );
                })}
              </div>

              {t.ai_recommendation && (
                <p className="text-xs border-l-2 border-accent pl-2">
                  <BarChart3 className="h-3 w-3 inline mr-1" />{t.ai_recommendation}
                  {t.confidence != null && ` (${Number(t.confidence).toFixed(1)}% megbízhatóság)`}
                </p>
              )}

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => evaluate(t)} disabled={busy === t.id}>
                  {busy === t.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <BarChart3 className="h-3 w-3 mr-1" />} Kiértékelés
                </Button>
                <Button size="sm" className="rounded-none" onClick={() => applyWinner(t)} disabled={!t.winner || !!t.applied_at}>
                  <Check className="h-3 w-3 mr-1" />{t.applied_at ? "Átvéve" : "Nyertes átvétele"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PartnerAbTestsTab;

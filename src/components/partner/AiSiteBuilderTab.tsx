import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import MediaImage from "@/components/partner/MediaImage";
import { Sparkles, Wand2, Check, Loader2, ImagePlus } from "lucide-react";

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
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refining, setRefining] = useState(false);
  const [withImages, setWithImages] = useState(true);
  const [imaging, setImaging] = useState(false);
  const [withPages, setWithPages] = useState(true);
  const [withProducts, setWithProducts] = useState(true);

  const generate = async () => {
    if (prompt.trim().length < 5) {
      toast({ title: "Írd le mit szeretnél", description: "Pár mondat is elég.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("partner-site-builder", {
        body: {
          prompt,
          partner_id: partnerId,
          mode: "build",
          target_score: 95,
          max_rounds: 2,
          generate_images: withImages,
        },
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

  const refine = async () => {
    if (!result?.patch) return;
    if (refinePrompt.trim().length < 3) {
      toast({ title: "Írd le a módosítást", description: "Pl.: legyen világosabb és barátságosabb.", variant: "destructive" });
      return;
    }
    setRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-site-builder", {
        body: {
          prompt: refinePrompt,
          partner_id: partnerId,
          mode: "refine",
          base_patch: result.patch,
          target_score: 92,
          max_rounds: 1,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setResult(data);
      setRefinePrompt("");
      toast({ title: "Frissítve", description: data?.explanation?.slice(0, 120) });
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message || "Nem sikerült finomítani.", variant: "destructive" });
    } finally {
      setRefining(false);
    }
  };

  const regenerateImages = async () => {
    if (!result?.patch) return;
    setImaging(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-site-builder", {
        body: { partner_id: partnerId, mode: "images", base_patch: result.patch, prompt: refinePrompt },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setResult({ ...result, patch: data.patch, images: data.images });
      toast({ title: "Új képek készültek" });
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message || "Nem sikerült képet készíteni.", variant: "destructive" });
    } finally {
      setImaging(false);
    }
  };

  const applyPagesAndProducts = async () => {
    let pageCount = 0;
    let productCount = 0;

    if (withPages && Array.isArray(result?.pages) && result.pages.length) {
      const rows = result.pages.map((p: any, i: number) => ({
        partner_id: partnerId,
        slug: String(p.slug),
        title: String(p.title),
        content_html: String(p.content_html || ""),
        meta_title: p.meta_title ? String(p.meta_title) : null,
        meta_description: p.meta_description ? String(p.meta_description) : null,
        is_published: true,
        sort_order: i,
      }));
      const { error } = await supabase
        .from("partner_pages")
        .upsert(rows, { onConflict: "partner_id,slug" });
      if (error) throw new Error(`Aloldalak: ${error.message}`);
      pageCount = rows.length;
    }

    if (withProducts && Array.isArray(result?.product_ideas) && result.product_ideas.length) {
      const suffix = Math.random().toString(36).slice(2, 6);
      const rows = result.product_ideas.map((p: any) => ({
        partner_id: partnerId,
        slug: `${String(p.slug || "termek")}-${suffix}`,
        title: String(p.title),
        description: String(p.description || ""),
        price_huf: Math.max(0, Math.round(Number(p.suggested_price_huf) || 0)),
        category: p.category || null,
        product_type: String(p.product_type || "clothing"),
        fulfillment_type: String(p.fulfillment_type || "physical"),
        stock_qty: 0,
        status: "draft",
      }));
      const { error } = await supabase.from("partner_products").insert(rows);
      if (error) throw new Error(`Termékek: ${error.message}`);
      productCount = rows.length;
    }

    return { pageCount, productCount };
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
        const name = String(result.patch.display_name || "webshop");
        const slug =
          name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 40) || "webshop";
        const { error } = await supabase.from("partner_storefronts").insert({
          partner_id: partnerId,
          slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
          display_name: name,
          ...result.patch,
        });
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
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={withImages}
            onChange={(e) => setWithImages(e.target.checked)}
            className="h-4 w-4 accent-current"
          />
          Készüljenek AI képek is a főoldalra (kicsit tovább tart)
        </label>
        <Button onClick={generate} disabled={loading} className="rounded-none">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          {loading ? "Építés…" : "Webshop generálása"}
        </Button>
      </Card>

      {result?.strategy && (
        <Card className="rounded-none border-border p-5 space-y-2">
          <h4 className="font-heading">Márkastratégia</h4>
          {result.strategy.positioning && <p className="text-sm">{result.strategy.positioning}</p>}
          {result.strategy.audience && (
            <p className="text-sm text-muted-foreground">Célközönség: {result.strategy.audience}</p>
          )}
          {Array.isArray(result.strategy.value_props) && (
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              {result.strategy.value_props.slice(0, 3).map((v: string, i: number) => <li key={i}>{v}</li>)}
            </ul>
          )}
        </Card>
      )}

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

          {result.qa && (
            <div className="border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm font-medium">Minőségi pontszám</span>
                <Badge variant="outline" className="rounded-none">{Number(result.qa.total ?? 0)}/100</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.qa.scores || {}).map(([k, v]) => (
                  <span key={k} className="text-[11px] border border-border px-2 py-1 text-muted-foreground">
                    {k}: {Number(v)}
                  </span>
                ))}
              </div>
              {result.qa.verdict && <p className="text-xs text-muted-foreground">{result.qa.verdict}</p>}
              {!!result.warnings?.length && (
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                  {result.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="border border-border p-3 space-y-2">
            <div className="text-sm font-medium">Finomítás</div>
            <Textarea
              rows={2}
              className="rounded-none"
              placeholder="Pl.: legyen világosabb háttér, a hero cím legyen rövidebb, hangsúlyozzuk az ingyenes szállítást…"
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={refine} disabled={refining} className="rounded-none">
                {refining ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                {refining ? "Finomítás…" : "Módosítás kérése"}
              </Button>
              <Button variant="outline" onClick={regenerateImages} disabled={imaging} className="rounded-none">
                {imaging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-2" />}
                {imaging ? "Képek készülnek…" : "Új képek kérése"}
              </Button>
            </div>
          </div>

          {["logo_url", "hero_image_url", "section1_image_url", "section2_image_url"].some((k) => result.patch[k]) && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {["logo_url", "hero_image_url", "section1_image_url", "section2_image_url"].map((k) =>
                result.patch[k] ? (
                  <div key={k} className="border border-border p-2 space-y-1">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {k.replace("_url", "").replace("_image", "")}
                    </div>
                    <MediaImage
                      bucket="partner-storefront-media"
                      path={String(result.patch[k])}
                      alt="AI kép"
                      className="w-full h-24 object-cover"
                    />
                  </div>
                ) : null,
              )}
            </div>
          )}




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

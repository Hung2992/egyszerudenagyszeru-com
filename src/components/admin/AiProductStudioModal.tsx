import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Image as ImageIcon, X, Check, Loader2, RefreshCw } from "lucide-react";

interface Props {
  productId: string;
  seed: {
    name?: string;
    category?: string;
    brand?: string;
    material?: string;
  };
  onClose: () => void;
  onApplied: (fields: Record<string, any>) => void;
}

type Content = {
  seo_title?: string;
  meta_description?: string;
  short_description?: string;
  long_description?: string;
  bullet_points?: string[];
  social_posts?: {
    facebook?: string;
    instagram?: string;
    ad_headline?: string;
    ad_cta?: string;
  };
};

type Score = {
  keyword_coverage: number;
  readability: number;
  conversion_power: number;
  overall: number;
};

const AiProductStudioModal = ({ productId, seed, onClose, onApplied }: Props) => {
  const [form, setForm] = useState({
    name: seed.name || "",
    category: seed.category || "",
    brand: seed.brand || "",
    material: seed.material || "",
    features: "",
    audience: "18-30 éves férfiak",
    keywords: "",
    tone: "közvetlen, magabiztos, streetwear",
    imgStyle: "modern, minimalista, sötét háttér",
    imgExtra: "",
  });
  const [loadingText, setLoadingText] = useState(false);
  const [loadingImg, setLoadingImg] = useState(false);
  const [applying, setApplying] = useState(false);
  const [content, setContent] = useState<Content | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({
    seo_title: true,
    meta_description: true,
    short_description: true,
    long_description: true,
    bullet_points: true,
    social_posts: true,
    ai_hero_image_url: true,
  });

  const call = async (action: "text" | "image" | "apply", payload: any) => {
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) throw new Error("Nincs bejelentkezve");
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-product-studio`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action, productId, ...payload }),
      },
    );
    const j = await res.json();
    if (!res.ok || j.error) throw new Error(j.error || `HTTP ${res.status}`);
    return j;
  };

  const generateText = async () => {
    if (!form.name.trim()) {
      toast({ title: "Add meg a terméknevet", variant: "destructive" });
      return;
    }
    setLoadingText(true);
    try {
      const r = await call("text", { input: form });
      setContent(r.content);
      setScore(r.score);
      toast({ title: "AI szöveg kész", description: `Overall SEO: ${r.score?.overall}%` });
    } catch (e: any) {
      toast({ title: "Szöveg hiba", description: e.message, variant: "destructive" });
    } finally {
      setLoadingText(false);
    }
  };

  const generateImage = async () => {
    if (!form.name.trim()) {
      toast({ title: "Add meg a terméknevet", variant: "destructive" });
      return;
    }
    setLoadingImg(true);
    try {
      const r = await call("image", {
        input: {
          name: form.name,
          category: form.category,
          style: form.imgStyle,
          audience: form.audience,
          extra: form.imgExtra,
        },
      });
      setImageUrl(r.imageUrl);
      toast({ title: "Kép kész" });
    } catch (e: any) {
      toast({ title: "Kép hiba", description: e.message, variant: "destructive" });
    } finally {
      setLoadingImg(false);
    }
  };

  const applyAll = async () => {
    if (!content && !imageUrl) return;
    setApplying(true);
    try {
      const fields: Record<string, any> = {};
      if (content) {
        if (selected.seo_title && content.seo_title) fields.seo_title = content.seo_title;
        if (selected.meta_description && content.meta_description)
          fields.meta_description = content.meta_description;
        if (selected.short_description && content.short_description)
          fields.short_description = content.short_description;
        if (selected.long_description && content.long_description) {
          fields.long_description = content.long_description;
          fields.description = content.long_description;
        }
        if (selected.bullet_points && content.bullet_points)
          fields.bullet_points = content.bullet_points;
        if (selected.social_posts && content.social_posts)
          fields.social_posts = content.social_posts;
      }
      if (imageUrl && selected.ai_hero_image_url) fields.ai_hero_image_url = imageUrl;

      if (Object.keys(fields).length === 0) {
        toast({ title: "Nincs kiválasztott mező" });
        return;
      }
      await call("apply", { fields });
      toast({ title: "Alkalmazva", description: Object.keys(fields).join(", ") });
      onApplied(fields);
      onClose();
    } catch (e: any) {
      toast({ title: "Mentés hiba", description: e.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 bg-muted overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${value}%`,
            background: value >= 80 ? "#10b981" : value >= 60 ? "#f59e0b" : "#ef4444",
          }}
        />
      </div>
      <span className="w-10 text-right font-mono">{value}%</span>
    </div>
  );

  const Row = ({
    k,
    label,
    children,
  }: {
    k: string;
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={!!selected[k]}
          onCheckedChange={(v) => setSelected((s) => ({ ...s, [k]: !!v }))}
        />
        <Label className="text-xs font-medium uppercase tracking-wider">{label}</Label>
      </div>
      <div className="pl-6 text-sm">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-background border border-border w-full max-w-5xl my-8">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">AI Product Studio</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-none">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          {/* INPUT */}
          <div className="p-4 space-y-3 border-r border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider">1. Input</h3>
            {[
              ["name", "Terméknév"],
              ["category", "Kategória"],
              ["brand", "Márka"],
              ["material", "Anyag / összetevő"],
              ["features", "Főbb tulajdonságok"],
              ["audience", "Célközönség"],
              ["keywords", "Kulcsszavak (vesszővel)"],
              ["tone", "Hangnem"],
            ].map(([k, label]) => (
              <div key={k}>
                <Label className="text-[11px] uppercase tracking-wider">{label}</Label>
                <Input
                  value={(form as any)[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="rounded-none text-xs h-8 mt-1"
                />
              </div>
            ))}
            <Button
              onClick={generateText}
              disabled={loadingText}
              className="w-full rounded-none"
            >
              {loadingText ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Szöveg generálása
            </Button>

            <div className="pt-3 border-t border-border space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider">Hero kép</h3>
              <div>
                <Label className="text-[11px] uppercase tracking-wider">Kép stílus</Label>
                <Input
                  value={form.imgStyle}
                  onChange={(e) => setForm({ ...form, imgStyle: e.target.value })}
                  className="rounded-none text-xs h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-wider">Extra utasítás</Label>
                <Textarea
                  value={form.imgExtra}
                  onChange={(e) => setForm({ ...form, imgExtra: e.target.value })}
                  className="rounded-none text-xs mt-1"
                  rows={2}
                />
              </div>
              <Button
                onClick={generateImage}
                disabled={loadingImg}
                variant="outline"
                className="w-full rounded-none"
              >
                {loadingImg ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                Kép generálása
              </Button>
            </div>
          </div>

          {/* PREVIEW */}
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider">2. Előnézet & jóváhagyás</h3>

            {score && (
              <div className="border border-border p-3 space-y-1.5 bg-muted/30">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>AI SEO pontszám</span>
                  <span className="font-mono">{score.overall}%</span>
                </div>
                <ScoreBar label="Kulcsszó lefedés" value={score.keyword_coverage} />
                <ScoreBar label="Olvashatóság" value={score.readability} />
                <ScoreBar label="Konverziós erő" value={score.conversion_power} />
              </div>
            )}

            {content && (
              <div className="space-y-2">
                {content.seo_title && (
                  <Row k="seo_title" label={`SEO cím (${content.seo_title.length})`}>
                    {content.seo_title}
                  </Row>
                )}
                {content.meta_description && (
                  <Row k="meta_description" label={`Meta leírás (${content.meta_description.length})`}>
                    {content.meta_description}
                  </Row>
                )}
                {content.short_description && (
                  <Row k="short_description" label="Rövid leírás">
                    {content.short_description}
                  </Row>
                )}
                {content.long_description && (
                  <Row k="long_description" label="Hosszú SEO leírás">
                    <div className="whitespace-pre-wrap">{content.long_description}</div>
                  </Row>
                )}
                {content.bullet_points && content.bullet_points.length > 0 && (
                  <Row k="bullet_points" label="Előny bulletek">
                    <ul className="list-disc pl-4 space-y-1">
                      {content.bullet_points.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </Row>
                )}
                {content.social_posts && (
                  <Row k="social_posts" label="Közösségi posztok">
                    <div className="space-y-1 text-xs">
                      {content.social_posts.facebook && (
                        <div><b>FB:</b> {content.social_posts.facebook}</div>
                      )}
                      {content.social_posts.instagram && (
                        <div><b>IG:</b> {content.social_posts.instagram}</div>
                      )}
                      {content.social_posts.ad_headline && (
                        <div><b>Ad headline:</b> {content.social_posts.ad_headline}</div>
                      )}
                      {content.social_posts.ad_cta && (
                        <div><b>CTA:</b> {content.social_posts.ad_cta}</div>
                      )}
                    </div>
                  </Row>
                )}
              </div>
            )}

            {imageUrl && (
              <Row k="ai_hero_image_url" label="AI Hero kép">
                <img src={imageUrl} alt="AI hero" className="w-full max-h-72 object-contain border border-border" />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="ghost" onClick={generateImage} className="rounded-none text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" /> Új variáció
                  </Button>
                </div>
              </Row>
            )}

            {!content && !imageUrl && (
              <div className="text-xs text-muted-foreground text-center py-12 border border-dashed border-border">
                Kattints a bal oldalon a generálásra, az eredmény ide kerül előnézetbe.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border p-4 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Csak a bepipált mezők kerülnek elmentésre a termékbe.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-none">
              Mégse
            </Button>
            <Button
              onClick={applyAll}
              disabled={applying || (!content && !imageUrl)}
              className="rounded-none"
            >
              {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Kijelöltek alkalmazása
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiProductStudioModal;

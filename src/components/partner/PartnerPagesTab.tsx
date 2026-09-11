import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Sparkles, ExternalLink, Trash2, RefreshCw, Globe } from "lucide-react";

interface Props { partnerId: string; storefrontSlug?: string | null; }

// AI Product Studio – partner oldalak: AI-val generált külön aloldalak a webshopba
const PartnerPagesTab = ({ partnerId, storefrontSlug }: Props) => {
  const [prompt, setPrompt] = useState("");
  const [pages, setPages] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("partner_pages")
      .select("id, slug, title, is_published, updated_at")
      .eq("partner_id", partnerId)
      .order("updated_at", { ascending: false });
    setPages(data || []);
  };

  useEffect(() => { void load(); }, [partnerId]);

  const generate = async () => {
    if (prompt.trim().length < 3) {
      toast({ title: "Írd le, milyen oldalt szeretnél", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-studio", {
        body: { action: "page", input: { prompt } },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "AI hiba");
      setLastExplanation((data as any).explanation || null);
      setPrompt("");
      toast({ title: "Oldal elkészült", description: `„${(data as any)?.page?.title}” — kapcsold be a publikálást a listában.` });
      await load();
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message || "Ismeretlen hiba", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const togglePublish = async (p: any) => {
    const { error } = await supabase.from("partner_pages").update({ is_published: !p.is_published }).eq("id", p.id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else await load();
  };

  const remove = async (p: any) => {
    if (!confirm(`Törlöd a „${p.title}” oldalt?`)) return;
    const { error } = await supabase.from("partner_pages").delete().eq("id", p.id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else await load();
  };

  const pageUrl = (p: any) => storefrontSlug ? `/b/${storefrontSlug}/oldal/${p.slug}` : null;

  return (
    <div className="space-y-6">
    <AiServiceProductGenerator partnerId={partnerId} />
    <Card className="rounded-none border-foreground/20 p-6 space-y-5">
      <div>
        <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" /> AI aloldal készítő
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Írd le, milyen külön oldalt szeretnél a webshopodba (pl. „Rólunk", „Szállítási infók", „Lookbook", „Akciók") — az AI megírja, elmenti, és a webshopod része lesz.
        </p>
      </div>

      <Textarea
        className="rounded-none"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="pl. Készíts egy Szállítási infók oldalt: GLS és Foxpost, 1-3 munkanap, ingyenes 20.000 Ft felett…"
      />
      <div className="flex items-center gap-3">
        <Button className="rounded-none" onClick={generate} disabled={generating}>
          {generating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {generating ? "AI dolgozik…" : "Oldal generálása AI-val"}
        </Button>
        {lastExplanation && <span className="text-xs text-muted-foreground">{lastExplanation}</span>}
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Oldalaid ({pages.length})</div>
        {pages.length === 0 && <div className="text-sm text-muted-foreground">Még nincs aloldalad. Generálj egyet fent!</div>}
        {pages.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border border-foreground/15 p-3">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{p.title}</div>
              <div className="text-[11px] text-muted-foreground font-mono truncate">
                {pageUrl(p) || `/oldal/${p.slug}`}
              </div>
            </div>
            <Badge variant={p.is_published ? "default" : "outline"} className="rounded-none text-[10px]">
              {p.is_published ? "Élő" : "Piszkozat"}
            </Badge>
            <Switch checked={!!p.is_published} onCheckedChange={() => togglePublish(p)} />
            {pageUrl(p) && (
              <a href={`${pageUrl(p)}${p.is_published ? "" : "?preview=editor"}`} target="_blank" rel="noreferrer" className="p-1 hover:text-accent">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button onClick={() => remove(p)} className="p-1 hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default PartnerPagesTab;

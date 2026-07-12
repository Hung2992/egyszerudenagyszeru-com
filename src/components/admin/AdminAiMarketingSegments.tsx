// Admin AI Marketing Segments panel - vásárlói szegmentáció + kampány javaslat
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Sparkles, Users, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Segment {
  id: string;
  segment_key: string;
  name: string;
  description: string;
  user_count: number;
  suggested_campaign: any;
  generated_at: string;
}

const SEGMENT_COLORS: Record<string, string> = {
  vip: "border-accent text-accent",
  dormant: "border-destructive text-destructive",
  new: "border-blue-500 text-blue-500",
  active: "border-green-500 text-green-500",
};

const AdminAiMarketingSegments = () => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("marketing_segments" as any) as any)
      .select("*").order("user_count", { ascending: false });
    setSegments(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-marketing-auto", { body: {} });
      if (error) throw error;
      toast({ title: "Kész!", description: `${data?.segments?.length || 0} szegmens frissítve AI kampányjavaslatokkal.` });
      await load();
    } catch (err: any) {
      toast({ title: "Hiba", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border border-foreground p-4 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider">AI Vásárlói Szegmensek</h3>
            <p className="text-[10px] text-muted-foreground">Automatikus csoportosítás és kampány javaslatok</p>
          </div>
        </div>
        <Button onClick={generate} disabled={generating} size="sm" className="rounded-none uppercase text-[10px] h-8">
          {generating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          {generating ? "Generálás..." : "AI generálás"}
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Betöltés...</p>
      ) : segments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Még nincsenek szegmensek. Kattints az "AI generálás" gombra.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {segments.map(s => (
            <div key={s.id} className={`border-l-2 border-r border-t border-b border-border bg-background p-3 ${SEGMENT_COLORS[s.segment_key] || ""}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">{s.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span className="text-lg font-bold">{s.user_count}</span>
                </div>
              </div>
              {s.suggested_campaign && (
                <div className="border-t border-border pt-2 mt-2 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-accent">AI kampány javaslat</p>
                  <p className="text-[11px] font-semibold">{s.suggested_campaign.subject}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{s.suggested_campaign.content}</p>
                  <div className="flex items-center gap-2 text-[9px] pt-1">
                    {s.suggested_campaign.suggested_discount_percent > 0 && (
                      <span className="border border-accent px-1.5 py-0.5 text-accent">
                        -{s.suggested_campaign.suggested_discount_percent}%
                      </span>
                    )}
                    {s.suggested_campaign.cta_text && (
                      <span className="border border-border px-1.5 py-0.5">
                        CTA: {s.suggested_campaign.cta_text}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <p className="text-[9px] text-muted-foreground mt-2">
                Frissítve: {new Date(s.generated_at).toLocaleString("hu-HU")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAiMarketingSegments;

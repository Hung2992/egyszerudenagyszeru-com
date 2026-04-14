import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Cpu, Ruler, TrendingUp } from "lucide-react";

interface Props { userId: string; }

const AiSizeRecommender = ({ userId }: Props) => {
  const [recs, setRecs] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase.from("ai_size_recommendations" as any) as any)
        .select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
      setRecs(data || []);
      setLoaded(true);
    };
    fetch();
  }, [userId]);

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Cpu className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI méretajánló</p>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Korábbi vásárlásaid alapján személyre szabott méretjavaslatok. Minél többet vásárolsz, annál pontosabb lesz!
      </p>

      {recs.length > 0 ? (
        <div className="space-y-2">
          {recs.map((r: any) => (
            <div key={r.id} className="border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-bold text-foreground">{r.recommended_size}</span>
                </div>
                {r.confidence_score && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-accent" />
                    <span className="text-[9px] text-accent font-bold">{Math.round(r.confidence_score * 100)}%</span>
                  </div>
                )}
              </div>
              {r.reasoning && <p className="text-[9px] text-muted-foreground mt-1">{r.reasoning}</p>}
              <div className="flex items-center gap-3 mt-1">
                {r.based_on_orders > 0 && (
                  <span className="text-[9px] text-muted-foreground">{r.based_on_orders} korábbi rendelés alapján</span>
                )}
                <span className="text-[9px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("hu-HU")}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-border p-4 text-center space-y-2">
          <Cpu className="h-6 w-6 text-muted-foreground/40 mx-auto" />
          <p className="text-xs text-muted-foreground">Még nincs elég vásárlási adat a méretajánláshoz</p>
          <p className="text-[9px] text-muted-foreground">Vásárolj legalább 3 terméket, és az AI személyre szabott méretjavaslatot készít!</p>
        </div>
      )}
    </div>
  );
};

export default AiSizeRecommender;

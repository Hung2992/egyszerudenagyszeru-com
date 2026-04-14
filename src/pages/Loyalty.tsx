import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Gift, Star, TrendingUp, ArrowRight, Crown, Truck, Zap } from "lucide-react";

interface LoyaltyTier {
  id: string;
  name: string;
  min_points: number;
  discount_percentage: number;
  free_shipping: boolean;
  early_access: boolean;
  icon: string;
  sort_order: number;
}

interface PointEntry {
  id: string;
  points: number;
  source: string;
  description: string | null;
  created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  purchase: "Vásárlás",
  review: "Vélemény",
  referral: "Ajánlás",
  bonus: "Bónusz",
  redeem: "Beváltás",
  signup: "Regisztráció",
};

const Loyalty = () => {
  const navigate = useNavigate();
  const [points, setPoints] = useState<PointEntry[]>([]);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const totalPoints = points.reduce((sum, p) => sum + p.points, 0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }

      const [pointsRes, tiersRes] = await Promise.all([
        supabase.from("loyalty_points").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
        (supabase.from("loyalty_tiers" as any) as any).select("*").order("sort_order", { ascending: true }),
      ]);

      setPoints((pointsRes.data || []) as any as PointEntry[]);
      setTiers((tiersRes.data || []) as LoyaltyTier[]);
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Fiókom</p>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">Hűségprogram</h1>
        </div>

        {/* Points card */}
        <div className="relative overflow-hidden border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-6 mb-8">
          <div className="absolute top-4 right-4">
            <Star className="h-16 w-16 text-accent/10" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">Egyenleged</p>
          <p className="text-5xl font-bold text-foreground">{totalPoints.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">pont</p>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-accent" />
              <span>100 Ft = 1 pont</span>
            </div>
            <div className="flex items-center gap-1">
              <Gift className="h-3 w-3 text-accent" />
              <span>100 pont = 500 Ft kedvezmény</span>
            </div>
          </div>
        </div>

        {/* Loyalty Tiers */}
        {tiers.length > 0 && (
          <div className="border border-border bg-card p-5 mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Törzsvásárlói szintek</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tiers.map((tier) => {
                const isCurrentTier = totalPoints >= tier.min_points && 
                  !tiers.some(t => t.min_points > tier.min_points && totalPoints >= t.min_points);
                const isReached = totalPoints >= tier.min_points;
                return (
                  <div
                    key={tier.id}
                    className={`relative p-4 border text-center transition-all ${
                      isCurrentTier
                        ? "border-accent bg-accent/10 shadow-sm"
                        : isReached
                        ? "border-accent/30 bg-accent/5"
                        : "border-border opacity-60"
                    }`}
                  >
                    {isCurrentTier && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[8px] font-bold uppercase tracking-widest px-2 py-0.5">
                        Jelenlegi
                      </span>
                    )}
                    <span className="text-2xl">{tier.icon}</span>
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground mt-2">{tier.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{tier.min_points.toLocaleString()}+ pont</p>
                    <div className="mt-3 space-y-1">
                      {tier.discount_percentage > 0 && (
                        <div className="flex items-center justify-center gap-1 text-[10px] text-accent">
                          <Crown className="h-3 w-3" />
                          <span>{tier.discount_percentage}% kedvezmény</span>
                        </div>
                      )}
                      {tier.free_shipping && (
                        <div className="flex items-center justify-center gap-1 text-[10px] text-accent">
                          <Truck className="h-3 w-3" />
                          <span>Ingyenes szállítás</span>
                        </div>
                      )}
                      {tier.early_access && (
                        <div className="flex items-center justify-center gap-1 text-[10px] text-accent">
                          <Zap className="h-3 w-3" />
                          <span>Korai hozzáférés</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="border border-border bg-card p-5 mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Hogyan működik?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-3">
              <div className="flex h-10 w-10 items-center justify-center bg-accent text-accent-foreground text-sm font-bold mx-auto mb-2">1</div>
              <p className="text-xs font-semibold text-foreground">Vásárolj</p>
              <p className="text-[10px] text-muted-foreground mt-1">Minden 100 Ft = 1 pont</p>
            </div>
            <div className="text-center p-3">
              <div className="flex h-10 w-10 items-center justify-center bg-accent text-accent-foreground text-sm font-bold mx-auto mb-2">2</div>
              <p className="text-xs font-semibold text-foreground">Gyűjts</p>
              <p className="text-[10px] text-muted-foreground mt-1">Véleményekért és ajánlásokért is kapsz</p>
            </div>
            <div className="text-center p-3">
              <div className="flex h-10 w-10 items-center justify-center bg-accent text-accent-foreground text-sm font-bold mx-auto mb-2">3</div>
              <p className="text-xs font-semibold text-foreground">Válts be</p>
              <p className="text-[10px] text-muted-foreground mt-1">100 pont = 500 Ft kedvezmény</p>
            </div>
          </div>
        </div>

        {/* History */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-4">Pont előzmények</h2>
          {points.length === 0 ? (
            <div className="text-center py-12 border border-border bg-card">
              <Gift className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Még nincsenek pontjaid</p>
              <Button variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={() => navigate("/shop")}>
                Vásárolj és gyűjts pontokat
                <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {points.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border border-border bg-card p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {SOURCE_LABELS[entry.source] || entry.source}
                    </p>
                    {entry.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                      {new Date(entry.created_at).toLocaleDateString("hu-HU")}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${entry.points >= 0 ? "text-green-500" : "text-destructive"}`}>
                    {entry.points >= 0 ? "+" : ""}{entry.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Loyalty;

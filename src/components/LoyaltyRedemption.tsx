import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Award, Gift, ShoppingBag } from "lucide-react";

const LoyaltyRedemption = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase.from("loyalty_redemption_rules" as any) as any)
        .select("*").eq("is_active", true).order("points_required", { ascending: true });
      setRules(data || []);
      setLoaded(true);
    };
    fetch();
  }, []);

  if (!loaded) return null;

  const typeLabel: Record<string, string> = {
    discount: "Kedvezmény",
    free_shipping: "Ingyenes szállítás",
    gift: "Ajándék termék",
    cashback: "Visszatérítés",
  };

  const typeIcon: Record<string, typeof Gift> = {
    discount: Award,
    free_shipping: ShoppingBag,
    gift: Gift,
    cashback: Award,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Award className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hűségpont beváltás</p>
      </div>
      <p className="text-[10px] text-muted-foreground">A hűségpontjaid beváltási lehetőségei:</p>

      {rules.length > 0 ? (
        <div className="space-y-2">
          {rules.map((r: any) => {
            const Icon = typeIcon[r.reward_type] || Award;
            return (
              <div key={r.id} className="border border-border p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 text-accent mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-foreground">{r.rule_name}</p>
                      {r.description && <p className="text-[9px] text-muted-foreground mt-0.5">{r.description}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] uppercase tracking-wider text-accent font-bold">
                          {r.points_required} pont
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          {typeLabel[r.reward_type] || r.reward_type}
                        </span>
                        {r.reward_value > 0 && (
                          <span className="text-[9px] text-muted-foreground">
                            Érték: {r.reward_value} {r.reward_type === "discount" ? "%" : "Ft"}
                          </span>
                        )}
                      </div>
                      {r.min_order_amount > 0 && (
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          Min. rendelés: {r.min_order_amount} Ft
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">Jelenleg nincs elérhető beváltási szabály</p>
      )}
    </div>
  );
};

export default LoyaltyRedemption;

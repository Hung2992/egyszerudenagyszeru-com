import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Trash2, Pause, Play } from "lucide-react";

interface Reorder {
  id: string;
  product_id: string;
  interval_days: number;
  next_order_date: string | null;
  is_active: boolean;
  quantity: number;
}

interface Props {
  userId: string;
}

const INTERVALS = [
  { value: 14, label: "2 hetente" },
  { value: 30, label: "Havonta" },
  { value: 60, label: "2 havonta" },
  { value: 90, label: "Negyedévente" },
];

const AutoReorder = ({ userId }: Props) => {
  const [reorders, setReorders] = useState<Reorder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const { data } = await (supabase.from("auto_reorders" as any) as any)
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setReorders((data || []) as Reorder[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [userId]);

  const toggle = async (id: string, is_active: boolean) => {
    await (supabase.from("auto_reorders" as any) as any)
      .update({ is_active: !is_active }).eq("id", id);
    toast({ title: !is_active ? "Újrarendelés aktiválva ✓" : "Újrarendelés szüneteltetve" });
    fetch();
  };

  const remove = async (id: string) => {
    await (supabase.from("auto_reorders" as any) as any).delete().eq("id", id);
    toast({ title: "Újrarendelés törölve" });
    fetch();
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <RefreshCw className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Automatikus újrarendelések ({reorders.length})
        </p>
      </div>

      {reorders.length === 0 ? (
        <div className="text-center py-6 border border-border bg-card">
          <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Még nincs beállítva automatikus újrarendelés</p>
          <p className="text-[10px] text-muted-foreground mt-1">A bolt oldalon állíthatsz be termékeknél</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reorders.map(r => {
            const interval = INTERVALS.find(i => i.value === r.interval_days);
            return (
              <div key={r.id} className={`border p-3 space-y-1 ${r.is_active ? "border-accent/30 bg-accent/5" : "border-border bg-card opacity-60"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">Termék #{r.product_id.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {interval?.label || `${r.interval_days} naponta`} · {r.quantity} db
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggle(r.id, r.is_active)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                      {r.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => remove(r.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {r.next_order_date && (
                  <p className="text-[9px] text-muted-foreground">
                    Következő: {new Date(r.next_order_date).toLocaleDateString("hu-HU")}
                  </p>
                )}
                <span className={`inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 ${
                  r.is_active ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                }`}>
                  {r.is_active ? "Aktív" : "Szüneteltetve"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AutoReorder;

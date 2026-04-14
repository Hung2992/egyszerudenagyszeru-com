import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { TrendingDown, Plus, Trash2, Save } from "lucide-react";

interface Props { userId: string; }

const PriceAlerts = ({ userId }: Props) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [productName, setProductName] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchAlerts = async () => {
    const { data } = await (supabase.from("price_alerts" as any) as any)
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setAlerts(data || []);
    setLoaded(true);
  };

  useEffect(() => { fetchAlerts(); }, [userId]);

  const create = async () => {
    if (!productName.trim() || !targetPrice) { toast({ title: "Töltsd ki a mezőket!", variant: "destructive" }); return; }
    setSaving(true);
    await (supabase.from("price_alerts" as any) as any).insert({
      user_id: userId, product_name: productName, target_price: parseFloat(targetPrice),
    });
    toast({ title: "Árfigyelő létrehozva! ✓" });
    setProductName(""); setTargetPrice(""); setShowForm(false); setSaving(false);
    fetchAlerts();
  };

  const remove = async (id: string) => {
    await (supabase.from("price_alerts" as any) as any).delete().eq("id", id);
    toast({ title: "Árfigyelő törölve" }); fetchAlerts();
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-accent" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Árfigyelő</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="text-accent hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {showForm && (
        <div className="border border-border p-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Termék neve</p>
            <Input value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="Pl. Fekete póló XL" className="rounded-none h-9 text-xs" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Célár (Ft)</p>
            <Input value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
              type="number" placeholder="5000" className="rounded-none h-9 text-xs" />
          </div>
          <Button onClick={create} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
            <Save className="h-3 w-3 mr-1" />{saving ? "Mentés..." : "Figyelő létrehozása"}
          </Button>
        </div>
      )}

      {alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between border border-border p-3">
              <div>
                <p className="text-xs font-bold text-foreground">{a.product_name || "Ismeretlen termék"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] uppercase tracking-wider text-accent font-bold">{Number(a.target_price).toLocaleString()} Ft</span>
                  {a.is_triggered && <span className="text-[9px] uppercase tracking-wider text-green-500">● Elérte</span>}
                </div>
              </div>
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <p className="text-xs text-muted-foreground text-center py-4">Még nincs árfigyelőd</p>
      )}
    </div>
  );
};

export default PriceAlerts;

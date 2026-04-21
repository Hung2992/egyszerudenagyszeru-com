import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Gift, Check } from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
};

type Prize = {
  id: string;
  product_id: string;
  is_active: boolean;
  sort_order: number;
  shop_products: Product | null;
};

const GiveawayPrizeManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: prods }, { data: prz }] = await Promise.all([
      supabase
        .from("shop_products")
        .select("id, name, price, image_url")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("giveaway_prizes")
        .select("id, product_id, is_active, sort_order, shop_products(id, name, price, image_url)")
        .order("sort_order", { ascending: true }),
    ]);
    setProducts((prods as Product[]) || []);
    setPrizes((prz as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const addPrize = async (productId: string) => {
    const { error } = await supabase
      .from("giveaway_prizes")
      .insert({ product_id: productId, is_active: true });
    if (error) {
      if (error.code === "23505") toast.info("Ez a termék már nyeremény!");
      else toast.error("Hiba a hozzáadáskor");
      return;
    }
    toast.success("Termék hozzáadva a nyereményekhez!");
    fetchAll();
  };

  const togglePrize = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("giveaway_prizes")
      .update({ is_active: !current })
      .eq("id", id);
    if (error) return toast.error("Hiba a frissítéskor");
    toast.success(current ? "Nyeremény letiltva" : "Nyeremény aktiválva");
    fetchAll();
  };

  const removePrize = async (id: string) => {
    if (!confirm("Biztosan eltávolítod a nyereményekből?")) return;
    const { error } = await supabase.from("giveaway_prizes").delete().eq("id", id);
    if (error) return toast.error("Hiba a törléskor");
    toast.success("Eltávolítva");
    fetchAll();
  };

  const prizeProductIds = new Set(prizes.map((p) => p.product_id));
  const available = products.filter((p) => !prizeProductIds.has(p.id));

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <Gift className="h-5 w-5 text-accent" />
          Nyerhető termékek
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Itt válaszd ki, mely termékeket nyerheti meg a nyertes. A nyilvános nyereményjáték oldalon ezek jelennek meg.
        </p>
      </div>

      {/* Current prizes */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-accent font-bold mb-3">
          Aktív nyeremények ({prizes.filter((p) => p.is_active).length})
        </p>
        {prizes.length === 0 ? (
          <div className="bg-secondary border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Még nincsenek nyeremények. Adj hozzá termékeket alulról!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {prizes.map((prize) => (
              <div
                key={prize.id}
                className={`border-2 ${
                  prize.is_active ? "border-accent bg-accent/5" : "border-border bg-secondary opacity-60"
                } p-3 flex gap-3`}
              >
                <div className="w-16 h-16 bg-background flex-shrink-0 overflow-hidden">
                  {prize.shop_products?.image_url ? (
                    <img
                      src={prize.shop_products.image_url}
                      alt={prize.shop_products.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gift className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground line-clamp-1">
                    {prize.shop_products?.name || "Törölt termék"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {Number(prize.shop_products?.price || 0).toLocaleString("hu-HU")} Ft
                  </p>
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => togglePrize(prize.id, prize.is_active)}
                      className="h-7 text-[10px] rounded-none px-2"
                    >
                      {prize.is_active ? "Letiltás" : "Aktiválás"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removePrize(prize.id)}
                      className="h-7 text-[10px] rounded-none px-2 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new prize */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-3">
          Termék hozzáadása ({available.length} elérhető)
        </p>
        {loading ? (
          <p className="text-xs text-muted-foreground">Betöltés...</p>
        ) : available.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Minden aktív termék már nyeremény.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto bg-secondary border border-border divide-y divide-border">
            {available.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-accent/5">
                <div className="w-10 h-10 bg-background flex-shrink-0 overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Gift className="w-full h-full p-2 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground line-clamp-1">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {Number(p.price).toLocaleString("hu-HU")} Ft
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => addPrize(p.id)}
                  className="h-8 rounded-none uppercase tracking-wider text-[10px] bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Hozzáad
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GiveawayPrizeManager;

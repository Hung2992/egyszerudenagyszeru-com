import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Package, TrendingDown, Eye, EyeOff, Bell, ShoppingCart } from "lucide-react";

interface ShopProduct {
  id: string;
  name: string;
  stock: number;
  is_active: boolean;
  image_url: string | null;
  category: string;
  price: number;
}

const AdminInventoryTab = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [threshold, setThreshold] = useState(5);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const fetchProducts = async () => {
    const { data } = await supabase.from("shop_products").select("id, name, stock, is_active, image_url, category, price").order("stock", { ascending: true });
    if (data) setProducts(data as any);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("store_settings").select("low_stock_threshold").limit(1).single();
    if (data) setThreshold((data as any).low_stock_threshold || 5);
  };

  useEffect(() => { fetchProducts(); fetchSettings(); }, []);

  const updateStock = async (id: string, newStock: number) => {
    await supabase.from("shop_products").update({ stock: newStock }).eq("id", id);
    toast({ title: "Készlet frissítve!" });
    fetchProducts();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("shop_products").update({ is_active: active }).eq("id", id);
    toast({ title: active ? "Termék aktiválva" : "Termék elrejtve" });
    fetchProducts();
  };

  const filtered = products.filter(p => {
    if (filter === "low") return p.stock > 0 && p.stock <= threshold;
    if (filter === "out") return p.stock === 0;
    return true;
  });

  const outOfStock = products.filter(p => p.stock === 0).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= threshold).length;
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold uppercase tracking-wider">Készletkezelés</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-accent" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Összes termék</span>
          </div>
          <p className="text-xl font-bold">{products.length}</p>
        </div>
        <div className="border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-yellow-500" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Alacsony készlet</span>
          </div>
          <p className="text-xl font-bold text-yellow-500">{lowStock}</p>
        </div>
        <div className="border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Elfogyott</span>
          </div>
          <p className="text-xl font-bold text-destructive">{outOfStock}</p>
        </div>
        <div className="border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-accent" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Készletérték</span>
          </div>
          <p className="text-xl font-bold">{totalValue.toLocaleString()} <span className="text-sm text-muted-foreground">Ft</span></p>
        </div>
      </div>

      {/* Low stock alerts */}
      {(lowStock > 0 || outOfStock > 0) && (
        <div className="border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-bold">Újrarendelési figyelmeztetés</span>
          </div>
          {products.filter(p => p.stock === 0).map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-destructive font-medium">⚠ {p.name} — ELFOGYOTT</span>
              <span className="text-xs text-muted-foreground">Ajánlott: újrarendelés azonnal</span>
            </div>
          ))}
          {products.filter(p => p.stock > 0 && p.stock <= threshold).map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-yellow-600 font-medium">⚡ {p.name} — {p.stock} db maradt</span>
              <span className="text-xs text-muted-foreground">Ajánlott: {Math.max(10, threshold * 3)} db rendelés</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "low", "out"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
              filter === f ? "border-accent text-accent bg-accent/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "Mind" : f === "low" ? `Alacsony (${lowStock})` : `Elfogyott (${outOfStock})`}
          </button>
        ))}
      </div>

      {/* Products list */}
      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className={`flex items-center gap-3 border bg-card p-3 ${p.stock === 0 ? "border-destructive/30" : p.stock <= threshold ? "border-yellow-500/30" : ""}`}>
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="h-10 w-10 object-cover border flex-shrink-0" />
            ) : (
              <div className="h-10 w-10 border flex items-center justify-center text-muted-foreground flex-shrink-0">
                <Package className="h-4 w-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate block">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-none text-xs" onClick={() => updateStock(p.id, Math.max(0, p.stock - 1))}>-</Button>
                <Input
                  type="number"
                  value={p.stock}
                  onChange={e => updateStock(p.id, Math.max(0, Number(e.target.value)))}
                  className="w-16 h-7 text-center text-xs"
                />
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-none text-xs" onClick={() => updateStock(p.id, p.stock + 1)}>+</Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => toggleActive(p.id, !p.is_active)}
                title={p.is_active ? "Elrejtés" : "Megjelenítés"}
              >
                {p.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nincs termék ebben a szűrőben.</p>
        )}
      </div>
    </div>
  );
};

export default AdminInventoryTab;

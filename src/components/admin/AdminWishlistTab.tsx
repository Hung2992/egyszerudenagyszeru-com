import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";

interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product_name?: string;
}

const AdminWishlistTab = () => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; uniqueUsers: number; topProducts: { name: string; count: number }[] }>({ total: 0, uniqueUsers: 0, topProducts: [] });

  useEffect(() => {
    const fetch = async () => {
      const { data: wishlistData } = await supabase.from("wishlists").select("*").order("created_at", { ascending: false }).limit(100);
      if (!wishlistData) { setLoading(false); return; }

      const productIds = [...new Set(wishlistData.map(w => w.product_id).filter(Boolean))];
      let productMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: products } = await supabase.from("shop_products").select("id, name").in("id", productIds);
        if (products) productMap = Object.fromEntries(products.map(p => [p.id, p.name]));
      }

      const enriched = wishlistData.map(w => ({ ...w, product_name: productMap[w.product_id] || "Ismeretlen" }));
      setItems(enriched);

      const uniqueUsers = new Set(wishlistData.map(w => w.user_id)).size;
      const countMap: Record<string, number> = {};
      wishlistData.forEach(w => { const name = productMap[w.product_id] || "Ismeretlen"; countMap[name] = (countMap[name] || 0) + 1; });
      const topProducts = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

      setStats({ total: wishlistData.length, uniqueUsers, topProducts });
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2"><Heart className="w-5 h-5" /><h2 className="font-bold text-lg">Kívánságlista & Vásárlói élmény</h2></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Összes kívánság</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
          <p className="text-sm text-muted-foreground">Egyedi felhasználók</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium mb-2">Top kívánt termékek</p>
          {stats.topProducts.map((p, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="truncate">{p.name}</span>
              <Badge variant="secondary">{p.count}</Badge>
            </div>
          ))}
          {stats.topProducts.length === 0 && <p className="text-xs text-muted-foreground">Nincs adat</p>}
        </div>
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>Termék</TableHead><TableHead>Felhasználó</TableHead><TableHead>Dátum</TableHead></TableRow></TableHeader>
        <TableBody>
          {items.slice(0, 50).map(i => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.product_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{i.user_id.slice(0, 8)}...</TableCell>
              <TableCell className="text-sm">{new Date(i.created_at).toLocaleDateString("hu-HU")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek kívánságlista elemek.</p>}
    </div>
  );
};

export default AdminWishlistTab;

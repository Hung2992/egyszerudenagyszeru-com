import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, Loader2, Package, Plus, Check, X, Pencil, Image } from "lucide-react";

interface ImportedProduct {
  product_name: string;
  description: string | null;
  unit_cost: number;
  currency: string;
  product_sku: string | null;
  supplier_name: string;
  image_url: string | null;
  category: string | null;
  sizes_available: string | null;
  colors_available: string | null;
}

interface ProductLinkImportProps {
  onProductImported: (product: {
    name: string;
    description: string;
    price: number;
    category: string;
    image_url: string | null;
  }) => void;
  onBatchImported?: () => void;
}

const ProductLinkImport = ({ onProductImported, onBatchImported }: ProductLinkImportProps) => {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [url, setUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  
  // Preview/edit state for single import
  const [preview, setPreview] = useState<ImportedProduct | null>(null);
  const [editingPreview, setEditingPreview] = useState<ImportedProduct | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");

  const importSingle = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setPreview(null);
    setEditingPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-product", {
        body: { url: url.trim() },
      });
      if (error) throw error;
      if (!data?.success || !data?.data) {
        toast({ title: "Hiba", description: data?.error || "Nem sikerült a termék kinyerése", variant: "destructive" });
        return;
      }
      const p = data.data as ImportedProduct;
      setPreview(p);
      setEditingPreview({ ...p });
      setSourceUrl(url.trim());
      toast({ title: "Termék betöltve!", description: "Ellenőrizd és szerkeszd az adatokat mentés előtt." });
    } catch (err: any) {
      toast({ title: "Hiba", description: err.message || "Import sikertelen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = () => {
    if (!editingPreview) return;
    onProductImported({
      name: editingPreview.product_name || "",
      description: editingPreview.description || "",
      price: editingPreview.unit_cost || 0,
      category: editingPreview.category || "Egyéb",
      image_url: editingPreview.image_url || null,
    });
    setUrl("");
    setPreview(null);
    setEditingPreview(null);
    setSourceUrl("");
    toast({ title: "Termék hozzáadva!", description: `${editingPreview.product_name}` });
  };

  const cancelPreview = () => {
    setPreview(null);
    setEditingPreview(null);
    setSourceUrl("");
  };

  const importBatch = async () => {
    const urls = batchUrls.split("\n").map(u => u.trim()).filter(u => u.startsWith("http"));
    if (urls.length === 0) {
      toast({ title: "Hiba", description: "Adj meg legalább egy érvényes URL-t!", variant: "destructive" });
      return;
    }
    if (urls.length > 20) {
      toast({ title: "Hiba", description: "Maximum 20 URL egyszerre!", variant: "destructive" });
      return;
    }

    setLoading(true);
    setBatchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-product", {
        body: { urls },
      });
      if (error) throw error;
      if (!data?.success || !data?.results) {
        toast({ title: "Hiba", description: "Tömeges import sikertelen", variant: "destructive" });
        return;
      }

      const successful = data.results.filter((r: any) => r.success);
      const failed = data.results.filter((r: any) => !r.success);

      for (const r of successful) {
        const p = r.data;
        await supabase.from("shop_products").insert({
          name: p.product_name || "Ismeretlen termék",
          description: p.description || null,
          price: p.unit_cost || 0,
          category: p.category || "Egyéb",
          image_url: p.image_url || null,
          is_active: true,
          stock: 0,
          sizes: p.sizes_available ? p.sizes_available.split(",").map((s: string) => s.trim()) : [],
          colors: p.colors_available ? p.colors_available.split(",").map((s: string) => s.trim()) : [],
        });
      }

      setBatchResults(data.results);
      toast({
        title: "Tömeges import kész!",
        description: `${successful.length} sikeres, ${failed.length} sikertelen`,
      });
      if (onBatchImported) onBatchImported();
      setBatchUrls("");
    } catch (err: any) {
      toast({ title: "Hiba", description: err.message || "Import sikertelen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-bold uppercase tracking-wider">Termék importálása linkből</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Illeszd be bármely webshop (Shein, AliExpress, Zara, H&M, stb.) terméklink-jét — az AI automatikusan kinyeri az adatokat.
      </p>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === "single" ? "default" : "outline"}
          className="rounded-none text-xs uppercase tracking-wider"
          onClick={() => setMode("single")}
        >
          Egy link
        </Button>
        <Button
          size="sm"
          variant={mode === "batch" ? "default" : "outline"}
          className="rounded-none text-xs uppercase tracking-wider"
          onClick={() => setMode("batch")}
        >
          Tömeges (max 20)
        </Button>
      </div>

      {mode === "single" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.shein.com/product/..."
              className="flex-1"
              disabled={loading}
            />
            <Button size="sm" onClick={importSingle} disabled={loading || !url.trim()} className="rounded-none text-xs uppercase tracking-wider">
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              {loading ? "Betöltés..." : "Betöltés"}
            </Button>
          </div>

          {/* Preview & Edit */}
          {editingPreview && (
            <div className="border border-primary/30 bg-accent/10 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Importált adatok — szerkeszd mentés előtt</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={cancelPreview} className="rounded-none text-xs h-7 px-2">
                    <X className="w-3 h-3 mr-1" /> Mégse
                  </Button>
                  <Button size="sm" onClick={confirmImport} className="rounded-none text-xs h-7 px-2">
                    <Check className="w-3 h-3 mr-1" /> Mentés termékként
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Image preview */}
                <div className="space-y-2">
                  {editingPreview.image_url ? (
                    <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden border">
                      <img src={editingPreview.image_url} alt="" className="object-contain w-full h-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted flex items-center justify-center border">
                      <Image className="w-8 h-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground ml-2">Nincs kép</span>
                    </div>
                  )}
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Kép URL</Label>
                    <Input
                      value={editingPreview.image_url || ""}
                      onChange={e => setEditingPreview({ ...editingPreview, image_url: e.target.value || null })}
                      placeholder="https://..."
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Termék neve</Label>
                    <Input
                      value={editingPreview.product_name}
                      onChange={e => setEditingPreview({ ...editingPreview, product_name: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Beszerzési ár</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingPreview.unit_cost}
                        onChange={e => setEditingPreview({ ...editingPreview, unit_cost: Number(e.target.value) })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Pénznem</Label>
                      <Input
                        value={editingPreview.currency}
                        onChange={e => setEditingPreview({ ...editingPreview, currency: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Kategória</Label>
                    <Input
                      value={editingPreview.category || ""}
                      onChange={e => setEditingPreview({ ...editingPreview, category: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Leírás</Label>
                    <Textarea
                      value={editingPreview.description || ""}
                      onChange={e => setEditingPreview({ ...editingPreview, description: e.target.value })}
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Beszállító</Label>
                      <Input
                        value={editingPreview.supplier_name}
                        onChange={e => setEditingPreview({ ...editingPreview, supplier_name: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">SKU</Label>
                      <Input
                        value={editingPreview.product_sku || ""}
                        onChange={e => setEditingPreview({ ...editingPreview, product_sku: e.target.value || null })}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Méretek</Label>
                      <Input
                        value={editingPreview.sizes_available || ""}
                        onChange={e => setEditingPreview({ ...editingPreview, sizes_available: e.target.value || null })}
                        placeholder="S, M, L, XL"
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Színek</Label>
                      <Input
                        value={editingPreview.colors_available || ""}
                        onChange={e => setEditingPreview({ ...editingPreview, colors_available: e.target.value || null })}
                        placeholder="Fekete, Fehér"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {sourceUrl && (
                <div className="text-[10px] text-muted-foreground truncate pt-1 border-t border-border/30">
                  Forrás: <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">{sourceUrl}</a>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={batchUrls}
            onChange={e => setBatchUrls(e.target.value)}
            placeholder={"https://www.shein.com/product/1\nhttps://www.zara.com/product/2\nhttps://www.hm.com/product/3"}
            rows={5}
            disabled={loading}
          />
          <Button size="sm" onClick={importBatch} disabled={loading || !batchUrls.trim()} className="rounded-none text-xs uppercase tracking-wider">
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Package className="w-4 h-4 mr-1" />}
            {loading ? "Importálás folyamatban..." : "Összes importálása"}
          </Button>
        </div>
      )}

      {batchResults.length > 0 && (
        <div className="text-xs space-y-1 border-t pt-2">
          <p className="font-medium">Eredmények:</p>
          {batchResults.map((r, i) => (
            <div key={i} className={`flex items-center gap-1 ${r.success ? "text-green-500" : "text-destructive"}`}>
              <span>{r.success ? "✓" : "✗"}</span>
              <span>{r.success ? r.data?.product_name : r.error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductLinkImport;

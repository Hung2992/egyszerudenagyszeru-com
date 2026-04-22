import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Layers, Plus, Trash2, Palette, Ruler, Search, Package, AlertTriangle, RefreshCw, Grid3x3 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image_url: string | null;
  colors: string[] | null;
  sizes: string[] | null;
  has_variants: boolean;
};

type Variant = {
  id?: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock: number;
  sku: string | null;
  price_modifier: number;
  is_active: boolean;
  _isNew?: boolean;
  _dirty?: boolean;
};

const AdminProductVariantsTab = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingVariants, setSavingVariants] = useState(false);
  const [bulkStock, setBulkStock] = useState<number>(10);
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shop_products")
      .select("id, name, category, price, stock, image_url, colors, sizes, has_variants")
      .order("name", { ascending: true });
    setProducts((data as any) || []);
    setLoading(false);
  };

  const loadVariants = async (productId: string) => {
    const { data } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });
    setVariants(((data as any) || []).map((v: any) => ({ ...v, _dirty: false })));
  };

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => {
    if (selectedProductId) loadVariants(selectedProductId);
    else setVariants([]);
  }, [selectedProductId]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, search]);

  const totalStock = useMemo(() => variants.reduce((s, v) => s + (Number(v.stock) || 0), 0), [variants]);

  const updateVariant = (idx: number, patch: Partial<Variant>) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch, _dirty: true } : v)));
  };

  const removeVariant = async (idx: number) => {
    const v = variants[idx];
    if (v.id) {
      const ok = confirm(`Biztos törlöd? (${v.color || "—"} / ${v.size || "—"})`);
      if (!ok) return;
      await supabase.from("product_variants").delete().eq("id", v.id);
    }
    setVariants((prev) => prev.filter((_, i) => i !== idx));
    toast({ title: "Variáns törölve" });
  };

  const addVariant = (size?: string, color?: string) => {
    if (!selectedProductId) return;
    setVariants((prev) => [
      ...prev,
      {
        product_id: selectedProductId,
        size: size ?? null,
        color: color ?? null,
        stock: 0,
        sku: null,
        price_modifier: 0,
        is_active: true,
        _isNew: true,
        _dirty: true,
      },
    ]);
  };

  const generateMatrix = () => {
    if (!selectedProduct) return;
    const sizes = selectedProduct.sizes || [];
    const colors = selectedProduct.colors || [];
    if (sizes.length === 0 && colors.length === 0) {
      toast({ title: "A termékhez nincs méret vagy szín megadva", variant: "destructive" });
      return;
    }
    const existing = new Set(variants.map((v) => `${v.size || ""}|${v.color || ""}`));
    const additions: Variant[] = [];
    const combos = sizes.length && colors.length
      ? sizes.flatMap((s) => colors.map((c) => ({ s, c })))
      : sizes.length
      ? sizes.map((s) => ({ s, c: null as any }))
      : colors.map((c) => ({ s: null as any, c }));
    combos.forEach(({ s, c }) => {
      const key = `${s || ""}|${c || ""}`;
      if (!existing.has(key)) {
        additions.push({
          product_id: selectedProduct.id,
          size: s || null,
          color: c || null,
          stock: bulkStock,
          sku: null,
          price_modifier: 0,
          is_active: true,
          _isNew: true,
          _dirty: true,
        });
      }
    });
    if (additions.length === 0) {
      toast({ title: "Minden kombináció már létezik" });
      return;
    }
    setVariants((prev) => [...prev, ...additions]);
    toast({ title: `${additions.length} variáns generálva ${bulkStock} db készlettel` });
  };

  const saveAll = async () => {
    if (!selectedProductId) return;
    setSavingVariants(true);
    try {
      let savedCount = 0;
      for (const v of variants) {
        if (!v._dirty) continue;
        if (v._isNew) {
          const { _isNew, _dirty, id, ...payload } = v as any;
          const { error } = await supabase.from("product_variants").insert(payload);
          if (error) throw error;
        } else if (v.id) {
          const { _isNew, _dirty, id, ...payload } = v as any;
          const { error } = await supabase.from("product_variants").update(payload).eq("id", v.id);
          if (error) throw error;
        }
        savedCount++;
      }
      // Sync aggregate stock + has_variants flag on shop_products
      const newTotal = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
      await supabase.from("shop_products").update({
        stock: newTotal,
        has_variants: variants.length > 0,
      }).eq("id", selectedProductId);
      toast({ title: `✅ ${savedCount} variáns mentve`, description: `Összes készlet: ${newTotal} db` });
      await loadVariants(selectedProductId);
      await loadProducts();
    } catch (e: any) {
      toast({ title: "Mentési hiba", description: e.message, variant: "destructive" });
    } finally {
      setSavingVariants(false);
    }
  };

  const applyBulkStock = () => {
    setVariants((prev) => prev.map((v) => ({ ...v, stock: bulkStock, _dirty: true })));
    toast({ title: `Minden variáns készlete: ${bulkStock} db` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" /> Termék variáns & készlet kezelő
          </h2>
          <p className="text-sm text-muted-foreground">Színenként és méretenként külön készlet beállítása</p>
        </div>
        <Button size="sm" variant="outline" onClick={loadProducts} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Frissítés
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Product list */}
        <div className="border border-border rounded-lg bg-card overflow-hidden flex flex-col max-h-[700px]">
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Termék keresése..."
                className="pl-8 h-9 text-sm"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">{filteredProducts.length} termék</p>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {loading && <p className="p-4 text-xs text-muted-foreground">Betöltés...</p>}
            {!loading && filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                className={`w-full text-left p-3 hover:bg-muted/50 transition-colors flex gap-3 items-center ${
                  selectedProductId === p.id ? "bg-accent/10 border-l-2 border-l-accent" : ""
                }`}
              >
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded" />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.category} · {p.stock} db</p>
                </div>
                {p.has_variants && <Layers className="w-3 h-3 text-accent shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Variant editor */}
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          {!selectedProduct ? (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Válassz egy terméket bal oldalt a variánsok kezeléséhez</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  {selectedProduct.image_url && (
                    <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-14 h-14 object-cover rounded" />
                  )}
                  <div>
                    <h3 className="font-bold text-foreground">{selectedProduct.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedProduct.price.toLocaleString()} Ft · Összes készlet: <strong className="text-foreground">{totalStock} db</strong>
                    </p>
                  </div>
                </div>
                <Button onClick={saveAll} disabled={savingVariants} className="gap-2">
                  <Save className="w-4 h-4" /> {savingVariants ? "Mentés..." : "Összes mentése"}
                </Button>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border border-border rounded p-3 bg-muted/20">
                  <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <Grid3x3 className="w-3.5 h-3.5" /> Mátrix generálás
                  </Label>
                  <p className="text-[10px] text-muted-foreground mt-1 mb-2">
                    Termék színei × méretei kombinációi
                  </p>
                  <Button size="sm" variant="outline" onClick={generateMatrix} className="w-full text-xs gap-1">
                    <Plus className="w-3 h-3" /> Generálás ({bulkStock} db)
                  </Button>
                </div>
                <div className="border border-border rounded p-3 bg-muted/20">
                  <Label className="text-[11px] font-bold text-foreground">Tömeges készlet</Label>
                  <div className="flex gap-1 mt-2">
                    <Input
                      type="number"
                      min={0}
                      value={bulkStock}
                      onChange={(e) => setBulkStock(Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" variant="outline" onClick={applyBulkStock} className="text-xs whitespace-nowrap">
                      Mind beáll.
                    </Button>
                  </div>
                </div>
                <div className="border border-border rounded p-3 bg-muted/20">
                  <Label className="text-[11px] font-bold text-foreground">Egyedi variáns</Label>
                  <div className="flex gap-1 mt-2">
                    <Input
                      placeholder="Szín"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Méret"
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!newSize && !newColor) {
                          toast({ title: "Adj meg színt vagy méretet", variant: "destructive" });
                          return;
                        }
                        addVariant(newSize || undefined, newColor || undefined);
                        setNewSize(""); setNewColor("");
                      }}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* View toggle */}
              {variants.length > 0 && (
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <span className="text-[11px] text-muted-foreground font-semibold">Nézet:</span>
                  <Button
                    size="sm"
                    variant={viewMode === "matrix" ? "default" : "outline"}
                    onClick={() => setViewMode("matrix")}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Grid3x3 className="w-3.5 h-3.5" /> Mátrix (gyors db beírás)
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "list" ? "default" : "outline"}
                    onClick={() => setViewMode("list")}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" /> Lista (részletes)
                  </Button>
                </div>
              )}

              {/* Matrix view: rows=colors, cols=sizes, each cell = stock input */}
              {variants.length > 0 && viewMode === "matrix" && (() => {
                const colorSet = Array.from(new Set(variants.map(v => v.color || "—")));
                const sizeSet = Array.from(new Set(variants.map(v => v.size || "—")));
                const findIdx = (color: string, size: string) =>
                  variants.findIndex(v => (v.color || "—") === color && (v.size || "—") === size);
                return (
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-2 text-left text-[11px] font-bold text-muted-foreground border-r border-border sticky left-0 bg-muted/50 min-w-[100px]">
                            <Palette className="w-3 h-3 inline mr-1" /> Szín \ Méret
                          </th>
                          {sizeSet.map(s => (
                            <th key={s} className="p-2 text-center text-[11px] font-bold text-foreground border-r border-border min-w-[80px]">
                              <Ruler className="w-3 h-3 inline mr-1" />{s}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {colorSet.map(c => (
                          <tr key={c} className="border-t border-border">
                            <td className="p-2 font-bold text-xs text-foreground border-r border-border sticky left-0 bg-card">
                              {c}
                            </td>
                            {sizeSet.map(s => {
                              const idx = findIdx(c, s);
                              if (idx === -1) {
                                return (
                                  <td key={s} className="p-1 text-center border-r border-border bg-muted/10">
                                    <button
                                      onClick={() => addVariant(s === "—" ? undefined : s, c === "—" ? undefined : c)}
                                      className="text-[10px] text-muted-foreground hover:text-accent hover:bg-accent/10 px-2 py-1 rounded transition-colors"
                                      title="Variáns létrehozása"
                                    >
                                      + új
                                    </button>
                                  </td>
                                );
                              }
                              const v = variants[idx];
                              const out = (v.stock || 0) === 0;
                              const low = (v.stock || 0) > 0 && (v.stock || 0) < 5;
                              return (
                                <td key={s} className={`p-1 border-r border-border ${v._dirty ? "bg-yellow-500/5" : ""}`}>
                                  <div className="flex flex-col items-center gap-1">
                                    {/* Quick step buttons +/- */}
                                    <div className="flex items-center gap-0.5 w-full">
                                      <button
                                        onClick={() => updateVariant(idx, { stock: Math.max(0, (v.stock || 0) - 1) })}
                                        className="flex-1 h-7 bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold text-sm rounded transition-colors"
                                        title="-1"
                                      >
                                        −
                                      </button>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={v.stock}
                                        onChange={(e) => updateVariant(idx, { stock: Number(e.target.value) })}
                                        className={`h-7 text-center text-sm font-bold px-1 w-12 ${
                                          out ? "border-destructive text-destructive" : low ? "border-yellow-500" : "border-accent/40"
                                        }`}
                                      />
                                      <button
                                        onClick={() => updateVariant(idx, { stock: (v.stock || 0) + 1 })}
                                        className="flex-1 h-7 bg-accent/10 hover:bg-accent/20 text-accent font-bold text-sm rounded transition-colors"
                                        title="+1"
                                      >
                                        +
                                      </button>
                                    </div>
                                    {/* Quick add presets */}
                                    <div className="flex items-center gap-0.5 w-full">
                                      <button
                                        onClick={() => updateVariant(idx, { stock: (v.stock || 0) + 5 })}
                                        className="flex-1 h-5 bg-accent/5 hover:bg-accent/15 text-accent text-[10px] font-bold rounded transition-colors"
                                        title="+5"
                                      >
                                        +5
                                      </button>
                                      <button
                                        onClick={() => updateVariant(idx, { stock: (v.stock || 0) + 10 })}
                                        className="flex-1 h-5 bg-accent/5 hover:bg-accent/15 text-accent text-[10px] font-bold rounded transition-colors"
                                        title="+10"
                                      >
                                        +10
                                      </button>
                                      <button
                                        onClick={() => updateVariant(idx, { stock: 0 })}
                                        className="flex-1 h-5 bg-muted hover:bg-muted/70 text-muted-foreground text-[10px] font-bold rounded transition-colors"
                                        title="Nulla"
                                      >
                                        0
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="checkbox"
                                        checked={v.is_active}
                                        onChange={(e) => updateVariant(idx, { is_active: e.target.checked })}
                                        className="w-3 h-3 accent-accent"
                                        title="Aktív"
                                      />
                                      <button
                                        onClick={() => removeVariant(idx)}
                                        className="text-destructive/70 hover:text-destructive"
                                        title="Törlés"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                    {out && <span className="text-[9px] text-destructive font-bold">ELFOGYOTT</span>}
                                    {low && <span className="text-[9px] text-yellow-600 font-bold">KEVÉS</span>}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[10px] text-muted-foreground p-2 bg-muted/20 border-t border-border">
                      💡 Egy kattintással növelheted a darabszámot: <strong>+/−</strong> léptetők, vagy <strong>+5 / +10</strong> gyorsgombok. A <strong>0</strong> gomb azonnal nullázza.
                    </p>
                  </div>
                );
              })()}

              {/* Variants table (list view) */}
              {variants.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-8 text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mb-3">Nincs még variáns ehhez a termékhez</p>
                  <Button size="sm" onClick={generateMatrix} className="gap-2">
                    <Grid3x3 className="w-4 h-4" /> Mátrix generálása méretek/színek alapján
                  </Button>
                </div>
              ) : viewMode === "list" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-2 font-semibold text-muted-foreground"><Palette className="w-3 h-3 inline" /> Szín</th>
                        <th className="text-left p-2 font-semibold text-muted-foreground"><Ruler className="w-3 h-3 inline" /> Méret</th>
                        <th className="text-left p-2 font-semibold text-muted-foreground">Készlet (db)</th>
                        <th className="text-left p-2 font-semibold text-muted-foreground">SKU</th>
                        <th className="text-left p-2 font-semibold text-muted-foreground">Ár mód. (Ft)</th>
                        <th className="text-left p-2 font-semibold text-muted-foreground">Aktív</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {variants.map((v, idx) => {
                        const lowStock = (v.stock || 0) > 0 && (v.stock || 0) < 5;
                        const outOfStock = (v.stock || 0) === 0;
                        return (
                          <tr key={v.id || `new-${idx}`} className={`${v._dirty ? "bg-yellow-500/5" : ""}`}>
                            <td className="p-1.5">
                              <Input
                                value={v.color || ""}
                                onChange={(e) => updateVariant(idx, { color: e.target.value || null })}
                                placeholder="—"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-1.5">
                              <Input
                                value={v.size || ""}
                                onChange={(e) => updateVariant(idx, { size: e.target.value || null })}
                                placeholder="—"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-1.5">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  value={v.stock}
                                  onChange={(e) => updateVariant(idx, { stock: Number(e.target.value) })}
                                  className={`h-8 text-xs font-bold w-20 ${
                                    outOfStock ? "border-destructive text-destructive" : lowStock ? "border-yellow-500" : ""
                                  }`}
                                />
                                {outOfStock && <span className="text-[10px] text-destructive font-bold">ELFOGYOTT</span>}
                                {lowStock && <span className="text-[10px] text-yellow-600 font-bold">KEVÉS</span>}
                              </div>
                            </td>
                            <td className="p-1.5">
                              <Input
                                value={v.sku || ""}
                                onChange={(e) => updateVariant(idx, { sku: e.target.value || null })}
                                placeholder="auto"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-1.5">
                              <Input
                                type="number"
                                value={v.price_modifier}
                                onChange={(e) => updateVariant(idx, { price_modifier: Number(e.target.value) })}
                                className="h-8 text-xs w-20"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="checkbox"
                                checked={v.is_active}
                                onChange={(e) => updateVariant(idx, { is_active: e.target.checked })}
                                className="w-4 h-4 accent-accent"
                              />
                            </td>
                            <td className="p-1.5">
                              <Button size="sm" variant="ghost" onClick={() => removeVariant(idx)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted/30 font-bold">
                      <tr>
                        <td colSpan={2} className="p-2 text-xs">Összesen: {variants.length} variáns</td>
                        <td className="p-2 text-xs">{totalStock} db</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => addVariant()} className="gap-2">
                  <Plus className="w-4 h-4" /> Üres sor
                </Button>
                <Button onClick={saveAll} disabled={savingVariants} className="gap-2">
                  <Save className="w-4 h-4" /> {savingVariants ? "Mentés..." : "Összes mentése"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProductVariantsTab;

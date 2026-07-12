import { useEffect, useState, type RefObject } from "react";
import { Plus, X, Image, Upload, Pencil, Trash2, Rocket, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminBulkProductImport from "@/components/admin/AdminBulkProductImport";
import ProductLinkImport from "@/components/admin/ProductLinkImport";
import ProductImageGallery from "@/components/admin/ProductImageGallery";
import Product3DUploader from "@/components/admin/Product3DUploader";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, createEmptyProductDraft, type ShopProduct } from "@/types/admin-shop-product";

const ProductImageGalleryWrapper = ({ productId }: { productId: string }) => {
  const [images, setImages] = useState<any[]>([]);
  const fetchImgs = async () => {
    const { data } = await supabase.from("product_images").select("*").eq("product_id", productId).order("sort_order");
    if (data) setImages(data);
  };
  useEffect(() => { fetchImgs(); }, [productId]);
  return <ProductImageGallery productId={productId} images={images} onImagesChange={fetchImgs} />;
};

interface Props {
  products: ShopProduct[];
  editProduct: Partial<ShopProduct> | null;
  setEditProduct: (p: Partial<ShopProduct> | null) => void;
  showProductForm: boolean;
  setShowProductForm: (b: boolean) => void;
  fetchProducts: () => Promise<void> | void;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveProduct: () => void | Promise<void>;
  savingProduct: boolean;
  deleteProduct: (id: string) => void;
}

export default function AdminProductsTab({
  products,
  editProduct,
  setEditProduct,
  showProductForm,
  setShowProductForm,
  fetchProducts,
  uploading,
  fileInputRef,
  handleImageUpload,
  saveProduct,
  savingProduct,
  deleteProduct,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Termékek ({products.length})</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { setEditProduct(createEmptyProductDraft()); setShowProductForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Új termék
        </Button>
      </div>

      {/* Bulk Import */}
      <AdminBulkProductImport onImportDone={fetchProducts} />

      {/* Link Import */}
      <ProductLinkImport
        onProductImported={async (p) => {
          const payload = {
            name: p.name.trim(),
            description: p.description.trim() || null,
            price: Number(p.price) || 0,
            category: p.category || "Egyéb",
            image_url: p.image_url,
            is_active: true,
            stock: p.stock,
            sizes: p.sizes,
            colors: p.colors,
          };

          if (!payload.name) {
            throw new Error("A termék neve kötelező.");
          }

          const { error } = await supabase.from("shop_products").insert(payload);
          if (error) {
            throw new Error(error.message);
          }

          await fetchProducts();
        }}
        onBatchImported={fetchProducts}
      />

      {showProductForm && editProduct && (
        <div className="border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">{editProduct.id ? "Szerkesztés" : "Új termék"}</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowProductForm(false); setEditProduct(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image Upload */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Termék kép</Label>
            <div className="mt-2 flex items-start gap-4">
              {editProduct.image_url ? (
                <div className="relative group">
                  <img src={editProduct.image_url} alt="Termék" className="h-24 w-24 object-cover border" />
                  <button
                    onClick={() => setEditProduct({ ...editProduct, image_url: null })}
                    className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="h-24 w-24 border border-dashed flex items-center justify-center text-muted-foreground">
                  <Image className="h-8 w-8" />
                </div>
              )}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-none text-xs uppercase tracking-wider"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {uploading ? "Feltöltés..." : "Kép feltöltés"}
                </Button>
                <p className="text-[10px] text-muted-foreground">vagy adj meg URL-t alább</p>
                <Input
                  value={editProduct.image_url || ""}
                  onChange={e => setEditProduct({ ...editProduct, image_url: e.target.value })}
                  placeholder="https://..."
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Név *</Label>
              <Input value={editProduct.name || ""} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kategória</Label>
              <select
                value={editProduct.category || "Egyéb"}
                onChange={e => setEditProduct({ ...editProduct, category: e.target.value })}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ár (Ft) *</Label>
              <Input type="number" value={editProduct.price ?? ""} onChange={e => setEditProduct({ ...editProduct, price: e.target.value === "" ? 0 : Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Eredeti ár (Ft)</Label>
              <Input type="number" value={editProduct.original_price ?? ""} onChange={e => setEditProduct({ ...editProduct, original_price: e.target.value === "" ? null : Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Készlet</Label>
              <Input type="number" value={editProduct.stock ?? 0} onChange={e => setEditProduct({ ...editProduct, stock: e.target.value === "" ? 0 : Number(e.target.value) })} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Méretek (kattints a kívántakra)</Label>
              <div className="flex flex-wrap gap-1.5">
                {["XS","S","M","L","XL","XXL","XXXL","One Size","34","36","38","40","42","44"].map(s => {
                  const active = (editProduct.sizes || []).includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        const cur = editProduct.sizes || [];
                        setEditProduct({ ...editProduct, sizes: active ? cur.filter(x => x !== s) : [...cur, s] });
                      }}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 transition-all ${active ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-foreground/40"}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <Input
                value={(editProduct.sizes || []).filter(s => !["XS","S","M","L","XL","XXL","XXXL","One Size","34","36","38","40","42","44"].includes(s)).join(", ")}
                onChange={e => {
                  const presets = (editProduct.sizes || []).filter(s => ["XS","S","M","L","XL","XXL","XXXL","One Size","34","36","38","40","42","44"].includes(s));
                  const customs = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                  setEditProduct({ ...editProduct, sizes: [...presets, ...customs] });
                }}
                className="mt-2 text-xs"
                placeholder="Egyedi méretek vesszővel (opcionális)"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Színek</Label>
              <div className="flex flex-wrap gap-1.5">
                {["Fekete","Fehér","Szürke","Bézs","Barna","Kék","Piros","Zöld","Sárga","Rózsaszín","Lila","Narancs"].map(c => {
                  const active = (editProduct.colors || []).includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const cur = editProduct.colors || [];
                        setEditProduct({ ...editProduct, colors: active ? cur.filter(x => x !== c) : [...cur, c] });
                      }}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 transition-all ${active ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-foreground/40"}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <Input
                value={(editProduct.colors || []).filter(c => !["Fekete","Fehér","Szürke","Bézs","Barna","Kék","Piros","Zöld","Sárga","Rózsaszín","Lila","Narancs"].includes(c)).join(", ")}
                onChange={e => {
                  const presets = (editProduct.colors || []).filter(c => ["Fekete","Fehér","Szürke","Bézs","Barna","Kék","Piros","Zöld","Sárga","Rózsaszín","Lila","Narancs"].includes(c));
                  const customs = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                  setEditProduct({ ...editProduct, colors: [...presets, ...customs] });
                }}
                className="mt-2 text-xs"
                placeholder="Egyedi színek vesszővel (opcionális)"
              />
            </div>

            {/* ─── Szín × Méret darabszám mátrix ─── */}
            {(editProduct.colors?.length || 0) > 0 && (editProduct.sizes?.length || 0) > 0 && (
              <div className="md:col-span-2 border-2 border-accent/40 bg-accent/5 p-3 rounded-md">
                <Label className="text-xs uppercase tracking-wider text-accent font-bold mb-1 block">
                  🎯 Darabszám szín × méret szerint
                </Label>
                <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wider">
                  Írd be / léptetsd a darabszámot minden cellába. Az összesítés automatikusan frissíti a fenti Készlet mezőt.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="border border-border bg-muted p-1.5 text-left uppercase tracking-wider text-[10px]">Szín \ Méret</th>
                        {(editProduct.sizes || []).map((s: string) => (
                          <th key={s} className="border border-border bg-muted p-1.5 text-center uppercase tracking-wider text-[10px] min-w-[80px]">{s}</th>
                        ))}
                        <th className="border border-border bg-accent/20 p-1.5 text-center uppercase tracking-wider text-[10px]">Σ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editProduct.colors || []).map((c: string) => {
                        const ep: any = editProduct;
                        const matrix: Record<string, Record<string, number>> = ep._stockMatrix || {};
                        const rowSum = (editProduct.sizes || []).reduce((acc: number, s: string) => acc + Number(matrix?.[c]?.[s] || 0), 0);
                        return (
                          <tr key={c}>
                            <td className="border border-border bg-muted/50 p-1.5 font-bold uppercase tracking-wider text-[10px]">{c}</td>
                            {(editProduct.sizes || []).map((s: string) => {
                              const val = Number(matrix?.[c]?.[s] || 0);
                              const setVal = (n: number) => {
                                const safe = Math.max(0, Math.floor(n));
                                const next: Record<string, Record<string, number>> = { ...((editProduct as any)._stockMatrix || {}) };
                                next[c] = { ...(next[c] || {}), [s]: safe };
                                let total = 0;
                                for (const row of Object.values(next)) {
                                  for (const v of Object.values(row || {})) total += Number(v || 0);
                                }
                                setEditProduct({ ...(editProduct as any), _stockMatrix: next, stock: total });
                              };
                              const out = val === 0;
                              const low = val > 0 && val < 5;
                              return (
                                <td key={s} className={`border border-border p-1 ${out ? "bg-destructive/10" : low ? "bg-yellow-500/10" : ""}`}>
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      type="number"
                                      inputMode="numeric"
                                      min={0}
                                      value={val}
                                      onFocus={(e) => e.currentTarget.select()}
                                      onChange={(e) => setVal(Number(e.target.value) || 0)}
                                      className={`h-9 text-center text-base font-bold ${out ? "text-destructive border-destructive" : low ? "border-yellow-500" : ""}`}
                                    />
                                    <div className="flex gap-0.5">
                                      <button type="button" onClick={() => setVal(val - 1)} className="flex-1 px-1 py-0.5 text-[10px] font-bold border border-border hover:bg-muted">−</button>
                                      <button type="button" onClick={() => setVal(val + 1)} className="flex-1 px-1 py-0.5 text-[10px] font-bold border border-border hover:bg-muted">+</button>
                                    </div>
                                    <div className="flex gap-0.5">
                                      <button type="button" onClick={() => setVal(val + 5)} className="flex-1 px-1 py-0.5 text-[10px] font-bold border border-accent/50 text-accent hover:bg-accent/10">+5</button>
                                      <button type="button" onClick={() => setVal(val + 10)} className="flex-1 px-1 py-0.5 text-[10px] font-bold border border-accent/50 text-accent hover:bg-accent/10">+10</button>
                                      <button type="button" onClick={() => setVal(0)} className="flex-1 px-1 py-0.5 text-[10px] font-bold border border-destructive/50 text-destructive hover:bg-destructive/10">0</button>
                                    </div>
                                    {out && <div className="text-[9px] text-destructive font-bold text-center uppercase">Elfogyott</div>}
                                    {low && <div className="text-[9px] text-yellow-600 font-bold text-center uppercase">Kevés</div>}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="border border-border bg-accent/10 p-1.5 text-center font-bold">{rowSum}</td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td className="border border-border bg-accent/20 p-1.5 font-bold uppercase tracking-wider text-[10px]">Σ Méret</td>
                        {(editProduct.sizes || []).map((s: string) => {
                          const matrix: Record<string, Record<string, number>> = (editProduct as any)._stockMatrix || {};
                          const colSum = (editProduct.colors || []).reduce((acc: number, c: string) => acc + Number(matrix?.[c]?.[s] || 0), 0);
                          return <td key={s} className="border border-border bg-accent/10 p-1.5 text-center font-bold">{colSum}</td>;
                        })}
                        <td className="border border-border bg-accent/30 p-1.5 text-center font-bold text-accent">
                          {(() => {
                            const matrix: Record<string, Record<string, number>> = (editProduct as any)._stockMatrix || {};
                            let total = 0;
                            for (const row of Object.values(matrix)) {
                              for (const v of Object.values(row || {})) total += Number(v || 0);
                            }
                            return total;
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  💡 A darabszámok mentéskor a variánsok közé kerülnek és külön-külön nyomon követhetők (méret + szín szerint).
                </p>
              </div>
            )}

            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Leírás</Label>
              <textarea
                value={editProduct.description || ""}
                onChange={e => setEditProduct({ ...editProduct, description: e.target.value })}
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Termék összetétel — Miből van */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
              📦 Termék összetétel — Miből van
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Anyag / Összetétel</Label>
                <textarea
                  value={editProduct.material || ""}
                  onChange={e => setEditProduct({ ...editProduct, material: e.target.value })}
                  placeholder="Pl. 95% pamut, 5% elasztán"
                  className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mosási / ápolási útmutató</Label>
                <textarea
                  value={editProduct.care_instructions || ""}
                  onChange={e => setEditProduct({ ...editProduct, care_instructions: e.target.value })}
                  placeholder="Pl. 30°C-on mosható, ne centrifugázd, vasalás közepes hőfokon"
                  className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Származási ország</Label>
                <Input value={editProduct.origin_country || ""} onChange={e => setEditProduct({ ...editProduct, origin_country: e.target.value })} placeholder="Pl. Magyarország" className="mt-1 h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gyártó</Label>
                <Input value={editProduct.manufacturer || ""} onChange={e => setEditProduct({ ...editProduct, manufacturer: e.target.value })} placeholder="Pl. Egyszerű de Nagyszerű Műhely" className="mt-1 h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tömeg (gramm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editProduct.weight_grams ?? ""}
                  onChange={e => setEditProduct({ ...editProduct, weight_grams: e.target.value === "" ? null : Number(e.target.value) })}
                  placeholder="Pl. 220"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              💡 Ezek a mezők megjelennek a webshop termék oldalán is, hogy a vásárlók tudják, miből van a termék.
            </p>
          </div>
          {/* Launch / Pre-order állapot */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
              <Rocket className="h-3.5 w-3.5" /> Launch állapot
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Állapot</Label>
                <select
                  value={editProduct.launch_status || "live"}
                  onChange={e => setEditProduct({ ...editProduct, launch_status: e.target.value })}
                  className="w-full mt-1 h-9 px-3 text-xs bg-background border border-input rounded-md"
                >
                  <option value="live">🟢 Élő (aktívan vásárolható)</option>
                  <option value="coming_soon">🔵 Hamarosan (teaser, sneak peek)</option>
                  <option value="pre_order">🟣 Előrendelhető (foglalóval)</option>
                  <option value="waitlist">🟡 Várólistás (csak email gyűjtés)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Megjelenés dátuma</Label>
                <Input
                  type="datetime-local"
                  value={editProduct.launch_date ? new Date(editProduct.launch_date).toISOString().slice(0, 16) : ""}
                  onChange={e => setEditProduct({ ...editProduct, launch_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              {(editProduct.launch_status === "pre_order" || editProduct.launch_status === "coming_soon") && (
                <>
                  <div className="flex items-center justify-between md:col-span-2 border-t pt-3">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={editProduct.preorder_enabled ?? false} onChange={e => setEditProduct({ ...editProduct, preorder_enabled: e.target.checked })} className="rounded" />
                      Előrendelés engedélyezése
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={editProduct.is_sneak_peek ?? false} onChange={e => setEditProduct({ ...editProduct, is_sneak_peek: e.target.checked })} className="rounded" />
                      Sneak peek (homályos kép, szavazás)
                    </label>
                  </div>
                  {editProduct.preorder_enabled && (
                    <>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Foglaló (%)</Label>
                        <Input type="number" min={0} max={100} value={editProduct.preorder_deposit_percent ?? 20} onChange={e => setEditProduct({ ...editProduct, preorder_deposit_percent: Number(e.target.value) })} className="mt-1 h-9 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max előrendelés (db)</Label>
                        <Input type="number" min={0} value={editProduct.preorder_limit ?? ""} onChange={e => setEditProduct({ ...editProduct, preorder_limit: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Korlátlan" className="mt-1 h-9 text-xs" />
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Teaser leírás (féligazság)</Label>
                    <textarea
                      value={editProduct.teaser_description || ""}
                      onChange={e => setEditProduct({ ...editProduct, teaser_description: e.target.value })}
                      placeholder="Kelts kíváncsiságot, ne áruld el a részleteket..."
                      className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Teaser kép URL (opcionális, blur effekttel jelenik meg)</Label>
                    <Input value={editProduct.teaser_image_url || ""} onChange={e => setEditProduct({ ...editProduct, teaser_image_url: e.target.value })} placeholder="https://..." className="mt-1 h-9 text-xs" />
                  </div>
                </>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              💡 A részletes szerkesztéshez (galéria, méret-szín mátrix, méret-táblázat) használd a <strong>Launch Center</strong> fület.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={editProduct.is_active ?? true} onChange={e => setEditProduct({ ...editProduct, is_active: e.target.checked })} className="rounded" />
              Látható a shopban
            </label>
          </div>
          <Button className="rounded-none uppercase tracking-wider text-xs" onClick={saveProduct} disabled={savingProduct || uploading}>
            {savingProduct ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />} {savingProduct ? "Mentés..." : "Mentés"}
          </Button>

          {/* Multi-image gallery for existing products */}
          {editProduct.id && (
            <>
              <ProductImageGalleryWrapper productId={editProduct.id} />
              <Product3DUploader productId={editProduct.id} productName={editProduct.name} />
            </>
          )}
        </div>
      )}

      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="flex items-center gap-3 border bg-card p-3">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="h-14 w-14 object-cover border flex-shrink-0" />
            ) : (
              <div className="h-14 w-14 border flex items-center justify-center text-muted-foreground flex-shrink-0">
                <Image className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground truncate">{p.name}</span>
                {!p.is_active && <span className="text-[9px] font-bold uppercase tracking-widest text-destructive">Inaktív</span>}
                {p.launch_status === "coming_soon" && <span className="text-[9px] font-bold uppercase tracking-widest text-blue-500 border border-blue-500/30 px-1.5 py-0.5">Hamarosan</span>}
                {p.launch_status === "pre_order" && <span className="text-[9px] font-bold uppercase tracking-widest text-accent border border-accent/30 px-1.5 py-0.5">Előrendelhető</span>}
                {p.launch_status === "waitlist" && <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-500 border border-yellow-500/30 px-1.5 py-0.5">Várólista</span>}
                {p.preorder_enabled && <span className="text-[9px] font-bold uppercase tracking-widest text-purple-500">Pre-order ON</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{p.category}</span>
                <span className="font-semibold text-accent">{p.price.toLocaleString()} Ft</span>
                <span>Készlet: {p.stock}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                // Variánsok betöltése a mátrixhoz
                const matrix: Record<string, Record<string, number>> = {};
                try {
                  const { data: vars } = await supabase.from("product_variants").select("color,size,stock").eq("product_id", p.id);
                  (vars || []).forEach((v: any) => {
                    const c = v.color || "—";
                    const s = v.size || "—";
                    if (!matrix[c]) matrix[c] = {};
                    matrix[c][s] = Number(v.stock || 0);
                  });
                } catch (err) { console.error("variant load failed", err); }
                setEditProduct({ ...p, _stockMatrix: matrix } as any);
                setShowProductForm(true);
              }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek termékek.</p>
        )}
      </div>
    </div>
  );
}

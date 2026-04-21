import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, ShoppingCart, Users, Vote, Calendar, Lock, Mail, Check, Share2,
  Flame, AlertTriangle, Ruler, Package, Sparkles, Heart
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  launch_status: string;
  launch_date: string | null;
  teaser_image_url: string | null;
  teaser_description: string | null;
  preorder_enabled: boolean;
  preorder_deposit_percent: number;
  preorder_limit: number | null;
  preorder_count: number;
  waitlist_count: number;
  is_sneak_peek: boolean;
  poll_votes: number;
  material: string | null;
  care_instructions: string | null;
  origin_country: string | null;
  manufacturer: string | null;
  weight_grams: number | null;
  has_variants: boolean;
}

interface Variant {
  id: string;
  size: string;
  color: string;
  stock: number;
  preorder_limit: number | null;
  preorder_count: number;
  price_modifier: number;
  image_url: string | null;
  is_active: boolean;
}

interface SizeChartRow {
  size: string;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  length_cm: number | null;
  shoulder_cm: number | null;
  sleeve_cm: number | null;
  inseam_cm: number | null;
}

const Countdown = ({ date }: { date: string }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, new Date(date).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="flex gap-2 font-mono">
      {[["NAP", d], ["ÓRA", h], ["PERC", m], ["MP", s]].map(([l, v]) => (
        <div key={l as string} className="border bg-background/80 px-3 py-2 text-center min-w-[60px]">
          <div className="text-2xl font-bold text-accent">{String(v).padStart(2, "0")}</div>
          <div className="text-[9px] tracking-widest text-muted-foreground">{l}</div>
        </div>
      ))}
    </div>
  );
};

const LaunchProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<{ image_url: string; is_primary: boolean }[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [sizeChart, setSizeChart] = useState<SizeChartRow[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = async () => {
    if (!id) return;
    const [{ data: p }, { data: imgs }, { data: vars }, { data: chart }] = await Promise.all([
      supabase.from("shop_products").select("*").eq("id", id).single(),
      supabase.from("product_images").select("image_url, is_primary").eq("product_id", id).order("sort_order"),
      supabase.from("product_variants").select("*").eq("product_id", id).eq("is_active", true).order("sort_order"),
      supabase.from("product_size_chart").select("*").eq("product_id", id).order("sort_order"),
    ]);
    if (!p) { navigate("/launch"); return; }
    setProduct(p as Product);
    setImages(imgs && imgs.length > 0 ? imgs : (p.image_url ? [{ image_url: p.image_url, is_primary: true }] : []));
    setVariants(vars || []);
    setSizeChart(chart || []);
  };

  useEffect(() => { load(); }, [id]);

  if (!product) return <Layout><div className="container mx-auto px-4 py-12 text-center text-sm text-muted-foreground">Betöltés...</div></Layout>;

  const isComing = product.launch_status === "coming_soon";
  const isPreorder = product.launch_status === "pre_order" && product.preorder_enabled;
  const isWaitlist = product.launch_status === "waitlist";
  const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const selectedVariant = variants.find(v => v.size === selectedSize && v.color === selectedColor);
  const variantPrice = product.price + (selectedVariant?.price_modifier || 0);
  const remainingStock = selectedVariant ? (selectedVariant.preorder_limit ? Math.max(0, selectedVariant.preorder_limit - selectedVariant.preorder_count) : null) : null;
  const isSoldOut = selectedVariant && selectedVariant.preorder_limit !== null && remainingStock === 0;
  const deposit = Math.round(variantPrice * qty * product.preorder_deposit_percent / 100);

  const submitPreorder = async () => {
    if (!email) { toast({ title: "Add meg az e-mail címed", variant: "destructive" }); return; }
    if (variants.length > 0 && (!selectedSize || !selectedColor)) { toast({ title: "Válassz méretet és színt!", variant: "destructive" }); return; }
    if (isSoldOut) { toast({ title: "Ez a kombináció elfogyott", variant: "destructive" }); return; }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("product_preorders").insert({
      product_id: product.id,
      variant_id: selectedVariant?.id || null,
      selected_size: selectedSize || null,
      selected_color: selectedColor || null,
      customer_email: email,
      customer_name: name || null,
      customer_phone: phone || null,
      quantity: qty,
      total_amount: variantPrice * qty,
      deposit_amount: deposit,
      user_id: user?.id || null,
    });
    setSubmitting(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setSuccess(true);
    toast({ title: "Előrendelés rögzítve!", description: `Foglaló: ${deposit.toLocaleString()} Ft` });
    load();
  };

  const submitWaitlist = async () => {
    if (!email) { toast({ title: "Add meg az e-mail címed", variant: "destructive" }); return; }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("product_waitlist").insert({
      product_id: product.id,
      email,
      name: name || null,
      user_id: user?.id || null,
    });
    setSubmitting(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setSuccess(true);
    toast({ title: "Felvettünk a várólistára!" });
    load();
  };

  const sharePage = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link másolva!" });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Link to="/launch" className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Vissza a launch oldalra
        </Link>

        <div className="grid md:grid-cols-2 gap-6">
          {/* LEFT: GALLERY */}
          <div>
            <div className="aspect-square border bg-muted overflow-hidden relative">
              {images[activeImage] ? (
                <img
                  src={isComing ? (product.teaser_image_url || images[activeImage].image_url) : images[activeImage].image_url}
                  alt={product.name}
                  className={`w-full h-full object-cover ${isComing ? "blur-md" : ""}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package className="h-12 w-12" /></div>
              )}
              {isComing && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                  <div className="bg-background/90 px-4 py-2 border flex items-center gap-2">
                    <Lock className="h-4 w-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider">Hamarosan</span>
                  </div>
                </div>
              )}
            </div>
            {images.length > 1 && !isComing && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`aspect-square border overflow-hidden ${activeImage === i ? "border-accent border-2" : ""}`}>
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: INFO */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {isComing && <span className="text-[10px] px-2 py-0.5 border border-blue-500/30 text-blue-500 bg-blue-500/5 uppercase tracking-wider font-bold">Hamarosan</span>}
                {isPreorder && <span className="text-[10px] px-2 py-0.5 border border-accent/30 text-accent bg-accent/5 uppercase tracking-wider font-bold">Előrendelhető</span>}
                {isWaitlist && <span className="text-[10px] px-2 py-0.5 border border-yellow-500/30 text-yellow-500 bg-yellow-500/5 uppercase tracking-wider font-bold">Várólistás</span>}
                {product.is_sneak_peek && <span className="text-[10px] px-2 py-0.5 border border-purple-500/30 text-purple-500 bg-purple-500/5 uppercase tracking-wider font-bold">Sneak peek</span>}
                <button onClick={sharePage} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Share2 className="h-3 w-3" /> Megosztás
                </button>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">{product.name}</h1>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{product.category}</p>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold">{variantPrice.toLocaleString()} Ft</span>
              {product.original_price && product.original_price > variantPrice && (
                <span className="text-sm text-muted-foreground line-through">{product.original_price.toLocaleString()} Ft</span>
              )}
            </div>

            {/* Countdown */}
            {product.launch_date && new Date(product.launch_date).getTime() > Date.now() && (
              <div className="border p-3 bg-card">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Indul:
                </p>
                <Countdown date={product.launch_date} />
              </div>
            )}

            {/* FOMO badges */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              {product.preorder_count > 0 && (
                <span className="border px-2 py-1 flex items-center gap-1 text-orange-500 border-orange-500/30 bg-orange-500/5">
                  <Flame className="h-3 w-3" /> {product.preorder_count} előrendelés
                </span>
              )}
              {product.waitlist_count > 0 && (
                <span className="border px-2 py-1 flex items-center gap-1 text-yellow-500 border-yellow-500/30 bg-yellow-500/5">
                  <Users className="h-3 w-3" /> {product.waitlist_count} várólistán
                </span>
              )}
              {product.preorder_limit && (
                <span className="border px-2 py-1 flex items-center gap-1 text-destructive border-destructive/30 bg-destructive/5">
                  <AlertTriangle className="h-3 w-3" /> Csak {Math.max(0, product.preorder_limit - product.preorder_count)} db marad
                </span>
              )}
            </div>

            {/* Teaser or Description */}
            {isComing && product.teaser_description ? (
              <div className="border p-3 bg-accent/5">
                <p className="text-[10px] uppercase tracking-widest text-accent mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Féligazság
                </p>
                <p className="text-sm leading-relaxed italic">{product.teaser_description}</p>
              </div>
            ) : product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* VARIANT SELECTOR */}
            {!isComing && variants.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                {colors.length > 0 && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Szín: <span className="text-foreground font-bold">{selectedColor || "—"}</span></Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {colors.map(c => (
                        <button
                          key={c}
                          onClick={() => setSelectedColor(c)}
                          className={`px-3 py-1.5 border text-xs uppercase tracking-wider transition-colors ${
                            selectedColor === c ? "border-accent bg-accent/10 text-accent font-bold" : "hover:border-foreground"
                          }`}
                        >{c}</button>
                      ))}
                    </div>
                  </div>
                )}
                {sizes.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Méret: <span className="text-foreground font-bold">{selectedSize || "—"}</span></Label>
                      {sizeChart.length > 0 && (
                        <button onClick={() => setShowSizeChart(true)} className="text-[10px] uppercase tracking-wider text-accent flex items-center gap-1 hover:underline">
                          <Ruler className="h-3 w-3" /> Méret-táblázat
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sizes.map(s => {
                        const variant = variants.find(v => v.size === s && (selectedColor ? v.color === selectedColor : true));
                        const out = variant?.preorder_limit !== null && variant?.preorder_limit !== undefined && variant.preorder_count >= variant.preorder_limit;
                        return (
                          <button
                            key={s}
                            onClick={() => setSelectedSize(s)}
                            disabled={out}
                            className={`px-4 py-2 border text-xs uppercase tracking-wider transition-colors ${
                              selectedSize === s ? "border-accent bg-accent/10 text-accent font-bold" :
                              out ? "opacity-40 line-through cursor-not-allowed" : "hover:border-foreground"
                            }`}
                          >{s}</button>
                        );
                      })}
                    </div>
                    {selectedVariant && remainingStock !== null && remainingStock <= 5 && remainingStock > 0 && (
                      <p className="text-[10px] text-destructive mt-1 uppercase tracking-wider">⚠ Már csak {remainingStock} db ebből a kombóból!</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PREORDER FORM */}
            {success ? (
              <div className="border border-accent bg-accent/5 p-4 text-center">
                <Check className="h-6 w-6 text-accent mx-auto mb-2" />
                <p className="text-sm font-bold uppercase tracking-wider">Köszönjük!</p>
                <p className="text-xs text-muted-foreground mt-1">Hamarosan e-mailben értesítünk a részletekről.</p>
              </div>
            ) : (isPreorder || isWaitlist || isComing) && (
              <div className="border p-4 space-y-3 bg-card">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  {isPreorder ? <><ShoppingCart className="h-4 w-4 text-accent" /> Előrendelés</> :
                   <><Mail className="h-4 w-4 text-accent" /> Iratkozz fel az értesítésre</>}
                </h3>
                <Input placeholder="E-mail címed" value={email} onChange={e => setEmail(e.target.value)} className="rounded-none text-xs" />
                <Input placeholder="Neved (opcionális)" value={name} onChange={e => setName(e.target.value)} className="rounded-none text-xs" />
                {isPreorder && (
                  <>
                    <Input placeholder="Telefonszám (opcionális)" value={phone} onChange={e => setPhone(e.target.value)} className="rounded-none text-xs" />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs uppercase tracking-wider">Mennyiség:</Label>
                      <Input type="number" min={1} max={10} value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} className="rounded-none text-xs w-20" />
                    </div>
                    <div className="border-t pt-3 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Teljes ár:</span><span>{(variantPrice * qty).toLocaleString()} Ft</span></div>
                      <div className="flex justify-between font-bold text-accent"><span>Foglaló most ({product.preorder_deposit_percent}%):</span><span>{deposit.toLocaleString()} Ft</span></div>
                      <p className="text-[10px] text-muted-foreground italic">A maradékot szállításkor fizeted.</p>
                    </div>
                    <Button onClick={submitPreorder} disabled={submitting || isSoldOut} className="w-full rounded-none uppercase tracking-wider text-xs">
                      {isSoldOut ? "Elfogyott" : submitting ? "Küldés..." : "Előrendelés véglegesítése"}
                    </Button>
                  </>
                )}
                {(isWaitlist || isComing) && !isPreorder && (
                  <Button onClick={submitWaitlist} disabled={submitting} className="w-full rounded-none uppercase tracking-wider text-xs">
                    {submitting ? "Küldés..." : isComing ? "Értesítést kérek" : "Várólistára iratkozom"}
                  </Button>
                )}
              </div>
            )}

            {/* DETAILS */}
            {(product.material || product.care_instructions || product.origin_country) && (
              <div className="border-t pt-4 space-y-2 text-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Package className="h-4 w-4" /> Részletek</h3>
                {product.material && <div><span className="text-muted-foreground uppercase tracking-wider text-[10px]">Anyag: </span><span>{product.material}</span></div>}
                {product.care_instructions && <div><span className="text-muted-foreground uppercase tracking-wider text-[10px]">Gondozás: </span><span>{product.care_instructions}</span></div>}
                {product.origin_country && <div><span className="text-muted-foreground uppercase tracking-wider text-[10px]">Származás: </span><span>{product.origin_country}</span></div>}
                {product.manufacturer && <div><span className="text-muted-foreground uppercase tracking-wider text-[10px]">Gyártó: </span><span>{product.manufacturer}</span></div>}
                {product.weight_grams && <div><span className="text-muted-foreground uppercase tracking-wider text-[10px]">Súly: </span><span>{product.weight_grams} g</span></div>}
              </div>
            )}
          </div>
        </div>

        {/* SIZE CHART MODAL */}
        {showSizeChart && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSizeChart(false)}>
            <div className="border bg-card max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold uppercase tracking-wider flex items-center gap-2"><Ruler className="h-4 w-4" /> Méret-táblázat</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowSizeChart(false)} className="rounded-none">Bezár</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-2 font-bold uppercase tracking-wider text-[10px]">Méret</th>
                      {sizeChart.some(r => r.chest_cm) && <th className="text-left p-2 font-bold uppercase tracking-wider text-[10px]">Mell</th>}
                      {sizeChart.some(r => r.waist_cm) && <th className="text-left p-2 font-bold uppercase tracking-wider text-[10px]">Derék</th>}
                      {sizeChart.some(r => r.hip_cm) && <th className="text-left p-2 font-bold uppercase tracking-wider text-[10px]">Csípő</th>}
                      {sizeChart.some(r => r.length_cm) && <th className="text-left p-2 font-bold uppercase tracking-wider text-[10px]">Hossz</th>}
                      {sizeChart.some(r => r.shoulder_cm) && <th className="text-left p-2 font-bold uppercase tracking-wider text-[10px]">Váll</th>}
                      {sizeChart.some(r => r.sleeve_cm) && <th className="text-left p-2 font-bold uppercase tracking-wider text-[10px]">Ujj</th>}
                      {sizeChart.some(r => r.inseam_cm) && <th className="text-left p-2 font-bold uppercase tracking-wider text-[10px]">Belső szár</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeChart.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-bold">{r.size}</td>
                        {sizeChart.some(x => x.chest_cm) && <td className="p-2">{r.chest_cm ? `${r.chest_cm} cm` : "—"}</td>}
                        {sizeChart.some(x => x.waist_cm) && <td className="p-2">{r.waist_cm ? `${r.waist_cm} cm` : "—"}</td>}
                        {sizeChart.some(x => x.hip_cm) && <td className="p-2">{r.hip_cm ? `${r.hip_cm} cm` : "—"}</td>}
                        {sizeChart.some(x => x.length_cm) && <td className="p-2">{r.length_cm ? `${r.length_cm} cm` : "—"}</td>}
                        {sizeChart.some(x => x.shoulder_cm) && <td className="p-2">{r.shoulder_cm ? `${r.shoulder_cm} cm` : "—"}</td>}
                        {sizeChart.some(x => x.sleeve_cm) && <td className="p-2">{r.sleeve_cm ? `${r.sleeve_cm} cm` : "—"}</td>}
                        {sizeChart.some(x => x.inseam_cm) && <td className="p-2">{r.inseam_cm ? `${r.inseam_cm} cm` : "—"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 italic">Mérések cm-ben. Tipp: mérd magad pólóban és válaszd a hozzád legközelebb álló méretet.</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

const Label = ({ className, children }: any) => <label className={className}>{children}</label>;

export default LaunchProductDetail;

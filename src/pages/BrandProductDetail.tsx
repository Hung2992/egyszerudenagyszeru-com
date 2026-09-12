import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { storeProductUrl, publicStorageUrl, buildProductDescription } from "@/lib/storefrontSeo";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { ArrowLeft, ShoppingBag, CalendarClock, Truck, Heart, ShieldCheck, RotateCcw, Minus, Plus } from "lucide-react";
import MediaImage from "@/components/partner/MediaImage";
import { toast } from "@/hooks/use-toast";
import { addToBrandCart } from "@/lib/brand-cart";
import { Button } from "@/components/ui/button";

const BrandProductDetail = () => {
  const { slug, productSlug } = useParams<{ slug: string; productSlug: string }>();
  const navigate = useNavigate();
  const [sf, setSf] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_email: "", customer_phone: "", starts_at: "", notes: "" });
  const [live, setLive] = useState<{ booked_today: number; next_booking_at: string | null } | null>(null);

  const loadLive = async (productId: string) => {
    const { data } = await supabase.rpc("public_product_day_status", { _product_id: productId });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setLive(row as any);
  };

  const submitBooking = async () => {
    if (!slug || !productSlug) return;
    setBookingSaving(true);
    const { data, error } = await supabase.functions.invoke("create-public-booking", {
      body: { store_slug: slug, product_slug: productSlug, ...form, starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : "" },
    });
    setBookingSaving(false);
    const err = (error as any) || (data && (data as any).error);
    if (err) {
      const code = typeof err === "string" ? err : "";
      const msgs: Record<string, string> = {
        invalid_name: "Add meg a neved.",
        invalid_email: "Az e-mail cím nem érvényes.",
        invalid_date: "Válassz érvényes időpontot.",
        too_soon: "Legalább 30 perccel előbbre foglalj.",
        closed_day: "Ezen a napon nincs nyitva.",
        not_bookable: "Ez a tétel nem foglalható.",
      };
      toast({ title: "Foglalás sikertelen", description: msgs[code] || "Próbáld újra kicsit később.", variant: "destructive" });
      return;
    }
    setBookingDone(true);
    if (product?.id) void loadLive(product.id);
    toast({ title: "Foglalás rögzítve", description: "A visszaigazolást elküldtük e-mailben." });
  };

  useEffect(() => {
    (async () => {
      const { data: store } = await supabase.from("partner_storefronts").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
      if (!store) { setLoading(false); return; }
      setSf(store);
      const { data: p } = await supabase.from("partner_products").select("*").eq("partner_id", store.partner_id).eq("slug", productSlug).eq("status", "active").maybeSingle();
      setProduct(p);
      setLoading(false);
      if (p) {
        void loadLive(p.id);
        await supabase.from("partner_products").update({ view_count: (p.view_count || 0) + 1 }).eq("id", p.id);
      }
    })();
  }, [slug, productSlug]);

  const seo = useMemo(() => {
    if (!sf || !product) return null;
    const title = `${product.title} – ${sf.display_name}`;
    const description = buildProductDescription({
      title: product.title,
      description: product.description || sf.tagline,
      priceHuf: product.price_huf,
      storeName: sf.display_name,
      category: product.category,
      inStock: (product.stock_qty ?? 0) > 0,
    });
    const url = storeProductUrl(sf, product.slug);
    const image = publicStorageUrl("partner-product-images", product.images?.[0])
      || publicStorageUrl("partner-storefront-media", sf.og_image_url || sf.hero_image_url || sf.logo_url);
    return { title: title.slice(0, 60), description, url, image };
  }, [sf, product]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Betöltés…</div>;
  if (!sf || !product || !seo) return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="text-center space-y-3">
        <h1 className="text-2xl uppercase">Nincs ilyen termék</h1>
        {sf && <Link to={`/b/${sf.slug}`} className="underline text-sm">Vissza a márka oldalára</Link>}
      </div>
    </div>
  );

  const css = { background: sf.bg_color, color: sf.text_color, fontFamily: sf.font_body, minHeight: "100vh" };

  // Napi állapot foglalható (szolgáltatás / élő kurzus) termékeknél
  const a: any = (product.attributes && typeof product.attributes === "object") ? product.attributes : {};
  const ptype = String(product.product_type || "");
  const isService = ptype === "service" || ptype.startsWith("service") || product.fulfillment_type === "service";
  const isCourse = ptype === "course" || ptype.startsWith("course") || product.fulfillment_type === "course";
  const isDigital = ptype === "digital" || product.fulfillment_type === "digital";
  const isBookable = a.booking_enabled !== false && (isService || (isCourse && !!a.live_schedule));
  const DAY_NAMES = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
  const dayStatus = (() => {
    if (!isBookable) return null;
    const days: number[] = Array.isArray(a.work_days) && a.work_days.length ? a.work_days.map(Number) : [1, 2, 3, 4, 5];
    const jsDay = new Date().getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    return {
      open: days.includes(isoDay),
      from: a.work_from || "09:00",
      to: a.work_to || "17:00",
      daysLabel: days.sort((x, y) => x - y).map((d) => DAY_NAMES[d - 1]).join(", "),
    };
  })();

  // Szállítási részletek fizikai termékhez (partner beállításaiból)
  const shipping = (() => {
    const fee = a.shipping_fee_huf;
    const feeLabel = fee === 0 || fee === "0"
      ? "Ingyenes szállítás"
      : fee
        ? `Szállítási díj: ${Number(fee).toLocaleString("hu-HU")} Ft`
        : "Szállítási díj a fizetésnél";
    return { feeLabel, time: a.shipping_time || "2-5 munkanap" };
  })();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || sf.tagline,
    image: seo.image ? [seo.image] : undefined,
    brand: { "@type": "Brand", name: sf.display_name },
    offers: {
      "@type": "Offer",
      url: seo.url,
      priceCurrency: "HUF",
      price: product.price_huf,
      availability: product.stock_qty > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div style={css}>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.url} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.url} />
        {seo.image && <meta property="og:image" content={seo.image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <header className="sticky top-0 z-30 border-b bg-inherit/95 backdrop-blur-xl" style={{ borderColor: `${sf.text_color}20` }}>
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <Link to={`/b/${sf.slug}`} className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" /> {sf.display_name}
          </Link>
          <Link to={`/b/${sf.slug}/kosar`} className="flex items-center gap-2 text-sm font-semibold"><ShoppingBag className="h-4 w-4" /> Kosár</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:py-14 grid md:grid-cols-2 gap-10 lg:gap-16">
        <div className="min-w-0 md:sticky md:top-28 md:self-start">
          <div className="aspect-[4/5] bg-muted/30 overflow-hidden">
            {product.images?.[activeImg] ? (
              <MediaImage bucket="partner-product-images" path={product.images[activeImg]} alt={product.title} className="w-full h-full object-cover" />
            ) : <div className="flex items-center justify-center h-full opacity-30"><ShoppingBag className="h-16 w-16" /></div>}
          </div>
          {product.images?.length > 1 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {product.images.map((p: string, i: number) => (
                <Button key={i} variant="ghost" onClick={() => setActiveImg(i)} className={`h-auto aspect-square rounded-none border p-0 ${activeImg === i ? "border-2" : ""}`} style={{ borderColor: activeImg === i ? sf.accent_color : `${sf.text_color}20` }} aria-label={`${i + 1}. kép`}>
                  <MediaImage bucket="partner-product-images" path={p} alt="" className="w-full h-full object-cover" />
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {product.category && <p className="text-xs font-semibold uppercase opacity-60">{product.category}</p>}
          <h1 className="text-3xl md:text-5xl font-bold leading-tight" style={{ fontFamily: sf.font_heading }}>{product.title}</h1>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold" style={{ color: sf.accent_color }}>{product.price_huf.toLocaleString("hu-HU")} Ft</span>
            {product.compare_price_huf && <span className="line-through opacity-50">{product.compare_price_huf.toLocaleString("hu-HU")} Ft</span>}
          </div>
          {product.description && <p className="opacity-75 whitespace-pre-wrap leading-relaxed">{product.description}</p>}

          {dayStatus && (
            <div className="border p-4 space-y-2" style={{ borderColor: `${sf.text_color}20` }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-70">
                <CalendarClock className="h-4 w-4" /> Mai állapot
              </div>
              <div className="text-lg font-bold" style={{ color: dayStatus.open ? sf.accent_color : undefined }}>
                {dayStatus.open ? `Ma foglalható · ${dayStatus.from}–${dayStatus.to}` : "Ma nem foglalható"}
              </div>
              <div className="text-xs opacity-70 space-y-1">
                {live && <div>Mai foglalások: {live.booked_today}{live.next_booking_at ? ` · következő szabad időpont után: ${new Date(live.next_booking_at).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" })}` : ""}</div>}
                <div>Nyitva: {dayStatus.daysLabel}</div>
                {a.service_duration && <div>Egy alkalom: {a.service_duration}</div>}
                {a.min_notice_hours && <div>Legkorábban {a.min_notice_hours} órával előre foglalható</div>}
                {a.deposit_percent && <div>Előleg: {a.deposit_percent}%</div>}
                {a.cancellation_policy && <div>Lemondás: {a.cancellation_policy}</div>}
              </div>
            </div>
          )}

          {isDigital && (
            <div className="text-xs opacity-70 space-y-1">
              {a.delivery_method && <div>Átadás: {a.delivery_method === "file" ? "letölthető fájl" : a.delivery_method === "link" ? "hozzáférési link" : a.delivery_method === "license" ? "licenckulcs" : "e-mailben"}</div>}
              {a.digital_version && <div>Verzió: {a.digital_version}</div>}
              {a.file_size && <div>Fájlméret: {a.file_size}</div>}
              {a.language && <div>Nyelv: {a.language}</div>}
              {a.free_updates && <div>Ingyenes frissítések</div>}
              {a.support_period && <div>Támogatás: {a.support_period}</div>}
              {a.refund_policy && <div>Garancia: {a.refund_policy}</div>}
            </div>
          )}

          {isCourse && (
            <div className="text-xs opacity-70 space-y-1">
              {a.course_duration && <div>Időtartam: {a.course_duration}</div>}
              {a.course_level && <div>Szint: {a.course_level}</div>}
              {a.instructor && <div>Oktató: {a.instructor}</div>}
              {a.live_schedule && <div>Élő alkalmak: {a.live_schedule}</div>}
              {a.course_platform && <div>Platform: {a.course_platform}</div>}
              {a.max_students && <div>Max. létszám: {a.max_students} fő</div>}
              {a.lifetime_access && <div>Örök hozzáférés</div>}
            </div>
          )}

          {!isBookable && !isDigital && !isCourse && (
            <div className="border p-4 space-y-2" style={{ borderColor: `${sf.text_color}20` }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-70">
                <Truck className="h-4 w-4" /> Szállítás
              </div>
              <div className="text-lg font-bold" style={{ color: sf.accent_color }}>
                {shipping.feeLabel}
              </div>
              <div className="text-xs opacity-70 space-y-1">
                <div>Várható kiszállítás: {shipping.time}</div>
                {a.processing_time && <div>Feldolgozás: {a.processing_time}</div>}
                {a.free_shipping_over_huf && <div>Ingyenes szállítás {Number(a.free_shipping_over_huf).toLocaleString("hu-HU")} Ft felett</div>}
                {a.shipping_carrier && <div>Futár: {a.shipping_carrier}</div>}
                {a.shipping_methods && <div>Átvétel: {a.shipping_methods}</div>}
                {a.cod_available && <div>Utánvét lehetséges</div>}
                {product.weight_g && <div>Súly: {product.weight_g} g</div>}
                {a.shipping_note && <div>{a.shipping_note}</div>}
              </div>
            </div>
          )}

          <div className="text-xs opacity-60 space-y-1">
            {product.material && <div>Anyag: {product.material}</div>}
            {product.origin_country && <div>Származás: {product.origin_country}</div>}
            {isBookable
              ? <div>Foglalható szolgáltatás</div>
              : <div>Készlet: {product.stock_qty > 0 ? `${product.stock_qty} db` : "Elfogyott"}</div>}
          </div>
          {!isBookable && <div className="flex items-center gap-3"><div className="flex h-12 items-center border" style={{ borderColor: `${sf.text_color}25` }}><Button variant="ghost" size="icon" className="rounded-none" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Mennyiség csökkentése"><Minus /></Button><span className="w-9 text-center text-sm font-semibold">{quantity}</span><Button variant="ghost" size="icon" className="rounded-none" onClick={() => setQuantity((value) => Math.min(20, value + 1))} aria-label="Mennyiség növelése"><Plus /></Button></div><Button variant="outline" size="icon" className="h-12 w-12 rounded-none" onClick={() => setSaved((value) => !value)} aria-label="Mentés a kedvencekhez"><Heart className={saved ? "fill-current" : ""} style={saved ? { color: sf.accent_color } : undefined} /></Button></div>}
          <Button
            onClick={() => {
              if (isBookable && a.booking_url) { window.open(String(a.booking_url), "_blank", "noopener"); return; }
              if (isBookable) { setBookingOpen(true); return; }
              const cartSlug = slug || sf.slug;
              addToBrandCart(cartSlug, {
                product_id: product.id,
                title: product.title,
                price_huf: Number(product.price_huf) || 0,
                qty: quantity,
                image: product.images?.[0] || null,
                physical: !isDigital && !isCourse && !isService,
              });
              toast({ title: "Kosárba tettük", description: product.title });
              navigate(slug ? `/b/${slug}/kosar` : "/kosar");
            }}
            disabled={!isBookable && !isDigital && !isCourse && product.stock_qty <= 0}
            className="h-14 w-full rounded-none text-sm font-bold uppercase disabled:opacity-30"
            style={{ background: sf.accent_color, color: sf.bg_color }}
          >
            <ShoppingBag className="h-4 w-4" /> {isBookable ? "Időpont foglalása" : (isDigital || isCourse) ? "Megvásárlom" : product.stock_qty > 0 ? "Kosárba teszem" : "Elfogyott"}
          </Button>

          <div className="grid grid-cols-3 border-y py-5 text-center" style={{ borderColor: `${sf.text_color}20` }}>
            <div className="px-2"><ShieldCheck className="mx-auto mb-2 h-5 w-5" style={{ color: sf.accent_color }} /><p className="text-[10px] font-semibold">Biztonságos vásárlás</p></div>
            <div className="border-x px-2" style={{ borderColor: `${sf.text_color}20` }}><Truck className="mx-auto mb-2 h-5 w-5" style={{ color: sf.accent_color }} /><p className="text-[10px] font-semibold">Gyors szállítás</p></div>
            <div className="px-2"><RotateCcw className="mx-auto mb-2 h-5 w-5" style={{ color: sf.accent_color }} /><p className="text-[10px] font-semibold">14 napos elállás</p></div>
          </div>

          {bookingOpen && (
            <div className="border p-4 space-y-3" style={{ borderColor: sf.accent_color }}>
              {bookingDone ? (
                <div className="space-y-1">
                  <div className="text-lg font-bold" style={{ color: sf.accent_color }}>Foglalás rögzítve</div>
                  <p className="text-sm opacity-80">A visszaigazolást elküldtük a megadott e-mail címre.</p>
                </div>
              ) : (
                <>
                  <div className="text-xs uppercase tracking-widest opacity-70">Időpontfoglalás</div>
                  <input className="w-full bg-transparent border p-3 text-sm" style={{ borderColor: `${sf.text_color}30` }}
                    placeholder="Neved" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
                  <input type="email" className="w-full bg-transparent border p-3 text-sm" style={{ borderColor: `${sf.text_color}30` }}
                    placeholder="E-mail cím" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} />
                  <input className="w-full bg-transparent border p-3 text-sm" style={{ borderColor: `${sf.text_color}30` }}
                    placeholder="Telefonszám (nem kötelező)" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} />
                  <input type="datetime-local" className="w-full bg-transparent border p-3 text-sm" style={{ borderColor: `${sf.text_color}30` }}
                    value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
                  <textarea className="w-full bg-transparent border p-3 text-sm" style={{ borderColor: `${sf.text_color}30` }} rows={2}
                    placeholder="Megjegyzés (nem kötelező)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  <button disabled={bookingSaving} onClick={() => void submitBooking()}
                    className="w-full py-3 uppercase tracking-widest font-bold border-2 disabled:opacity-40"
                    style={{ borderColor: sf.accent_color, color: sf.accent_color }}>
                    {bookingSaving ? "Küldés…" : "Foglalás elküldése"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BrandProductDetail;

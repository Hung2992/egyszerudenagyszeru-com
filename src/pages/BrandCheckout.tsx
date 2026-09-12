import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import MediaImage from "@/components/partner/MediaImage";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { getPartnerSlugFromHostname, resolveCustomDomainSlug } from "@/lib/partner-subdomain";
import { useBrandCart, setBrandCartQty, clearBrandCart } from "@/lib/brand-cart";
import { Button } from "@/components/ui/button";

const ERRORS: Record<string, string> = {
  invalid_name: "Add meg a neved.",
  invalid_email: "Az e-mail cím nem érvényes.",
  invalid_address: "Add meg a teljes szállítási címet.",
  invalid_items: "A kosár tartalma érvénytelen.",
  invalid_quantity: "Érvénytelen darabszám.",
  out_of_stock: "Egy termékből nincs elegendő készlet.",
  product_unavailable: "Egy termék már nem elérhető.",
  store_not_found: "Ez a webshop nem érhető el.",
  invalid_shipping_method: "Válassz szállítási módot.",
};

const BrandCheckout = () => {
  const params = useParams<{ slug: string }>();
  const previewToken = new URLSearchParams(window.location.search).get("preview");
  const isPreview = previewToken === "editor" || previewToken === "admin";
  const [slug, setSlug] = useState<string | null>(params.slug || getPartnerSlugFromHostname());
  const [sf, setSf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ order_number: string; total_huf: number } | null>(null);
  const [session, setSession] = useState<any>(null);

  const { items, count, subtotal } = useBrandCart(slug);
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    street: "", city: "", zip: "", notes: "", payment_method: "cod",
  });

  useEffect(() => {
    if (slug) return;
    (async () => setSlug(await resolveCustomDomainSlug()))();
  }, [slug]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      let q = supabase.from("partner_storefronts").select("*").eq("slug", slug);
      if (!isPreview) q = q.eq("is_published", true);
      const { data } = await q.maybeSingle();
      if (!alive) return;
      setSf(data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  // előtöltés a vásárlói fiókból
  useEffect(() => {
    if (!session?.user || !sf?.partner_id) return;
    (async () => {
      const { data } = await supabase.from("storefront_customers").select("*")
        .eq("user_id", session.user.id).eq("partner_id", sf.partner_id).maybeSingle();
      setForm((f) => ({
        ...f,
        customer_email: f.customer_email || session.user.email || "",
        customer_name: f.customer_name || data?.full_name || "",
        customer_phone: f.customer_phone || data?.phone || "",
        street: f.street || data?.address || "",
      }));
    })();
  }, [session, sf]);

  const hasPhysical = items.some((i) => i.physical);

  // Partner szállítási módjai
  const [methods, setMethods] = useState<any[]>([]);
  const [methodId, setMethodId] = useState<string>("");
  useEffect(() => {
    if (!sf?.partner_id) return;
    (async () => {
      const { data } = await supabase.from("partner_shipping_methods")
        .select("id, name, description, method_type, fee_huf, free_over_huf, requires_address")
        .eq("partner_id", sf.partner_id).eq("is_active", true).order("sort_order");
      setMethods(data || []);
      if (data?.length) setMethodId((m) => m || data[0].id);
    })();
  }, [sf?.partner_id]);

  const selectedMethod = methods.find((m) => m.id === methodId) || null;
  const shippingFee = !hasPhysical || !selectedMethod
    ? 0
    : (selectedMethod.free_over_huf && subtotal >= Number(selectedMethod.free_over_huf))
      ? 0
      : Math.max(0, Number(selectedMethod.fee_huf) || 0);
  const needsAddress = hasPhysical && (!selectedMethod || selectedMethod.requires_address !== false);
  const grandTotal = subtotal + shippingFee;

  const style = useMemo(() => ({
    background: sf?.bg_color || "#000",
    color: sf?.text_color || "#fff",
    fontFamily: sf?.font_body,
    minHeight: "100vh",
  }) as React.CSSProperties, [sf]);
  const accent = sf?.accent_color || "#c9a227";
  const border = `${sf?.text_color || "#fff"}20`;
  const shopHome = params.slug ? `/b/${params.slug}` : "/";

  const submit = async () => {
    if (!slug || !items.length) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-storefront-order", {
      body: {
        store_slug: slug,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        notes: form.notes,
        payment_method: form.payment_method,
        shipping_method_id: methodId || undefined,
        shipping_address: { street: form.street, city: form.city, zip: form.zip, country: "Magyarország" },
        items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
      },
    });
    setBusy(false);
    const code = (data as any)?.error || (error as any)?.message;
    if (!(data as any)?.success) {
      toast({ title: "A rendelést nem tudtuk rögzíteni", description: ERRORS[String(code)] || "Próbáld újra kicsit később.", variant: "destructive" });
      return;
    }
    clearBrandCart(slug);
    setDone({ order_number: (data as any).order_number, total_huf: (data as any).total_huf });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Betöltés…</div>;
  if (!sf) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Ez a webshop nem érhető el.</div>;

  const inputCls = "w-full h-12 px-4 bg-transparent border text-sm outline-none focus:ring-2";

  return (
    <div style={style}>
      <Helmet>
        <title>{`Kosár és pénztár – ${sf.display_name}`.slice(0, 60)}</title>
        <meta name="description" content={`Rendelés leadása a(z) ${sf.display_name} webshopban.`.slice(0, 160)} />
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="border-b" style={{ borderColor: border }}>
        <div className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between">
          <Link to={shopHome} className="font-bold uppercase text-base md:text-lg" style={{ fontFamily: sf.font_heading }}>{sf.display_name}</Link>
          <Link to={shopHome} className="text-xs font-semibold opacity-70 hover:opacity-100">← Vissza a boltba</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <p className="text-xs font-semibold uppercase" style={{ color: accent }}>Biztonságos rendelés</p>
        <h1 className="mt-2 text-3xl font-bold mb-8 md:text-5xl" style={{ fontFamily: sf.font_heading }}>Kosár és pénztár</h1>

        {done ? (
          <div className="border p-6 space-y-3" style={{ borderColor: accent }}>
            <div className="text-xl font-bold" style={{ color: accent }}>Köszönjük a rendelést!</div>
            <p className="text-sm opacity-80">Rendelésszám: <strong>{done.order_number}</strong></p>
            <p className="text-sm opacity-80">Fizetendő: <strong>{done.total_huf.toLocaleString("hu-HU")} Ft</strong></p>
            <p className="text-sm opacity-70">A rendelést a webshop tulajdonosa dolgozza fel. A státuszt a vásárlói fiókodban követheted.</p>
            <div className="flex gap-3 pt-2">
              <Link to={shopHome} className="border px-4 py-2 text-xs uppercase tracking-widest" style={{ borderColor: border }}>Tovább nézelődöm</Link>
              <Link to={params.slug ? `/b/${params.slug}/fiok` : "/fiok"} className="border-2 px-4 py-2 text-xs uppercase tracking-widest" style={{ borderColor: accent, color: accent }}>Rendeléseim</Link>
            </div>
          </div>
        ) : !items.length ? (
          <div className="border p-10 text-center space-y-4" style={{ borderColor: border }}>
            <ShoppingBag className="h-10 w-10 mx-auto opacity-40" />
            <p className="opacity-70">A kosarad üres.</p>
            <Link to={shopHome} className="inline-block border-2 px-5 py-3 text-xs uppercase tracking-widest" style={{ borderColor: accent, color: accent }}>Termékek megtekintése</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_340px] gap-8">
            <div className="space-y-3">
              {items.map((i) => (
                 <div key={i.product_id} className="border-b py-4 flex gap-3 items-center" style={{ borderColor: border }}>
                   <div className="w-20 h-20 shrink-0 bg-muted/30">
                    {i.image ? <MediaImage bucket="partner-product-images" path={i.image} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center opacity-30"><ShoppingBag className="h-6 w-6" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{i.title}</div>
                    <div className="text-xs opacity-70">{i.price_huf.toLocaleString("hu-HU")} Ft / db</div>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button variant="outline" size="icon" aria-label="Kevesebb" onClick={() => slug && setBrandCartQty(slug, i.product_id, i.qty - 1)} className="h-8 w-8 rounded-none" style={{ borderColor: border }}><Minus className="h-3 w-3" /></Button>
                    <span className="text-sm w-6 text-center">{i.qty}</span>
                     <Button variant="outline" size="icon" aria-label="Több" onClick={() => slug && setBrandCartQty(slug, i.product_id, i.qty + 1)} className="h-8 w-8 rounded-none" style={{ borderColor: border }}><Plus className="h-3 w-3" /></Button>
                     <Button variant="ghost" size="icon" aria-label="Törlés" onClick={() => slug && setBrandCartQty(slug, i.product_id, 0)} className="ml-1 h-8 w-8 rounded-none"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}

              <div className="border p-4 space-y-3 mt-6" style={{ borderColor: border }}>
                <div className="text-xs uppercase tracking-widest opacity-70">Vásárlói adatok</div>
                <input className={inputCls} style={{ borderColor: border }} placeholder="Teljes név" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                <input type="email" className={inputCls} style={{ borderColor: border }} placeholder="E-mail cím" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
                <input className={inputCls} style={{ borderColor: border }} placeholder="Telefonszám (nem kötelező)" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                {hasPhysical && methods.length > 0 && (
                  <>
                    <div className="text-xs uppercase tracking-widest opacity-70 pt-2">Szállítási mód</div>
                    <div className="space-y-2">
                      {methods.map((m) => (
                         <Button
                          key={m.id}
                          type="button"
                          onClick={() => setMethodId(m.id)}
                           variant="outline"
                           className="h-auto w-full rounded-none p-4 text-left flex justify-between gap-3 items-center"
                          style={{ borderColor: methodId === m.id ? accent : border }}
                        >
                          <span>
                            <span className="text-sm font-bold block">{m.name}</span>
                            {m.description && <span className="text-xs opacity-70">{m.description}</span>}
                            {m.free_over_huf ? (
                              <span className="text-xs opacity-70 block">
                                Ingyenes {Number(m.free_over_huf).toLocaleString("hu-HU")} Ft felett
                              </span>
                            ) : null}
                          </span>
                          <span className="text-sm whitespace-nowrap" style={{ color: accent }}>
                            {Number(m.fee_huf) > 0 ? `${Number(m.fee_huf).toLocaleString("hu-HU")} Ft` : "Ingyenes"}
                          </span>
                         </Button>
                      ))}
                    </div>
                  </>
                )}
                {needsAddress && (
                  <>
                    <div className="text-xs uppercase tracking-widest opacity-70 pt-2">Szállítási cím</div>
                    <input className={inputCls} style={{ borderColor: border }} placeholder="Utca, házszám" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                    <div className="grid grid-cols-2 gap-3">
                      <input className={inputCls} style={{ borderColor: border }} placeholder="Irányítószám" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                      <input className={inputCls} style={{ borderColor: border }} placeholder="Város" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </div>
                  </>
                )}
                <div className="text-xs uppercase tracking-widest opacity-70 pt-2">Fizetési mód</div>
                <div className="grid grid-cols-2 gap-3">
                  {[{ v: "cod", l: "Utánvét" }, { v: "transfer", l: "Banki átutalás" }].map((o) => (
                     <Button key={o.v} variant="outline" onClick={() => setForm({ ...form, payment_method: o.v })}
                       className="rounded-none border py-3 text-xs uppercase"
                      style={{ borderColor: form.payment_method === o.v ? accent : border, color: form.payment_method === o.v ? accent : undefined }}>
                      {o.l}
                     </Button>
                  ))}
                </div>
                <textarea rows={2} className="w-full p-3 bg-transparent border text-sm outline-none" style={{ borderColor: border }} placeholder="Megjegyzés (nem kötelező)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

             <aside className="border p-5 h-fit space-y-4 md:sticky md:top-6" style={{ borderColor: border }}>
              <div className="text-xs uppercase tracking-widest opacity-70">Összegzés</div>
              <div className="flex justify-between text-sm"><span>Tételek ({count} db)</span><span>{subtotal.toLocaleString("hu-HU")} Ft</span></div>
              {hasPhysical && (
                <div className="flex justify-between text-sm opacity-70">
                  <span>Szállítás{selectedMethod ? ` – ${selectedMethod.name}` : ""}</span>
                  <span>{methods.length ? (shippingFee > 0 ? `${shippingFee.toLocaleString("hu-HU")} Ft` : "Ingyenes") : "a visszaigazolás szerint"}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t" style={{ borderColor: border }}>
                <span>Végösszeg</span><span style={{ color: accent }}>{grandTotal.toLocaleString("hu-HU")} Ft</span>
              </div>
               <Button disabled={busy} onClick={() => void submit()} className="h-14 w-full rounded-none uppercase font-bold disabled:opacity-40" style={{ background: accent, color: sf.bg_color }}>
                {busy ? "Küldés…" : "Rendelés leadása"}
               </Button>
              {!session && (
                <p className="text-xs opacity-60">
                  Vendégként is rendelhetsz. <Link className="underline" to={params.slug ? `/b/${params.slug}/fiok` : "/fiok"}>Belépés</Link> után a rendeléseidet is látod.
                </p>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default BrandCheckout;

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Check, Tag, ShoppingBag, Gift, ArrowLeft } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

interface GiftWrapOption {
  id: string;
  name: string;
  price: number;
  description: string | null;
}

interface SavedAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  zip: string;
  city: string;
  address: string;
  is_default: boolean;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const [user, setUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [notes, setNotes] = useState("");
  const [installments, setInstallments] = useState(1);

  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [giftWrapOptions, setGiftWrapOptions] = useState<GiftWrapOption[]>([]);
  const [selectedGiftWrap, setSelectedGiftWrap] = useState<string | null>(null);
  const [giftMessage, setGiftMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      // Fetch gift wrap options
      const { data: giftWraps } = await (supabase.from("gift_wrap_options" as any) as any)
        .select("id, name, price, description")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (giftWraps) setGiftWrapOptions(giftWraps as GiftWrapOption[]);
      if (session?.user) {
        const [profileRes, addressRes] = await Promise.all([
          supabase.from("profiles").select("display_name, phone, city").eq("id", session.user.id).maybeSingle(),
          (supabase.from("saved_addresses" as any) as any).select("*").eq("user_id", session.user.id).order("is_default", { ascending: false }),
        ]);
        if (profileRes.data) {
          setName(profileRes.data.display_name || "");
          setPhone(profileRes.data.phone || "");
          setCity(profileRes.data.city || "");
        }
        if (addressRes.data && addressRes.data.length > 0) {
          setSavedAddresses(addressRes.data as SavedAddress[]);
          const defaultAddr = addressRes.data.find((a: any) => a.is_default) || addressRes.data[0];
          if (defaultAddr) {
            applyAddress(defaultAddr);
            setSelectedAddressId(defaultAddr.id);
          }
        }
      }
    });
  }, []);

  const applyAddress = (addr: SavedAddress) => {
    setName(addr.name);
    setPhone(addr.phone);
    setZip(addr.zip);
    setCity(addr.city);
    setAddress(addr.address);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    const code = couponCode.toUpperCase();

    // Try legacy coupons table first
    let { data } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        toast({ title: "Ez a kupon lejárt", variant: "destructive" });
        setCouponLoading(false);
        return;
      }
      if (data.max_uses && (data.used_count || 0) >= data.max_uses) {
        toast({ title: "Ez a kupon elfogyott", variant: "destructive" });
        setCouponLoading(false);
        return;
      }
      let discount = 0;
      if (data.discount_percent) discount = Math.round(totalPrice * (data.discount_percent / 100));
      else if (data.discount_amount) discount = data.discount_amount;
      setCouponDiscount(Math.min(discount, totalPrice));
      setAppliedCoupon(data.code);
      toast({ title: `Kupon alkalmazva: -${Math.min(discount, totalPrice).toLocaleString()} Ft` });
      setCouponLoading(false);
      return;
    }

    // Try enhanced coupons table
    const { data: enhanced } = await (supabase.from("enhanced_coupons" as any) as any)
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (!enhanced) {
      toast({ title: "Érvénytelen kuponkód", variant: "destructive" });
      setCouponLoading(false);
      return;
    }
    if (enhanced.valid_until && new Date(enhanced.valid_until) < new Date()) {
      toast({ title: "Ez a kupon lejárt", variant: "destructive" });
      setCouponLoading(false);
      return;
    }
    if (enhanced.max_uses && enhanced.used_count >= enhanced.max_uses) {
      toast({ title: "Ez a kupon elfogyott", variant: "destructive" });
      setCouponLoading(false);
      return;
    }
    if (enhanced.min_order_amount && totalPrice < enhanced.min_order_amount) {
      toast({ title: `Minimum rendelési összeg: ${enhanced.min_order_amount.toLocaleString()} Ft`, variant: "destructive" });
      setCouponLoading(false);
      return;
    }

    let discount = 0;
    switch (enhanced.discount_type) {
      case "percentage":
        discount = Math.round(totalPrice * (enhanced.discount_value / 100));
        break;
      case "fixed":
        discount = enhanced.discount_value;
        break;
      case "free_shipping":
        discount = 990; // standard shipping cost
        break;
      case "first_purchase":
        discount = Math.round(totalPrice * (enhanced.discount_value / 100));
        break;
    }

    setCouponDiscount(Math.min(discount, totalPrice));
    setAppliedCoupon(enhanced.code);
    toast({ title: `Kupon alkalmazva: -${Math.min(discount, totalPrice).toLocaleString()} Ft` });
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setCouponDiscount(0);
    setAppliedCoupon("");
    setCouponCode("");
  };

  const giftWrapPrice = selectedGiftWrap ? (giftWrapOptions.find(g => g.id === selectedGiftWrap)?.price || 0) : 0;
  const finalTotal = totalPrice - couponDiscount + giftWrapPrice;

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !zip.trim() || !city.trim() || !address.trim()) {
      toast({ title: "Töltsd ki az összes kötelező mezőt!", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "A kosarad üres!", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const orderItems = items.map(i => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
    }));

    // If card payment, create embedded checkout session
    if (paymentMethod === "card") {
      try {
        const checkoutPromise = supabase.functions.invoke("create-checkout-session", {
          body: {
            orderData: {
              user_id: user?.id || null,
              total_amount: finalTotal,
              shipping_name: name,
              shipping_phone: phone,
              shipping_zip: zip,
              shipping_city: city,
              shipping_address: address,
              coupon_code: appliedCoupon || null,
              discount_amount: couponDiscount > 0 ? couponDiscount : null,
              gift_wrap_price: giftWrapPrice > 0 ? giftWrapPrice : null,
              items: orderItems,
            },
            returnUrl: window.location.origin,
            environment: getStripeEnvironment(),
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error("A fizetési szolgáltató nem válaszol. Próbáld újra pár másodperc múlva."));
          }, 15000);
        });

        const { data, error } = await Promise.race([checkoutPromise, timeoutPromise]) as Awaited<ReturnType<typeof supabase.functions.invoke>>;

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.clientSecret) {
          throw new Error("Nem sikerült a fizetési munkamenet létrehozása");
        }

        setStripeClientSecret(data.clientSecret);
        setShowStripeCheckout(true);

        if (appliedCoupon) {
          await (supabase.rpc as any)("increment_coupon_usage", { coupon_code_input: appliedCoupon }).catch(() => {});
        }

        return;
      } catch (err: any) {
        console.error("Checkout error:", err);
        const msg = err?.message || err?.context?.message || err?.details || "Próbáld újra később.";
        toast({ title: "Fizetési hiba", description: msg, variant: "destructive" });
        return;
      } finally {
        setSubmitting(false);
      }
    }

    // Non-card payment (COD, transfer)
    const { error } = await supabase.from("orders").insert({
      user_id: user?.id || null,
      status: "pending",
      total_amount: finalTotal,
      shipping_name: name,
      shipping_phone: phone,
      shipping_zip: zip,
      shipping_city: city,
      shipping_address: address,
      payment_method: paymentMethod,
      coupon_code: appliedCoupon || null,
      discount_amount: couponDiscount > 0 ? couponDiscount : null,
      notes: notes || null,
      items: orderItems as any,
    });

    if (error) {
      toast({ title: "Hiba történt", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    if (appliedCoupon) {
      await (supabase.rpc as any)("increment_coupon_usage", { coupon_code_input: appliedCoupon }).catch(() => {});
    }

    // Send order confirmation email
    const orderEmail = user?.email || null;
    if (orderEmail) {
      const orderId = crypto.randomUUID();
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "order-confirmation",
          recipientEmail: orderEmail,
          idempotencyKey: `order-confirm-${orderId}`,
          templateData: {
            name,
            totalAmount: finalTotal.toLocaleString(),
            itemCount: items.length,
          },
        },
      }).catch(() => {});
    }

    clearCart();
    toast({ title: "Rendelés leadva! 🎉", description: "Hamarosan feldolgozzuk." });
    navigate("/");
    setSubmitting(false);
  };

  // Show Stripe Embedded Checkout
  if (showStripeCheckout && stripeClientSecret) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
          <Button
            variant="ghost"
            className="rounded-none uppercase tracking-wider text-xs"
            onClick={() => { setShowStripeCheckout(false); setStripeClientSecret(null); }}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Vissza
          </Button>
          <h1 className="text-xl font-bold uppercase tracking-wider">Bankkártyás fizetés</h1>
          <div id="checkout" className="border bg-card p-4">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret: stripeClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-4 py-32">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">A kosarad üres</p>
          <Button variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={() => navigate("/shop")}>
            Vissza a boltba
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="mb-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Pénztár</p>
          <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">Megrendelés</h1>
        </div>

        {/* Order summary */}
        <div className="border bg-card p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Összesítés</h3>
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {item.name} {item.size && `(${item.size})`} {item.color && `/ ${item.color}`} × {item.quantity}
              </span>
              <span className="font-semibold text-accent">{(item.price * item.quantity).toLocaleString()} Ft</span>
            </div>
          ))}
          <div className="border-t pt-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Részösszeg</span>
            <span className="font-bold">{totalPrice.toLocaleString()} Ft</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex items-center justify-between text-sm text-accent">
              <span>Kupon ({appliedCoupon})</span>
              <span>-{couponDiscount.toLocaleString()} Ft</span>
            </div>
          )}
          {giftWrapPrice > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">🎁 Ajándékcsomagolás</span>
              <span className="text-foreground">+{giftWrapPrice.toLocaleString()} Ft</span>
            </div>
          )}
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Összesen</span>
            <span className="text-accent">{finalTotal.toLocaleString()} Ft</span>
          </div>
        </div>

        {/* Coupon */}
        <div className="border bg-card p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kuponkód</h3>
          {appliedCoupon ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-accent" />
                <span className="font-mono font-bold text-accent">{appliedCoupon}</span>
                <span className="text-sm text-accent">-{couponDiscount.toLocaleString()} Ft</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={removeCoupon}>Eltávolítás</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                placeholder="KUPONKÓD"
                className="uppercase font-mono rounded-none"
              />
              <Button
                variant="outline"
                className="rounded-none uppercase tracking-wider text-xs shrink-0"
                onClick={applyCoupon}
                disabled={couponLoading}
              >
                Beváltás
              </Button>
            </div>
          )}
        </div>

        {/* Gift wrap */}
        {giftWrapOptions.length > 0 && (
          <div className="border bg-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Gift className="h-3.5 w-3.5 inline mr-1.5" />
              Ajándékcsomagolás
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedGiftWrap(null)}
                className={`w-full text-left text-xs px-4 py-2.5 border transition-colors ${
                  !selectedGiftWrap ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Nem kérek csomagolást
              </button>
              {giftWrapOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedGiftWrap(opt.id)}
                  className={`w-full text-left text-xs px-4 py-2.5 border transition-colors ${
                    selectedGiftWrap === opt.id ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="font-medium">{opt.name}</span>
                  <span className="float-right">+{opt.price.toLocaleString()} Ft</span>
                  {opt.description && <span className="block text-[10px] mt-0.5 opacity-70">{opt.description}</span>}
                </button>
              ))}
            </div>
            {selectedGiftWrap && (
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Üzenet a kártyára (opcionális)</Label>
                <Input
                  value={giftMessage}
                  onChange={e => setGiftMessage(e.target.value)}
                  className="mt-1 rounded-none"
                  placeholder="Boldog szülinapot! ❤️"
                  maxLength={150}
                />
              </div>
            )}
          </div>
        )}

        {/* Saved addresses */}
        {savedAddresses.length > 0 && (
          <div className="border bg-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mentett címek</h3>
            <div className="flex gap-2 flex-wrap">
              {savedAddresses.map(addr => (
                <button
                  key={addr.id}
                  onClick={() => { applyAddress(addr); setSelectedAddressId(addr.id); }}
                  className={`text-left text-xs px-4 py-2.5 border transition-colors ${
                    selectedAddressId === addr.id
                      ? "bg-accent text-accent-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="font-medium">{addr.label}</span>
                  <span className="block text-[10px] mt-0.5 opacity-70">{addr.city}, {addr.address}</span>
                </button>
              ))}
              <button
                onClick={() => { setSelectedAddressId(null); setName(""); setPhone(""); setZip(""); setCity(""); setAddress(""); }}
                className={`text-xs px-4 py-2.5 border transition-colors ${
                  !selectedAddressId ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Új cím
              </button>
            </div>
          </div>
        )}

        {/* Shipping info */}
        <div className="border bg-card p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Szállítási adatok</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Név *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1 rounded-none" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Telefon *</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 rounded-none" placeholder="+36..." />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Irányítószám *</Label>
              <Input value={zip} onChange={e => setZip(e.target.value)} className="mt-1 rounded-none" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Város *</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} className="mt-1 rounded-none" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cím *</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} className="mt-1 rounded-none" placeholder="Utca, házszám, emelet..." />
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="border bg-card p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fizetési mód</h3>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "cod", label: "Utánvét" },
              { value: "card", label: "Bankkártya" },
              { value: "transfer", label: "Átutalás" },
            ].map(pm => (
              <button
                key={pm.value}
                onClick={() => setPaymentMethod(pm.value)}
                className={`text-xs uppercase tracking-wider px-5 py-2.5 border transition-colors ${
                  paymentMethod === pm.value
                    ? "bg-accent text-accent-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Installments */}
        {finalTotal >= 10000 && paymentMethod === "card" && (
          <div className="border bg-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">💳 Részletfizetés</h3>
            <div className="flex gap-2 flex-wrap">
              {[1, 3, 6, 12].map(n => (
                <button
                  key={n}
                  onClick={() => setInstallments(n)}
                  className={`text-xs uppercase tracking-wider px-4 py-2.5 border transition-colors ${
                    installments === n
                      ? "bg-accent text-accent-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n === 1 ? "Egyben" : `${n}×`}
                </button>
              ))}
            </div>
            {installments > 1 && (
              <div className="text-sm border border-accent/20 bg-accent/5 p-3">
                <p className="text-foreground font-medium">
                  {installments} × <span className="text-accent font-bold">{Math.round(finalTotal / installments).toLocaleString()} Ft</span>
                  <span className="text-muted-foreground text-xs ml-2">/hó</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">0% THM, kamatmentes részletfizetés</p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="border bg-card p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Megjegyzés (opcionális)</h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="flex min-h-[60px] w-full border border-input bg-background px-3 py-2 text-sm"
            placeholder="Pl. kapucsengő kód, szállítási időpont..."
          />
        </div>

        {/* Submit */}
        <Button
          className="w-full rounded-none uppercase tracking-wider text-xs h-12"
          onClick={handleSubmit}
          disabled={submitting}
        >
          <Check className="h-4 w-4 mr-2" />
          {submitting ? "Feldolgozás..." : `Megrendelés leadása — ${finalTotal.toLocaleString()} Ft`}
        </Button>
      </div>
    </Layout>
  );
};

export default Checkout;

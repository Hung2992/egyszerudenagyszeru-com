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
import { getStoredReferralCode, clearStoredReferralCode } from "@/hooks/useReferralCapture";
import Welcome20StatusBanner from "@/components/Welcome20StatusBanner";

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

interface CheckoutSessionResponse {
  clientSecret?: string;
  order_id?: string;
  total_amount?: number;
  error?: string;
  fallback?: boolean;
}

const FUNCTION_REQUEST_TIMEOUT_MS = 15000;

const isMissingRelationError = (error: { code?: string; message?: string } | null | undefined) => {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "PGRST205" || error?.code === "42P01" || message.includes("could not find the table") || message.includes("does not exist");
};

async function invokeCheckoutFunction<T>(functionName: string, body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error("A kérés túl sokáig tartott. Próbáld újra.")), FUNCTION_REQUEST_TIMEOUT_MS);
  });

  try {
    const { data, error } = await Promise.race([
      supabase.functions.invoke(functionName, {
        body,
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      }),
      timeoutPromise,
    ]);

    if (error) {
      throw new Error(error.message || "Hálózati hiba történt");
    }

    return data as T;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Hálózati hiba történt");
  }
}

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const [user, setUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
  const [referralAutoApplied, setReferralAutoApplied] = useState(false);
  const [aiOfferId, setAiOfferId] = useState<string | null>(null);
  const [aiOfferDetails, setAiOfferDetails] = useState<any | null>(null);

  // Sync AI offer részletek a pending_ai_coupon-ból
  useEffect(() => {
    if (!appliedCoupon.startsWith("AI-")) { setAiOfferDetails(null); return; }
    try {
      const raw = sessionStorage.getItem("pending_ai_coupon");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.code === appliedCoupon) setAiOfferDetails(p);
      }
    } catch { /* ignore */ }
  }, [appliedCoupon]);


  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [giftWrapOptions, setGiftWrapOptions] = useState<GiftWrapOption[]>([]);
  const [selectedGiftWrap, setSelectedGiftWrap] = useState<string | null>(null);
  const [giftMessage, setGiftMessage] = useState("");

  useEffect(() => {
    const loadCheckoutData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      const giftWrapResponse = await (supabase.from("gift_wrap_options" as any) as any)
        .select("id, name, price, description")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (giftWrapResponse.data) {
        setGiftWrapOptions(giftWrapResponse.data as GiftWrapOption[]);
      } else if (giftWrapResponse.error && !isMissingRelationError(giftWrapResponse.error)) {
        console.error("Gift wrap options load failed:", giftWrapResponse.error);
      }

      if (!session?.user) return;

      if (session.user.email) {
        setEmail(session.user.email);
      }

      const [profileRes, addressRes] = await Promise.all([
        supabase.from("profiles").select("display_name, phone, city").eq("user_id", session.user.id).maybeSingle(),
        (supabase.from("saved_addresses" as any) as any).select("*").eq("user_id", session.user.id).order("is_default", { ascending: false }),
      ]);

      if (profileRes.data) {
        setName(profileRes.data.display_name || "");
        setPhone(profileRes.data.phone || "");
        setCity(profileRes.data.city || "");
      } else if (profileRes.error && !isMissingRelationError(profileRes.error)) {
        console.error("Profile prefill failed:", profileRes.error);
      }

      if (addressRes.data && addressRes.data.length > 0) {
        setSavedAddresses(addressRes.data as SavedAddress[]);
        const defaultAddr = addressRes.data.find((a: any) => a.is_default) || addressRes.data[0];
        if (defaultAddr) {
          applyAddress(defaultAddr);
          setSelectedAddressId(defaultAddr.id);
        }
      } else if (addressRes.error && !isMissingRelationError(addressRes.error)) {
        console.error("Saved addresses load failed:", addressRes.error);
      }
    };

    loadCheckoutData();
  }, []);

  const applyAddress = (addr: SavedAddress) => {
    setName(addr.name);
    setPhone(addr.phone);
    setZip(addr.zip);
    setCity(addr.city);
    setAddress(addr.address);
  };

  const applyCoupon = async (overrideCode?: string) => {
    const sourceCode = overrideCode ?? couponCode;
    if (!sourceCode.trim()) return;
    setCouponLoading(true);
    const code = sourceCode.toUpperCase();

    // === Kupon-ütközés kezelés ===
    // Olvassuk ki az AI ajánlat policy-jét (ha van pending)
    let aiPolicy: "override" | "block" | "ask" = "ask";
    try {
      const raw = sessionStorage.getItem("pending_ai_coupon");
      if (raw) aiPolicy = (JSON.parse(raw)?.coupon_conflict_policy as any) ?? "ask";
    } catch { /* ignore */ }

    if (code.startsWith("AI-") && appliedCoupon && !appliedCoupon.startsWith("AI-")) {
      // AI kupon jön, de már van sima kupon
      if (aiPolicy === "block") {
        toast({ title: "AI ajánlat nem alkalmazható a jelenlegi kupon mellé.", variant: "destructive" });
        setCouponLoading(false); return;
      }
      if (aiPolicy === "ask" && !window.confirm(
        `Az AI ajánlat felülírja a jelenlegi kupont: ${appliedCoupon} (-${couponDiscount.toLocaleString()} Ft). Folytatod?`
      )) { setCouponLoading(false); return; }
      // override -> töröljük a régit, folytatjuk
      setCouponDiscount(0); setAppliedCoupon("");
    } else if (!code.startsWith("AI-") && appliedCoupon.startsWith("AI-")) {
      // Sima kupon jön, AI aktív
      if (!window.confirm(
        `A jelenlegi AI ajánlat (${appliedCoupon}) elveszik, ha másik kupont alkalmazol. Folytatod?`
      )) { setCouponLoading(false); return; }
      setCouponDiscount(0); setAppliedCoupon(""); setAiOfferId(null);
      try { sessionStorage.removeItem("pending_ai_coupon"); } catch { /* ignore */ }
    }

    // === AI áralku kupon (AI- prefix) — szerveroldali validáció az ai_price_offers ellen
    if (code.startsWith("AI-")) {
      const { data: aiRes, error: aiErr } = await supabase.rpc("validate_ai_price_offer" as any, {
        _code: code,
        _user_id: user?.id ?? null,
        _order_total: totalPrice,
      });
      const parsed = aiRes as { valid: boolean; discount_amount?: number; offer_id?: string; error?: string } | null;
      if (!aiErr && parsed?.valid) {
        const discount = Math.min(parsed.discount_amount ?? 0, totalPrice);
        setCouponDiscount(discount);
        setAppliedCoupon(code);
        setAiOfferId(parsed.offer_id ?? null);
        toast({ title: `AI ajánlat aktiválva: -${discount.toLocaleString()} Ft` });
      } else {
        const map: Record<string, string> = {
          expired: "Ez az AI ajánlat már lejárt.",
          already_used: "Ezt az AI kupont már beváltottad.",
          wrong_user: "Ez az AI kupon másik fiókra érvényes.",
          not_found: "Érvénytelen AI kuponkód.",
        };
        toast({ title: map[parsed?.error ?? ""] ?? "Érvénytelen AI kupon", variant: "destructive" });
      }
      setCouponLoading(false);
      return;
    }

    // Server-side coupon validation (kód nem szivárog ki)
    const { data: result, error } = await supabase.rpc("validate_coupon", {
      _code: code,
      _order_total: totalPrice,
    });

    const res = result as { valid: boolean; code?: string; discount_amount?: number; error?: string } | null;

    if (!error && res?.valid) {
      const discount = Math.min(res.discount_amount || 0, totalPrice);
      setCouponDiscount(discount);
      setAppliedCoupon(res.code || code);
      toast({ title: `Kupon alkalmazva: -${discount.toLocaleString()} Ft` });
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
    clearStoredReferralCode();
  };

  // Auto-apply ?ref=PARTNER-XXXX captured referral code at checkout
  useEffect(() => {
    if (referralAutoApplied || appliedCoupon || items.length === 0 || totalPrice <= 0) return;
    const refCode = getStoredReferralCode();
    if (!refCode) return;
    setReferralAutoApplied(true);
    setCouponCode(refCode);
    applyCoupon(refCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, totalPrice, appliedCoupon, referralAutoApplied]);

  // Auto-apply WELCOME20 to eligible first-time buyers (server-validated)
  const [welcome20Checked, setWelcome20Checked] = useState(false);
  useEffect(() => {
    if (welcome20Checked || appliedCoupon || !user?.id || items.length === 0 || totalPrice <= 0) return;
    setWelcome20Checked(true);
    (async () => {
      const { data: eligible } = await supabase.rpc("welcome20_eligible" as any, { _user_id: user.id });
      if (eligible === true) {
        setCouponCode("WELCOME20");
        applyCoupon("WELCOME20");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, items.length, totalPrice, appliedCoupon, welcome20Checked]);

  // Auto-apply pending AI áralku kupon (a "Elfogadom és kosárba" gombból)
  const [aiAutoApplied, setAiAutoApplied] = useState(false);
  useEffect(() => {
    if (aiAutoApplied || appliedCoupon || items.length === 0 || totalPrice <= 0) return;
    try {
      const raw = sessionStorage.getItem("pending_ai_coupon");
      if (!raw) return;
      const pending = JSON.parse(raw) as { code: string; product_id: string; expires_at: string };
      if (new Date(pending.expires_at) < new Date()) {
        sessionStorage.removeItem("pending_ai_coupon");
        return;
      }
      // csak akkor alkalmazzuk, ha a termék a kosárban van
      const inCart = items.some(i => i.productId === pending.product_id);
      if (!inCart) return;
      setAiAutoApplied(true);
      setCouponCode(pending.code);
      applyCoupon(pending.code);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, totalPrice, appliedCoupon, aiAutoApplied]);



  const giftWrapPrice = selectedGiftWrap ? (giftWrapOptions.find(g => g.id === selectedGiftWrap)?.price || 0) : 0;
  const finalTotal = totalPrice - couponDiscount + giftWrapPrice;

  const handleSubmit = async () => {
    if (submitting) return;

    const trimmedEmail = email.trim();

    if (!name.trim() || !trimmedEmail || !phone.trim() || !zip.trim() || !city.trim() || !address.trim()) {
      toast({ title: "Töltsd ki az összes kötelező mezőt!", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({ title: "Adj meg egy érvényes e-mail címet!", variant: "destructive" });
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
        console.log("[Checkout] Starting card payment flow...");
        const data = await invokeCheckoutFunction<CheckoutSessionResponse>(
          "create-checkout-session",
          {
            orderData: {
              shipping_name: name,
              email: trimmedEmail,
              shipping_phone: phone,
              shipping_zip: zip,
              shipping_city: city,
              shipping_address: address,
              coupon_code: appliedCoupon || null,
              gift_wrap_id: selectedGiftWrap || null,
              items: orderItems,
            },
            returnUrl: window.location.origin,
            environment: getStripeEnvironment(),
          },
        );

        console.log("[Checkout] Edge function response:", JSON.stringify(data));

        if (!data || data.error) {
          console.error("[Checkout] Data error:", data);
          throw new Error(data?.error || "Nem sikerült a fizetési munkamenet létrehozása");
        }

        if (!data?.clientSecret) {
          console.error("[Checkout] Missing clientSecret in response:", data);
          throw new Error("Hiányzó fizetési token");
        }

        console.log("[Checkout] Got clientSecret, showing Stripe checkout...");
        setStripeClientSecret(data.clientSecret);
        setShowStripeCheckout(true);

        // Coupon usage is now handled server-side in create-checkout-session

        return;
      } catch (err: any) {
        console.error("Checkout error:", err);
        const msg = typeof err === 'string' ? err : (err?.message || "Próbáld újra később.");
        toast({ title: "Fizetési hiba", description: msg, variant: "destructive" });
        return;
      } finally {
        setSubmitting(false);
      }
    }

    // Non-card payment: validate server-side via edge function
    try {
      const data = await invokeCheckoutFunction<CheckoutSessionResponse>("place-order", {
          items: orderItems,
          coupon_code: appliedCoupon || null,
          shipping_name: name,
          email: trimmedEmail,
          shipping_phone: phone,
          shipping_zip: zip,
          shipping_city: city,
          shipping_address: address,
          payment_method: paymentMethod,
          notes: notes || null,
          gift_wrap_id: selectedGiftWrap || null,
      });

      if (!data || data.error) {
        throw new Error(data?.error || "Nem sikerült a rendelés létrehozása");
      }

      clearCart();
      if (appliedCoupon) clearStoredReferralCode();
      if (aiOfferId && data?.order_id) {
        await supabase.rpc("mark_ai_offer_accepted" as any, {
          _offer_id: aiOfferId,
          _order_id: data.order_id,
        });
        try { sessionStorage.removeItem("pending_ai_coupon"); } catch { /* ignore */ }
      }
      toast({ title: "Rendelés leadva! 🎉", description: "Hamarosan feldolgozzuk." });
      navigate("/orders");
    } catch (err: any) {
      const msg = typeof err === "string" ? err : (err?.message || "Próbáld újra később.");
      toast({ title: "Rendelési hiba", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
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
          <Welcome20StatusBanner />
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
                onClick={() => applyCoupon()}
                disabled={couponLoading}
              >
                Beváltás
              </Button>
            </div>
          )}
        </div>

        {/* AI ajánlat megerősítő kártya — a rendelés véglegesítése előtt */}
        {appliedCoupon.startsWith("AI-") && aiOfferDetails && (
          <AiOfferConfirmationCard details={aiOfferDetails} onRemove={removeCoupon} />
        )}



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
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 rounded-none" placeholder="pelda@email.com" />
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

function AiOfferConfirmationCard({ details, onRemove }: { details: any; onRemove: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const expiresAt = new Date(details.expires_at).getTime();
  const msLeft = Math.max(0, expiresAt - now);
  const mins = Math.floor(msLeft / 60000);
  const secs = Math.floor((msLeft % 60000) / 1000);
  const expired = msLeft <= 0;
  const orig = Number(details.original_price ?? 0);
  const offered = Number(details.offered_price ?? 0);
  const discountFt = orig - offered;
  const marginPct = Number(details.min_margin_percent ?? 0);
  const hardCap = Number(details.hard_cap_percent ?? 0);

  return (
    <div className={`border-2 p-5 space-y-3 ${expired ? "border-destructive bg-destructive/5" : "border-primary bg-primary/5"}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider">💰 AI ajánlat megerősítés</h3>
        <span className={`text-xs font-mono ${expired ? "text-destructive" : "text-primary"}`}>
          {expired ? "LEJÁRT" : `⏱ ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-muted-foreground">Termék</div><div className="font-semibold truncate">{details.product_name}</div>
        <div className="text-muted-foreground">Eredeti ár</div><div className="line-through">{orig.toLocaleString()} Ft</div>
        <div className="text-muted-foreground">Számolt ajánlat</div><div className="font-bold text-primary">{offered.toLocaleString()} Ft (-{details.discount_percent}%)</div>
        <div className="text-muted-foreground">Megtakarítás</div><div className="font-semibold">-{discountFt.toLocaleString()} Ft</div>
        <div className="text-muted-foreground">Kuponkód</div><div className="font-mono">{details.code}</div>
        {details.rule_name && (<><div className="text-muted-foreground">Szabály</div><div>{details.rule_name}</div></>)}
      </div>

      <div className="border-t pt-3 space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span>Margin védelem ellenőrizve — min. {marginPct}% profit megtartva</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span>Hard cap érvényesítve — max {hardCap}% engedmény</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={expired ? "text-destructive" : "text-green-600"}>{expired ? "✕" : "✓"}</span>
          <span>{expired ? "Az ajánlat lejárt — távolítsd el és kérj újat." : `Érvényesség: ${new Date(details.expires_at).toLocaleString("hu-HU")}`}</span>
        </div>
      </div>

      {details.reasoning && (
        <p className="text-xs italic text-muted-foreground border-t pt-2">„{details.reasoning}"</p>
      )}

      {expired && (
        <Button variant="destructive" size="sm" onClick={onRemove} className="w-full">
          AI kupon eltávolítása
        </Button>
      )}
    </div>
  );
}

export default Checkout;

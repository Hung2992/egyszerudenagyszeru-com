import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Minus, Plus, Trash2, ShoppingBag, Flame, Truck, Clock, Eye, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import Welcome20StatusBanner from "@/components/Welcome20StatusBanner";
import SmartCartSuggestions from "@/components/SmartCartSuggestions";

const LAUNCH_DATE = new Date("2026-06-05T10:00:00+02:00").getTime();
const FREE_SHIPPING_THRESHOLD = 15000;
const DISCOUNT_PERCENT = 20;

// Fake FOMO data
const generateViewers = () => Math.floor(Math.random() * 12) + 3;
const generateStock = () => Math.floor(Math.random() * 4) + 1;

const CartDrawer = () => {
  const { items, updateQuantity, removeItem, totalPrice, totalItems, isCartOpen, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isCartOpen) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isCartOpen]);

  const isLaunched = now >= LAUNCH_DATE;
  const saleEnd = LAUNCH_DATE + 24 * 60 * 60 * 1000;
  const saleActive = isLaunched && now < saleEnd;

  // Sale countdown
  const saleDiff = Math.max(0, saleEnd - now);
  const saleH = Math.floor(saleDiff / 3600000);
  const saleM = Math.floor((saleDiff % 3600000) / 60000);
  const saleS = Math.floor((saleDiff % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");

  // Discount
  const discountAmount = saleActive ? Math.round(totalPrice * (DISCOUNT_PERCENT / 100)) : 0;
  const priceAfterDiscount = totalPrice - discountAmount;

  // Free shipping
  const shippingCost = priceAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : 1490;
  const shippingProgress = Math.min(100, (priceAfterDiscount / FREE_SHIPPING_THRESHOLD) * 100);
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - priceAfterDiscount);

  const finalTotal = priceAfterDiscount + shippingCost;

  // FOMO - per-item viewers and stock (stable during open)
  const fomoData = useMemo(() => {
    return items.map(item => ({
      key: `${item.productId}-${item.size}-${item.color}`,
      viewers: generateViewers(),
      stock: generateStock(),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, isCartOpen]);

  // Upsell suggestions (simple mock)
  const upsellItems = useMemo(() => [
    { name: "Alap póló", price: 4990, img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop" },
    { name: "Zokni csomag", price: 2490, img: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=200&h=200&fit=crop" },
    { name: "Sapka", price: 3990, img: "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=200&h=200&fit=crop" },
  ], []);

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="text-sm font-bold uppercase tracking-wider">
            Kosár ({totalItems})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground px-5">
            <ShoppingBag className="h-10 w-10" />
            <p className="text-sm">A kosarad üres</p>
          </div>
        ) : (
          <>
            {/* FREE SHIPPING PROGRESS */}
            <div className="px-5 pb-3">
              {amountToFreeShipping > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Truck className="h-3.5 w-3.5 text-accent" />
                    <span>
                      Még <span className="text-accent font-bold">{amountToFreeShipping.toLocaleString()} Ft</span> és <span className="font-bold text-foreground">INGYENES</span> a szállítás!
                    </span>
                  </div>
                  <Progress value={shippingProgress} className="h-1.5" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-accent font-bold bg-accent/10 px-3 py-2">
                  <Truck className="h-3.5 w-3.5" />
                  ✓ Ingyenes szállítás!
                </div>
              )}
            </div>

            {/* SALE BANNER IN CART */}
            {saleActive && (
              <div className="mx-5 mb-3 bg-accent/15 border border-accent/30 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent" />
                  <span className="text-xs font-bold text-accent uppercase tracking-wider">-{DISCOUNT_PERCENT}% aktív</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs text-foreground">
                  <Clock className="h-3 w-3 text-accent" />
                  <span>{pad(saleH)}:{pad(saleM)}:{pad(saleS)}</span>
                </div>
              </div>
            )}

            {/* WELCOME20 status */}
            <div className="px-5 pb-2"><Welcome20StatusBanner compact /></div>

            {/* CART ITEMS */}
            <div className="flex-1 overflow-y-auto space-y-3 px-5 py-2">
              {items.map((item, idx) => {
                const fomo = fomoData[idx];
                return (
                  <div key={idx} className="flex gap-3 border bg-card p-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-16 w-16 object-cover border flex-shrink-0" />
                    ) : (
                      <div className="h-16 w-16 border bg-secondary flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.size && <span>{item.size}</span>}
                        {item.size && item.color && <span> / </span>}
                        {item.color && <span>{item.color}</span>}
                      </p>

                      {/* FOMO */}
                      {fomo && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {fomo.viewers} nézi most
                          </span>
                          {fomo.stock <= 3 && (
                            <span className="text-[10px] text-destructive font-bold flex items-center gap-1">
                              🔥 Már csak {fomo.stock} db!
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity - 1)}
                            className="h-6 w-6 border flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity + 1)}
                            className="h-6 w-6 border flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          {saleActive ? (
                            <div className="text-right">
                              <span className="text-[10px] text-muted-foreground line-through block">
                                {(item.price * item.quantity).toLocaleString()} Ft
                              </span>
                              <span className="text-sm font-semibold text-accent">
                                {Math.round(item.price * item.quantity * (1 - DISCOUNT_PERCENT / 100)).toLocaleString()} Ft
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-accent">
                              {(item.price * item.quantity).toLocaleString()} Ft
                            </span>
                          )}
                          <button
                            onClick={() => removeItem(item.productId, item.size, item.color)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* UPSELL */}
            <div className="px-5 py-3 border-t">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-accent" />
                Ezt is szokták hozzávenni
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {upsellItems.map((upsell, i) => (
                  <div key={i} className="flex-shrink-0 w-24 border bg-card p-2 text-center">
                    <img src={upsell.img} alt={upsell.name} className="h-16 w-full object-cover mb-1" />
                    <p className="text-[10px] font-semibold text-foreground truncate">{upsell.name}</p>
                    <p className="text-[10px] text-accent font-bold">{upsell.price.toLocaleString()} Ft</p>
                  </div>
                ))}
              </div>
            </div>

            {/* TOTALS */}
            <div className="border-t px-5 pt-4 pb-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Részösszeg</span>
                <span className="text-foreground">{totalPrice.toLocaleString()} Ft</span>
              </div>

              {saleActive && discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm text-accent">
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3" /> Nyitókedvezmény (-{DISCOUNT_PERCENT}%)
                  </span>
                  <span>-{discountAmount.toLocaleString()} Ft</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Szállítás</span>
                <span className={shippingCost === 0 ? "text-accent font-bold" : "text-foreground"}>
                  {shippingCost === 0 ? "INGYENES" : `${shippingCost.toLocaleString()} Ft`}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-bold uppercase tracking-wider">Összesen</span>
                <span className="text-lg font-bold text-accent">{finalTotal.toLocaleString()} Ft</span>
              </div>

              <Button
                className="w-full rounded-none uppercase tracking-wider text-xs h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate("/checkout");
                }}
              >
                Megrendelés
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;

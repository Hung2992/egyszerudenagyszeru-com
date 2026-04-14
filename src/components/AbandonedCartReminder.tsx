import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const REMINDER_KEY = "edn-cart-reminder-dismissed";
const REMINDER_DELAY = 30000; // 30 seconds

const AbandonedCartReminder = () => {
  const navigate = useNavigate();
  const { items, totalPrice, setIsCartOpen } = useCart();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (items.length === 0) { setShow(false); return; }

    const dismissed = sessionStorage.getItem(REMINDER_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      // Only show if user is NOT on checkout page
      if (!window.location.pathname.includes("checkout")) {
        setShow(true);
      }
    }, REMINDER_DELAY);

    return () => clearTimeout(timer);
  }, [items.length]);

  if (!show || items.length === 0) return null;

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem(REMINDER_KEY, "1");
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="border border-accent/30 bg-card shadow-lg p-4 flex items-start gap-3">
        <ShoppingBag className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Ne felejts el fizetni! 🛒</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.length} tétel vár a kosaradban — összesen {totalPrice.toLocaleString()} Ft
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              className="rounded-none text-[10px] uppercase tracking-wider h-8 flex-1"
              onClick={() => { dismiss(); setIsCartOpen(true); }}
            >
              Kosár megtekintése
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-none text-[10px] uppercase tracking-wider h-8"
              onClick={() => { dismiss(); navigate("/checkout"); }}
            >
              Pénztár
            </Button>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AbandonedCartReminder;

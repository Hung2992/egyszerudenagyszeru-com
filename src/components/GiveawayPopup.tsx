import { useState, useEffect } from "react";
import { Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const GiveawayPopup = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = sessionStorage.getItem("giveaway_popup_dismissed");
    if (dismissed) return;
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("giveaway_popup_dismissed", "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border max-w-sm w-full p-6 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center bg-accent/20 border border-accent/40 p-3 mb-4">
            <Gift className="h-8 w-8 text-accent" />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            🎉 Nyereményjáték!
          </h2>

          <p className="text-sm text-muted-foreground mb-1">
            Nyerj <span className="text-accent font-bold">ingyen ruhákat</span> — minden termékből 1 darabot!
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Csak add meg az e-mail címed és azonnal kiderül, nyertél-e.
          </p>

          <Button
            onClick={() => {
              handleDismiss();
              navigate("/nyeremenyjatek");
            }}
            className="w-full rounded-none uppercase tracking-[0.15em] text-xs h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
          >
            Játszom most!
          </Button>

          <button
            onClick={handleDismiss}
            className="mt-3 text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider"
          >
            Nem érdekel
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiveawayPopup;

import { Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const GiveawayBanner = () => {
  const navigate = useNavigate();

  return (
    <section className="border-y border-accent/30 bg-accent/5">
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-16 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-accent/20 border border-accent/40 p-3">
            <Gift className="h-8 w-8 text-accent" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground">
              🎉 Nyereményjáték — Nyerj <span className="text-accent">ingyen ruhákat!</span>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add meg az e-mail címed és azonnal kiderül, nyertél-e. Minden termékből 1 darab a tiéd!
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/nyeremenyjatek")}
          className="rounded-none uppercase tracking-[0.15em] text-xs h-12 px-8 bg-accent text-accent-foreground hover:bg-accent/90 font-bold whitespace-nowrap"
        >
          Játszom most
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
};

export default GiveawayBanner;

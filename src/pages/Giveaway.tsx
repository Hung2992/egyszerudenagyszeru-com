import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { Gift, Mail, Trophy, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "sonner";
import { sendAppEmail } from "@/lib/app-email";

// Giveaway end date: 51 days from 2026-04-14
const GIVEAWAY_END = new Date("2026-06-04T23:59:59");

type PrizeProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
};

const Giveaway = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [ended, setEnded] = useState(false);
  const [prizes, setPrizes] = useState<PrizeProduct[]>([]);

  useEffect(() => {
    const fetchPrizes = async () => {
      const { data } = await supabase
        .from("giveaway_prizes")
        .select("sort_order, shop_products(id, name, price, image_url)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (data) {
        const list = data
          .map((row: any) => row.shop_products)
          .filter(Boolean) as PrizeProduct[];
        setPrizes(list);
      }
    };
    fetchPrizes();
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const diff = GIVEAWAY_END.getTime() - now.getTime();
      if (diff <= 0) {
        setEnded(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ended) {
      toast.error("A nyereményjáték már lezárult!");
      return;
    }
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Kérlek adj meg egy érvényes e-mail címet!");
      return;
    }

    setSubmitting(true);

    const { data: existing } = await supabase
      .from("giveaway_entries")
      .select("id")
      .eq("email", trimmed)
      .maybeSingle();

    if (existing) {
      setSubmitting(false);
      setDone(true);
      toast.info("Már feliratkoztál a nyereményjátékra!");
      return;
    }

    const { error } = await supabase
      .from("giveaway_entries")
      .insert({ email: trimmed, is_winner: false });

    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast.info("Már feliratkoztál a nyereményjátékra!");
        setDone(true);
      } else {
        toast.error("Hiba történt, próbáld újra!");
      }
      return;
    }

    setDone(true);
    toast.success("Sikeresen feliratkoztál! 🎉");

    try {
      await sendAppEmail({
        templateName: 'giveaway-thanks',
        recipientEmail: trimmed,
        idempotencyKey: `giveaway-thanks-${trimmed}`,
      });
    } catch (emailError) {
      console.error("Giveaway thank-you email error:", emailError);
    }
  };

  const CountdownBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="bg-secondary border border-border p-3 min-w-[60px] text-center">
      <p className="text-2xl md:text-3xl font-bold text-accent tabular-nums">{String(value).padStart(2, "0")}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mt-1">{label}</p>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="max-w-3xl w-full text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 px-4 py-1.5 mb-6">
              <Gift className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
                Nyereményjáték
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[0.9]">
              Nyerj
              <br />
              <span className="text-accent">ingyen</span>
              <br />
              ruhákat!
            </h1>

            <p className="mt-5 text-sm md:text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Iratkozz fel az e-mail címeddel és a sorsolás végén véletlenszerűen választunk egy nyertest, aki
              <span className="text-accent font-bold"> mindenből 1 darabot kap ingyen</span> a teljes kínálatból.
            </p>
          </div>

          {/* Countdown */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <Clock className="h-4 w-4 text-accent" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                {ended ? "A sorsolás lezárult!" : "Hátralévő idő a sorsolásig"}
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <CountdownBlock value={timeLeft.days} label="Nap" />
              <CountdownBlock value={timeLeft.hours} label="Óra" />
              <CountdownBlock value={timeLeft.minutes} label="Perc" />
              <CountdownBlock value={timeLeft.seconds} label="Mp" />
            </div>
          </div>

          {/* Prizes */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: Trophy, label: "1 nyertes" },
              { icon: Gift, label: "Minden termékből 1 db" },
              { icon: Sparkles, label: "Teljesen ingyen" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="bg-secondary border border-border p-4 text-center">
                <Icon className="h-6 w-6 text-accent mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Form or Done or Ended */}
          {ended ? (
            <div className="bg-secondary border border-border p-8 text-center">
              <Trophy className="h-10 w-10 text-accent mx-auto mb-3" />
              <p className="text-lg font-bold text-foreground mb-2">
                A nyereményjáték lezárult!
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                A nyertest hamarosan kisorsolják. Ha nyertél, e-mailben értesítünk!
              </p>
              <Button
                className="rounded-none uppercase tracking-[0.15em] text-xs bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
                onClick={() => window.location.href = "/shop"}
              >
                Vásárlás
              </Button>
            </div>
          ) : !done ? (
            <form onSubmit={handleEnter} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="E-mail címed"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-14 rounded-none bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="h-14 px-8 rounded-none uppercase tracking-[0.15em] text-xs bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
              >
                Feliratkozom!
              </Button>
            </form>
          ) : (
            <div className="bg-secondary border border-border p-8 text-center">
              <p className="text-lg font-bold text-foreground mb-2">
                ✅ Sikeresen feliratkoztál!
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                Bekerültél a sorsolókerékbe! 🎡
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Ha nyersz, e-mailben értesítünk a sorsolás után. Addig is nézd meg a termékeinket!
              </p>
              <Button
                className="rounded-none uppercase tracking-[0.15em] text-xs bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
                onClick={() => window.location.href = "/shop"}
              >
                Vásárlás
              </Button>
            </div>
          )}

          <div className="mt-6 space-y-1">
            <p className="text-[10px] text-muted-foreground">
              ⏳ A sorsolás 2026. június 4-én zárul — utána véletlenszerűen választunk 1 nyertest!
            </p>
            <p className="text-[10px] text-muted-foreground">
              📧 Ha nyertél, e-mailben keresünk a megadott címen — nem kell mást tenned!
            </p>
            <p className="text-[10px] text-muted-foreground">
              A nyeremény nem váltható készpénzre. A játékban bárki részt vehet érvényes e-mail címmel.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Giveaway;

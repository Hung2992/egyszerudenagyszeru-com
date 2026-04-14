import Layout from "@/components/Layout";
import { useState } from "react";
import { Gift, Mail, Trophy, Sparkles, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "sonner";

const Giveaway = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"won" | "lost" | null>(null);
  const [animating, setAnimating] = useState(false);

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Kérlek adj meg egy érvényes e-mail címet!");
      return;
    }

    setSubmitting(true);
    setAnimating(true);

    // Check if already entered
    const { data: existing } = await supabase
      .from("giveaway_entries")
      .select("is_winner")
      .eq("email", trimmed)
      .maybeSingle();

    if (existing) {
      setAnimating(false);
      setSubmitting(false);
      if (existing.is_winner) {
        setResult("won");
        toast.success("Már nyertél korábban! 🎉");
      } else {
        setResult("lost");
        toast.info("Már részt vettél a játékban!");
      }
      return;
    }

    // Instant win: ~1 in 50 chance
    const isWinner = Math.random() < 0.02;

    const { error } = await supabase
      .from("giveaway_entries")
      .insert({ email: trimmed, is_winner: isWinner });

    // Animate for 2 seconds
    await new Promise((r) => setTimeout(r, 2000));
    setAnimating(false);
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast.info("Már részt vettél a játékban!");
        setResult("lost");
      } else {
        toast.error("Hiba történt, próbáld újra!");
      }
      return;
    }

    setResult(isWinner ? "won" : "lost");
    if (isWinner) {
      toast.success("GRATULÁLUNK! Nyertél! 🎉🎉🎉");
    } else {
      toast.info("Sajnos most nem nyertél, de köszönjük a részvételt!");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
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
              Add meg az e-mail címed és azonnal megtudjuk, nyertél-e!
              A nyertes <span className="text-accent font-bold">mindenből 1 darabot kap ingyen</span> a teljes kínálatból.
            </p>
          </div>

          {/* Prizes */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: Trophy, label: "Azonnali sorsolás" },
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

          {/* Form or Result */}
          {!result && !animating && (
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
                Játszom!
              </Button>
            </form>
          )}

          {/* Spinning animation */}
          {animating && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="animate-spin h-16 w-16 border-4 border-accent border-t-transparent rounded-full" />
              <p className="text-sm text-muted-foreground animate-pulse uppercase tracking-wider">
                Sorsolás folyamatban...
              </p>
            </div>
          )}

          {/* Won */}
          {result === "won" && !animating && (
            <div className="bg-accent/10 border-2 border-accent p-8 text-center">
              <PartyPopper className="h-16 w-16 text-accent mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-accent mb-2">
                🎉 NYERTÉL! 🎉
              </h2>
              <p className="text-sm text-foreground mb-4">
                Gratulálunk! Minden termékünkből 1 darabot kapsz teljesen ingyen!
              </p>
              <p className="text-xs text-muted-foreground">
                E-mailben keresünk a részletekkel a megadott címen.
              </p>
            </div>
          )}

          {/* Lost */}
          {result === "lost" && !animating && (
            <div className="bg-secondary border border-border p-8 text-center">
              <p className="text-lg font-bold text-foreground mb-2">
                Sajnos most nem nyertél 😔
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                De köszönjük, hogy részt vettél! Nézd meg a kollekcióinkat kedvezményes áron.
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
              ⏳ A nyereményjáték korlátlan ideig tart — amíg le nem zárjuk!
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

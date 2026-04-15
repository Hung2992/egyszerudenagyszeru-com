import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { ArrowRight, Flame, Clock } from "lucide-react";
import { useState, useEffect, lazy, Suspense } from "react";

const GiveawayBanner = lazy(() => import("@/components/GiveawayBanner"));

const LAUNCH_DATE = new Date("2026-06-05T10:00:00+02:00").getTime();

const Index = () => {
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());

  const isLaunched = now >= LAUNCH_DATE;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const targetTime = isLaunched ? LAUNCH_DATE + 24 * 60 * 60 * 1000 : LAUNCH_DATE;
  const diff = Math.max(0, targetTime - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const saleExpired = isLaunched && diff <= 0;

  return (
    <Layout>
      {/* 🔥 FELSŐ SÁV */}
      <div className="bg-accent text-accent-foreground text-center py-2 px-4">
        <p className="text-xs md:text-sm font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2">
          <Flame className="h-4 w-4" />
          {isLaunched && !saleExpired
            ? "-20% kedvezmény minden termékre — csak 24 óráig!"
            : isLaunched && saleExpired
              ? "Üdv a boltban! Nézd meg a kollekciókat."
              : "🔥 Hamarosan indulunk — iratkozz fel a kedvezményért!"}
          <Flame className="h-4 w-4" />
        </p>
      </div>

      {/* HERO */}
      <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1335&h=858&fit=crop&q=80&fm=webp"
            srcSet="https://images.unsplash.com/photo-1617137968427-85924c800a22?w=480&h=309&fit=crop&q=75&fm=webp 480w, https://images.unsplash.com/photo-1617137968427-85924c800a22?w=768&h=494&fit=crop&q=80&fm=webp 768w, https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1335&h=858&fit=crop&q=80&fm=webp 1335w"
            sizes="100vw"
            alt="Streetwear stílus"
            className="h-full w-full object-cover"
            fetchPriority="high"
            decoding="sync"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-5 py-20">
          <div className="max-w-lg">

            {/* ========== NYITÁS ELŐTT ========== */}
            {!isLaunched && (
              <>
                <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 rounded-none px-4 py-1.5 mb-6">
                  <Flame className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
                    Megnyitás hamarosan
                  </span>
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[0.9]">
                  Hamarosan
                  <br />
                  <span className="text-accent">indulunk.</span>
                </h1>

                <p className="mt-5 text-sm md:text-base text-muted-foreground leading-relaxed max-w-sm">
                  Add meg az e-mail címed, és értesítünk a nyitásról + kapsz <span className="text-accent font-bold">20% kedvezményt</span>.
                </p>

                {/* COUNTDOWN */}
                <div className="mt-6 flex items-center gap-3 flex-wrap">
                  <Clock className="h-4 w-4 text-accent" />
                  <div className="flex items-center gap-1.5 font-mono text-foreground">
                    {days > 0 && (
                      <>
                        <div className="text-center">
                          <span className="bg-secondary px-2.5 py-1.5 text-lg font-bold block">{pad(days)}</span>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">nap</span>
                        </div>
                        <span className="text-accent font-bold">:</span>
                      </>
                    )}
                    <div className="text-center">
                      <span className="bg-secondary px-2.5 py-1.5 text-lg font-bold block">{pad(hours)}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">óra</span>
                    </div>
                    <span className="text-accent font-bold">:</span>
                    <div className="text-center">
                      <span className="bg-secondary px-2.5 py-1.5 text-lg font-bold block">{pad(minutes)}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">perc</span>
                    </div>
                    <span className="text-accent font-bold">:</span>
                    <div className="text-center">
                      <span className="bg-secondary px-2.5 py-1.5 text-lg font-bold block">{pad(seconds)}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">mp</span>
                    </div>
                  </div>
                </div>

              </>
            )}

            {/* ========== NYITÁS UTÁN ========== */}
            {isLaunched && (
              <>
                <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 rounded-none px-4 py-1.5 mb-6">
                  <Flame className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
                    Megnyitottunk
                  </span>
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground leading-[0.9]">
                  <span className="text-accent">-20%</span>
                  <br />
                  minden
                  <br />
                  termékre.
                </h1>

                <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xs">
                  {saleExpired
                    ? "Nézd meg a kollekcióinkat!"
                    : "Csak 24 óráig! Ne hagyd ki a nyitókedvezményt."}
                </p>

                {/* Countdown — 24h sale */}
                {!saleExpired && (
                  <div className="mt-6 flex items-center gap-3">
                    <Clock className="h-4 w-4 text-accent" />
                    <div className="flex items-center gap-1.5 font-mono text-foreground">
                      <span className="bg-secondary px-2.5 py-1.5 text-lg font-bold">{pad(hours)}</span>
                      <span className="text-accent font-bold">:</span>
                      <span className="bg-secondary px-2.5 py-1.5 text-lg font-bold">{pad(minutes)}</span>
                      <span className="text-accent font-bold">:</span>
                      <span className="bg-secondary px-2.5 py-1.5 text-lg font-bold">{pad(seconds)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">hátra</span>
                  </div>
                )}

                <Button
                  size="lg"
                  className="mt-8 rounded-none uppercase tracking-[0.2em] text-xs h-14 px-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
                  onClick={() => navigate("/shop")}
                >
                  Vásárlás most
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                {!saleExpired && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Kuponkód automatikusan érvényesítve · Ingyenes szállítás
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>


      {/* NYEREMÉNYJÁTÉK BANNER */}
      <Suspense fallback={null}>
        <GiveawayBanner />
      </Suspense>

      {/* HANGULAT szekció */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-32 text-center">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Felveszed.
            <br />
            <span className="text-muted-foreground">Jól áll.</span>
            <br />
            Kész.
          </h2>
          <p className="mt-6 text-sm md:text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Nem kell túlgondolni. Nem kell feltűnőnek lenned, hogy észrevegyenek. Elég, ha jól nézel ki benne.
          </p>
          <Button
            size="lg"
            className="mt-10 rounded-none uppercase tracking-[0.2em] text-xs h-14 px-12 bg-foreground text-background hover:bg-foreground/90"
            onClick={() => navigate("/shop")}
          >
            Nézd meg a kollekciót
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* RÓLUNK */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent mb-4">
            A márka
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            Nem túlgondolt ruhák.
          </h2>
          <p className="mt-3 text-xl md:text-2xl font-bold text-muted-foreground leading-tight">
            Egyszerű, hordható stílus mindenkinek.
          </p>
          <p className="mt-6 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            Ez a márka azoknak szól, akik nem akarnak túlárazott, túlgondolt ruhákat. 
            Letisztult stílus, kényelmes viselet, olyan darabok, amiket bármikor felveszel — és jól állnak.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Index;

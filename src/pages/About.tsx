import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { ArrowRight, Flame, Shirt, Sparkles, Heart, Zap, Target, Users } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      {/* HERO */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1335&h=600&fit=crop&q=80&fm=webp"
            alt="A márka"
            className="h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 px-4 py-1.5 mb-6">
              <Flame className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
                Kik vagyunk
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[0.9]">
              Egyszerű
              <br />
              <span className="text-accent">de Nagyszerű.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
              Egy magyar streetwear márka, ami nem akar mindenkinek megfelelni —
              csak azoknak, akik értik: a stílus nem felhajtás, hanem tartás.
            </p>
          </div>
        </div>
      </section>

      {/* SZTORI - AZ ALAPÍTÓ */}
      <section className="mx-auto max-w-4xl px-5 py-16 md:py-24">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent mb-4 text-center">
          Az alapító
        </p>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight text-center">
          Egy ember.
          <br />
          <span className="text-accent">Egy márka.</span>
          <br />
          <span className="text-muted-foreground">Horváth Zoltán.</span>
        </h2>
        <div className="mt-10 space-y-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          <p>
            <span className="text-foreground font-bold">Horváth Zoltán vagyok</span>, és ezt a márkát
            egyedül hoztam létre — nem csapat, nem befektető, nem marketing ügynökség.
            Csak én, és egy gondolat, amit nem hagyott nyugodni.
          </p>
          <p>
            Elegem lett a túlárazott, túldizájnolt, üres logókkal teleaggatott
            ruhákból. Olyan dolgokat akartam, amit reggel felveszek és nem
            kell rá gondolnom — mégis jól nézek ki benne.
          </p>
          <p>
            Ezért hoztam létre az <span className="text-foreground font-bold">Egyszerű de Nagyszerű</span> márkát.
            Tiszta vonalak, kemény anyagok, hordható szabások. Nem kísérletezem
            trendekkel — időtálló darabokat csinálok, amiket éveken át fogsz hordani.
          </p>
          <p>
            Magyar márka, magyar gondolkodással. Nem akarom megváltani
            a divatvilágot. Csak jó ruhákat akarok csinálni, jó áron, jó embereknek.
            Egyedül kezdtem — de veled együtt csinálom tovább.
          </p>
          <p className="text-foreground font-bold pt-4 border-t border-border">
            — Horváth Zoltán, alapító
          </p>
        </div>
      </section>

      {/* ÉRTÉKEK */}
      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent mb-4 text-center">
            Amiben hiszünk
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight text-center mb-12">
            Négy szabály.
            <br />
            <span className="text-muted-foreground">Nem több.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                Icon: Target,
                title: "Egyszerűség",
                text: "Nincs felesleges grafika, nincs üres marketing. Csak a ruha. Csak a viselet.",
              },
              {
                Icon: Zap,
                title: "Minőség",
                text: "Nem rohanunk. Az anyagokat válogatjuk, a varrást ellenőrizzük. Hosszú életre tervezzük.",
              },
              {
                Icon: Heart,
                title: "Becsület",
                text: "Tisztességes árak, valós kommunikáció. Nincs hype, nincs átverés.",
              },
              {
                Icon: Users,
                title: "Közösség",
                text: "A vásárlóink nem ügyfelek — ők hozzák létre velünk a márkát. Visszajeleznek, mi reagálunk.",
              },
            ].map(({ Icon, title, text }) => (
              <div
                key={title}
                className="border border-border bg-background p-6 md:p-8 hover:border-accent transition-colors"
              >
                <Icon className="h-8 w-8 text-accent mb-4" />
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                  {title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MIT KAPSZ */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent mb-4 text-center">
          A kollekció
        </p>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight text-center mb-4">
          Milyen ruhák lesznek
          <br />
          <span className="text-accent">a polcokon?</span>
        </h2>
        <p className="text-center text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-12">
          Streetwear alapdarabok férfiaknak. Minden, amit egy hétköznapi
          szettben hordhatsz — csak jobban kivitelezve.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Pólók",
              text: "Súlyos pamut, szabott fazon. Nem nyúlik ki, nem fakul.",
              tag: "Alap",
            },
            {
              title: "Pulóverek",
              text: "Kapucnis és kerek nyakú változatok. Bélelt, meleg, masszív.",
              tag: "Réteg",
            },
            {
              title: "Nadrágok",
              text: "Cargo, jogger, klasszikus szabás. Kényelmes, de nem lompos.",
              tag: "Alsó",
            },
            {
              title: "Felsőkabátok",
              text: "Bomber, overshirt, könnyű dzseki. Évszakok közötti darabok.",
              tag: "Kabát",
            },
            {
              title: "Sapkák & Sálak",
              text: "Kötött, kordbársony, gyapjú. Apró kiegészítők, nagy különbséggel.",
              tag: "Kiegészítő",
            },
            {
              title: "Limited drops",
              text: "Kis példányszámú, számozott darabok. Ha elfogy, elfogy.",
              tag: "Drop",
            },
          ].map(({ title, text, tag }) => (
            <div
              key={title}
              className="border border-border p-6 hover:border-accent transition-colors group"
            >
              <div className="flex items-center justify-between mb-4">
                <Shirt className="h-6 w-6 text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border px-2 py-0.5">
                  {tag}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* KIKNEK */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-4xl px-5 py-20 md:py-32 text-center">
          <Sparkles className="h-8 w-8 text-accent mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Nem mindenkinek.
            <br />
            <span className="text-muted-foreground">Csak neked.</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Ha unod a logó-cirkuszt, és ruhát keresel — nem reklámfelületet
            magadon — akkor jó helyen vagy. Üdv a márkában.
          </p>
          <Button
            size="lg"
            className="mt-10 rounded-none uppercase tracking-[0.2em] text-xs h-14 px-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
            onClick={() => navigate("/shop")}
          >
            Nézd meg a kollekciót
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default About;

import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { ChevronLeft, FileText, Shield, Cookie, Undo2, Truck, ShieldCheck, Building2, Scale, Handshake } from "lucide-react";

export const LEGAL_DOCS = [
  { slug: "aszf", title: "ÁSZF", short: "Általános Szerződési Feltételek", Icon: FileText, path: "/legal/aszf" },
  { slug: "adatvedelem", title: "Adatvédelem", short: "Adatkezelési Tájékoztató (GDPR)", Icon: Shield, path: "/legal/adatvedelem" },
  { slug: "cookie", title: "Cookie", short: "Süti szabályzat", Icon: Cookie, path: "/legal/cookie" },
  { slug: "elallas", title: "Elállás", short: "Elállási / felmondási jog (14 nap)", Icon: Undo2, path: "/legal/elallas" },
  { slug: "szallitas", title: "Szállítás", short: "Szállítási és fizetési feltételek", Icon: Truck, path: "/legal/szallitas" },
  { slug: "garancia", title: "Garancia", short: "Szavatosság, jótállás, panaszkezelés", Icon: ShieldCheck, path: "/legal/garancia" },
  { slug: "impresszum", title: "Impresszum", short: "Szolgáltató adatai", Icon: Building2, path: "/legal/impresszum" },
  { slug: "jogi-nyilatkozat", title: "Jogi nyilatkozat", short: "Felelősségkorlátozás, szellemi tulajdon", Icon: Scale, path: "/legal/jogi-nyilatkozat" },
  { slug: "partner-szabalyzat", title: "Partner szabályzat", short: "Bérleti / forgalmi részesedéses együttműködés", Icon: Handshake, path: "/legal/partner-szabalyzat" },
] as const;

interface Props {
  slug: string;
  title: string;
  subtitle?: string;
  effectiveDate?: string;
  children: ReactNode;
}

const LegalLayout = ({ slug, title, subtitle, effectiveDate = "2026.01.01.", children }: Props) => {
  const navigate = useNavigate();

  return (
    <Layout>
      <section className="border-b border-border bg-secondary/20">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <button
            onClick={() => navigate("/legal")}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-accent transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Jogi központ
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent mb-3">Jogi dokumentum</p>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">{title}</h1>
          {subtitle && <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-3xl">{subtitle}</p>}
          <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Hatályos: <span className="text-foreground font-bold">{effectiveDate}</span> — Verzió: 1.0
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-12 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-4">
            Dokumentumok
          </p>
          <nav className="flex flex-col gap-1 sticky top-24">
            {LEGAL_DOCS.map(({ slug: s, title: t, path, Icon }) => {
              const active = s === slug;
              return (
                <button
                  key={s}
                  onClick={() => navigate(path)}
                  className={`flex items-center gap-2 px-3 py-2 text-[12px] text-left border-l-2 transition-colors ${
                    active
                      ? "border-accent text-accent bg-accent/5 font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {t}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <article className="legal-prose max-w-3xl">{children}</article>
      </div>
    </Layout>
  );
};

export default LegalLayout;

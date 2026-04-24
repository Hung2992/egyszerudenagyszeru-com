import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Scale, ArrowRight } from "lucide-react";
import { LEGAL_DOCS } from "@/components/legal/LegalLayout";
import { LEGAL_INFO as L } from "@/lib/legal-info";

const LegalHub = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <section className="border-b border-border bg-secondary/20">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 px-4 py-1.5 mb-6">
            <Scale className="h-3.5 w-3.5 text-accent" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Jogi központ</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[0.9]">
            Tiszta játék.
            <br />
            <span className="text-accent">Minden papíron.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Itt találsz minden jogi dokumentumot, ami a {L.brandName} márka és a {L.website} webáruház
            használatára vonatkozik. EU-s (GDPR) és magyar jogszabályoknak teljes mértékben megfelel.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {LEGAL_DOCS.map(({ slug, title, short, path, Icon }) => (
            <button
              key={slug}
              onClick={() => navigate(path)}
              className="group text-left border border-border p-6 hover:border-accent transition-colors bg-background"
            >
              <div className="flex items-start justify-between mb-4">
                <Icon className="h-7 w-7 text-accent" />
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1 group-hover:text-accent transition-colors">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{short}</p>
            </button>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Hatályos verzió: {L.version} — {L.effectiveDate} | Utolsó módosítás: {L.lastUpdated}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Jogi kérdésekkel:{" "}
            <a href={`mailto:${L.legalEmail}`} className="text-accent underline">{L.legalEmail}</a>
            {" • "}Adatvédelem:{" "}
            <a href={`mailto:${L.privacyEmail}`} className="text-accent underline">{L.privacyEmail}</a>
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default LegalHub;

// 📄 IMPROVEMENT REPORT — egy Auto-Improve futás teljes elszámolása (before/after, változott vs érintetlen mezők, QA).
import { Badge } from "@/components/ui/badge";
import { Check, ShieldCheck, X } from "lucide-react";

export interface ImprovementReport {
  run_id: string;
  created_at?: string;
  before: number;
  after: number;
  rounds: number;
  max_rounds?: number;
  target?: number;
  reached?: boolean;
  changed: string[];
  unchanged: string[];
  qa_areas: { area: string; score: number; passed: boolean }[];
  open_issues?: number;
}

const PATH_LABELS: Record<string, string> = {
  title: "Cím",
  slug: "Slug",
  short_pitch: "Rövid pitch",
  description: "Leírás",
  bullets: "Értékesítési pontok",
  faq: "GYIK",
  price_huf: "Ár",
  compare_price_huf: "Áthúzott ár",
  price_reasoning: "Árindoklás",
  upsell: "Upsell ajánlat",
  category: "Kategória",
  cover_prompt: "Borítókép prompt",
  "seo.meta_title": "SEO cím",
  "seo.meta_description": "SEO meta description",
  "seo.keywords": "SEO kulcsszavak",
  "checkout.mode": "Checkout mód",
  "checkout.confirmation_email": "Visszaigazoló e-mail",
  "checkout.post_purchase": "Vásárlás utáni folyamat",
  "attributes.license_terms": "Licencfeltételek",
  "attributes.download_limit": "Letöltési limit",
  "attributes.access_days": "Hozzáférési napok",
  "attributes.digital_delivery": "Kiszolgálás módja",
  "attributes.certificate": "Tanúsítvány",
  "attributes.cancellation_policy": "Lemondási feltételek",
};

const AREA_LABELS: Record<string, string> = {
  content: "Tartalom",
  product_page: "Termékoldal",
  checkout: "Checkout",
  seo: "SEO",
  experience: "Vásárlói élmény",
  upsell: "Upsell",
  security: "Biztonság",
};

const label = (p: string) => PATH_LABELS[p] || p;

const ImprovementReportCard = ({ report }: { report: ImprovementReport }) => {
  const delta = Number(report.after) - Number(report.before);

  return (
    <div className="border border-foreground/20 p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Improvement Report · {report.run_id}
        </div>
        <Badge variant="outline" className="rounded-none">
          {report.reached ? "💎 Cél elérve" : "🎯 Cél alatt"}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="border border-foreground/10 py-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Before</div>
          <div className="text-lg font-bold">{report.before}</div>
        </div>
        <div className="border border-foreground/10 py-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">After</div>
          <div className="text-lg font-bold text-accent">
            {report.after} {delta > 0 && <span className="text-xs">(+{delta})</span>}
          </div>
        </div>
        <div className="border border-foreground/10 py-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Körök</div>
          <div className="text-lg font-bold">
            {report.rounds}
            {report.max_rounds ? ` / ${report.max_rounds}` : ""}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Változott ({report.changed.length})
          </div>
          <div className="space-y-1">
            {report.changed.length === 0 && <div className="text-xs text-muted-foreground">Nem történt módosítás.</div>}
            {report.changed.map((p) => (
              <div key={p} className="text-xs flex gap-2">
                <Check className="h-3 w-3 mt-0.5 shrink-0 text-accent" />
                <span>{label(p)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Érintetlen ({report.unchanged.length})
          </div>
          <div className="space-y-1">
            {report.unchanged.length === 0 && <div className="text-xs text-muted-foreground">—</div>}
            {report.unchanged.map((p) => (
              <div key={p} className="text-xs flex gap-2 text-muted-foreground">
                <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{label(p)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">QA végállapot</div>
        <div className="grid grid-cols-2 gap-2">
          {report.qa_areas.map((a) => (
            <div key={a.area} className="flex items-center justify-between text-xs border border-foreground/10 px-2 py-1">
              <span className="flex items-center gap-1">
                {a.passed ? <Check className="h-3 w-3 text-accent" /> : <X className="h-3 w-3 text-destructive" />}
                {AREA_LABELS[a.area] || a.area}
              </span>
              <span className="font-bold">{a.score}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        A riport rollbackhez, diffhez és audithoz is felhasználható — a termékhez mentve marad.
      </p>
    </div>
  );
};

export default ImprovementReportCard;

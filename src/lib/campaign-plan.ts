// AI kampánytervező — determinisztikus modell és ellenőrzés.
// Az AI csak szöveges javaslatot adhat; publikálni kizárólag ellenőrzött,
// a partner által jóváhagyott terv lehet.

export interface CampaignPlanDraft {
  name: string;
  goal: string;
  audience: string;
  tone?: string;
  message_headline: string;
  message_body: string;
  newsletter_subject: string;
  newsletter_body: string;
  page_slug: string;
  page_headline: string;
  page_subheadline: string;
  page_body: string;
  page_cta_text: string;
}

export interface CampaignQaIssue {
  field: keyof CampaignPlanDraft | "general";
  label: string;
  severity: "critical" | "warning";
  message: string;
}

export interface CampaignQaReport {
  score: number;
  publishable: boolean;
  issues: CampaignQaIssue[];
  checkedAt: string;
}

const PLACEHOLDER = /lorem ipsum|placeholder|tbd|xxx+|kitöltendő/i;

interface FieldRule {
  key: keyof CampaignPlanDraft;
  label: string;
  min: number;
  max: number;
  required: boolean;
}

export const CAMPAIGN_FIELDS: FieldRule[] = [
  { key: "name", label: "Kampány neve", min: 3, max: 80, required: true },
  { key: "goal", label: "Cél", min: 5, max: 300, required: true },
  { key: "audience", label: "Célcsoport", min: 5, max: 300, required: true },
  { key: "message_headline", label: "Fő üzenet címe", min: 5, max: 90, required: true },
  { key: "message_body", label: "Fő üzenet", min: 20, max: 600, required: true },
  { key: "newsletter_subject", label: "Hírlevél tárgya", min: 5, max: 90, required: true },
  { key: "newsletter_body", label: "Hírlevél szövege", min: 40, max: 3000, required: true },
  { key: "page_slug", label: "Kampányoldal URL", min: 3, max: 60, required: true },
  { key: "page_headline", label: "Kampányoldal címe", min: 5, max: 90, required: true },
  { key: "page_subheadline", label: "Kampányoldal alcíme", min: 5, max: 160, required: false },
  { key: "page_body", label: "Kampányoldal szövege", min: 40, max: 4000, required: true },
  { key: "page_cta_text", label: "Gomb felirata", min: 2, max: 30, required: true },
];

export const slugifyCampaign = (raw: string): string =>
  (raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const text = (v: unknown) => String(v ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** AI nyers kimenetének normalizálása a szigorú mezőmodellre. */
export function normalizeCampaignPlan(raw: unknown, base: Partial<CampaignPlanDraft> = {}): CampaignPlanDraft {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = (k: keyof CampaignPlanDraft) => text(o[k] ?? base[k] ?? "");
  const plan: CampaignPlanDraft = {
    name: pick("name"),
    goal: pick("goal"),
    audience: pick("audience"),
    tone: pick("tone") || undefined,
    message_headline: pick("message_headline"),
    message_body: pick("message_body"),
    newsletter_subject: pick("newsletter_subject"),
    newsletter_body: pick("newsletter_body"),
    page_slug: slugifyCampaign(text(o.page_slug) || text(base.page_slug) || text(o.name) || text(base.name)),
    page_headline: pick("page_headline"),
    page_subheadline: pick("page_subheadline"),
    page_body: pick("page_body"),
    page_cta_text: pick("page_cta_text"),
  };
  // Hosszúság-vágás a mezőmodell szerint (nem csonkolunk mondat közepén szóhatár nélkül).
  for (const f of CAMPAIGN_FIELDS) {
    const val = plan[f.key];
    if (typeof val === "string" && val.length > f.max) {
      plan[f.key] = val.slice(0, f.max).replace(/\s+\S*$/, "") as never;
    }
  }
  return plan;
}

/** Determinisztikus ellenőrzés — ez dönti el, publikálható-e a kampány. */
export function runCampaignQa(plan: CampaignPlanDraft): CampaignQaReport {
  const issues: CampaignQaIssue[] = [];

  for (const f of CAMPAIGN_FIELDS) {
    const val = text(plan[f.key]);
    if (!val) {
      if (f.required) issues.push({ field: f.key, label: f.label, severity: "critical", message: "hiányzik" });
      continue;
    }
    if (val.length < f.min) {
      issues.push({ field: f.key, label: f.label, severity: f.required ? "critical" : "warning", message: `túl rövid (min. ${f.min} karakter)` });
    }
    if (PLACEHOLDER.test(val)) {
      issues.push({ field: f.key, label: f.label, severity: "critical", message: "helyőrző szöveget tartalmaz" });
    }
  }

  if (plan.page_slug && plan.page_slug !== slugifyCampaign(plan.page_slug)) {
    issues.push({ field: "page_slug", label: "Kampányoldal URL", severity: "critical", message: "érvénytelen URL-formátum" });
  }
  if (text(plan.message_headline) && text(plan.message_headline) === text(plan.page_headline)) {
    issues.push({ field: "page_headline", label: "Kampányoldal címe", severity: "warning", message: "megegyezik a fő üzenet címével" });
  }
  if (text(plan.newsletter_subject).length > 60) {
    issues.push({ field: "newsletter_subject", label: "Hírlevél tárgya", severity: "warning", message: "60 karakter felett levágódhat a postafiókban" });
  }

  const critical = issues.filter((i) => i.severity === "critical").length;
  const warnings = issues.length - critical;
  const score = Math.max(0, 100 - critical * 20 - warnings * 5);

  return { score, publishable: critical === 0, issues, checkedAt: new Date().toISOString() };
}

/** A kampányoldal HTML-je a jóváhagyott szövegekből (nem AI HTML). */
export function campaignPageHtml(plan: CampaignPlanDraft): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = plan.page_body
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("\n");
  return paragraphs || `<p>${esc(plan.page_body)}</p>`;
}

/** A hírlevél HTML-je a jóváhagyott szövegből. */
export function campaignNewsletterHtml(plan: CampaignPlanDraft): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = plan.newsletter_body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("\n");
  return `<h1>${esc(plan.message_headline)}</h1>\n${body || `<p>${esc(plan.newsletter_body)}</p>`}`;
}

// Pure, deterministic optimization rules for EMPYREAN. Read-only: produces
// recommendations only; any change still goes through the approval chain.

export type OptSnapshot = {
  generated_at: string; days: number;
  ai_cost_by_function: { fn: string; requests: number; tokens: number; cost: number | null }[];
  ai_cost_daily: { day: string; cost: number | null }[];
  cache: { entries: number; hits: number; live: number };
  agents: { slug: string; runs: number; ok: number; failed: number; credit_blocked?: number; avg_ms: number; cost: number; tasks_done: number }[];
  feedback: { count: number; avg_rating: number | null; negative: number };
  email: Record<string, number>;
  messaging: Record<string, number>;
  payments: { total: number; failed: number; top_errors: { code: string; n: number }[] };
  fraud: { open: number; high_open: number };
  stock: { active: number; out: number; low: number; never_sold: number; low_items: { id: string; title: string; stock_qty: number; sales_count: number | null }[] };
};

export type Severity = "high" | "medium" | "low";
export type Recommendation = { id: string; area: string; severity: Severity; title: string; why: string; kpi: string };

const safeRatio = (a: number, b: number) => (b > 0 ? a / b : null);

/** Cache hit ratio = hits / (hits + entries). Each entry was one miss. */
export function cacheHitRatio(c: OptSnapshot["cache"]): number | null {
  return safeRatio(c.hits, c.hits + c.entries);
}

/** Agent score 0–100: success rate weighted, penalised by failures. Null without runs. */
export function agentScore(a: { runs: number; ok: number; failed: number; credit_blocked?: number }): number | null {
  // Runs blocked by an exhausted AI credit limit are infrastructure outages, not agent quality.
  const runs = a.runs - (a.credit_blocked ?? 0);
  if (runs <= 0) return null;
  const success = a.ok / runs;
  const failure = a.failed / runs;
  return Math.max(0, Math.min(100, Math.round(success * 100 - failure * 20)));
}

/** Days whose cost exceeds mean + 2σ (needs ≥ 7 data points). */
export function costAnomalies(daily: { day: string; cost: number | null }[]): string[] {
  const pts = daily.filter((d) => d.cost != null) as { day: string; cost: number }[];
  if (pts.length < 7) return [];
  const mean = pts.reduce((s, p) => s + p.cost, 0) / pts.length;
  const sd = Math.sqrt(pts.reduce((s, p) => s + (p.cost - mean) ** 2, 0) / pts.length);
  if (sd === 0) return [];
  return pts.filter((p) => p.cost > mean + 2 * sd).map((p) => p.day);
}

export function deliveryRate(counts: Record<string, number>, okKeys: string[], failKeys: string[]): number | null {
  let ok = 0, fail = 0;
  for (const [k, n] of Object.entries(counts)) {
    const s = k.split(":").pop()!;
    if (okKeys.includes(s)) ok += n; else if (failKeys.includes(s)) fail += n;
  }
  return safeRatio(ok, ok + fail);
}

/** What-if: revenue = visitors × conversion × AOV. Inputs clamped; returns delta vs base. */
export function simulateRevenue(base: { visitors: number; conversion: number; aov: number },
  change: { visitorsPct: number; conversionPct: number; aovPct: number }) {
  const clamp = (v: number) => Math.max(-90, Math.min(300, v));
  const rev = (v: number, c: number, a: number) => Math.max(0, v) * Math.max(0, Math.min(1, c)) * Math.max(0, a);
  const baseRev = rev(base.visitors, base.conversion, base.aov);
  const nv = base.visitors * (1 + clamp(change.visitorsPct) / 100);
  const nc = base.conversion * (1 + clamp(change.conversionPct) / 100);
  const na = base.aov * (1 + clamp(change.aovPct) / 100);
  const newRev = rev(nv, nc, na);
  return { baseRevenue: Math.round(baseRev), newRevenue: Math.round(newRev), delta: Math.round(newRev - baseRev) };
}

export function recommendations(s: OptSnapshot): Recommendation[] {
  const out: Recommendation[] = [];
  const hit = cacheHitRatio(s.cache);
  if (hit != null && s.cache.entries >= 20 && hit < 0.2)
    out.push({ id: "cache", area: "AI költség", severity: "medium", title: "Alacsony AI gyorsítótár-találat", why: `Találati arány ${(hit * 100).toFixed(0)}%.`, kpi: "AI-költség" });
  const top = s.ai_cost_by_function[0];
  const total = s.ai_cost_by_function.reduce((t, f) => t + (f.cost ?? 0), 0);
  if (top && total > 0 && (top.cost ?? 0) / total > 0.5)
    out.push({ id: "cost-concentration", area: "AI költség", severity: "medium", title: `A költség ${Math.round(((top.cost ?? 0) / total) * 100)}%-a egy funkcióé: ${top.fn}`, why: "Olcsóbb modell vagy gyorsítótár vizsgálata javasolt.", kpi: "AI-költség" });
  const blocked = s.agents.reduce((t, a) => t + (a.credit_blocked ?? 0), 0);
  if (blocked > 0)
    out.push({ id: "ai-credit", area: "AI költség", severity: "high", title: `${blocked} ügynökfutás elakadt AI-keret hiánya miatt`, why: "Keretkimerülés, nem ügynökhiba. Költségkeret és riasztás javasolt.", kpi: "AI-költség" });
  for (const a of s.agents) {
    const sc = agentScore(a);
    if (sc != null && a.runs >= 5 && sc < 60)
      out.push({ id: `agent-${a.slug}`, area: "Ügynökök", severity: sc < 30 ? "high" : "medium", title: `Gyenge ügynök: ${a.slug} (${sc}/100)`, why: `${a.failed}/${a.runs - (a.credit_blocked ?? 0)} futás hibás.`, kpi: "Kevesebb kézi javítás" });
  }
  if (s.feedback.count >= 5 && s.feedback.negative / s.feedback.count > 0.3)
    out.push({ id: "feedback", area: "AI minőség", severity: "medium", title: "Sok negatív AI-visszajelzés", why: `${s.feedback.negative}/${s.feedback.count} értékelés ≤ 2.`, kpi: "Kevesebb kézi javítás" });
  const em = deliveryRate(s.email, ["sent", "delivered"], ["failed", "bounced", "dlq", "suppressed"]);
  if (em != null && em < 0.9)
    out.push({ id: "email", area: "Kommunikáció", severity: em < 0.7 ? "high" : "medium", title: "Gyenge e-mail kézbesítés", why: `Sikeres arány ${(em * 100).toFixed(0)}%.`, kpi: "Konverzió" });
  if (s.payments.total >= 5 && s.payments.failed / s.payments.total > 0.15)
    out.push({ id: "payments", area: "Fizetés", severity: "high", title: "Magas sikertelen fizetési arány", why: `${s.payments.failed}/${s.payments.total} sikertelen.`, kpi: "Konverzió" });
  if (s.fraud.high_open > 0)
    out.push({ id: "fraud", area: "Kockázat", severity: "high", title: `${s.fraud.high_open} magas kockázatú rendelés vár átnézésre`, why: "Emberi döntés kötelező.", kpi: "Pénzügyi kontroll" });
  if (s.stock.out > 0)
    out.push({ id: "stock-out", area: "Készlet", severity: "medium", title: `${s.stock.out} aktív termék elfogyott`, why: "Elfogyott termék nem konvertál.", kpi: "Konverzió" });
  if (s.stock.never_sold > 0)
    out.push({ id: "never-sold", area: "Kínálat", severity: "low", title: `${s.stock.never_sold} termék 30+ napja nem fogyott`, why: "SEO- vagy kampányjavaslat érdemes.", kpi: "Konverzió" });
  if (costAnomalies(s.ai_cost_daily).length)
    out.push({ id: "cost-anomaly", area: "AI költség", severity: "medium", title: "Szokatlan AI-költségcsúcs", why: costAnomalies(s.ai_cost_daily).join(", "), kpi: "AI-költség" });
  const rank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

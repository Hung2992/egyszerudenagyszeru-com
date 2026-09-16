// AI kampánytervező: cél → célcsoport → AI javaslat (üzenet, hírlevél, kampányoldal)
// → determinisztikus ellenőrzés és előrejelzés → jóváhagyás → publikálás valódi
// kampányoldalként, webshop kiemelt sávként és hírlevél-vázlatként.
// Az AI semmit nem tesz élesbe automatikusan.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Megaphone, Loader2, Check, ShieldCheck, Rocket, RefreshCw, TrendingUp, PackageSearch } from "lucide-react";
import {
  normalizeCampaignPlan,
  runCampaignQa,
  campaignPageHtml,
  campaignNewsletterHtml,
  slugifyCampaign,
  forecastCampaign,
  selectSlowMovers,
  type CampaignPlanDraft,
  type CampaignQaReport,
  type CampaignForecast,
  type CampaignForecastInput,
} from "@/lib/campaign-plan";

interface Props { partnerId: string }

type Step = "brief" | "review" | "done";

const EMPTY: CampaignPlanDraft = {
  name: "", goal: "", audience: "", message_headline: "", message_body: "",
  newsletter_subject: "", newsletter_body: "", page_slug: "", page_headline: "",
  page_subheadline: "", page_body: "", page_cta_text: "",
};

const ft = (n: number) => `${Math.round(n || 0).toLocaleString("hu-HU")} Ft`;

const AiCampaignPlanner = ({ partnerId }: Props) => {
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [busy, setBusy] = useState(false);
  const [slowBusy, setSlowBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [step, setStep] = useState<Step>("brief");
  const [plan, setPlan] = useState<CampaignPlanDraft>(EMPTY);
  const [qa, setQa] = useState<CampaignQaReport | null>(null);
  const [forecast, setForecast] = useState<CampaignForecast | null>(null);
  const [source, setSource] = useState<"manual" | "auto_slow_movers">("manual");
  const [category, setCategory] = useState("Általános");
  const [planId, setPlanId] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  const loadRecent = async () => {
    const { data } = await supabase
      .from("partner_campaign_plans")
      .select("id, name, status, created_at, page_slug, view_count, click_count")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecent(data || []);
  };

  useEffect(() => { void loadRecent(); }, [partnerId]);

  // Valódi bolti adatok az előrejelzéshez (nincs becsült vagy kitalált érték).
  const loadForecastInput = async (qaScore: number): Promise<CampaignForecastInput> => {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [{ count: subs }, prods, orders] = await Promise.all([
      supabase.from("partner_email_subscribers").select("id", { count: "exact", head: true }).eq("partner_id", partnerId),
      supabase.from("partner_products").select("view_count").eq("partner_id", partnerId).eq("status", "active"),
      supabase.from("partner_orders").select("total_huf, created_at").eq("partner_id", partnerId).gte("created_at", since),
    ]);
    const visitors = (prods.data || []).reduce((s: number, p: any) => s + (p.view_count || 0), 0);
    const list = orders.data || [];
    const revenue = list.reduce((s: number, o: any) => s + Number(o.total_huf || 0), 0);
    return {
      subscribers: subs || 0,
      visitors30d: visitors,
      orders30d: list.length,
      avgOrderValueHuf: list.length ? revenue / list.length : 0,
      qaScore,
    };
  };

  const setField = (k: keyof CampaignPlanDraft, v: string) => {
    setPlan((p) => {
      const next = { ...p, [k]: k === "page_slug" ? slugifyCampaign(v) : v };
      setQa(runCampaignQa(next));
      return next;
    });
  };

  const runGenerate = async (g: string, a: string, src: "manual" | "auto_slow_movers") => {
    const { data, error } = await supabase.functions.invoke("partner-campaign-plan", {
      body: { partner_id: partnerId, goal: g, audience: a, tone },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    const normalized = normalizeCampaignPlan(data.plan, { goal: g, audience: a, tone });
    normalized.goal = g.trim();
    normalized.audience = a.trim();
    const report = runCampaignQa(normalized);
    const fc = forecastCampaign(normalized, await loadForecastInput(report.score));
    setPlan(normalized);
    setQa(report);
    setForecast(fc);
    setSource(src);
    setStep("review");

    const { data: saved } = await supabase
      .from("partner_campaign_plans")
      .insert({
        partner_id: partnerId,
        name: normalized.name || "AI kampány",
        goal: normalized.goal,
        audience: normalized.audience,
        tone: tone || null,
        message_headline: normalized.message_headline,
        message_body: normalized.message_body,
        newsletter_subject: normalized.newsletter_subject,
        newsletter_body: normalized.newsletter_body,
        page_slug: normalized.page_slug,
        page_headline: normalized.page_headline,
        page_subheadline: normalized.page_subheadline,
        page_body: normalized.page_body,
        page_cta_text: normalized.page_cta_text,
        qa_report: report as unknown as Record<string, unknown>,
        forecast: fc as unknown as Record<string, unknown>,
        source: src,
        category: src === "auto_slow_movers" ? "Készletkisöprés" : category,
        status: "draft",
      })
      .select("id")
      .maybeSingle();
    setPlanId(saved?.id ?? null);
    void loadRecent();
  };

  const errMsg = (e: any) => {
    const m = String(e?.message || "");
    return m.includes("ai_unavailable") ? "Az AI most nem elérhető, próbáld újra pár perc múlva."
      : m.includes("rate_limited") ? "Túl sok kérés, várj egy kicsit."
      : m.includes("not_partner") ? "Ehhez a partnerfiókhoz nincs jogosultságod."
      : "Nem sikerült elkészíteni a kampánytervet.";
  };

  const generate = async () => {
    if (!goal.trim() || !audience.trim()) {
      toast({ title: "Hiányzó adat", description: "Add meg a kampány célját és a célcsoportot.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try { await runGenerate(goal, audience, "manual"); }
    catch (e: any) { toast({ title: "Hiba", description: errMsg(e), variant: "destructive" }); }
    finally { setBusy(false); }
  };

  // Lassan fogyó termékek: valódi készlet- és eladási adatok alapján.
  const generateForSlowMovers = async () => {
    setSlowBusy(true);
    try {
      const { data: prods } = await supabase
        .from("partner_products")
        .select("id, title, price_huf, stock_qty, category, sales_count, created_at")
        .eq("partner_id", partnerId)
        .eq("status", "active");
      const slow = selectSlowMovers(
        (prods || []).map((p: any) => ({
          id: p.id, title: p.title, price_huf: p.price_huf, stock: p.stock_qty,
          category: p.category, sold30d: p.sales_count || 0, created_at: p.created_at,
        })),
      );
      if (slow.length === 0) {
        toast({ title: "Nincs lassan fogyó termék", description: "Minden készleten lévő terméked jól fogy." });
        return;
      }
      const names = slow.map((p) => `${p.title}${p.price_huf ? ` (${ft(Number(p.price_huf))})` : ""}`).join(", ");
      const g = `Készleten maradt, lassan fogyó termékek eladásának felpörgetése: ${names}`;
      const a = audience.trim() || "meglévő vásárlók és hírlevél-feliratkozók";
      setGoal(g);
      setAudience(a);
      setCategory("Készletkisöprés");
      await runGenerate(g, a, "auto_slow_movers");
    } catch (e: any) {
      toast({ title: "Hiba", description: errMsg(e), variant: "destructive" });
    } finally { setSlowBusy(false); }
  };

  const publish = async () => {
    const report = runCampaignQa(plan);
    setQa(report);
    if (!report.publishable) {
      toast({ title: "Nem publikálható", description: "Előbb javítsd a pirossal jelölt hibákat.", variant: "destructive" });
      return;
    }
    setPublishing(true);
    try {
      const now = new Date().toISOString();
      const fc = forecast ?? forecastCampaign(plan, await loadForecastInput(report.score));

      const { data: page, error: pageErr } = await supabase
        .from("partner_landing_pages")
        .insert({
          partner_id: partnerId,
          slug: plan.page_slug,
          headline: plan.page_headline,
          subheadline: plan.page_subheadline || null,
          body_html: campaignPageHtml(plan),
          cta_text: plan.page_cta_text,
          active: true,
        })
        .select("id, slug")
        .maybeSingle();
      if (pageErr) throw new Error(pageErr.message);

      const { data: blast, error: blastErr } = await supabase
        .from("partner_email_blasts")
        .insert({
          partner_id: partnerId,
          subject: plan.newsletter_subject,
          body_html: campaignNewsletterHtml(plan),
          status: "draft",
        })
        .select("id")
        .maybeSingle();
      if (blastErr) throw new Error(blastErr.message);

      // Webshop kiemelt sáv + verzióbejegyzés a történetbe.
      const { data: sfRow } = await supabase
        .from("partner_storefronts")
        .select("*")
        .eq("partner_id", partnerId)
        .maybeSingle();

      let versionId: string | null = null;
      if (sfRow?.id) {
        const { data: last } = await supabase
          .from("partner_storefront_versions")
          .select("version_number")
          .eq("storefront_id", sfRow.id)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();
        const { data: ver } = await supabase
          .from("partner_storefront_versions")
          .insert({
            storefront_id: sfRow.id,
            version_number: (last?.version_number || 0) + 1,
            snapshot: { ...sfRow, active_campaign_plan_id: planId },
            change_summary: `Kampány publikálva: ${plan.name || plan.message_headline}`,
          })
          .select("id")
          .maybeSingle();
        versionId = ver?.id ?? null;
        await supabase.from("partner_storefronts").update({ active_campaign_plan_id: planId }).eq("id", sfRow.id);
      }

      const payload = {
        partner_id: partnerId,
        name: plan.name || "AI kampány",
        goal: plan.goal,
        audience: plan.audience,
        tone: tone || null,
        message_headline: plan.message_headline,
        message_body: plan.message_body,
        newsletter_subject: plan.newsletter_subject,
        newsletter_body: plan.newsletter_body,
        page_slug: plan.page_slug,
        page_headline: plan.page_headline,
        page_subheadline: plan.page_subheadline,
        page_body: plan.page_body,
        page_cta_text: plan.page_cta_text,
        qa_report: report as unknown as Record<string, unknown>,
        forecast: fc as unknown as Record<string, unknown>,
        source,
        category: source === "auto_slow_movers" ? "Készletkisöprés" : category,
        status: "published",
        approved_at: now,
        published_at: now,
        published_landing_page_id: page?.id ?? null,
        published_blast_id: blast?.id ?? null,
        storefront_version_id: versionId,
      };
      const { error: planErr } = planId
        ? await supabase.from("partner_campaign_plans").update(payload).eq("id", planId)
        : await supabase.from("partner_campaign_plans").insert(payload);
      if (planErr) throw new Error(planErr.message);

      setPageUrl(sfRow?.slug ? `${window.location.origin}/b/${sfRow.slug}/kampany/${plan.page_slug}` : null);
      setForecast(fc);
      setStep("done");
      void loadRecent();
      toast({ title: "Kampány publikálva", description: "A kampányoldal él, a webshopban kiemelt sáv jelenik meg." });
    } catch (e: any) {
      toast({ title: "Publikálás sikertelen", description: String(e?.message || "Ismeretlen hiba"), variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const field = (key: keyof CampaignPlanDraft, label: string, multiline = false) => {
    const issues = (qa?.issues || []).filter((i) => i.field === key);
    const critical = issues.some((i) => i.severity === "critical");
    return (
      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</label>
        {multiline ? (
          <Textarea
            value={String(plan[key] ?? "")}
            onChange={(e) => setField(key, e.target.value)}
            rows={4}
            className={`rounded-none ${critical ? "border-destructive" : ""}`}
          />
        ) : (
          <Input
            value={String(plan[key] ?? "")}
            onChange={(e) => setField(key, e.target.value)}
            className={`rounded-none ${critical ? "border-destructive" : ""}`}
          />
        )}
        {issues.map((i, idx) => (
          <p key={idx} className={`text-[11px] ${i.severity === "critical" ? "text-destructive" : "text-muted-foreground"}`}>
            {i.message}
          </p>
        ))}
      </div>
    );
  };

  const forecastBlock = forecast && (
    <div className="border border-foreground/15 p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
        <TrendingUp className="h-3 w-3" /> Várható eredmény
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 text-xs">
        <div><span className="block text-muted-foreground">Megtekintés</span><b>{forecast.expectedViews.toLocaleString("hu-HU")}</b></div>
        <div><span className="block text-muted-foreground">Kattintás</span><b>{forecast.expectedClicks.toLocaleString("hu-HU")}</b></div>
        <div><span className="block text-muted-foreground">Rendelés</span><b>{forecast.expectedConversions}</b></div>
        <div><span className="block text-muted-foreground">Bevétel</span><b>{ft(forecast.expectedRevenueHuf)}</b></div>
      </div>
      <div className="space-y-1">
        {forecast.sections.map((s) => (
          <div key={s.key} className="flex justify-between text-[11px]">
            <span>{s.label}</span>
            <span className="text-muted-foreground">{s.expectedClicks} kattintás · {ft(s.expectedRevenueHuf)}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{forecast.basis}</p>
    </div>
  );

  return (
    <Card className="rounded-none border-foreground/20 p-4 md:p-5 space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Megaphone className="h-3.5 w-3.5" /> AI kampánytervező
        </div>
        <p className="text-xs text-muted-foreground">
          Cél és célcsoport megadása után az AI megírja az üzenetet, a hírlevelet és a webshop kampányoldalát. Ellenőrzés és jóváhagyás után publikálod.
        </p>
      </div>

      {step === "brief" && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void generate(); }}>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Cél</label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Pl.: Őszi fékbetét eladás növelése" className="rounded-none" disabled={busy} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Célcsoport</label>
            <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Pl.: budapesti autótulajdonosok, 30–50 év" className="rounded-none" disabled={busy} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Hangnem (opcionális)</label>
            <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Pl.: magabiztos, barátságos" className="rounded-none" disabled={busy} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="rounded-none" disabled={busy || slowBusy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
              Kampányterv készítése
            </Button>
            <Button type="button" variant="outline" className="rounded-none" onClick={() => void generateForSlowMovers()} disabled={busy || slowBusy}>
              {slowBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PackageSearch className="h-4 w-4 mr-2" />}
              Kampány a lassan fogyó termékekre
            </Button>
          </div>
        </form>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={qa?.publishable ? "default" : "destructive"} className="rounded-none">
              <ShieldCheck className="h-3 w-3 mr-1" /> Ellenőrzés: {qa?.score ?? 0}/100
            </Badge>
            {source === "auto_slow_movers" && <Badge variant="secondary" className="rounded-none">Lassan fogyó termékek</Badge>}
            {!qa?.publishable && <span className="text-[11px] text-destructive">Javítsd a hibákat a publikáláshoz.</span>}
          </div>

          {forecastBlock}

          <div className="grid gap-3 md:grid-cols-2">
            {field("name", "Kampány neve")}
            {field("message_headline", "Fő üzenet címe")}
          </div>
          {field("message_body", "Fő üzenet", true)}

          <div className="border-t border-foreground/10 pt-3 space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Hírlevél</p>
            {field("newsletter_subject", "Tárgy")}
            {field("newsletter_body", "Szöveg", true)}
          </div>

          <div className="border-t border-foreground/10 pt-3 space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Webshop kampányoldal</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Kampány kategória</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-none" placeholder="Pl.: Akció, Újdonság" />
            </div>
            {field("page_slug", "Oldal URL")}
              {field("page_cta_text", "Gomb felirata")}
            </div>
            {field("page_headline", "Cím")}
            {field("page_subheadline", "Alcím")}
            {field("page_body", "Szöveg", true)}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-foreground/10 pt-3">
            <Button className="rounded-none" onClick={() => void publish()} disabled={publishing || !qa?.publishable}>
              {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
              Jóváhagyás és publikálás
            </Button>
            <Button variant="outline" className="rounded-none" onClick={() => void generate()} disabled={busy || publishing}>
              <RefreshCw className="h-4 w-4 mr-2" /> Új javaslat
            </Button>
            <Button variant="ghost" className="rounded-none" onClick={() => setStep("brief")} disabled={publishing}>
              Vissza
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-3">
          <Badge className="rounded-none"><Check className="h-3 w-3 mr-1" /> Publikálva</Badge>
          <p className="text-sm">
            A kampányoldal él{pageUrl ? ": " : "."}
            {pageUrl && <a href={pageUrl} target="_blank" rel="noreferrer" className="underline break-all">{pageUrl}</a>}
          </p>
          <p className="text-xs text-muted-foreground">
            A webshop tetején kiemelt sáv vezet a kampányra, a hírlevél pedig piszkozatként készült el — a kiküldést a Marketing fülön indíthatod.
          </p>
          {forecastBlock}
          <Button variant="outline" className="rounded-none" onClick={() => { setStep("brief"); setPlan(EMPTY); setQa(null); setForecast(null); setPlanId(null); }}>
            Új kampány
          </Button>
        </div>
      )}

      {recent.length > 0 && (
        <div className="border-t border-foreground/10 pt-3 space-y-1">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Korábbi kampányok</p>
          {recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">{r.name}</span>
              <span className="shrink-0 text-muted-foreground">{r.view_count || 0} / {r.click_count || 0}</span>
              <Badge variant={r.status === "published" ? "default" : "secondary"} className="rounded-none text-[10px] shrink-0">
                {r.status === "published" ? "Publikált" : r.status === "approved" ? "Jóváhagyott" : "Vázlat"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AiCampaignPlanner;

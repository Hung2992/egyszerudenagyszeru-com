// AI kampánytervező: cél → célcsoport → AI javaslat (üzenet, hírlevél, kampányoldal)
// → determinisztikus ellenőrzés → jóváhagyás → publikálás valódi kampányoldalként és
// hírlevél-vázlatként. Az AI semmit nem tesz élesbe automatikusan.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Megaphone, Loader2, Check, ShieldCheck, Rocket, RefreshCw } from "lucide-react";
import {
  normalizeCampaignPlan,
  runCampaignQa,
  campaignPageHtml,
  campaignNewsletterHtml,
  slugifyCampaign,
  type CampaignPlanDraft,
  type CampaignQaReport,
} from "@/lib/campaign-plan";

interface Props { partnerId: string }

type Step = "brief" | "review" | "done";

const EMPTY: CampaignPlanDraft = {
  name: "", goal: "", audience: "", message_headline: "", message_body: "",
  newsletter_subject: "", newsletter_body: "", page_slug: "", page_headline: "",
  page_subheadline: "", page_body: "", page_cta_text: "",
};

const AiCampaignPlanner = ({ partnerId }: Props) => {
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [step, setStep] = useState<Step>("brief");
  const [plan, setPlan] = useState<CampaignPlanDraft>(EMPTY);
  const [qa, setQa] = useState<CampaignQaReport | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  const loadRecent = async () => {
    const { data } = await supabase
      .from("partner_campaign_plans")
      .select("id, name, status, created_at, page_slug")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecent(data || []);
  };

  useEffect(() => { void loadRecent(); }, [partnerId]);

  const setField = (k: keyof CampaignPlanDraft, v: string) => {
    setPlan((p) => {
      const next = { ...p, [k]: k === "page_slug" ? slugifyCampaign(v) : v };
      setQa(runCampaignQa(next));
      return next;
    });
  };

  const generate = async () => {
    if (!goal.trim() || !audience.trim()) {
      toast({ title: "Hiányzó adat", description: "Add meg a kampány célját és a célcsoportot.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-campaign-plan", {
        body: { partner_id: partnerId, goal, audience, tone },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const normalized = normalizeCampaignPlan(data.plan, { goal, audience, tone });
      normalized.goal = goal.trim();
      normalized.audience = audience.trim();
      const report = runCampaignQa(normalized);
      setPlan(normalized);
      setQa(report);
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
          status: "draft",
        })
        .select("id")
        .maybeSingle();
      setPlanId(saved?.id ?? null);
      void loadRecent();
    } catch (e: any) {
      const m = String(e?.message || "");
      toast({
        title: "Hiba",
        description:
          m.includes("ai_unavailable") ? "Az AI most nem elérhető, próbáld újra pár perc múlva."
          : m.includes("rate_limited") ? "Túl sok kérés, várj egy kicsit."
          : m.includes("not_partner") ? "Ehhez a partnerfiókhoz nincs jogosultságod."
          : "Nem sikerült elkészíteni a kampánytervet.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
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
        status: "published",
        approved_at: now,
        published_at: now,
        published_landing_page_id: page?.id ?? null,
        published_blast_id: blast?.id ?? null,
      };
      const { error: planErr } = planId
        ? await supabase.from("partner_campaign_plans").update(payload).eq("id", planId)
        : await supabase.from("partner_campaign_plans").insert(payload);
      if (planErr) throw new Error(planErr.message);

      const { data: sfRow } = await supabase
        .from("partner_storefronts")
        .select("slug")
        .eq("partner_id", partnerId)
        .maybeSingle();
      setPageUrl(page?.slug && sfRow?.slug ? `${window.location.origin}/p/${sfRow.slug}/${page.slug}` : null);
      setStep("done");
      void loadRecent();
      toast({ title: "Kampány publikálva", description: "A kampányoldal él, a hírlevél piszkozatként elkészült." });
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
          <Button type="submit" className="rounded-none w-full sm:w-auto" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
            Kampányterv készítése
          </Button>
        </form>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={qa?.publishable ? "default" : "destructive"} className="rounded-none">
              <ShieldCheck className="h-3 w-3 mr-1" /> Ellenőrzés: {qa?.score ?? 0}/100
            </Badge>
            {!qa?.publishable && <span className="text-[11px] text-destructive">Javítsd a hibákat a publikáláshoz.</span>}
          </div>

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
            A hírlevél piszkozatként elkészült — a kiküldést a Marketing fülön indíthatod, hogy te döntsd el, mikor megy ki.
          </p>
          <Button variant="outline" className="rounded-none" onClick={() => { setStep("brief"); setPlan(EMPTY); setQa(null); setPlanId(null); }}>
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

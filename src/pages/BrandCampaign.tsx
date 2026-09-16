// Publikált kampányoldal a partner webshopon belül: /b/:slug/kampany/:campaignSlug
// A tartalom a jóváhagyott kampánytervből jön, a megtekintést és a kattintást mérjük.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { ArrowRight, Loader2 } from "lucide-react";
import { campaignPageHtml, type CampaignPlanDraft } from "@/lib/campaign-plan";

const BrandCampaign = () => {
  const { slug, campaignSlug } = useParams<{ slug: string; campaignSlug: string }>();
  const [sf, setSf] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: store } = await supabase
        .from("partner_storefronts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (!alive) return;
      if (!store) { setLoading(false); return; }
      setSf(store);

      const { data: p } = await supabase
        .from("partner_campaign_plans")
        .select("*")
        .eq("partner_id", store.partner_id)
        .eq("page_slug", campaignSlug)
        .eq("status", "published")
        .maybeSingle();
      if (!alive) return;
      setPlan(p || null);
      setLoading(false);
      if (p?.id) void supabase.rpc("track_campaign_event", { _plan_id: p.id, _kind: "view" });
    })();
    return () => { alive = false; };
  }, [slug, campaignSlug]);

  const trackClick = () => {
    if (plan?.id) void supabase.rpc("track_campaign_event", { _plan_id: plan.id, _kind: "click" });
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!sf || !plan) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-2xl font-bold">Ez a kampány nem érhető el</h1>
        <Link to={`/b/${slug}`} className="mt-6 inline-block underline">Vissza a webshopba</Link>
      </div>
    );
  }

  const accent = sf.accent_color || "#111111";
  const body = campaignPageHtml(plan as CampaignPlanDraft);

  return (
    <div style={{ background: sf.bg_color, color: sf.text_color }} className="min-h-screen">
      <Helmet>
        <title>{`${plan.page_headline} – ${sf.display_name}`.slice(0, 60)}</title>
        <meta name="description" content={String(plan.page_subheadline || plan.message_body || "").slice(0, 155)} />
        <meta property="og:title" content={plan.page_headline} />
        <meta property="og:description" content={String(plan.page_subheadline || plan.message_body || "").slice(0, 155)} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <header className="border-b px-5 py-4" style={{ borderColor: `${sf.text_color}22` }}>
        <Link to={`/b/${slug}`} className="text-sm font-bold uppercase tracking-widest">{sf.display_name}</Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: accent }}>Kampány</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">{plan.page_headline}</h1>
        {plan.page_subheadline && <p className="mt-4 text-base opacity-80 md:text-lg">{plan.page_subheadline}</p>}

        <article
          className="prose prose-sm mt-8 max-w-none opacity-90 [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: body }}
        />

        <Link
          to={`/b/${slug}#termekek`}
          onClick={trackClick}
          className="sf-btn mt-10 inline-flex h-14 items-center justify-center gap-2 px-8 text-xs font-bold uppercase tracking-widest"
          style={{ background: accent, color: sf.bg_color }}
        >
          {plan.page_cta_text || "Vásárolj most"} <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    </div>
  );
};

export default BrandCampaign;

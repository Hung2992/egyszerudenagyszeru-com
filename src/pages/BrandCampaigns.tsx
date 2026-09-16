// Kampányok a webshopban, kategóriánként csoportosítva: /b/:slug/kampanyok
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Loader2, ArrowRight } from "lucide-react";
import { setCampaignAttribution } from "@/lib/campaign-attribution";

const BrandCampaigns = () => {
  const { slug } = useParams<{ slug: string }>();
  const [sf, setSf] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: store } = await supabase
        .from("partner_storefronts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (!alive) return;
      setSf(store || null);
      if (store) {
        const { data } = await supabase
          .from("partner_campaign_plans")
          .select("id, name, category, page_slug, page_headline, page_subheadline, page_cta_text, published_at")
          .eq("partner_id", store.partner_id)
          .eq("status", "published")
          .order("published_at", { ascending: false });
        if (alive) setPlans(data || []);
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!sf) return <div className="px-5 py-24 text-center"><h1 className="text-2xl font-bold">A bolt nem érhető el</h1></div>;

  const groups = plans.reduce<Record<string, any[]>>((acc, p) => {
    const k = p.category || "Általános";
    (acc[k] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div style={{ background: sf.bg_color, color: sf.text_color }} className="min-h-screen">
      <Helmet>
        <title>{`Kampányok – ${sf.display_name}`.slice(0, 60)}</title>
        <meta name="description" content={`Aktuális akciók és kampányok: ${sf.display_name}.`.slice(0, 155)} />
      </Helmet>

      <header className="border-b px-5 py-4" style={{ borderColor: `${sf.text_color}22` }}>
        <Link to={`/b/${slug}`} className="text-sm font-bold uppercase tracking-widest">{sf.display_name}</Link>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-3xl font-bold md:text-4xl">Kampányok</h1>
        {plans.length === 0 && <p className="mt-6 opacity-70">Jelenleg nincs futó kampány.</p>}

        {Object.entries(groups).map(([cat, items]) => (
          <section key={cat} className="mt-10">
            <h2 className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: sf.accent_color }}>{cat}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {items.map((p) => (
                <Link
                  key={p.id}
                  to={`/b/${slug}/kampany/${p.page_slug}`}
                  onClick={() => { setCampaignAttribution(p.id); void supabase.rpc("track_campaign_event", { _plan_id: p.id, _kind: "click", _amount: 0 }); }}
                  className="block border p-5 transition-opacity hover:opacity-80"
                  style={{ borderColor: `${sf.text_color}22` }}
                >
                  <p className="text-lg font-bold">{p.page_headline || p.name}</p>
                  {p.page_subheadline && <p className="mt-2 text-sm opacity-75">{p.page_subheadline}</p>}
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest" style={{ color: sf.accent_color }}>
                    {p.page_cta_text || "Megnézem"} <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default BrandCampaigns;

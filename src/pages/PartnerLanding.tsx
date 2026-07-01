import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Landing {
  id: string;
  partner_id: string;
  slug: string;
  product_id: string | null;
  headline: string;
  subheadline: string | null;
  body_html: string | null;
  hero_image_url: string | null;
  partner_photo_url: string | null;
  partner_quote: string | null;
  cta_text: string;
  cta_url: string | null;
  theme_color: string;
  is_live_shopping: boolean;
  live_until: string | null;
  active: boolean;
}

const PartnerLanding = () => {
  const { partnerSlug, landingSlug } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const [landing, setLanding] = useState<Landing | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: partner } = await supabase.from("partners").select("id, company_name").eq("coupon_code", partnerSlug).maybeSingle();
      if (!partner) { setLoading(false); return; }
      let q = supabase
        .from("partner_landing_pages")
        .select("*")
        .eq("partner_id", partner.id)
        .eq("slug", landingSlug);
      if (!isPreview) q = q.eq("active", true);
      const { data: l } = await q.maybeSingle();
      if (l) {
        setLanding(l as Landing);
        if (!isPreview) {
          await supabase.from("partner_landing_pages").update({ view_count: (l as any).view_count + 1 }).eq("id", l.id);
        }
        if (l.product_id) {
          const { data: p } = await supabase.from("partner_products").select("title, price_huf, images, description").eq("id", l.product_id).maybeSingle();
          setProduct(p);
        }
      }
      setLoading(false);
    })();
  }, [partnerSlug, landingSlug, isPreview]);

  const handleCtaClick = async () => {
    if (!landing || isPreview) return;
    // Fire-and-forget conversion tracking
    void supabase.from("partner_landing_pages").update({ conversion_count: (landing as any).conversion_count + 1 || 1 }).eq("id", landing.id);
    void supabase.from("partner_share_clicks").insert({
      partner_id: landing.partner_id,
      source: "landing_cta",
      referrer: window.location.href,
      user_agent: navigator.userAgent.slice(0, 500),
      device_type: /mobile/i.test(navigator.userAgent) ? "mobile" : /tablet|ipad/i.test(navigator.userAgent) ? "tablet" : "desktop",
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="h-6 w-6 animate-spin border-2 border-foreground border-t-transparent" /></div>;
  if (!landing) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><div className="text-center"><h1 className="text-2xl font-bold uppercase">Nincs ilyen oldal</h1><Link to="/" className="text-accent underline mt-4 inline-block">Vissza a főoldalra</Link></div></div>;

  const isLive = landing.is_live_shopping && (!landing.live_until || new Date(landing.live_until) > new Date());

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ ["--accent" as any]: landing.theme_color }}>
      {isPreview && (
        <div className="bg-yellow-500 text-black text-center py-2 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          <Badge className="rounded-none bg-black text-yellow-400">ELŐNÉZET</Badge>
          Csak neked látható — {landing.active ? "publikálva" : "piszkozat"}
        </div>
      )}
      {isLive && (
        <div className="bg-red-600 text-white text-center py-2 text-xs font-bold uppercase tracking-widest animate-pulse">
          🔴 ÉLŐ KÖZVETÍTÉS — KORLÁTOZOTT IDŐRE
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {landing.hero_image_url && (
          <img src={landing.hero_image_url} alt={landing.headline} className="w-full h-80 object-cover mb-8" />
        )}
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4" style={{ color: landing.theme_color }}>
          {landing.headline}
        </h1>
        {landing.subheadline && <p className="text-xl text-muted-foreground mb-8">{landing.subheadline}</p>}

        {landing.partner_quote && (
          <div className="flex items-start gap-4 border-l-4 pl-4 my-8" style={{ borderColor: landing.theme_color }}>
            {landing.partner_photo_url && <img src={landing.partner_photo_url} alt="" className="w-16 h-16 object-cover rounded-full" />}
            <p className="italic text-lg">"{landing.partner_quote}"</p>
          </div>
        )}

        {product && (
          <div className="border border-foreground/20 p-6 my-8 flex gap-6 items-center">
            {Array.isArray(product.images) && product.images[0] && <img src={product.images[0]} className="w-32 h-32 object-cover" alt="" />}
            <div className="flex-1">
              <h3 className="text-xl font-bold">{product.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
              <p className="text-2xl font-black mt-2">{product.price_huf?.toLocaleString("hu-HU")} Ft</p>
            </div>
          </div>
        )}

        {landing.body_html && <div className="prose prose-invert max-w-none my-8" dangerouslySetInnerHTML={{ __html: landing.body_html }} />}

        {landing.cta_url && (
          <Button asChild size="lg" className="rounded-none uppercase tracking-widest text-base px-8 py-6" style={{ backgroundColor: landing.theme_color }}>
            <a href={landing.cta_url} target="_blank" rel="noreferrer">{landing.cta_text}</a>
          </Button>
        )}
      </div>
    </div>
  );
};

export default PartnerLanding;

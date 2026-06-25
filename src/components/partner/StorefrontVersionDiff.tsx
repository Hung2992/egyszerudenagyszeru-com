import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { diffWordsWithSpace } from "diff";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props { storefrontId: string; }

// Fields we compare; everything is rendered as text via JSON.stringify if not string.
const FIELDS: { key: string; label: string }[] = [
  { key: "display_name", label: "Márka neve" },
  { key: "tagline", label: "Mottó" },
  { key: "meta_title", label: "SEO title" },
  { key: "meta_description", label: "SEO description" },
  { key: "seo_keywords", label: "SEO kulcsszavak" },
  { key: "hero_title", label: "Hero cím" },
  { key: "hero_subtitle", label: "Hero alcím" },
  { key: "hero_cta_text", label: "Hero CTA" },
  { key: "topbar_text", label: "Topbar" },
  { key: "section1_title", label: "Szekció 1 cím" },
  { key: "section1_subtitle", label: "Szekció 1 alcím" },
  { key: "section2_title", label: "Szekció 2 cím" },
  { key: "section2_subtitle", label: "Szekció 2 alcím" },
  { key: "about_html", label: "Bemutatkozás" },
  { key: "footer_text", label: "Footer" },
  { key: "accent_color", label: "Kiemelő szín" },
  { key: "bg_color", label: "Háttér" },
  { key: "company_legal_name", label: "Cég neve" },
  { key: "company_tax_id", label: "Adószám" },
  { key: "company_address", label: "Cím" },
  { key: "testimonials", label: "Vélemények" },
  { key: "featured_product_ids", label: "Kiemelt termékek" },
];

const toText = (v: any) => v == null ? "" : typeof v === "string" ? v : JSON.stringify(v, null, 2);

const StorefrontVersionDiff = ({ storefrontId }: Props) => {
  const [current, setCurrent] = useState<any>(null);
  const [last, setLast] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cur } = await supabase.from("partner_storefronts").select("*").eq("id", storefrontId).maybeSingle();
      const { data: vers } = await supabase
        .from("partner_storefront_versions")
        .select("snapshot, created_at, is_published_version")
        .eq("storefront_id", storefrontId)
        .eq("is_published_version", true)
        .order("created_at", { ascending: false })
        .limit(1);
      setCurrent(cur);
      setLast(vers?.[0]?.snapshot ?? null);
      setLoading(false);
    })();
  }, [storefrontId]);

  if (loading) return <p className="text-sm text-muted-foreground">Diff számítása…</p>;
  if (!current) return <p className="text-sm text-muted-foreground">Storefront nem található.</p>;

  const changed = FIELDS.filter(f => toText(current[f.key]) !== toText(last?.[f.key] ?? ""));

  if (changed.length === 0) {
    return <p className="text-sm text-muted-foreground">Nincs változás a legutóbbi publikált verzióhoz képest.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="secondary" className="rounded-none uppercase">{changed.length} változás</Badge>
        <span className="text-muted-foreground">Piros = törölve · zöld = új</span>
      </div>
      {changed.map(f => {
        const parts = diffWordsWithSpace(toText(last?.[f.key] ?? ""), toText(current[f.key]));
        return (
          <Card key={f.key} className="rounded-none border-foreground/20 p-3 space-y-1">
            <div className="text-xs font-bold uppercase tracking-widest">{f.label}</div>
            <div className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
              {parts.map((p, i) => (
                <span
                  key={i}
                  className={p.added ? "bg-green-500/30" : p.removed ? "bg-red-500/30 line-through" : ""}
                >
                  {p.value}
                </span>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default StorefrontVersionDiff;

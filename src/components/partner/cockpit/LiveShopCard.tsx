// Partner OS – Éles webshop kártya: a publikált bolt valódi éles URL-je,
// megnyitás és állapot (élesben / vázlat) egy helyen.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Store } from "lucide-react";
import { toast } from "sonner";
import { buildLiveUrl, buildPreviewUrl, type StorefrontState } from "@/lib/partner-storefront-urls";

const LiveShopCard = ({ partnerId }: { partnerId: string }) => {
  const [sf, setSf] = useState<StorefrontState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("partner_storefronts")
        .select("slug,is_published,custom_domain,custom_domain_status")
        .eq("partner_id", partnerId)
        .maybeSingle();
      if (!active) return;
      setSf((data as StorefrontState) || null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [partnerId]);

  if (loading || !sf?.slug) return null;

  const liveUrl = buildLiveUrl(sf);
  const previewUrl = buildPreviewUrl(window.location.origin, sf);
  const url = sf.is_published ? liveUrl : previewUrl;
  if (!url) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link másolva");
    } catch {
      toast.error("A másolás nem sikerült");
    }
  };

  return (
    <Card className="rounded-none border-foreground/20 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Store className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-widest">Éles webshop</span>
        <Badge className="rounded-none uppercase" variant={sf.is_published ? "default" : "secondary"}>
          {sf.is_published ? "Élesben" : "Vázlat"}
        </Badge>
      </div>
      <p className="font-mono text-xs break-all">{url.replace("https://", "")}</p>
      <p className="text-[11px] text-muted-foreground">
        {sf.is_published
          ? "Ez a publikált bolt valódi címe — a vásárlók ezt látják."
          : "A bolt még nincs publikálva, ezért most csak az előnézet nyitható meg."}
      </p>
      <div className="flex gap-2 flex-wrap">
        <Button asChild size="sm" className="rounded-none">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" /> Éles bolt megnyitása
          </a>
        </Button>
        <Button size="sm" variant="outline" className="rounded-none" onClick={() => void copy()}>
          <Copy className="h-4 w-4 mr-1" /> Link másolása
        </Button>
      </div>
    </Card>
  );
};

export default LiveShopCard;

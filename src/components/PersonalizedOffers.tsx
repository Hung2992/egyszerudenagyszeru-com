import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Gift, Copy, Tag, Clock } from "lucide-react";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  coupon_code: string | null;
  valid_until: string | null;
  is_used: boolean;
}

interface Props {
  userId: string;
}

const PersonalizedOffers = ({ userId }: Props) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase.from("personalized_offers" as any) as any)
        .select("*")
        .eq("user_id", userId)
        .eq("is_used", false)
        .order("created_at", { ascending: false });
      setOffers((data || []) as Offer[]);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Kuponkód másolva! 📋", description: code });
  };

  if (loading || offers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Személyre szabott ajánlatok ({offers.length})
        </p>
      </div>
      <div className="space-y-2">
        {offers.map(offer => (
          <div key={offer.id} className="border border-accent/30 bg-accent/5 p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-foreground">{offer.title}</p>
                {offer.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{offer.description}</p>
                )}
              </div>
              {offer.discount_percent ? (
                <span className="text-sm font-bold text-accent shrink-0">-{offer.discount_percent}%</span>
              ) : offer.discount_amount ? (
                <span className="text-sm font-bold text-accent shrink-0">-{offer.discount_amount.toLocaleString()} Ft</span>
              ) : null}
            </div>
            {offer.coupon_code && (
              <button
                onClick={() => copyCode(offer.coupon_code!)}
                className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-accent bg-accent/10 px-2 py-1 border border-accent/20 hover:bg-accent/20 transition-colors"
              >
                <Tag className="h-3 w-3" />
                {offer.coupon_code}
                <Copy className="h-2.5 w-2.5 ml-1" />
              </button>
            )}
            {offer.valid_until && (
              <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                Érvényes: {new Date(offer.valid_until).toLocaleDateString("hu-HU")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalizedOffers;

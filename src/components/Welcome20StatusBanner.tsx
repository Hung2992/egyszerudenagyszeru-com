import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Gift, AlertCircle, CheckCircle2, Clock, Ban, ShoppingBag } from "lucide-react";

interface StatusData {
  status: string;
  eligible: boolean;
  reason: string;
  discount_percent?: number;
  already_emailed?: boolean;
}

const ICONS: Record<string, JSX.Element> = {
  eligible: <CheckCircle2 className="h-4 w-4 text-accent" />,
  has_order: <ShoppingBag className="h-4 w-4 text-muted-foreground" />,
  already_redeemed: <Ban className="h-4 w-4 text-muted-foreground" />,
  already_sent: <Gift className="h-4 w-4 text-muted-foreground" />,
  expired: <Clock className="h-4 w-4 text-destructive" />,
  exhausted: <AlertCircle className="h-4 w-4 text-destructive" />,
  no_coupon: <AlertCircle className="h-4 w-4 text-destructive" />,
};

const LABEL: Record<string, string> = {
  eligible: "Jogosult",
  has_order: "Nem első vásárló",
  already_redeemed: "Már beváltottad",
  already_sent: "Már megkaptad",
  expired: "Lejárt",
  exhausted: "Kupon kimerült",
  no_coupon: "Nem aktív",
  no_user: "Jelentkezz be",
};

interface Props { compact?: boolean }

const Welcome20StatusBanner = ({ compact = false }: Props) => {
  const [data, setData] = useState<StatusData | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setHidden(true); return; }
      const { data: res, error } = await supabase.rpc("welcome20_status" as any, { _user_id: user.id });
      if (!active) return;
      if (error || !res) { setHidden(true); return; }
      setData(res as unknown as StatusData);
    })();
    return () => { active = false; };
  }, []);

  if (hidden || !data) return null;
  const eligible = data.eligible;
  const tone = eligible ? "border-accent/40 bg-accent/10" : (data.status === "expired" || data.status === "exhausted" || data.status === "no_coupon") ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30";

  return (
    <div className={`border ${tone} px-3 py-2 ${compact ? "text-[11px]" : "text-xs"} flex items-start gap-2`}>
      <div className="mt-0.5">{ICONS[data.status] || <Gift className="h-4 w-4" />}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold uppercase tracking-wider">
          WELCOME20 — {LABEL[data.status] || data.status}
          {eligible && data.discount_percent ? ` · -${data.discount_percent}%` : ""}
        </div>
        <div className="text-muted-foreground mt-0.5">{data.reason}</div>
      </div>
    </div>
  );
};

export default Welcome20StatusBanner;

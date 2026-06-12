import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { usePartnerCheck } from "@/hooks/usePartnerCheck";

export const PartnerAccessButton = () => {
  const navigate = useNavigate();
  const { partner, loading } = usePartnerCheck();
  if (loading || !partner || partner.status !== "active") return null;
  return (
    <button
      onClick={() => navigate("/partner")}
      className="w-full mb-6 flex items-center justify-between gap-3 border border-accent bg-accent/10 px-4 py-3 hover:bg-accent/20 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-accent" />
        <div className="text-left">
          <div className="text-xs font-bold uppercase tracking-widest text-foreground">Partner felület</div>
          <div className="text-[10px] text-muted-foreground">Kupon: {partner.coupon_code || "—"}</div>
        </div>
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-accent">Belépés →</span>
    </button>
  );
};

export default PartnerAccessButton;

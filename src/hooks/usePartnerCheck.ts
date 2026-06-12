import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";

export interface PartnerInfo {
  id: string;
  status: "invited" | "active" | "paused" | "revoked";
  full_name: string;
  company_name: string | null;
  email: string | null;
  commission_per_order_amount: number;
  coupon_id: string | null;
  coupon_code: string | null;
  iban: string | null;
  tax_number: string | null;
  phone: string | null;
  address: string | null;
}

export const usePartnerCheck = () => {
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [tryClaim, setTryClaim] = useState(false);

  const load = async (uid: string) => {
    setUserId(uid);
    const [{ data: adm }, { data: row }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
      supabase
        .from("partners")
        .select("id,status,full_name,company_name,email,commission_per_order_amount,coupon_id,iban,tax_number,phone,address,coupons:coupon_id(code)")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);
    setIsAdmin(!!adm);
    if (row) {
      setPartner({
        id: row.id,
        status: row.status,
        full_name: row.full_name,
        company_name: row.company_name,
        email: row.email,
        commission_per_order_amount: Number(row.commission_per_order_amount || 0),
        coupon_id: row.coupon_id,
        coupon_code: (row as any).coupons?.code ?? null,
        iban: row.iban,
        tax_number: row.tax_number,
        phone: row.phone,
        address: row.address,
      });
    } else {
      setPartner(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const apply = async (session: any) => {
      if (!session?.user) {
        if (!cancelled) { setLoading(false); setPartner(null); setUserId(null); }
        return;
      }
      await load(session.user.id);
    };
    supabase.auth.getSession().then(({ data: { session } }) => void apply(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => void apply(session), 0);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [tryClaim]);

  const claim = async () => {
    const { data, error } = await supabase.functions.invoke("partner-claim", { body: {} });
    if (error) return { ok: false, error: error.message };
    setTryClaim((v) => !v);
    return data as { ok: boolean; error?: string; partner_id?: string };
  };

  return { partner, isAdmin, loading, userId, claim, reload: () => userId && load(userId) };
};

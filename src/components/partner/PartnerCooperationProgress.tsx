import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Clock3, FileSignature, ShieldCheck, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";

type ProgressData = {
  hasAccount: boolean;
  partnerStatus: string | null;
  kycStatus: string | null;
  contractStatus: string | null;
  partnerSigned: boolean;
  contractBody: string | null;
  contractNumber: string | null;
};

const initialProgress: ProgressData = {
  hasAccount: false,
  partnerStatus: null,
  kycStatus: null,
  contractStatus: null,
  partnerSigned: false,
  contractBody: null,
  contractNumber: null,
};

const PartnerCooperationProgress = ({ compact = false }: { compact?: boolean }) => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressData>(initialProgress);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const [partnerRes, kycRes, contractRes] = await Promise.all([
        supabase.from("partners").select("status").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("tenant_kyc_submissions").select("status").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("partner_contracts").select("status,partner_signed_at,contract_body,contract_number").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (!cancelled) {
        setProgress({
          hasAccount: true,
          partnerStatus: partnerRes.data?.status ?? null,
          kycStatus: kycRes.data?.status ?? null,
          contractStatus: contractRes.data?.status ?? null,
          partnerSigned: Boolean(contractRes.data?.partner_signed_at),
          contractBody: contractRes.data?.contract_body ?? null,
          contractNumber: contractRes.data?.contract_number ?? null,
        });
        setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const active = progress.partnerStatus === "active";
  const steps = useMemo(() => {
    const hasKyc = Boolean(progress.kycStatus);
    const kycApproved = progress.kycStatus === "approved";
    const contractReady = Boolean(progress.contractStatus);
    const activationReady = progress.contractStatus === "pending_admin_countersign" || progress.contractStatus === "signed";
    return [
      { label: "Regisztrált", done: progress.hasAccount },
      { label: "KYC beküldve", done: active || hasKyc },
      { label: "KYC ellenőrzés alatt", done: active || kycApproved },
      { label: "Szerződés", done: active || (contractReady && progress.partnerSigned) },
      { label: "Aktiválható", done: active || activationReady },
      { label: "Aktív", done: active },
    ];
  }, [active, progress]);

  const currentIndex = Math.max(0, steps.findIndex(step => !step.done));
  const nextAction = active
    ? { label: "Partner Központ megnyitása", path: "/partner" }
    : !progress.kycStatus || progress.kycStatus === "rejected"
      ? { label: progress.kycStatus === "rejected" ? "KYC adatok javítása" : "KYC kitöltése", path: "/partner-onboarding" }
      : progress.kycStatus === "pending"
        ? null
        : !progress.partnerSigned
          ? { label: "Szerződés megnyitása", path: "/partner-contract" }
          : null;

  if (loading) return <div className="border border-border p-4 text-sm text-muted-foreground">Együttműködési állapot betöltése…</div>;

  return (
    <section className="border border-border bg-card p-4 sm:p-5" aria-label="Partneri együttműködés állapota">
      <div className="mb-4 flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <h2 className="font-heading text-base font-bold uppercase">Partneri együttműködés</h2>
          {!compact && <p className="mt-1 text-xs text-muted-foreground">Minden partner ugyanazon ellenőrzött lépéseken halad végig.</p>}
        </div>
      </div>

      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => {
          const isCurrent = !active && index === currentIndex;
          return (
            <li key={step.label} className={`flex min-h-12 items-center gap-3 border p-3 ${step.done ? "border-accent/50 bg-accent/5" : isCurrent ? "border-foreground/40 bg-muted/40" : "border-border opacity-60"}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-current text-xs font-bold">
                {step.done ? <Check className="h-4 w-4" /> : isCurrent ? <Clock3 className="h-4 w-4" /> : index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase">{step.label}</p>
                <p className="text-[11px] text-muted-foreground">{step.done ? "Kész" : isCurrent ? "Aktuális lépés" : "Következő"}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {active ? "Az együttműködés aktív." : progress.kycStatus === "pending" ? "A KYC ellenőrzése folyamatban van. Értesítést kapsz a döntésről." : progress.partnerSigned ? "A szerződés admin ellenjegyzésére és aktiválásra vár." : "Folytasd a következő lépéssel."}
        </p>
        {nextAction && (
          <Button className="w-full rounded-none sm:w-auto" onClick={() => navigate(nextAction.path)}>
            {nextAction.path === "/partner-contract" ? <FileSignature className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
            {nextAction.label}
          </Button>
        )}
      </div>
    </section>
  );
};

export default PartnerCooperationProgress;
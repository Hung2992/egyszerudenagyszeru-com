import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileSignature, CheckCircle2, Clock, Loader2, ShieldCheck, Download, XCircle, AlertTriangle } from "lucide-react";

const PartnerContract = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contract, setContract] = useState<any>(null);
  const [signatureName, setSignatureName] = useState("");
  const [accept, setAccept] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { navigate("/auth?redirect=/partner-contract"); return; }
    const { data } = await supabase.from("partner_contracts")
      .select("*").eq("user_id", session.user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setContract(data);
    if (data) setSignatureName(data.partner_full_name || "");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sign = async () => {
    if (!contract || !accept || !signatureName.trim()) return;
    setSaving(true);
    let ip = "";
    try { const r = await fetch("https://api.ipify.org?format=json"); ip = (await r.json()).ip; } catch {}
    const { error } = await supabase.from("partner_contracts").update({
      partner_signed_at: new Date().toISOString(),
      partner_signature_name: signatureName.trim(),
      partner_signature_ip: ip,
    }).eq("id", contract.id);
    setSaving(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Aláírva", description: "Várjuk az üzemeltető ellenjegyzését." });
    load();
  };

  const downloadPdf = async () => {
    const { data, error } = await supabase.functions.invoke("generate-contract-pdf", { body: { contract_id: contract.id } });
    if (error || !data?.url) { toast({ title: "Hiba", description: error?.message || "Nem sikerült letölteni", variant: "destructive" }); return; }
    window.open(data.url, "_blank");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  if (!contract) {
    return (
      <div className="min-h-screen bg-background py-16 px-4">
        <div className="max-w-2xl mx-auto border p-8 text-center space-y-4">
          <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Nincs aktív szerződés</h1>
          <p className="text-sm text-muted-foreground">
            A szerződés automatikusan generálódik, amint a KYC adatkezelést az üzemeltető jóváhagyta.
          </p>
          <Button onClick={() => navigate("/partner-onboarding")}>KYC státusz</Button>
        </div>
      </div>
    );
  }

  const StatusBadge = () => {
    if (contract.status === "signed") return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Aláírva, hatályos</Badge>;
    if (contract.status === "pending_admin_countersign") return <Badge className="bg-blue-600"><Clock className="w-3 h-3 mr-1" />Üzemeltető aláírására vár</Badge>;
    if (contract.status === "rejected") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Elutasítva</Badge>;
    if (contract.status === "needs_correction") return <Badge className="bg-amber-600"><AlertTriangle className="w-3 h-3 mr-1" />Javítás szükséges</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Aláírásodra vár</Badge>;
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileSignature className="w-6 h-6 text-accent" />
            <div>
              <h1 className="text-2xl font-bold">Partneri szerződés</h1>
              <p className="text-xs text-muted-foreground font-mono">{contract.contract_number}</p>
            </div>
          </div>
          <StatusBadge />
        </div>

        <pre className="border p-5 bg-muted/30 text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-[500px] overflow-auto">
{contract.contract_body}
        </pre>

        <div className="grid sm:grid-cols-2 gap-4">
          <SigBox
            title="Partner aláírása"
            name={contract.partner_signature_name}
            at={contract.partner_signed_at}
          />
          <SigBox
            title="Üzemeltető aláírása"
            name={contract.owner_signature_name}
            at={contract.owner_signed_at}
          />
        </div>

        {!contract.partner_signed_at && (
          <div className="border p-5 space-y-4 bg-accent/5">
            <h2 className="font-bold">Elektronikus aláírás</h2>
            <div>
              <Label className="text-xs">Teljes név (aláíráshoz pontosan ahogy a szerződésben szerepel)</Label>
              <Input value={signatureName} onChange={e => setSignatureName(e.target.value)} className="mt-1" />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="accept" checked={accept} onCheckedChange={v => setAccept(v === true)} className="mt-0.5" />
              <label htmlFor="accept" className="text-xs leading-relaxed cursor-pointer">
                Kijelentem, hogy a fenti szerződés tartalmát elolvastam, megértettem és magamra nézve kötelezőnek elismerem. Az aláírással egyenértékűen rögzített elektronikus aláírásom (név + IP cím + időbélyeg) jogi kötőerővel bír.
              </label>
            </div>
            <Button className="w-full" size="lg" disabled={!accept || !signatureName.trim() || saving} onClick={sign}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aláírás...</> : <><FileSignature className="w-4 h-4 mr-2" />Szerződés aláírása</>}
            </Button>
          </div>
        )}

        {contract.status === "signed" && (
          <div className="border p-5 bg-green-500/10 space-y-2 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-green-500" />
            <h2 className="font-bold">Szerződés hatályos</h2>
            <p className="text-sm text-muted-foreground">A partner adminisztrációs felülethez való hozzáférésed aktiválva.</p>
            <Button onClick={() => navigate("/admin")}>Admin panel megnyitása</Button>
          </div>
        )}
      </div>
    </div>
  );
};

const SigBox = ({ title, name, at }: { title: string; name: string | null; at: string | null }) => (
  <div className={`border p-4 ${at ? "bg-green-500/5 border-green-500/30" : ""}`}>
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
    {at ? (
      <>
        <p className="font-mono text-sm italic mt-1">{name}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{new Date(at).toLocaleString("hu")}</p>
        <CheckCircle2 className="w-4 h-4 text-green-500 mt-1" />
      </>
    ) : (
      <p className="text-xs text-muted-foreground mt-2 italic">Aláírásra vár…</p>
    )}
  </div>
);

export default PartnerContract;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FileSignature, CheckCircle2, Clock, Eye, Loader2, XCircle, AlertTriangle, Download, ScrollText } from "lucide-react";

const AdminContractsTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [sigName, setSigName] = useState("Egyszerű de Nagyszerű Kft. – Ügyvezető");
  const [accept, setAccept] = useState(false);
  const [saving, setSaving] = useState(false);

  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [actionMode, setActionMode] = useState<"sign" | "reject" | "correct" | null>("sign");

  const fetch_ = async () => {
    setLoading(true);
    const { data } = await supabase.from("partner_contracts").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { fetch_(); }, []);

  const loadAudit = async (contractId: string) => {
    const { data } = await supabase.from("partner_contract_audit_log")
      .select("*").eq("contract_id", contractId).order("created_at", { ascending: false });
    setAuditLog(data || []);
  };

  const openContract = async (row: any) => {
    setSelected(row);
    setAccept(false);
    setActionMode("sign");
    setRejectReason("");
    setCorrectionNotes("");
    setShowAudit(false);
    await loadAudit(row.id);
  };

  const downloadPdf = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("generate-contract-pdf", { body: { contract_id: id } });
    if (error || !data?.url) { toast({ title: "Hiba", description: error?.message || "PDF hiba", variant: "destructive" }); return; }
    window.open(data.url, "_blank");
  };

  const reject = async () => {
    if (!selected || !rejectReason.trim()) return;
    setSaving(true);
    const { error } = await supabase.rpc("reject_partner_contract", { _contract_id: selected.id, _reason: rejectReason.trim() });
    setSaving(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Elutasítva" });
    setSelected(null); fetch_();
  };

  const requestCorrection = async () => {
    if (!selected || !correctionNotes.trim()) return;
    setSaving(true);
    const { error } = await supabase.rpc("request_partner_contract_correction", { _contract_id: selected.id, _notes: correctionNotes.trim() });
    setSaving(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Javítás kérve" });
    setSelected(null); fetch_();
  };

  const sign = async () => {
    if (!selected || !accept || !sigName.trim()) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    let ip = "";
    try { const r = await fetch("https://api.ipify.org?format=json"); ip = (await r.json()).ip; } catch {}
    const { error } = await supabase.from("partner_contracts").update({
      owner_signed_at: new Date().toISOString(),
      owner_signed_by: session?.user.id,
      owner_signature_name: sigName.trim(),
      owner_signature_ip: ip,
    }).eq("id", selected.id);
    setSaving(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Ellenjegyezve", description: "Partner megkapta a hozzáférést." });
    setSelected(null); setAccept(false); fetch_();
  };

  const badge = (s: string) => {
    if (s === "signed") return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Hatályos</Badge>;
    if (s === "pending_admin_countersign") return <Badge className="bg-blue-600"><Clock className="w-3 h-3 mr-1" />Ellenjegyzésre vár</Badge>;
    if (s === "rejected") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Elutasítva</Badge>;
    if (s === "needs_correction") return <Badge className="bg-amber-600"><AlertTriangle className="w-3 h-3 mr-1" />Javítás kérve</Badge>;
    if (s === "terminated") return <Badge variant="destructive">Megszűnt</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Partner aláírására vár</Badge>;
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileSignature className="w-5 h-5" />
        <h2 className="font-bold text-lg">Partneri szerződések</h2>
        <Badge variant="outline">{rows.filter(r => r.status === "pending_admin_countersign").length} ellenjegyzésre vár</Badge>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Még nincs generált szerződés. A KYC jóváhagyásakor automatikusan keletkezik.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="border p-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{r.partner_full_name}</span>
                  {badge(r.status)}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{r.contract_number} · {r.partner_email}</p>
              </div>
              <div className="flex gap-2">
                {r.partner_signed_at && (
                  <Button size="sm" variant="ghost" onClick={() => downloadPdf(r.id)}>
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openContract(r)}>
                  <Eye className="w-4 h-4 mr-1" />Megnyitás
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-card border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-accent" />
                <h3 className="font-bold">{selected.contract_number}</h3>
                {badge(selected.status)}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Bezár</Button>
            </div>

            <pre className="border p-4 bg-muted/30 text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-[400px] overflow-auto">
{selected.contract_body}
            </pre>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Partner aláírás</p>
                {selected.partner_signed_at ? (
                  <>
                    <p className="font-mono italic">{selected.partner_signature_name}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(selected.partner_signed_at).toLocaleString("hu")} · IP: {selected.partner_signature_ip || "—"}</p>
                  </>
                ) : <p className="italic text-muted-foreground">Még nem írta alá</p>}
              </div>
              <div className="border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Üzemeltető aláírás</p>
                {selected.owner_signed_at ? (
                  <>
                    <p className="font-mono italic">{selected.owner_signature_name}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(selected.owner_signed_at).toLocaleString("hu")} · IP: {selected.owner_signature_ip || "—"}</p>
                  </>
                ) : <p className="italic text-muted-foreground">Még nincs ellenjegyezve</p>}
              </div>
            </div>

            {selected.status === "awaiting_owner_signature" && (
              <div className="border p-4 bg-accent/5 space-y-3">
                <h4 className="font-bold text-sm">Ellenjegyzés üzemeltetőként</h4>
                <div>
                  <Label className="text-xs">Aláíró neve / titulusa</Label>
                  <Input value={sigName} onChange={e => setSigName(e.target.value)} className="mt-1" />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="ack" checked={accept} onCheckedChange={v => setAccept(v === true)} className="mt-0.5" />
                  <label htmlFor="ack" className="text-xs leading-relaxed cursor-pointer">
                    A szerződés tartalmát ellenőriztem, a partner aláírását elfogadom, és a szerződést a Egyszerű de Nagyszerű Kft. nevében ellenjegyzem. A partner ezután automatikusan megkapja a partneri admin hozzáférést.
                  </label>
                </div>
                <Button className="w-full" disabled={!accept || !sigName.trim() || saving} onClick={sign}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mentés...</> : <><FileSignature className="w-4 h-4 mr-2" />Ellenjegyzés + hozzáférés aktiválása</>}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContractsTab;

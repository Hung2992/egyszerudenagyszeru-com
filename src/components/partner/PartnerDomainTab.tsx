import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import DomainProofTimeline from "@/components/partner/DomainProofTimeline";
import { Globe, Send, Trash2, Copy, ShieldCheck, ShieldAlert, Upload, Loader2, History } from "lucide-react";

interface Props { partnerId: string; }

const STATUS_LABEL: Record<string, string> = {
  pending: "Beküldve – jóváhagyásra vár",
  verifying: "DNS ellenőrzés folyamatban",
  approved: "Jóváhagyva",
  active: "Aktív (élesben)",
  rejected: "Elutasítva",
};

const DNS_LABEL: Record<string, string> = {
  not_checked: "Még nem ellenőrzött",
  self_reported: "Partner: beállítva",
  verified: "Sikeres ellenőrzés",
  failed: "Sikertelen ellenőrzés",
};

const PartnerDomainTab = ({ partnerId }: Props) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_domain_requests")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [partnerId]);

  const submit = async () => {
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) {
      toast({ title: "Érvénytelen domain", description: "Pl. myshop.hu", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("partner_domain_requests").insert({
      partner_id: partnerId,
      requested_domain: d,
      status: "pending",
      dns_check_status: "not_checked",
      dns_instructions: {
        a_record: { type: "A", name: "@", value: "185.158.133.1" },
        a_www: { type: "A", name: "www", value: "185.158.133.1" },
        txt: { type: "TXT", name: "_lovable_partner", value: "auto-generated" },
      },
    });
    setSubmitting(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setDomain("");
    toast({ title: "Domain kérelem elküldve" });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Biztosan törlöd ezt a kérelmet?")) return;
    await supabase.from("partner_domain_requests").delete().eq("id", id);
    await load();
  };

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast({ title: "Másolva" }); };

  const runDnsCheck = async (id: string) => {
    setChecking(id);
    const { data, error } = await supabase.functions.invoke("verify-partner-domain-dns", { body: { request_id: id } });
    setChecking(null);
    if (error) { toast({ title: "Ellenőrzés hiba", description: error.message, variant: "destructive" }); return; }
    const status = (data as any)?.status;
    toast({
      title: status === "verified" ? "Sikeres DNS ellenőrzés" : "Sikertelen DNS ellenőrzés",
      description: status === "verified" ? "Az admin jóváhagyhatja a domaint." : "Ellenőrizd a DNS rekordokat.",
      variant: status === "verified" ? "default" : "destructive",
    });
    await load();
  };

  const markSelfReported = async (id: string) => {
    await supabase.from("partner_domain_requests")
      .update({ dns_check_status: "self_reported", partner_self_reported: true })
      .eq("id", id);
    toast({ title: "Beállítás rögzítve", description: "Most már futtathatod az ellenőrzést." });
    await load();
  };

  const uploadProof = async (id: string, file: File) => {
    setUploading(id);
    const path = `${partnerId}/${id}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("partner-domain-proofs").upload(path, file, { upsert: true });
    if (error) { setUploading(null); toast({ title: "Feltöltési hiba", description: error.message, variant: "destructive" }); return; }
    await supabase.from("partner_domain_requests").update({ dns_proof_url: path }).eq("id", id);
    setUploading(null);
    toast({ title: "Bizonyíték feltöltve" });
    await load();
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-none border-foreground/20 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <h3 className="text-sm font-bold uppercase tracking-widest">Saját domain kérése</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Saját domain (pl. <span className="font-mono">myshop.hu</span>) bekötése. Beküldés után állítsd be a DNS rekordokat, futtasd az ellenőrzést, majd az admin jóváhagyja.
        </p>
        <div className="flex gap-2">
          <Input className="rounded-none font-mono" placeholder="pl. myshop.hu" value={domain} onChange={e => setDomain(e.target.value)} />
          <Button className="rounded-none" onClick={submit} disabled={submitting}>
            <Send className="h-4 w-4 mr-1" /> Beküldés
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <Label className="text-xs uppercase">Korábbi kérelmek</Label>
        {loading ? <p className="text-sm text-muted-foreground">Betöltés…</p> :
          requests.length === 0 ? <p className="text-sm text-muted-foreground">Még nincs kérelem.</p> :
          requests.map(r => (
            <Card key={r.id} className="rounded-none border-foreground/20 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-bold">{r.requested_domain}</span>
                  <Badge variant={r.status === "active" || r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="rounded-none uppercase">
                    {STATUS_LABEL[r.status] || r.status}
                  </Badge>
                  <Badge variant={r.dns_check_status === "verified" ? "default" : r.dns_check_status === "failed" ? "destructive" : "secondary"} className="rounded-none uppercase text-[10px]">
                    {r.dns_check_status === "verified" ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
                    {DNS_LABEL[r.dns_check_status] || r.dns_check_status}
                  </Badge>
                </div>
                {r.status === "pending" && r.dns_check_status === "not_checked" && (
                  <Button variant="outline" size="sm" className="rounded-none" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {r.admin_note && (
                <div className="text-xs p-2 bg-muted">
                  <span className="font-bold uppercase">Admin üzenet: </span>{r.admin_note}
                </div>
              )}
              <div className="text-xs space-y-1">
                <div className="font-bold uppercase">Állítsd be ezeket a DNS rekordokat:</div>
                <div className="grid gap-1 font-mono bg-muted p-2">
                  <div className="flex justify-between items-center gap-2">
                    <span>A @ → 185.158.133.1</span>
                    <button onClick={() => copy("185.158.133.1")}><Copy className="h-3 w-3" /></button>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span>A www → 185.158.133.1</span>
                    <button onClick={() => copy("185.158.133.1")}><Copy className="h-3 w-3" /></button>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span>TXT _lovable_partner.{r.requested_domain} → {r.verification_token}</span>
                    <button onClick={() => copy(r.verification_token)}><Copy className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>

              {r.dns_check_result && (
                <details className="text-[11px] bg-muted p-2 font-mono">
                  <summary className="cursor-pointer">Utolsó ellenőrzés eredménye</summary>
                  <pre className="whitespace-pre-wrap break-all mt-1">{JSON.stringify(r.dns_check_result, null, 2)}</pre>
                  {r.dns_checked_at && <div className="mt-1 text-muted-foreground">Ellenőrizve: {new Date(r.dns_checked_at).toLocaleString("hu-HU")}</div>}
                </details>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => markSelfReported(r.id)} disabled={r.dns_check_status === "verified"}>
                  Beállítottam a DNS-t
                </Button>
                <Button size="sm" className="rounded-none" onClick={() => runDnsCheck(r.id)} disabled={checking === r.id}>
                  {checking === r.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
                  DNS ellenőrzés
                </Button>
                <label className="inline-flex">
                  <input type="file" accept="image/*,application/pdf" hidden onChange={e => e.target.files?.[0] && uploadProof(r.id, e.target.files[0])} />
                  <Button asChild size="sm" variant="outline" className="rounded-none" disabled={uploading === r.id}>
                    <span>{uploading === r.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />} Bizonyíték feltöltése</span>
                  </Button>
                </label>
                {r.dns_proof_url && <span className="text-[11px] text-muted-foreground self-center">Feltöltve ✓</span>}
              </div>
            </Card>
          ))
        }
      </div>
    </div>
  );
};

export default PartnerDomainTab;

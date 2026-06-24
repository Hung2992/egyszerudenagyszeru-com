import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Globe, Send, Trash2, Copy } from "lucide-react";

interface Props { partnerId: string; }

const STATUS_LABEL: Record<string, string> = {
  pending: "Beküldve – jóváhagyásra vár",
  verifying: "DNS ellenőrzés folyamatban",
  approved: "Jóváhagyva",
  active: "Aktív (élesben)",
  rejected: "Elutasítva",
};

const PartnerDomainTab = ({ partnerId }: Props) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      dns_instructions: {
        a_record: { type: "A", name: "@", value: "185.158.133.1" },
        a_www: { type: "A", name: "www", value: "185.158.133.1" },
        txt: { type: "TXT", name: "_lovable_partner", value: "auto-generated" },
      },
    });
    setSubmitting(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    setDomain("");
    toast({ title: "Domain kérelem elküldve", description: "Az admin hamarosan átnézi." });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Biztosan törlöd ezt a kérelmet?")) return;
    await supabase.from("partner_domain_requests").delete().eq("id", id);
    await load();
  };

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast({ title: "Másolva" }); };

  return (
    <div className="space-y-4">
      <Card className="rounded-none border-foreground/20 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <h3 className="text-sm font-bold uppercase tracking-widest">Saját domain kérése</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Ha van saját domained (pl. <span className="font-mono">myshop.hu</span>), itt kérheted, hogy a webshopod ott jelenjen meg. Az admin jóváhagyása után állítsd be a lent kapott DNS rekordokat.
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
            <Card key={r.id} className="rounded-none border-foreground/20 p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold">{r.requested_domain}</span>
                  <Badge variant={r.status === "active" || r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="rounded-none uppercase">
                    {STATUS_LABEL[r.status] || r.status}
                  </Badge>
                </div>
                {r.status === "pending" && (
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
              {(r.status === "approved" || r.status === "verifying") && (
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
                      <span>TXT _lovable_partner → {r.verification_token}</span>
                      <button onClick={() => copy(r.verification_token)}><Copy className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        }
      </div>
    </div>
  );
};

export default PartnerDomainTab;

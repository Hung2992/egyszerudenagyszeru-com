import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

type Blast = {
  id: string;
  partner_id: string;
  subject: string;
  status: string | null;
  sent_at: string | null;
  recipient_count: number | null;
  sent_count: number | null;
};

type Delivery = { id: string; email: string; status: string; error: string | null; sent_at: string | null };

export default function AdminPartnerNewsletterPanel({ partnerNames }: { partnerNames: Record<string, string> }) {
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_email_blasts")
      .select("id, partner_id, subject, status, sent_at, recipient_count, sent_count")
      .order("created_at", { ascending: false })
      .limit(30);
    setBlasts((data as Blast[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const loadDeliveries = async (blastId: string) => {
    if (openId === blastId) return setOpenId(null);
    setOpenId(blastId);
    const { data } = await supabase
      .from("partner_newsletter_deliveries")
      .select("id, email, status, error, sent_at")
      .eq("blast_id", blastId)
      .order("created_at", { ascending: false })
      .limit(200);
    setDeliveries((prev) => ({ ...prev, [blastId]: (data as Delivery[]) || [] }));
  };

  const send = async (blast: Blast) => {
    setBusy(blast.id);
    const { data, error } = await supabase.functions.invoke("partner-newsletter-send", { body: { blastId: blast.id } });
    setBusy(null);
    const err = (error as any) || (data as any)?.error;
    if (err) {
      toast({ title: "Küldés sikertelen", description: (data as any)?.error || "Próbáld újra.", variant: "destructive" });
      return;
    }
    toast({
      title: "Hírlevél kiküldve",
      description: `${(data as any)?.sent ?? 0} címzettnek ment ki (${(data as any)?.recipients ?? 0} feliratkozóból).`,
    });
    await load();
    await loadDeliveries(blast.id);
  };

  return (
    <Card className="rounded-none p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-widest">Partner hírlevelek</h3>
        <Button variant="outline" size="sm" className="rounded-none ml-auto" onClick={() => void load()}>Frissítés</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Betöltés...</p>
      ) : blasts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Még nincs partner hírlevél.</p>
      ) : (
        <div className="space-y-2">
          {blasts.map((b) => (
            <div key={b.id} className="border p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{b.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {partnerNames[b.partner_id] || "Ismeretlen partner"}
                    {b.sent_at ? ` · ${new Date(b.sent_at).toLocaleString("hu-HU")}` : ""}
                  </p>
                </div>
                <Badge variant={b.status === "sent" ? "default" : "secondary"} className="rounded-none">
                  {b.status === "sent" ? `kiment (${b.sent_count ?? 0}/${b.recipient_count ?? 0})` : b.status || "vázlat"}
                </Badge>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => void loadDeliveries(b.id)}>
                  Kinek ment ki?
                </Button>
                <Button
                  size="sm"
                  className="rounded-none"
                  disabled={busy === b.id || b.status === "sent"}
                  onClick={() => void send(b)}
                >
                  {busy === b.id ? "Küldés..." : "Kiküldés"}
                </Button>
              </div>

              {openId === b.id && (
                <div className="border-t pt-2 space-y-1">
                  {(deliveries[b.id] || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Még nincs kézbesítési adat.</p>
                  ) : (
                    (deliveries[b.id] || []).map((d) => (
                      <div key={d.id} className="flex justify-between gap-2 text-xs border-b py-1">
                        <span className="truncate">{d.email}</span>
                        <span className={d.status === "sent" ? "text-muted-foreground" : "text-destructive"}>
                          {d.status === "sent" ? "elküldve" : d.error || d.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        A státusz azt mutatja, hogy a levél elhagyta a rendszert. A postaládába érkezést a címzett visszajelzése igazolja.
      </p>
    </Card>
  );
}

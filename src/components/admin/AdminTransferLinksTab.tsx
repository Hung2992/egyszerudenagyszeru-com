// Átutalási linkek: partner átutalásos rendelésekhez egyedi, banki adatokat tartalmazó link generálása.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";
import { LIVE_ORIGIN } from "@/lib/partner-storefront-urls";
import { Copy, ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";

interface OrderRow {
  id: string;
  partner_id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  total_huf: number | null;
  status: string | null;
  payment_status: string | null;
  created_at: string | null;
  transfer_access_token: string | null;
}

const huf = (n: number | null) => `${Number(n || 0).toLocaleString("hu-HU")} Ft`;

const AdminTransferLinksTab = () => {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [partners, setPartners] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyUnpaid, setOnlyUnpaid] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [oRes, pRes] = await Promise.all([
      supabase
        .from("partner_orders")
        .select("id, partner_id, order_number, customer_name, customer_email, total_huf, status, payment_status, created_at, transfer_access_token")
        .eq("payment_method", "transfer")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("partners").select("id, company_name, full_name").limit(500),
    ]);
    if (oRes.error) {
      toast({ title: "Nem sikerült betölteni", description: oRes.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const map: Record<string, string> = {};
    ((pRes.data as { id: string; company_name: string | null; full_name: string | null }[]) || []).forEach((p) => {
      map[p.id] = p.company_name || p.full_name || p.id.slice(0, 8);
    });
    setPartners(map);
    setRows((oRes.data as OrderRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyUnpaid && r.payment_status === "paid") return false;
      if (!needle) return true;
      return [r.order_number, r.customer_name, r.customer_email, partners[r.partner_id]]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, onlyUnpaid, partners]);

  const linkOf = (r: OrderRow) => (r.transfer_access_token ? `${LIVE_ORIGIN}/atutalas/${r.transfer_access_token}` : "");

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés rendelésszám, vevő vagy partner szerint" className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant={onlyUnpaid ? "default" : "outline"} size="sm" onClick={() => setOnlyUnpaid((v) => !v)}>
            Csak fizetésre váró
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Betöltés…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Nincs átutalásos rendelés a szűrésnek megfelelően.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const link = linkOf(r);
            return (
              <Card key={r.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {partners[r.partner_id] || "Ismeretlen partner"} · {r.customer_name || "—"} · {r.customer_email || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{huf(r.total_huf)}</Badge>
                    <Badge variant={r.payment_status === "paid" ? "default" : "secondary"}>
                      {r.payment_status === "paid" ? "Fizetve" : "Fizetésre vár"}
                    </Badge>
                  </div>
                </div>
                {link ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded bg-muted px-2 py-1 text-xs">{link}</code>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(link, "Átutalási link másolva")}>
                        <Copy className="mr-2 h-4 w-4" /> Másolás
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`/atutalas/${r.transfer_access_token}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" /> Megnyitás
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-destructive">Ehhez a rendeléshez nincs átutalási kulcs.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminTransferLinksTab;

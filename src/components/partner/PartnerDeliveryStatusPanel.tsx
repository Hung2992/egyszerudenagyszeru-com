import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  channel: string;
  to_address: string;
  status: string;
  provider: string | null;
  error: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Sorban áll",
  sending: "Küldés folyamatban",
  sent: "Kiment",
  delivered: "Kézbesítve",
  failed: "Hiba",
  no_provider: "Nincs szolgáltató",
};

const CHANNEL_LABEL: Record<string, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "E-mail",
  voice: "Hívás",
};

function statusClass(status: string) {
  switch (status) {
    case "delivered":
      return "bg-emerald-500/15 text-emerald-600 border-emerald-500/40";
    case "sent":
      return "bg-sky-500/15 text-sky-600 border-sky-500/40";
    case "queued":
    case "sending":
      return "bg-amber-500/15 text-amber-600 border-amber-500/40";
    case "failed":
      return "bg-destructive/15 text-destructive border-destructive/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("hu-HU", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duration(from: string, to: string | null) {
  if (!to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (ms < 0) return null;
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)} mp`;
  return `${Math.round(ms / 60000)} perc`;
}

export default function PartnerDeliveryStatusPanel({ partnerId }: { partnerId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("messaging_outbox")
      .select("id, channel, to_address, status, provider, error, created_at, sent_at, delivered_at")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(40);
    setRows((data as Row[]) || []);
    setUpdatedAt(new Date());
    setLoading(false);
  }, [partnerId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 20000);
    return () => clearInterval(timer);
  }, [load]);

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card className="rounded-none">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Kézbesítési státusz</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {updatedAt ? `Frissítve: ${fmt(updatedAt.toISOString())} · 20 mp-enként` : "Betöltés…"}
          </p>
        </div>
        <Button size="sm" variant="outline" className="rounded-none" disabled={loading} onClick={() => void load()}>
          Frissítés
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {["delivered", "sent", "queued", "failed", "no_provider"].map((s) =>
            counts[s] ? (
              <Badge key={s} variant="outline" className={`rounded-none ${statusClass(s)}`}>
                {STATUS_LABEL[s]}: {counts[s]}
              </Badge>
            ) : null,
          )}
          {rows.length === 0 && <span className="text-sm text-muted-foreground">Még nincs kimenő üzenet.</span>}
        </div>

        <div className="space-y-2">
          {rows.map((r) => {
            const took = duration(r.created_at, r.delivered_at || r.sent_at);
            return (
              <div key={r.id} className="border p-2 text-sm space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium break-all">
                    {CHANNEL_LABEL[r.channel] || r.channel} · {r.to_address}
                  </span>
                  <Badge variant="outline" className={`rounded-none ${statusClass(r.status)}`}>
                    {STATUS_LABEL[r.status] || r.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  <span>Indítva: {fmt(r.created_at)}</span>
                  <span>Kiment: {fmt(r.sent_at)}</span>
                  <span>Kézbesítve: {fmt(r.delivered_at)}</span>
                  {took && <span>Idő: {took}</span>}
                </div>
                {r.status === "no_provider" && (
                  <p className="text-xs text-muted-foreground">
                    Nincs bekötve küldő szolgáltató, ezért az üzenet nem indult el.
                  </p>
                )}
                {r.error && <p className="text-xs text-destructive break-all">{r.error}</p>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

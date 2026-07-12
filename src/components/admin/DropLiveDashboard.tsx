import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Users, ShoppingCart, ShieldAlert, TrendingUp, Eye, Timer } from "lucide-react";

interface Props {
  dropId: string;
}

interface DropRow {
  id: string;
  name: string;
  slug: string;
  drop_type: string;
  status: string;
  total_units: number;
  reserved_count: number;
  sold_count: number;
  starts_at: string;
  ends_at: string | null;
  hold_minutes: number;
}

interface Stats {
  reservationsActive: number;
  reservationsExpired: number;
  reservationsPaid: number;
  raffleEntries: number;
  raffleWinners: number;
  botBlocks: number;
  liveViewers: number;
}

export default function DropLiveDashboard({ dropId }: Props) {
  const [drop, setDrop] = useState<DropRow | null>(null);
  const [stats, setStats] = useState<Stats>({
    reservationsActive: 0,
    reservationsExpired: 0,
    reservationsPaid: 0,
    raffleEntries: 0,
    raffleWinners: 0,
    botBlocks: 0,
    liveViewers: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [{ data: d }, resv, raffle, bots, viewers] = await Promise.all([
      supabase.from("product_drops").select("*").eq("id", dropId).maybeSingle(),
      supabase
        .from("drop_reservations")
        .select("status", { count: "exact", head: false })
        .eq("drop_id", dropId),
      supabase
        .from("drop_raffle_entries")
        .select("is_winner", { count: "exact", head: false })
        .eq("drop_id", dropId),
      supabase
        .from("fraud_signals")
        .select("id", { count: "exact", head: true })
        .eq("context", "drop")
        .eq("reference_id", dropId),
      supabase
        .from("page_views")
        .select("id", { count: "exact", head: true })
        .ilike("path", `/drop/%`)
        .gte("created_at", new Date(Date.now() - 5 * 60_000).toISOString()),
    ]);

    if (d) setDrop(d as DropRow);

    const resvRows = (resv.data ?? []) as { status: string }[];
    const raffleRows = (raffle.data ?? []) as { is_winner: boolean | null }[];

    setStats({
      reservationsActive: resvRows.filter((r) => r.status === "active").length,
      reservationsExpired: resvRows.filter((r) => r.status === "expired").length,
      reservationsPaid: resvRows.filter((r) => r.status === "paid").length,
      raffleEntries: raffleRows.length,
      raffleWinners: raffleRows.filter((r) => r.is_winner === true).length,
      botBlocks: bots.count ?? 0,
      liveViewers: viewers.count ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 5000);
    const ch = supabase
      .channel(`drop-live-${dropId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drop_reservations", filter: `drop_id=eq.${dropId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drop_raffle_entries", filter: `drop_id=eq.${dropId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "product_drops", filter: `id=eq.${dropId}` },
        refresh,
      )
      .subscribe();
    return () => {
      clearInterval(iv);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropId]);

  const stockPct = useMemo(() => {
    if (!drop || drop.total_units <= 0) return 0;
    return Math.min(100, Math.round(((drop.sold_count + drop.reserved_count) / drop.total_units) * 100));
  }, [drop]);

  const conversion = useMemo(() => {
    if (stats.reservationsActive + stats.reservationsExpired + stats.reservationsPaid === 0) return 0;
    return Math.round(
      (stats.reservationsPaid /
        (stats.reservationsActive + stats.reservationsExpired + stats.reservationsPaid)) *
        100,
    );
  }, [stats]);

  if (loading || !drop) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </Card>
    );
  }

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-blue-500/20 text-blue-500",
    open: "bg-emerald-500/20 text-emerald-500 animate-pulse",
    closed: "bg-amber-500/20 text-amber-500",
    drawn: "bg-purple-500/20 text-purple-500",
    sold_out: "bg-red-500/20 text-red-500",
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-heading text-2xl">{drop.name}</h3>
          <div className="text-sm text-muted-foreground">
            /{drop.slug} · {drop.drop_type === "raffle" ? "Sorsolás" : "Érkezési sorrend"}
          </div>
        </div>
        <Badge className={statusColor[drop.status] ?? ""}>{drop.status.toUpperCase()}</Badge>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>Készletfogyás</span>
          <span className="font-mono">
            {drop.sold_count + drop.reserved_count} / {drop.total_units} ({stockPct}%)
          </span>
        </div>
        <Progress value={stockPct} className="h-3" />
        <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
          <span>💰 Fizetett: {drop.sold_count}</span>
          <span>⏳ Foglalva: {drop.reserved_count}</span>
          <span>📦 Szabad: {Math.max(0, drop.total_units - drop.sold_count - drop.reserved_count)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox icon={<Eye className="h-4 w-4" />} label="Élő nézők (5p)" value={stats.liveViewers} accent />
        <StatBox icon={<Timer className="h-4 w-4" />} label="Aktív foglalás" value={stats.reservationsActive} />
        <StatBox icon={<ShoppingCart className="h-4 w-4" />} label="Konverzió" value={`${conversion}%`} />
        <StatBox icon={<ShieldAlert className="h-4 w-4" />} label="Bot blokk" value={stats.botBlocks} danger={stats.botBlocks > 0} />
        {drop.drop_type === "raffle" && (
          <>
            <StatBox icon={<Users className="h-4 w-4" />} label="Jelentkező" value={stats.raffleEntries} />
            <StatBox icon={<TrendingUp className="h-4 w-4" />} label="Nyertes" value={stats.raffleWinners} />
          </>
        )}
        <StatBox icon={<Timer className="h-4 w-4" />} label="Lejárt foglalás" value={stats.reservationsExpired} />
        <StatBox icon={<ShoppingCart className="h-4 w-4" />} label="Fizetett foglalás" value={stats.reservationsPaid} />
      </div>

      <div className="text-xs text-muted-foreground border-t pt-3">
        Auto-frissítés: 5 másodpercenként + realtime események · Utolsó frissítés: {new Date().toLocaleTimeString("hu-HU")}
      </div>
    </Card>
  );
}

function StatBox({
  icon,
  label,
  value,
  accent,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`border p-3 ${
        danger ? "border-red-500/40 bg-red-500/5" : accent ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="font-mono text-2xl">{value}</div>
    </div>
  );
}

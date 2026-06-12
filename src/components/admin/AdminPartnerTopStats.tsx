import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Download, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TopPartner {
  partner_id: string;
  partner_name: string;
  coupon_code: string | null;
  orders_count: number;
  total_revenue: number;
  total_commission: number;
  pending_commission: number;
  paid_commission: number;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("hu-HU")} Ft`;

const downloadCsv = (rows: TopPartner[]) => {
  const header = ["Partner", "Kupon", "Rendelések", "Forgalom (Ft)", "Jutalék összesen (Ft)", "Függő jutalék (Ft)", "Kifizetve (Ft)"];
  const lines = [header.join(";")];
  rows.forEach((r) => {
    lines.push([
      `"${(r.partner_name || "").replace(/"/g, '""')}"`,
      r.coupon_code || "",
      r.orders_count,
      Math.round(r.total_revenue),
      Math.round(r.total_commission),
      Math.round(r.pending_commission),
      Math.round(r.paid_commission),
    ].join(";"));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `top-partnerek-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const AdminPartnerTopStats = () => {
  const [rows, setRows] = useState<TopPartner[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("get_top_partners", { _limit: 10 });
    if (error) {
      toast({ title: "Top partnerek betöltési hiba", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as TopPartner[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="border bg-card">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest">Top 10 Partner</h3>
            <p className="text-[10px] text-muted-foreground">Jutalék szerint rendezve</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-[10px]" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Frissítés
          </Button>
          <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-[10px]" onClick={() => downloadCsv(rows)} disabled={!rows.length}>
            <Download className="h-3 w-3 mr-1" /> CSV export
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Kupon</TableHead>
              <TableHead className="text-right">Rendelés</TableHead>
              <TableHead className="text-right">Forgalom</TableHead>
              <TableHead className="text-right">Jutalék</TableHead>
              <TableHead className="text-right">Függő</TableHead>
              <TableHead className="text-right">Kifizetve</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground text-xs py-6">{loading ? "Betöltés…" : "Még nincs adat"}</TableCell></TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={r.partner_id}>
                <TableCell className="font-bold">{i + 1}{i === 0 && " 🥇"}{i === 1 && " 🥈"}{i === 2 && " 🥉"}</TableCell>
                <TableCell className="font-medium">{r.partner_name}</TableCell>
                <TableCell className="font-mono text-xs">{r.coupon_code || "—"}</TableCell>
                <TableCell className="text-right">{r.orders_count}</TableCell>
                <TableCell className="text-right">{fmt(r.total_revenue)}</TableCell>
                <TableCell className="text-right font-bold text-accent">{fmt(r.total_commission)}</TableCell>
                <TableCell className="text-right">{fmt(r.pending_commission)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{fmt(r.paid_commission)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminPartnerTopStats;

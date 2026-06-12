import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, CheckCircle2, XCircle, RefreshCw, Download, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Payout {
  id: string;
  partner_id: string;
  amount: number;
  status: "requested" | "approved" | "paid" | "rejected";
  requested_at: string;
  approved_at: string | null;
  paid_at: string | null;
  rejected_at: string | null;
  payment_reference: string | null;
  admin_notes: string | null;
  partner_notes: string | null;
  partner_name?: string;
  partner_email?: string;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("hu-HU")} Ft`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("hu-HU") : "—";

const statusBadge = (s: Payout["status"]) => {
  const map = {
    requested: { label: "Igényelve", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
    approved: { label: "Jóváhagyva", className: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
    paid: { label: "Kifizetve", className: "bg-green-500/10 text-green-500 border-green-500/30" },
    rejected: { label: "Elutasítva", className: "bg-red-500/10 text-red-500 border-red-500/30" },
  };
  const v = map[s];
  return <Badge variant="outline" className={`rounded-none text-[10px] uppercase ${v.className}`}>{v.label}</Badge>;
};

const exportCsv = (rows: Payout[]) => {
  const header = ["ID", "Partner", "Email", "Összeg (Ft)", "Státusz", "Igényelve", "Jóváhagyva", "Kifizetve", "Referencia", "Admin jegyzet"];
  const lines = [header.join(";")];
  rows.forEach((r) => {
    lines.push([
      r.id, `"${(r.partner_name || "").replace(/"/g, '""')}"`, r.partner_email || "",
      Math.round(r.amount), r.status, fmtDate(r.requested_at), fmtDate(r.approved_at),
      fmtDate(r.paid_at), r.payment_reference || "", `"${(r.admin_notes || "").replace(/"/g, '""')}"`,
    ].join(";"));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `partner-kifizetesek-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const AdminPartnerPayouts = () => {
  const [rows, setRows] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | Payout["status"]>("requested");
  const [reference, setReference] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data: payouts, error } = await supabase
      .from("partner_payouts")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Betöltési hiba", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const partnerIds = Array.from(new Set((payouts ?? []).map((p: any) => p.partner_id)));
    const { data: partners } = partnerIds.length
      ? await supabase.from("partners").select("id, full_name, company_name, email").in("id", partnerIds)
      : { data: [] };
    const pMap: Record<string, any> = {};
    (partners ?? []).forEach((p: any) => { pMap[p.id] = p; });
    setRows((payouts ?? []).map((p: any) => ({
      ...p,
      partner_name: pMap[p.partner_id]?.company_name || pMap[p.partner_id]?.full_name || "—",
      partner_email: pMap[p.partner_id]?.email || "",
    })) as Payout[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, newStatus: Payout["status"]) => {
    const patch: Record<string, unknown> = { status: newStatus };
    if (newStatus === "approved") patch.approved_at = new Date().toISOString();
    if (newStatus === "paid") {
      patch.paid_at = new Date().toISOString();
      patch.payment_reference = reference[id] || null;
    }
    if (newStatus === "rejected") patch.rejected_at = new Date().toISOString();
    if (notes[id]) patch.admin_notes = notes[id];

    const { error } = await supabase.from("partner_payouts").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Frissítési hiba", description: error.message, variant: "destructive" });
      return;
    }

    // If rejected, release referrals back to unpaid pool
    if (newStatus === "rejected") {
      await supabase.from("partner_referrals").update({ payout_id: null }).eq("payout_id", id);
    }

    toast({ title: `✅ Státusz: ${newStatus}` });
    load();
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const totals = {
    requested: rows.filter((r) => r.status === "requested").reduce((s, r) => s + Number(r.amount), 0),
    approved: rows.filter((r) => r.status === "approved").reduce((s, r) => s + Number(r.amount), 0),
    paid: rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0),
  };

  return (
    <div className="border bg-card">
      <div className="border-b p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-accent" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest">Kifizetések kezelése</h3>
            <p className="text-[10px] text-muted-foreground">Igényelve → Jóváhagyva → Kifizetve</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="rounded-none h-8 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes</SelectItem>
              <SelectItem value="requested">Igényelve</SelectItem>
              <SelectItem value="approved">Jóváhagyva</SelectItem>
              <SelectItem value="paid">Kifizetve</SelectItem>
              <SelectItem value="rejected">Elutasítva</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="rounded-none uppercase text-[10px]" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Frissítés
          </Button>
          <Button size="sm" variant="outline" className="rounded-none uppercase text-[10px]" onClick={() => exportCsv(filtered)} disabled={!filtered.length}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b">
        <div className="p-3 border-r"><p className="text-[10px] uppercase text-muted-foreground">Függő igénylés</p><p className="text-xl font-bold text-yellow-500">{fmt(totals.requested)}</p></div>
        <div className="p-3 border-r"><p className="text-[10px] uppercase text-muted-foreground">Jóváhagyott (utalásra vár)</p><p className="text-xl font-bold text-blue-500">{fmt(totals.approved)}</p></div>
        <div className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Kifizetve összesen</p><p className="text-xl font-bold text-green-500">{fmt(totals.paid)}</p></div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead className="text-right">Összeg</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead>Igényelve</TableHead>
              <TableHead>Referencia / jegyzet</TableHead>
              <TableHead>Műveletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-6">{loading ? "Betöltés…" : "Nincs kifizetés"}</TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="min-w-[160px]">
                  <div className="font-bold text-xs">{r.partner_name}</div>
                  <div className="text-[10px] text-muted-foreground">{r.partner_email}</div>
                </TableCell>
                <TableCell className="text-right font-bold">{fmt(Number(r.amount))}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-xs">
                  <div>{fmtDate(r.requested_at)}</div>
                  {r.paid_at && <div className="text-[10px] text-green-500">Kifiz: {fmtDate(r.paid_at)}</div>}
                  {r.rejected_at && <div className="text-[10px] text-red-500">Elut: {fmtDate(r.rejected_at)}</div>}
                </TableCell>
                <TableCell className="min-w-[200px]">
                  {r.status === "requested" || r.status === "approved" ? (
                    <div className="space-y-1">
                      <Input className="rounded-none h-7 text-xs" placeholder="Utalási ref." value={reference[r.id] ?? r.payment_reference ?? ""} onChange={(e) => setReference({ ...reference, [r.id]: e.target.value })} />
                      <Input className="rounded-none h-7 text-xs" placeholder="Admin jegyzet" value={notes[r.id] ?? r.admin_notes ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground">
                      {r.payment_reference && <div>Ref: <span className="font-mono">{r.payment_reference}</span></div>}
                      {r.admin_notes && <div>{r.admin_notes}</div>}
                      {r.partner_notes && <div className="italic">Partner: {r.partner_notes}</div>}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {r.status === "requested" && (
                      <>
                        <Button size="sm" className="rounded-none h-6 text-[10px] uppercase bg-blue-500 hover:bg-blue-600" onClick={() => updateStatus(r.id, "approved")}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Jóváhagy
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-none h-6 text-[10px] uppercase text-red-500 border-red-500/30" onClick={() => updateStatus(r.id, "rejected")}>
                          <XCircle className="w-3 h-3 mr-1" /> Elutasít
                        </Button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" className="rounded-none h-6 text-[10px] uppercase bg-green-500 hover:bg-green-600" onClick={() => updateStatus(r.id, "paid")}>
                        <Banknote className="w-3 h-3 mr-1" /> Kifizetve
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminPartnerPayouts;

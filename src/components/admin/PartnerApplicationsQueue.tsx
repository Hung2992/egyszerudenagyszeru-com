// Partner regisztrációk jóváhagyása: jelentkezés → aktív fiók + partner hozzáférés.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Check, RefreshCw, X } from "lucide-react";

interface Row {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  tax_number: string | null;
  status: string | null;
  is_active: boolean | null;
  user_id: string | null;
  default_commission_percent: number | null;
  created_at: string | null;
}

const PartnerApplicationsQueue = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "active" | "all">("pending");
  const [commission, setCommission] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("partners")
      .select("id, full_name, company_name, email, phone, tax_number, status, is_active, user_id, default_commission_percent, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (filter === "pending") q = q.eq("status", "pending");
    else if (filter === "active") q = q.eq("status", "active");
    const { data, error } = await q;
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    setRows((data as Row[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const approve = async (r: Row) => {
    setBusy(r.id);
    const pct = Number(commission[r.id] ?? r.default_commission_percent ?? 0);
    const { error } = await supabase.from("partners").update({
      status: "active",
      is_active: true,
      default_commission_percent: Number.isFinite(pct) ? pct : 0,
      valid_from: new Date().toISOString().slice(0, 10),
    }).eq("id", r.id);
    if (error) { setBusy(null); toast({ title: "Nem sikerült", description: error.message, variant: "destructive" }); return; }

    if (r.user_id) {
      const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: r.user_id, role: "partner" });
      if (roleErr && !/duplicate|unique/i.test(roleErr.message)) {
        toast({ title: "Hozzáférés figyelmeztetés", description: roleErr.message, variant: "destructive" });
      }
    }
    setBusy(null);
    toast({ title: "Partner aktiválva", description: "A fiók mostantól elérhető a Partner Központban." });
    void load();
  };

  const reject = async (r: Row) => {
    setBusy(r.id);
    const { error } = await supabase.from("partners")
      .update({ status: "rejected", is_active: false })
      .eq("id", r.id);
    setBusy(null);
    if (error) { toast({ title: "Nem sikerült", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Jelentkezés elutasítva" });
    void load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "active", "all"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="rounded-none uppercase text-xs" onClick={() => setFilter(f)}>
            {f === "pending" ? "Jóváhagyásra vár" : f === "active" ? "Aktív" : "Összes"}
          </Button>
        ))}
        <Button size="sm" variant="outline" className="rounded-none ml-auto" onClick={() => void load()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Betöltés…</p> :
        rows.length === 0 ? <p className="text-sm text-muted-foreground">Nincs ilyen állapotú jelentkezés.</p> :
        rows.map(r => (
          <Card key={r.id} className="rounded-none border-foreground/20 p-4 space-y-3">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="font-bold">{r.company_name || r.full_name || "Névtelen"}</div>
                <div className="text-xs text-muted-foreground break-all">{r.email} {r.phone ? `· ${r.phone}` : ""}</div>
                {r.tax_number && <div className="text-xs text-muted-foreground">Adószám: {r.tax_number}</div>}
                {r.created_at && <div className="text-xs text-muted-foreground">Jelentkezett: {new Date(r.created_at).toLocaleString("hu-HU")}</div>}
              </div>
              <Badge className="rounded-none uppercase" variant={r.status === "active" ? "default" : "secondary"}>
                {r.status === "active" ? "Aktív" : r.status === "rejected" ? "Elutasítva" : "Várakozik"}
              </Badge>
            </div>

            {r.status !== "active" && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-32">
                  <Label className="text-xs uppercase tracking-widest">Jutalék %</Label>
                  <Input
                    className="rounded-none"
                    type="number"
                    min={0}
                    max={100}
                    value={commission[r.id] ?? String(r.default_commission_percent ?? 0)}
                    onChange={(e) => setCommission(c => ({ ...c, [r.id]: e.target.value }))}
                  />
                </div>
                <Button size="sm" className="rounded-none" disabled={busy === r.id} onClick={() => void approve(r)}>
                  <Check className="h-3 w-3 mr-1" /> Jóváhagy és aktivál
                </Button>
                <Button size="sm" variant="outline" className="rounded-none" disabled={busy === r.id} onClick={() => void reject(r)}>
                  <X className="h-3 w-3 mr-1" /> Elutasít
                </Button>
              </div>
            )}
          </Card>
        ))
      }
    </div>
  );
};

export default PartnerApplicationsQueue;

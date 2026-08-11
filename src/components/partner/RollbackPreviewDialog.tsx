// 🔐 Rollback előnézet: mielőtt bármit visszaállítunk, megmutatjuk pontosan mi változik.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Undo2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  planId: string | null;
  partnerId: string;
  onClose: () => void;
  onDone: () => void;
}

interface Field { field: string; current: unknown; restore: unknown }
interface Item {
  table: string; id: string; kind: "restore" | "delete"; missing?: boolean;
  drift?: boolean; label: string; fields?: Field[];
}
interface Summary { total: number; restore: number; remove: number; missing: number; drifted: number }

const FIELD_LABEL: Record<string, string> = {
  price_huf: "Ár", compare_price_huf: "Áthúzott ár",
};

const fmt = (v: unknown) =>
  typeof v === "number" ? `${v.toLocaleString("hu-HU")} Ft` : v == null ? "—" : String(v);

const RollbackPreviewDialog = ({ planId, partnerId, onClose, onDone }: Props) => {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!planId) return;
    let active = true;
    setLoading(true);
    void (async () => {
      const { data, error } = await supabase.functions.invoke("partner-action-engine", {
        body: { partner_id: partnerId, action: "rollback_preview", plan_id: planId },
      });
      if (!active) return;
      setLoading(false);
      if (error || data?.error) {
        toast({ title: "Nem sikerült az előnézet", description: error?.message || data?.error, variant: "destructive" });
        return;
      }
      setItems(data?.preview || []);
      setSummary(data?.summary || null);
    })();
    return () => { active = false; };
  }, [planId, partnerId]);

  const doRollback = async () => {
    if (!planId) return;
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("partner-action-engine", {
      body: { partner_id: partnerId, action: "rollback", plan_id: planId, skip_drifted: true },
    });
    setRunning(false);
    if (error || data?.error) {
      toast({ title: "Rollback hiba", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    const failed = data?.failures?.length || 0;
    const skipped = data?.skipped?.length || 0;
    toast({
      title: failed ? "Részleges visszaállítás" : "Visszaállítva",
      description: `${data?.restored || 0} elem visszaállítva${skipped ? `, ${skipped} kihagyva (időközben módosult)` : ""}${failed ? `, ${failed} hiba` : ""}.`,
      variant: failed ? "destructive" : undefined,
    });
    onDone();
    onClose();
  };

  return (
    <Dialog open={!!planId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-none max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-4 w-4" /> Rollback előnézet
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {summary && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" className="rounded-none">{summary.restore} visszaállítás</Badge>
                <Badge variant="secondary" className="rounded-none">{summary.remove} törlés</Badge>
                {summary.missing > 0 && <Badge variant="outline" className="rounded-none">{summary.missing} hiányzó</Badge>}
                {summary.drifted > 0 && <Badge variant="destructive" className="rounded-none">{summary.drifted} időközben módosult</Badge>}
              </div>
            )}

            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">Nincs visszaállítható változás ehhez a tervhez.</p>
            )}

            {items.map((it) => (
              <div key={`${it.table}-${it.id}`} className="border border-border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium">{it.label}</p>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="rounded-none text-[10px]">
                      {it.kind === "delete" ? "AI által létrehozott – törlés" : "Érték visszaállítása"}
                    </Badge>
                    {it.missing && <Badge variant="outline" className="rounded-none text-[10px]">hiányzik</Badge>}
                    {it.drift && (
                      <Badge variant="destructive" className="rounded-none text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" /> kézzel módosult – kihagyjuk
                      </Badge>
                    )}
                  </div>
                </div>
                {(it.fields || []).map((f) => (
                  <p key={f.field} className="text-xs">
                    <span className="text-muted-foreground">{FIELD_LABEL[f.field] || f.field}: </span>
                    <span className="line-through">{fmt(f.current)}</span> → <strong>{fmt(f.restore)}</strong>
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-none" onClick={onClose} disabled={running}>Mégsem</Button>
          <Button
            variant="destructive"
            className="rounded-none"
            disabled={running || loading || items.length === 0}
            onClick={() => void doRollback()}
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Undo2 className="h-4 w-4 mr-2" />}
            Visszaállítás
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RollbackPreviewDialog;

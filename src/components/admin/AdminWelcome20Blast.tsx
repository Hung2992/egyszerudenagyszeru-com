import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Megaphone, Send, Loader2 } from "lucide-react";

const AdminWelcome20Blast = () => {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const preview = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("send-welcome20-blast", { body: { dry_run: true } });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({ title: "Hiba", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setPreviewCount((data as any)?.recipient_count ?? 0);
  };

  const send = async () => {
    if (!confirm(`Biztosan kiküldöd a WELCOME20 (20% kedvezmény) kupont MINDEN regisztrált, megerősített felhasználónak?`)) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("send-welcome20-blast", { body: {} });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({ title: "Hiba a küldés során", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    const r = data as any;
    setLastResult({ sent: r.sent, failed: r.failed, total: r.recipient_count });
    toast({ title: "✅ Kuponok kiküldve", description: `${r.sent} sikeres, ${r.failed} sikertelen (${r.recipient_count} címzett)` });
  };

  return (
    <div className="border border-accent/40 bg-accent/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-bold uppercase tracking-wider">Nyitó akció — WELCOME20 körlevél</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Egy közös <strong className="text-foreground">WELCOME20</strong> kuponkód (20% kedvezmény, felhasználónként egyszer beváltható) kiküldése
        emailben MINDEN regisztrált, megerősített vásárlónak. Idempotens — ha újra futtatod, nem duplikál.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={preview} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
          Címzettek megtekintése
        </Button>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={send} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
          Kupon kiküldése most
        </Button>
        {previewCount !== null && (
          <span className="text-xs self-center text-muted-foreground">
            📧 {previewCount} címzett várja
          </span>
        )}
        {lastResult && (
          <span className="text-xs self-center">
            ✅ {lastResult.sent} sikeres / ❌ {lastResult.failed} sikertelen / {lastResult.total} összesen
          </span>
        )}
      </div>
    </div>
  );
};

export default AdminWelcome20Blast;

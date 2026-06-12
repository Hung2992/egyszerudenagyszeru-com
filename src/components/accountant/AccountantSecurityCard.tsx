import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Shield, RefreshCw, Loader2, Copy, AlertTriangle } from "lucide-react";

const AccountantSecurityCard = () => {
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);

  const regenerate = async () => {
    if (!confirm("Biztos? A korábbi backup kódok ezzel azonnal érvénytelenné válnak.")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("accountant-totp", { body: { action: "regenerate_backup" } });
    setBusy(false);
    if (error || !data?.ok) {
      toast({ title: "Sikertelen", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    setCodes(data.backup_codes ?? []);
    toast({ title: "Új backup kódok generálva", description: "A régiek érvénytelenek." });
  };

  return (
    <div className="border border-border p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 bg-accent/10 border border-accent flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">Biztonsági beállítások</h3>
          <p className="text-xs text-muted-foreground mt-1">
            TOTP backup kódok újragenerálása. A régiek azonnal érvénytelenné válnak — őrizd biztos helyen.
          </p>
        </div>
      </div>

      <Button onClick={regenerate} disabled={busy} variant="outline">
        {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
        Új backup kódok generálása
      </Button>

      {codes && (
        <div className="border border-accent/40 bg-accent/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-accent">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-[10px] uppercase tracking-wide font-bold">Mentsd el most — ezek után nem jelennek meg újra!</p>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs font-mono">
            {codes.map((c) => <code key={c} className="bg-background p-1.5 border border-border text-center">{c}</code>)}
          </div>
          <Button size="sm" variant="outline" onClick={() => {
            navigator.clipboard.writeText(codes.join("\n"));
            toast({ title: "Vágólapra másolva" });
          }}>
            <Copy className="h-3 w-3 mr-1" /> Összes másolása
          </Button>
        </div>
      )}
    </div>
  );
};

export default AccountantSecurityCard;

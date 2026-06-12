import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Shield, RefreshCw, Loader2, Copy, AlertTriangle, Eye, X } from "lucide-react";

type Mode = "view" | "regenerate";

const AccountantSecurityCard = () => {
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [prompt, setPrompt] = useState<Mode | null>(null);
  const [code, setCode] = useState("");

  const submit = async () => {
    if (!prompt) return;
    if (!/^\d{6}$/.test(code)) { toast({ title: "6 jegyű kód szükséges", variant: "destructive" }); return; }
    if (prompt === "regenerate" && !confirm("Biztos? A korábbi backup kódok azonnal érvénytelenné válnak.")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("accountant-totp", {
      body: { action: prompt === "regenerate" ? "regenerate_backup" : "view_backup", code },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast({ title: "Sikertelen", description: error?.message || data?.error || "Érvénytelen kód", variant: "destructive" });
      return;
    }
    setCodes(data.backup_codes ?? []);
    setPrompt(null);
    setCode("");
    toast({
      title: prompt === "regenerate" ? "Új backup kódok generálva" : "Backup kódok megjelenítve",
      description: prompt === "regenerate" ? "A régiek érvénytelenek." : "Az audit naplóba bekerült.",
    });
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
            A backup kódok megtekintéséhez vagy újragenerálásához érvényes TOTP kód szükséges. Minden hozzáférés auditálva.
          </p>
        </div>
      </div>

      {!prompt && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setCodes(null); setPrompt("view"); }} disabled={busy} variant="outline">
            <Eye className="h-4 w-4 mr-1" /> Backup kódok megtekintése
          </Button>
          <Button onClick={() => { setCodes(null); setPrompt("regenerate"); }} disabled={busy} variant="outline">
            <RefreshCw className="h-4 w-4 mr-1" /> Új kódok generálása
          </Button>
        </div>
      )}

      {prompt && (
        <div className="border border-accent/40 bg-accent/5 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wide font-bold text-accent">
              TOTP megerősítés — {prompt === "regenerate" ? "új kódok" : "kódok megtekintése"}
            </p>
            <Button size="sm" variant="ghost" onClick={() => { setPrompt(null); setCode(""); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            className="text-center text-2xl tracking-[0.5em] font-mono"
            autoFocus
          />
          <Button className="w-full" onClick={submit} disabled={busy || code.length !== 6}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Shield className="h-4 w-4 mr-1" />}
            Megerősítés
          </Button>
        </div>
      )}

      {codes && (
        <div className="border border-accent/40 bg-accent/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-accent">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-[10px] uppercase tracking-wide font-bold">Mentsd el biztos helyre — érzékeny adat!</p>
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

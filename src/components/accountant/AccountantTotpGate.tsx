import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Shield, Loader2, Copy, CheckCircle2 } from "lucide-react";

type Phase = "loading" | "enroll" | "verify" | "ok";

/**
 * TOTP 2FA gate. Forces enrollment if not enabled, then prompts for a 6-digit code.
 * On success, sets a sessionStorage flag so the user is not asked again this session.
 */
const TOTP_SESSION_KEY = "konyvelo_totp_ok";

const AccountantTotpGate = ({ onPass }: { onPass: () => void }) => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backup, setBackup] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const startEnroll = async () => {
    setBusy(true); setEnrollError(null);
    const { data, error } = await supabase.functions.invoke("accountant-totp", { body: { action: "enroll" } });
    setBusy(false);
    if (error || !data?.ok || !data?.qr_data_url) {
      const msg = error?.message ?? data?.error ?? "A QR kód generálása nem sikerült. Próbáld újra.";
      setEnrollError(msg);
      toast({ title: "Hiba", description: msg, variant: "destructive" });
      return;
    }
    setQr(data.qr_data_url); setSecret(data.secret); setBackup(data.backup_codes ?? []);
  };

  useEffect(() => {
    if (sessionStorage.getItem(TOTP_SESSION_KEY) === "1") { setPhase("ok"); onPass(); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("accountant-totp", { body: { action: "status" } });
      if (error) { setPhase("enroll"); setEnrollError("Nem sikerült lekérni az állapotot. Próbáld újra."); return; }
      if (data?.enabled) { setPhase("verify"); return; }
      setPhase("enroll");
      // Auto-start enrollment so the QR code appears immediately, no extra tap needed
      startEnroll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { toast({ title: "6 jegyű kód szükséges", variant: "destructive" }); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("accountant-totp", { body: { action: "verify", code } });
    setBusy(false);
    if (error || !data?.ok) { toast({ title: "Érvénytelen kód", variant: "destructive" }); return; }
    sessionStorage.setItem(TOTP_SESSION_KEY, "1");
    setPhase("ok"); onPass();
    toast({ title: "Sikeres hitelesítés" });
  };

  if (phase === "ok") return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-5">
      <div className="w-full max-w-md border border-border bg-secondary/20 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-accent/10 border border-accent flex items-center justify-center">
            <Shield className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent">Kétlépcsős hitelesítés</p>
            <h1 className="text-lg font-bold leading-tight">Könyvelői belépés</h1>
          </div>
        </div>

        {phase === "loading" && <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>}

        {phase === "enroll" && !qr && (
          <>
            <p className="text-xs text-muted-foreground">
              A pénzügyi adatok védelméhez először állítsd be a kétlépcsős hitelesítést. Szükséged lesz egy authenticator alkalmazásra (Google Authenticator, 1Password, Authy, Microsoft Authenticator).
            </p>
            {busy && (
              <div className="py-6 flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
                <p className="text-xs text-muted-foreground">QR kód generálása…</p>
              </div>
            )}
            {enrollError && (
              <p className="text-xs text-destructive border border-destructive/40 bg-destructive/5 p-2">{enrollError}</p>
            )}
            {!busy && (
              <Button className="w-full" onClick={startEnroll} disabled={busy}>
                <Shield className="h-4 w-4 mr-1" />
                {enrollError ? "Újrapróbálás — QR kód kérése" : "QR kód megjelenítése"}
              </Button>
            )}
          </>
        )}

        {phase === "enroll" && qr && (
          <>
            <p className="text-xs text-muted-foreground">1. Olvasd be a QR kódot az authenticator appoddal:</p>
            <div className="flex justify-center"><img src={qr} alt="TOTP QR" className="border border-border" /></div>
            {secret && (
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate bg-background p-2 border border-border text-[11px]">{secret}</code>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(secret); toast({ title: "Vágólapra másolva" }); }}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            {backup.length > 0 && (
              <div className="border border-accent/40 bg-accent/5 p-3">
                <p className="text-[10px] uppercase tracking-wide text-accent font-bold mb-2">Backup kódok — mentsd el biztos helyre!</p>
                <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                  {backup.map((c) => <code key={c} className="bg-background p-1 border border-border">{c}</code>)}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">2. Írd be a 6 jegyű kódot:</p>
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" className="text-center text-2xl tracking-[0.5em] font-mono" />
            <Button className="w-full" onClick={verify} disabled={busy || code.length !== 6}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Aktiválás befejezése
            </Button>
          </>
        )}

        {phase === "verify" && (
          <>
            <p className="text-xs text-muted-foreground">Írd be az authenticator alkalmazásból a 6 jegyű kódot (vagy egy backup kódot):</p>
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 10))} placeholder="000000" inputMode="text" className="text-center text-2xl tracking-[0.5em] font-mono" />
            <Button className="w-full" onClick={verify} disabled={busy || code.length < 6}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Belépés
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">A backup kód egyszer használható és nagybetűs.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountantTotpGate;

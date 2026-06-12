import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Shield, Loader2, Copy, CheckCircle2, Mail, Zap, AlertCircle } from "lucide-react";

type Phase = "loading" | "enroll" | "verify" | "ok";

// Persistent across reloads (per browser). Cleared on explicit logout.
const TOTP_OK_KEY = "konyvelo_totp_ok_v2";
// Build timestamp embedded at build time — lets the user confirm the deployed version.
const BUILD_AT = "2026-06-12T01:15:00Z";

const AccountantTotpGate = ({ onPass }: { onPass: () => void }) => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backup, setBackup] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "ok" | "bad">("idle");

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
    if (localStorage.getItem(TOTP_OK_KEY) === "1") { setPhase("ok"); onPass(); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("accountant-totp", { body: { action: "status" } });
      if (error) { setPhase("enroll"); setEnrollError("Nem sikerült lekérni az állapotot. Próbáld újra."); return; }
      if (data?.enabled) { setPhase("verify"); return; }
      setPhase("enroll");
      startEnroll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async () => {
    if (!/^\d{6}$/.test(code) && code.length < 6) { toast({ title: "6 jegyű kód szükséges", variant: "destructive" }); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("accountant-totp", { body: { action: "verify", code } });
    setBusy(false);
    if (error || !data?.ok) { toast({ title: "Érvénytelen kód", variant: "destructive" }); return; }
    localStorage.setItem(TOTP_OK_KEY, "1");
    setPhase("ok"); onPass();
    toast({ title: "Sikeres hitelesítés" });
  };

  const testCode = async () => {
    if (!/^\d{6}$/.test(code)) { toast({ title: "Adj meg egy 6 jegyű kódot a teszteléshez", variant: "destructive" }); return; }
    setBusy(true); setTestResult("idle");
    const { data, error } = await supabase.functions.invoke("accountant-totp", { body: { action: "test_code", code } });
    setBusy(false);
    if (error) { toast({ title: "Hálózati hiba", variant: "destructive" }); return; }
    if (data?.ok) { setTestResult("ok"); toast({ title: "A kód érvényes ✓" }); }
    else { setTestResult("bad"); toast({ title: "A kód érvénytelen", variant: "destructive" }); }
  };

  const emailQr = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("accountant-totp", { body: { action: "email_qr" } });
    setBusy(false);
    if (error || !data?.ok) { toast({ title: "E-mail küldés sikertelen", description: error?.message ?? data?.error, variant: "destructive" }); return; }
    setEmailSent(true);
    toast({ title: "QR kód e-mailben elküldve" });
  };

  if (phase === "ok") return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-5">
      <div className="w-full max-w-md border border-border bg-secondary/20 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-accent/10 border border-accent flex items-center justify-center">
            <Shield className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent">Kétlépcsős hitelesítés</p>
            <h1 className="text-lg font-bold leading-tight">Könyvelői belépés</h1>
          </div>
        </div>

        <div className="border border-accent/30 bg-accent/5 p-2 flex items-start gap-2">
          <CheckCircle2 className="h-3 w-3 text-accent mt-0.5 shrink-0" />
          <div className="text-[10px] text-muted-foreground leading-tight">
            <span className="text-accent font-bold">FRONTEND VERZIÓ:</span> {BUILD_AT}
            <br />
            <span className="opacity-70">Ha ezt látod az éles oldalon (egyszerudenagyszeru.com), a publikálás sikeres.</span>
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
              <div className="border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{enrollError}</p>
              </div>
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
            <Button size="sm" variant="outline" className="w-full" onClick={emailQr} disabled={busy || emailSent}>
              <Mail className="h-3 w-3 mr-1" />
              {emailSent ? "QR e-mailben elküldve ✓" : "QR kód küldése e-mailben"}
            </Button>
            {backup.length > 0 && (
              <div className="border border-accent/40 bg-accent/5 p-3">
                <p className="text-[10px] uppercase tracking-wide text-accent font-bold mb-2">Backup kódok — mentsd el biztos helyre!</p>
                <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                  {backup.map((c) => <code key={c} className="bg-background p-1 border border-border">{c}</code>)}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">2. Írd be a 6 jegyű kódot:</p>
            <Input value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setTestResult("idle"); }} placeholder="000000" inputMode="numeric" className="text-center text-2xl tracking-[0.5em] font-mono" />
            {testResult === "ok" && <p className="text-xs text-accent border border-accent/40 bg-accent/5 p-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> A kód érvényes — aktiválhatod.</p>}
            {testResult === "bad" && <p className="text-xs text-destructive border border-destructive/40 bg-destructive/5 p-2 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> A kód nem egyezik. Ellenőrizd az időt és az appot.</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={testCode} disabled={busy || code.length !== 6}>
                <Zap className="h-4 w-4 mr-1" /> Kód tesztelése
              </Button>
              <Button onClick={verify} disabled={busy || code.length !== 6}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Aktiválás
              </Button>
            </div>
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

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { logRecoveryEvent, classifyTokenError } from "@/lib/password-recovery-analytics";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [ready, setReady] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"token_expired" | "token_invalid" | null>(null);

  const [reEmail, setReEmail] = useState("");
  const [reLoading, setReLoading] = useState(false);

  useEffect(() => {
    logRecoveryEvent("page_view", { path: "/reset-password" });

    const url = new URL(window.location.href);
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");

    if (tokenHash && type === "recovery") {
      supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash }).then(({ error }) => {
        if (error) {
          const kind = classifyTokenError(error.message);
          setVerifyError(error.message);
          setErrorKind(kind);
          logRecoveryEvent(kind, { stage: "verifyOtp", message: error.message });
        } else {
          setReady(true);
        }
        window.history.replaceState({}, "", "/reset-password");
      });
    } else {
      setReady(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Hiba", description: "A jelszavak nem egyeznek.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Hiba", description: "Legalább 6 karakter kell.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      logRecoveryEvent("save_error", { message: error.message });
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      logRecoveryEvent("save_success");
      toast({ title: "Kész!", description: "A jelszavad megváltozott." });
      navigate("/");
    }
  };

  const requestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reEmail || !reEmail.includes("@")) {
      toast({ title: "Hiba", description: "Adj meg egy érvényes email címet.", variant: "destructive" });
      return;
    }
    setReLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-password-recovery", {
        body: { email: reEmail, redirectTo: `${window.location.origin}/reset-password` },
      });
      if (error) throw error;
      logRecoveryEvent("new_link_requested", { rate_limited: !!(data as any)?.rateLimited });
      if ((data as any)?.rateLimited) {
        toast({ title: "Túl sok próbálkozás", description: "Várj 1 órát, mielőtt újra próbálkozol.", variant: "destructive" });
      } else {
        toast({ title: "Elküldtük!", description: "Nézd meg az email fiókodat (a spam mappát is)." });
      }
    } catch (err: any) {
      toast({ title: "Hiba", description: err?.message ?? "Nem sikerült elküldeni.", variant: "destructive" });
    } finally {
      setReLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center px-4 py-16 md:py-24">
        <div className="w-full max-w-sm">
          <Card className="rounded-none border bg-card">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">
                {verifyError ? (errorKind === "token_expired" ? "Lejárt link" : "Érvénytelen link") : "Új jelszó"}
              </CardTitle>
              <CardDescription className="text-xs">
                {verifyError ? "Kérj egy új visszaállító linket lent." : "Add meg az új jelszavadat."}
              </CardDescription>
            </CardHeader>

            {verifyError ? (
              <form onSubmit={requestNewLink}>
                <CardContent className="space-y-4">
                  <p className="text-xs text-destructive">
                    {errorKind === "token_expired"
                      ? "A visszaállító link már lejárt. Az új link 1 óráig érvényes."
                      : "A visszaállító link érvénytelen vagy már felhasználtad."}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="reEmail" className="text-xs uppercase tracking-wider">Email</Label>
                    <Input id="reEmail" type="email" value={reEmail} onChange={(e) => setReEmail(e.target.value)} placeholder="email@cimed.hu" className="rounded-none h-11 text-sm" required />
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button type="submit" className="w-full rounded-none h-11 uppercase tracking-wider text-xs" disabled={reLoading}>
                    {reLoading ? "Küldés..." : "Új visszaállító link kérése"}
                  </Button>
                  <Link to="/auth" className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
                    Vissza a bejelentkezéshez
                  </Link>
                </CardFooter>
              </form>
            ) : (
              <form onSubmit={handleReset}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs uppercase tracking-wider">Új jelszó</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="rounded-none h-11 text-sm" required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider">Mégegyszer</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="rounded-none h-11 text-sm" required minLength={6} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full rounded-none h-11 uppercase tracking-wider text-xs" disabled={loading || !ready}>
                    {loading ? "Várj..." : !ready ? "Betöltés..." : "Mentés"}
                  </Button>
                </CardFooter>
              </form>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ResetPassword;

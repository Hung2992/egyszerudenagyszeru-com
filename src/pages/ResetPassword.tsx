import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [ready, setReady] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    // PKCE flow: ?token_hash=...&type=recovery
    const url = new URL(window.location.href);
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");

    if (tokenHash && type === "recovery") {
      supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash }).then(({ error }) => {
        if (error) setVerifyError(error.message);
        else setReady(true);
        // Tisztítsuk az URL-t
        window.history.replaceState({}, "", "/reset-password");
      });
    } else {
      // Implicit flow: a Supabase JS automatikusan beolvassa a #access_token=... hash-t
      // és kibocsát egy PASSWORD_RECOVERY eseményt.
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
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Kész!", description: "A jelszavad megváltozott." }); navigate("/"); }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center px-4 py-16 md:py-24">
        <div className="w-full max-w-sm">
          <Card className="rounded-none border bg-card">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Új jelszó</CardTitle>
              <CardDescription className="text-xs">Add meg az új jelszavadat.</CardDescription>
            </CardHeader>

            {verifyError ? (
              <CardContent>
                <p className="text-xs text-destructive">
                  A visszaállító link érvénytelen vagy lejárt. Kérj egy újat a bejelentkezési oldalon.
                </p>
              </CardContent>
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

import { useState } from "react";
import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Eye, EyeOff } from "lucide-react";

type AuthMode = "login" | "admin" | "forgot";

const translateAuthError = (msg: string): string => {
  const map: Record<string, string> = {
    "Invalid login credentials": "Hibás email cím vagy jelszó.",
    "Email not confirmed": "Az email cím még nincs megerősítve. Ellenőrizd a postaládádat.",
    "User already registered": "Ez az email cím már regisztrálva van.",
    "Password is known to be weak and easy to guess, please choose a different one.": "Ez a jelszó túl gyenge vagy kiszivárgott adatbázisban szerepel. Kérlek válassz másikat.",
    "Signup requires a valid password": "Érvényes jelszó szükséges a regisztrációhoz.",
    "For security purposes, you can only request this after": "Biztonsági okokból csak később kérheted újra.",
    "Email rate limit exceeded": "Túl sok kérés. Próbáld újra később.",
    "Unable to validate email address: invalid format": "Érvénytelen email cím formátum.",
  };
  for (const [en, hu] of Object.entries(map)) {
    if (msg.includes(en)) return hu;
  }
  return msg;
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = useMemo(() => {
    const requested = searchParams.get("redirect") || "/";
    return requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  }, [searchParams]);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const isAdminMode = mode === "admin";
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast({ title: "Hiba", description: translateAuthError(error.message), variant: "destructive" });
      return;
    }

    if (isAdminMode) {
      const userId = data?.user?.id;
      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      setLoading(false);
      if (roleError || !isAdmin) {
        await supabase.auth.signOut();
        toast({
          title: "Nincs jogosultság",
          description: "Ehhez a fiókhoz nem tartozik adminisztrátori hozzáférés.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Sikeres admin belépés!" });
      navigate("/admin", { replace: true });
      return;
    }

    setLoading(false);
    toast({ title: "Sikeres bejelentkezés!" });
    navigate(redirectPath, { replace: true });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-password-recovery", {
        body: { email, redirectTo: `${window.location.origin}/reset-password` },
      });
      if (error) throw error;
      if ((data as any)?.rateLimited) {
        toast({
          title: "Túl sok próbálkozás",
          description: "Várj 1 órát, mielőtt újra próbálkozol.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Elküldtük!", description: "Nézd meg az email fiókodat." });
      }
    } catch (err: any) {
      toast({ title: "Hiba", description: translateAuthError(err?.message ?? "Ismeretlen hiba"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<AuthMode, string> = {
    login: "BELÉPÉS",
    admin: "SZUPER ADMIN BELÉPÉS",
    forgot: "JELSZÓ VISSZAÁLLÍTÁS",
  };
  const descriptions: Record<AuthMode, string> = {
    login: "Lépj be a partnerfiókoddal.",
    admin: "Csak adminisztrátori fiókkal.",
    forgot: "Küldünk egy visszaállítási linket.",
  };

  return (
    <Layout>
      <div className="flex items-center justify-center px-4 py-16 md:py-24">
        <div className="w-full max-w-sm">
          <Card className="rounded-none border bg-card">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">{titles[mode]}</CardTitle>
              <CardDescription className="text-xs">{descriptions[mode]}</CardDescription>
            </CardHeader>

            {mode !== "forgot" && (
              <div className="grid grid-cols-2 gap-2 px-6 pb-4">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`h-9 text-[10px] font-bold uppercase tracking-wider border ${mode === "login" ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground"}`}
                >
                  Partner
                </button>
                <button
                  type="button"
                  onClick={() => setMode("admin")}
                  className={`h-9 text-[10px] font-bold uppercase tracking-wider border ${mode === "admin" ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground"}`}
                >
                  Szuper admin
                </button>
              </div>
            )}

            <form onSubmit={mode === "forgot" ? handleForgotPassword : handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@cimed.hu" className="rounded-none h-11 text-sm" required />
                </div>
                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs uppercase tracking-wider">Jelszó</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="rounded-none h-11 text-sm pr-10" required minLength={6} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button type="submit" className="w-full rounded-none h-11 uppercase tracking-wider text-xs" disabled={loading}>
                  {loading ? "Várj..." : titles[mode]}
                </Button>
                {mode === "login" && (
                  <>
                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider" onClick={() => setMode("forgot")}>
                      Elfelejtett jelszó?
                    </button>
                    <p className="text-xs text-muted-foreground text-center">
                      Nincs fiókod?{" "}
                      <Link to="/partner-regisztracio" className="text-accent hover:underline font-medium">Partner regisztráció</Link>
                    </p>
                  </>
                )}
                {mode === "forgot" && (
                  <button type="button" className="text-xs text-accent hover:underline font-medium uppercase tracking-wider" onClick={() => setMode("login")}>
                    Vissza
                  </button>
                )}
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Auth;

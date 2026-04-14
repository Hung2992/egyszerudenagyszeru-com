import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Eye, EyeOff } from "lucide-react";

type AuthMode = "login" | "register" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Sikeres bejelentkezés!" }); navigate("/"); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Hiba", description: "A jelszónak legalább 6 karakter hosszúnak kell lennie.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { display_name: displayName } },
    });
    setLoading(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else if (data.user && !data.session) toast({ title: "Sikerült!", description: "Erősítsd meg az email címedet." });
    else { toast({ title: "Sikeres regisztráció!" }); navigate("/"); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Elküldtük!", description: "Nézd meg az email fiókodat." });
  };

  const titles: Record<AuthMode, string> = { login: "BELÉPÉS", register: "REGISZTRÁCIÓ", forgot: "JELSZÓ VISSZAÁLLÍTÁS" };
  const descriptions: Record<AuthMode, string> = {
    login: "Üdv újra. Jelentkezz be a fiókodba.",
    register: "Hozd létre a fiókodat.",
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

            <form onSubmit={mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleForgotPassword}>
              <CardContent className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-xs uppercase tracking-wider">Név</Label>
                    <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Neved" className="rounded-none h-11 text-sm" required />
                  </div>
                )}
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
                    <p className="text-xs text-muted-foreground">
                      Nincs fiókod?{" "}
                      <button type="button" className="text-accent hover:underline font-medium" onClick={() => setMode("register")}>Regisztrálj</button>
                    </p>
                  </>
                )}
                {mode === "register" && (
                  <p className="text-xs text-muted-foreground">
                    Van fiókod?{" "}
                    <button type="button" className="text-accent hover:underline font-medium" onClick={() => setMode("login")}>Lépj be</button>
                  </p>
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

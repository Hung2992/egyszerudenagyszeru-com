import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import PartnerCooperationProgress from "@/components/partner/PartnerCooperationProgress";

const PartnerRegister = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [alreadyPartner, setAlreadyPartner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    company_name: "",
    phone: "",
    tax_number: "",
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    setForm((f) => ({ ...f, email: session.user.email || f.email }));
    supabase
      .from("partners")
      .select("id, status")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setAlreadyPartner(!!data));
  }, [session]);

  const signUp = async () => {
    if (!form.email || form.password.length < 8) {
      toast({ title: "Hiányzó adat", description: "Adj meg e-mailt és legalább 8 karakteres jelszót.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { emailRedirectTo: `${window.location.origin}/partner-regisztracio` },
    });
    setBusy(false);
    if (error) {
      toast({ title: "Regisztráció sikertelen", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Fiók létrehozva", description: "Erősítsd meg az e-mail címed, majd térj vissza ide." });
  };

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (error) toast({ title: "Belépés sikertelen", description: error.message, variant: "destructive" });
  };

  const apply = async () => {
    if (!session?.user) return;
    if (form.full_name.trim().length < 2) {
      toast({ title: "Add meg a neved", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("partners").insert({
      user_id: session.user.id,
      full_name: form.full_name.trim(),
      company_name: form.company_name.trim() || null,
      email: session.user.email,
      phone: form.phone.trim() || null,
      tax_number: form.tax_number.trim() || null,
      partner_type: form.company_name.trim() ? "company" : "person",
      status: "pending",
      is_active: false,
      default_commission_percent: 0,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Jelentkezés sikertelen", description: error.message, variant: "destructive" });
      return;
    }
    setAlreadyPartner(true);
    toast({ title: "Jelentkezés elküldve", description: "Folytasd a kötelező KYC ellenőrzéssel." });
    navigate("/partner-onboarding");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Partner regisztráció | Egyszerű de Nagyszerű</title>
        <meta name="description" content="Hozd létre partnerfiókodat, és indítsd el saját webshopodat, szolgáltatásaidat és időpontfoglalásaidat." />
      </Helmet>

      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-3xl font-bold uppercase tracking-tight">Partner regisztráció</h1>
        <p className="text-sm text-muted-foreground">
          Készítsd el a fiókod, és küldd be a jelentkezésed. Jóváhagyás után saját webshopot, szolgáltatásokat, naptárat és hírleveleket kezelhetsz.
        </p>

        {checking ? (
          <p className="text-sm text-muted-foreground">Betöltés…</p>
        ) : !session?.user ? (
          <Card className="rounded-none p-4 space-y-3">
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input className="rounded-none" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Jelszó</Label>
              <Input className="rounded-none" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="rounded-none flex-1" disabled={busy} onClick={() => void signUp()}>Fiók létrehozása</Button>
              <Button variant="outline" className="rounded-none flex-1" disabled={busy} onClick={() => void signIn()}>Már van fiókom</Button>
            </div>
            <button
              type="button"
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground underline"
              disabled={busy}
              onClick={() => void forgotPassword()}
            >
              Elfelejtett jelszó?
            </button>
          </Card>
        ) : alreadyPartner ? (
          <div className="space-y-3">
            <PartnerCooperationProgress />
            <Button variant="outline" className="w-full rounded-none" onClick={() => navigate("/partner-onboarding")}>Együttműködés folytatása</Button>
          </div>
        ) : (
          <Card className="rounded-none p-4 space-y-3">
            <div className="space-y-1">
              <Label>Teljes név *</Label>
              <Input className="rounded-none" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Cégnév (ha van)</Label>
              <Input className="rounded-none" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefonszám</Label>
                <Input className="rounded-none" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Adószám</Label>
                <Input className="rounded-none" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
              </div>
            </div>
            <Button className="rounded-none w-full" disabled={busy} onClick={() => void apply()}>Jelentkezés beküldése</Button>
          </Card>
        )}

        <Link to="/" className="text-xs underline text-muted-foreground">Vissza a főoldalra</Link>
      </div>
    </div>
  );
};

export default PartnerRegister;

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { getPartnerSlugFromHostname, resolveCustomDomainSlug } from "@/lib/partner-subdomain";

type Mode = "login" | "register" | "forgot";

const STATUS_LABELS: Record<string, string> = {
  pending: "Feldolgozás alatt",
  confirmed: "Visszaigazolva",
  processing: "Készítés alatt",
  shipped: "Kiszállítás alatt",
  delivered: "Kézbesítve",
  cancelled: "Törölve",
  refunded: "Visszatérítve",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "függőben",
  paid: "kifizetve",
  failed: "sikertelen",
  refunded: "visszatérítve",
};

const translateAuthError = (msg: string): string => {
  const map: Record<string, string> = {
    "Invalid login credentials": "Hibás email cím vagy jelszó.",
    "Email not confirmed": "Az email cím még nincs megerősítve. Nézd meg a postaládád.",
    "User already registered": "Ez az email cím már regisztrálva van.",
    "Password should be at least": "A jelszó túl rövid.",
    "Email rate limit exceeded": "Túl sok kérés. Próbáld újra később.",
    "Unable to validate email address: invalid format": "Érvénytelen email cím.",
  };
  for (const [en, hu] of Object.entries(map)) if (msg.includes(en)) return hu;
  return msg;
};

const BrandCustomerAccount = () => {
  const params = useParams<{ slug: string }>();
  const previewToken = new URLSearchParams(window.location.search).get("preview");
  const isPreview = previewToken === "editor" || previewToken === "admin";
  const [slug, setSlug] = useState<string | null>(params.slug || getPartnerSlugFromHostname());
  const [sf, setSf] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (slug) return;
    (async () => setSlug(await resolveCustomDomainSlug()))();
  }, [slug]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      let q = supabase.from("partner_storefronts").select("*").eq("slug", slug);
      if (!isPreview) q = q.eq("is_published", true);
      const { data } = await q.maybeSingle();
      if (!alive) return;
      setSf(data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  // load or create the customer profile for this storefront
  useEffect(() => {
    if (!session?.user || !sf?.partner_id) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("storefront_customers").select("*")
        .eq("user_id", session.user.id).eq("partner_id", sf.partner_id).maybeSingle();
      if (!alive) return;
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
      } else {
        const { data: created } = await supabase.from("storefront_customers").insert({
          user_id: session.user.id,
          partner_id: sf.partner_id,
          email: session.user.email,
          full_name: (session.user.user_metadata as any)?.full_name || null,
        }).select().maybeSingle();
        if (!alive) return;
        setProfile(created || null);
        setFullName(created?.full_name || "");
      }
    })();
    return () => { alive = false; };
  }, [session, sf]);

  // saját rendelések ennél a webshopnál
  useEffect(() => {
    if (!session?.user || !sf?.partner_id) { setOrders([]); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("partner_orders")
        .select("id, order_number, status, payment_status, total_huf, items, created_at, tracking_number, carrier")
        .eq("customer_user_id", session.user.id)
        .eq("partner_id", sf.partner_id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (alive) setOrders(data || []);
    })();
    return () => { alive = false; };
  }, [session, sf]);

  const style = useMemo(() => ({
    background: sf?.bg_color || "#000",
    color: sf?.text_color || "#fff",
    fontFamily: sf?.font_body,
  }) as React.CSSProperties, [sf]);
  const accent = sf?.accent_color || "#c9a227";
  const border = `${sf?.text_color || "#fff"}20`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${params.slug ? `/b/${params.slug}` : ""}/fiok`,
            data: { full_name: fullName.trim() || null },
          },
        });
        if (error) throw error;
        toast({ title: "Regisztráció elküldve", description: "Erősítsd meg az email címed a kiküldött linkkel." });
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast({ title: "Sikeres belépés" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Elküldtük", description: "Nézd meg az email fiókodat." });
        setMode("login");
      }
    } catch (err: any) {
      toast({ title: "Hiba", description: translateAuthError(err?.message || "Ismeretlen hiba"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase.from("storefront_customers")
      .update({ full_name: fullName.trim() || null, phone: phone.trim() || null, address: address.trim() || null })
      .eq("id", profile.id);
    setBusy(false);
    toast({
      title: error ? "Mentés sikertelen" : "Elmentve",
      description: error ? error.message : "Frissítettük az adataidat.",
      variant: error ? "destructive" : undefined,
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Betöltés…</div>;
  if (!sf) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Ez a webshop nem érhető el.</div>;

  const shopHome = params.slug ? `/b/${params.slug}` : "/";
  const inputCls = "w-full h-11 px-3 bg-transparent border text-sm outline-none";

  return (
    <div className="min-h-screen" style={style}>
      <Helmet>
        <title>{`Vásárlói fiók – ${sf.display_name}`.slice(0, 60)}</title>
        <meta name="description" content={`Belépés és regisztráció a(z) ${sf.display_name} webshopban: rendelések és személyes adatok kezelése.`.slice(0, 160)} />
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="border-b" style={{ borderColor: border }}>
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to={shopHome} className="font-bold uppercase tracking-widest text-lg" style={{ fontFamily: sf.font_heading }}>
            {sf.display_name}
          </Link>
          <Link to={shopHome} className="text-xs uppercase tracking-widest opacity-70 hover:opacity-100">← Vissza a boltba</Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-2xl font-bold uppercase tracking-widest mb-6" style={{ fontFamily: sf.font_heading }}>
          {session ? "Vásárlói fiókom" : mode === "register" ? "Regisztráció" : mode === "forgot" ? "Elfelejtett jelszó" : "Belépés"}
        </h1>

        {session ? (
          <div className="space-y-4 border p-5" style={{ borderColor: border }}>
            <p className="text-sm opacity-70">{session.user.email}</p>
            <div className="space-y-3">
              <input className={inputCls} style={{ borderColor: border }} placeholder="Teljes név" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
              <input className={inputCls} style={{ borderColor: border }} placeholder="Telefonszám" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
              <input className={inputCls} style={{ borderColor: border }} placeholder="Szállítási cím" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={255} />
            </div>
            <button onClick={saveProfile} disabled={busy} className="w-full h-11 uppercase tracking-widest text-xs font-bold" style={{ background: accent, color: sf.bg_color }}>
              {busy ? "Mentés…" : "Adatok mentése"}
            </button>
            <button onClick={() => supabase.auth.signOut()} className="w-full h-11 border uppercase tracking-widest text-xs" style={{ borderColor: border }}>
              Kijelentkezés
            </button>

            <div className="pt-4 border-t space-y-3" style={{ borderColor: border }}>
              <div className="text-xs uppercase tracking-widest opacity-70">Rendeléseim</div>
              {orders.length === 0 ? (
                <p className="text-sm opacity-60">Még nincs rendelésed ebben a webshopban.</p>
              ) : orders.map((o) => (
                <div key={o.id} className="border p-3 space-y-1" style={{ borderColor: border }}>
                  <div className="flex justify-between text-sm font-bold">
                    <span>{o.order_number}</span>
                    <span style={{ color: accent }}>{Number(o.total_huf).toLocaleString("hu-HU")} Ft</span>
                  </div>
                  <div className="text-xs opacity-70">
                    {new Date(o.created_at).toLocaleDateString("hu-HU")} · {STATUS_LABELS[o.status] || o.status}
                    {o.payment_status ? ` · fizetés: ${PAYMENT_LABELS[o.payment_status] || o.payment_status}` : ""}
                  </div>
                  <div className="text-xs opacity-70">
                    {(Array.isArray(o.items) ? o.items : []).map((i: any) => `${i.title} × ${i.qty}`).join(", ")}
                  </div>
                  {o.tracking_number && (
                    <div className="text-xs opacity-70">Csomagkövetés: {o.carrier ? `${o.carrier} · ` : ""}{o.tracking_number}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 border p-5" style={{ borderColor: border }}>
            {mode === "register" && (
              <input className={inputCls} style={{ borderColor: border }} placeholder="Teljes név" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
            )}
            <input className={inputCls} style={{ borderColor: border }} type="email" required placeholder="Email cím" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            {mode !== "forgot" && (
              <input className={inputCls} style={{ borderColor: border }} type="password" required minLength={6} placeholder="Jelszó" value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
            <button type="submit" disabled={busy} className="w-full h-11 uppercase tracking-widest text-xs font-bold" style={{ background: accent, color: sf.bg_color }}>
              {busy ? "Várj…" : mode === "register" ? "Regisztrálok" : mode === "forgot" ? "Link küldése" : "Belépés"}
            </button>

            <div className="flex flex-col gap-2 text-xs opacity-80 pt-1">
              {mode !== "login" && (
                <button type="button" onClick={() => setMode("login")} className="uppercase tracking-widest hover:opacity-100">Van már fiókom – belépés</button>
              )}
              {mode !== "register" && (
                <button type="button" onClick={() => setMode("register")} className="uppercase tracking-widest hover:opacity-100">Új vásárlói fiók létrehozása</button>
              )}
              {mode !== "forgot" && (
                <button type="button" onClick={() => setMode("forgot")} className="uppercase tracking-widest hover:opacity-100">Elfelejtett jelszó</button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default BrandCustomerAccount;

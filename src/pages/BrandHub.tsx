import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { getPartnerSlugFromHostname, resolveCustomDomainSlug } from "@/lib/partner-subdomain";

// Partner saját ügyfélközpontja: termékek, szolgáltatások, naptár, foglalás, hírlevél, ügyfélfiók
// Útvonal: /b/:slug/kozpont (saját domainen: /kozpont)

type Tab = "termekek" | "szolgaltatasok" | "naptar" | "foglalas" | "hirlevel" | "fiok";

const TABS: { key: Tab; label: string }[] = [
  { key: "termekek", label: "Termékek" },
  { key: "szolgaltatasok", label: "Szolgáltatások" },
  { key: "naptar", label: "Naptár" },
  { key: "foglalas", label: "Foglalás" },
  { key: "hirlevel", label: "Hírlevél" },
  { key: "fiok", label: "Fiókom" },
];

const DAY_NAMES = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

const attrsOf = (p: any) => (p?.attributes && typeof p.attributes === "object" ? p.attributes : {});
const isBookable = (p: any) => {
  const a = attrsOf(p);
  const t = String(p.product_type || "");
  const service = t.startsWith("service") || p.fulfillment_type === "service";
  const course = t.startsWith("course") || p.fulfillment_type === "course";
  return a.booking_enabled !== false && (service || (course && !!a.live_schedule));
};

const BrandHub = () => {
  const params = useParams<{ slug: string }>();
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(params.slug || getPartnerSlugFromHostname());
  const [sf, setSf] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("termekek");

  const [session, setSession] = useState<any>(null);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
  const [openNews, setOpenNews] = useState<string | null>(null);
  const [auth, setAuth] = useState({ email: "", password: "" });

  const [subEmail, setSubEmail] = useState("");
  const [booking, setBooking] = useState({ product_slug: "", customer_name: "", customer_email: "", customer_phone: "", starts_at: "", notes: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (resolvedSlug) return;
    void resolveCustomDomainSlug().then((s) => s && setResolvedSlug(s));
  }, [resolvedSlug]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, s: any) => setSession(s));
    supabase.auth.getSession().then(({ data }: any) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!resolvedSlug) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: store } = await supabase
        .from("partner_storefronts").select("*").eq("slug", resolvedSlug).eq("is_published", true).maybeSingle();
      if (!alive) return;
      if (!store) { setLoading(false); return; }
      setSf(store);
      const [{ data: prods }, { data: blasts }] = await Promise.all([
        supabase.from("partner_products").select("*").eq("partner_id", store.partner_id).eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("partner_email_blasts").select("id, subject, excerpt, slug, body_html, published_at")
          .eq("partner_id", store.partner_id).eq("published_on_site", true).order("published_at", { ascending: false }).limit(10),
      ]);
      if (!alive) return;
      setProducts(prods || []);
      setNews(blasts || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [resolvedSlug]);

  const loadMyBookings = useCallback(async () => {
    if (!session?.user) { setMyBookings([]); return; }
    const { data } = await supabase
      .from("partner_appointments")
      .select("id, starts_at, status, duration_min, location, product_id")
      .eq("customer_user_id", session.user.id)
      .order("starts_at", { ascending: true })
      .limit(50);
    setMyBookings(data || []);
  }, [session]);

  useEffect(() => { void loadMyBookings(); }, [loadMyBookings]);

  // Saját hírlevél-kézbesítési státusz (csak a belépett ügyfél saját e-mail címére)
  const loadMyDeliveries = useCallback(async () => {
    if (!session?.user) { setMyDeliveries([]); return; }
    const { data } = await supabase
      .from("partner_newsletter_deliveries")
      .select("id, blast_id, status, error, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setMyDeliveries(data || []);
  }, [session]);

  useEffect(() => { void loadMyDeliveries(); }, [loadMyDeliveries]);

  const services = useMemo(() => products.filter(isBookable), [products]);
  const shopItems = useMemo(() => products.filter((p) => !isBookable(p)), [products]);
  const productTitle = (id: string) => products.find((p) => p.id === id)?.title || "Foglalás";

  const submitBooking = async () => {
    if (!resolvedSlug || !booking.product_slug) {
      toast({ title: "Válassz szolgáltatást", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-public-booking", {
      body: {
        store_slug: resolvedSlug,
        product_slug: booking.product_slug,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email || session?.user?.email || "",
        customer_phone: booking.customer_phone,
        notes: booking.notes,
        starts_at: booking.starts_at ? new Date(booking.starts_at).toISOString() : "",
      },
    });
    setBusy(false);
    const err = (error as any) || (data as any)?.error;
    if (err) {
      const code = typeof (data as any)?.error === "string" ? (data as any).error : "";
      const msgs: Record<string, string> = {
        invalid_name: "Add meg a neved.",
        invalid_email: "Az e-mail cím nem érvényes.",
        invalid_date: "Válassz érvényes időpontot.",
        too_soon: "Legalább 30 perccel előbbre foglalj.",
        closed_day: "Ezen a napon nincs nyitva.",
        not_bookable: "Ez a tétel nem foglalható.",
      };
      toast({ title: "Foglalás sikertelen", description: msgs[code] || "Próbáld újra kicsit később.", variant: "destructive" });
      return;
    }
    toast({ title: "Foglalás rögzítve", description: "A visszaigazolást e-mailben küldjük." });
    setBooking({ product_slug: "", customer_name: "", customer_email: "", customer_phone: "", starts_at: "", notes: "" });
    void loadMyBookings();
  };

  const subscribe = async () => {
    if (!sf || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(subEmail)) {
      toast({ title: "Adj meg érvényes e-mail címet", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("partner_email_subscribers").insert({ partner_id: sf.partner_id, email: subEmail.trim().toLowerCase() });
    setBusy(false);
    if (error) { toast({ title: "Feliratkozás sikertelen", description: "Lehet, hogy már fel vagy iratkozva.", variant: "destructive" }); return; }
    setSubEmail("");
    toast({ title: "Feliratkoztál", description: "A következő hírlevelet már megkapod." });
  };

  const doAuth = async (mode: "in" | "up") => {
    setBusy(true);
    const fn = mode === "in"
      ? supabase.auth.signInWithPassword({ email: auth.email.trim(), password: auth.password })
      : supabase.auth.signUp({ email: auth.email.trim(), password: auth.password, options: { emailRedirectTo: window.location.href } });
    const { error } = await fn;
    setBusy(false);
    if (error) { toast({ title: mode === "in" ? "Belépés sikertelen" : "Regisztráció sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: mode === "in" ? "Beléptél" : "Fiók létrehozva", description: mode === "up" ? "Erősítsd meg az e-mail címed." : "" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white text-sm">Betöltés…</div>;
  if (!sf) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-black text-white p-4">
      <h1 className="text-2xl uppercase">Nincs ilyen oldal</h1>
      <Link to="/" className="text-sm underline opacity-70">Vissza a főoldalra</Link>
    </div>
  );

  const bg = sf.bg_color || "#0a0a0a";
  const text = sf.text_color || "#ffffff";
  const accent = sf.accent_color || "#D4AF37";
  const base = params.slug ? `/b/${params.slug}` : "";
  const inputCls = "w-full border p-2 text-sm bg-transparent";
  const inputStyle = { borderColor: `${text}33`, color: text } as const;

  return (
    <div className="min-h-screen" style={{ background: bg, color: text, fontFamily: sf.font_body || "Inter, sans-serif" }}>
      <Helmet>
        <title>{`${sf.display_name} ügyfélközpont`.slice(0, 60)}</title>
        <meta name="description" content={`${sf.display_name}: termékek, szolgáltatások, naptár, időpontfoglalás és hírlevél egy helyen.`.slice(0, 155)} />
      </Helmet>

      <header className="border-b px-4 py-5" style={{ borderColor: `${text}22` }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight">{sf.display_name}</h1>
          <Link to={base || "/"} className="text-xs underline opacity-70">Főoldal</Link>
        </div>
        <nav className="max-w-4xl mx-auto mt-4 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="whitespace-nowrap border px-3 py-2 text-xs uppercase tracking-widest"
              style={{
                borderColor: tab === t.key ? accent : `${text}33`,
                background: tab === t.key ? accent : "transparent",
                color: tab === t.key ? bg : text,
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {tab === "termekek" && (
          shopItems.length === 0 ? <p className="text-sm opacity-70">Még nincs elérhető termék.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shopItems.map((p) => (
                <Link key={p.id} to={`${base}/termek/${p.slug}`} className="border p-3 block" style={{ borderColor: `${text}22` }}>
                  <p className="font-medium text-sm">{p.title}</p>
                  <p className="text-xs opacity-70 mt-1">{p.price ? `${Number(p.price).toLocaleString("hu-HU")} Ft` : "Ár egyeztetés szerint"}</p>
                </Link>
              ))}
            </div>
          )
        )}

        {tab === "szolgaltatasok" && (
          services.length === 0 ? <p className="text-sm opacity-70">Még nincs foglalható szolgáltatás.</p> : (
            <div className="space-y-3">
              {services.map((p) => {
                const a = attrsOf(p);
                return (
                  <div key={p.id} className="border p-3" style={{ borderColor: `${text}22` }}>
                    <p className="font-medium text-sm">{p.title}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {a.service_duration_min ? `${a.service_duration_min} perc · ` : ""}
                      {p.price ? `${Number(p.price).toLocaleString("hu-HU")} Ft` : "Ár egyeztetés szerint"}
                      {a.service_location ? ` · ${a.service_location}` : ""}
                    </p>
                    <button
                      className="mt-2 border px-3 py-1 text-xs uppercase"
                      style={{ borderColor: accent, color: accent }}
                      onClick={() => { setBooking((b) => ({ ...b, product_slug: p.slug })); setTab("foglalas"); }}
                    >
                      Időpontot foglalok
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === "naptar" && (
          services.length === 0 ? <p className="text-sm opacity-70">Nincs naptárhoz kötött szolgáltatás.</p> : (
            <div className="space-y-3">
              {services.map((p) => {
                const a = attrsOf(p);
                const days: number[] = Array.isArray(a.work_days) && a.work_days.length ? a.work_days.map(Number) : [1, 2, 3, 4, 5];
                const jsDay = new Date().getDay();
                const isoDay = jsDay === 0 ? 7 : jsDay;
                return (
                  <div key={p.id} className="border p-3 space-y-2" style={{ borderColor: `${text}22` }}>
                    <p className="font-medium text-sm">{p.title}</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <span
                          key={d}
                          className="border px-2 py-1 text-[11px]"
                          style={{
                            borderColor: days.includes(d) ? accent : `${text}22`,
                            opacity: days.includes(d) ? 1 : 0.4,
                            fontWeight: d === isoDay ? 700 : 400,
                          }}
                        >
                          {DAY_NAMES[d - 1]}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs opacity-70">
                      Nyitva: {a.work_from || "09:00"}–{a.work_to || "17:00"} · Ma {days.includes(isoDay) ? "fogadunk foglalást" : "zárva"}
                    </p>
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === "foglalas" && (
          <div className="border p-4 space-y-3 max-w-md" style={{ borderColor: `${text}22` }}>
            <select
              className={inputCls}
              style={{ ...inputStyle, background: bg }}
              value={booking.product_slug}
              onChange={(e) => setBooking({ ...booking, product_slug: e.target.value })}
            >
              <option value="">Válassz szolgáltatást…</option>
              {services.map((p) => <option key={p.id} value={p.slug}>{p.title}</option>)}
            </select>
            <input className={inputCls} style={inputStyle} placeholder="Neved" value={booking.customer_name} onChange={(e) => setBooking({ ...booking, customer_name: e.target.value })} />
            <input className={inputCls} style={inputStyle} placeholder="E-mail" value={booking.customer_email || session?.user?.email || ""} onChange={(e) => setBooking({ ...booking, customer_email: e.target.value })} />
            <input className={inputCls} style={inputStyle} placeholder="Telefon (nem kötelező)" value={booking.customer_phone} onChange={(e) => setBooking({ ...booking, customer_phone: e.target.value })} />
            <input className={inputCls} style={inputStyle} type="datetime-local" value={booking.starts_at} onChange={(e) => setBooking({ ...booking, starts_at: e.target.value })} />
            <textarea className={inputCls} style={inputStyle} rows={3} placeholder="Megjegyzés" value={booking.notes} onChange={(e) => setBooking({ ...booking, notes: e.target.value })} />
            <button
              className="w-full px-4 py-2 text-xs uppercase tracking-widest"
              style={{ background: accent, color: bg }}
              disabled={busy}
              onClick={() => void submitBooking()}
            >
              {busy ? "Küldés…" : "Foglalás elküldése"}
            </button>
            {!session?.user && <p className="text-xs opacity-70">Ha belépsz a Fiókom fülön, a foglalásaidat itt is végig tudod követni.</p>}
          </div>
        )}

        {tab === "hirlevel" && (
          <div className="space-y-4">
            <div className="border p-4 space-y-2 max-w-md" style={{ borderColor: `${text}22` }}>
              <p className="text-sm">Iratkozz fel a hírlevélre.</p>
              <input className={inputCls} style={inputStyle} placeholder="E-mail címed" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} />
              <button className="w-full px-4 py-2 text-xs uppercase tracking-widest" style={{ background: accent, color: bg }} disabled={busy} onClick={() => void subscribe()}>
                Feliratkozom
              </button>
            </div>
            <div className="space-y-2">
              {news.length === 0 ? <p className="text-sm opacity-70">Még nincs közzétett hírlevél.</p> : news.map((n) => {
                const d = myDeliveries.find((x) => x.blast_id === n.id);
                const open = openNews === n.id;
                return (
                  <div key={n.id} className="border p-3" style={{ borderColor: `${text}22` }}>
                    <button className="text-left w-full" onClick={() => setOpenNews(open ? null : n.id)}>
                      <p className="text-sm font-medium">{n.subject}</p>
                      {n.excerpt && <p className="text-xs opacity-70 mt-1">{n.excerpt}</p>}
                      {n.published_at && <p className="text-[11px] opacity-50 mt-1">{new Date(n.published_at).toLocaleDateString("hu-HU")}</p>}
                    </button>
                    {d && (
                      <p className="text-[11px] mt-2 opacity-80">
                        {d.status === "sent"
                          ? `Kiküldve neked: ${new Date(d.sent_at || d.created_at).toLocaleString("hu-HU")}`
                          : `Küldés sikertelen${d.error ? `: ${d.error}` : ""}`}
                      </p>
                    )}
                    {open && (
                      <>
                        {n.body_html
                          ? <div className="text-sm mt-3 space-y-2 [&_a]:underline" dangerouslySetInnerHTML={{ __html: n.body_html }} />
                          : <p className="text-sm mt-3 opacity-70">Ehhez a hírlevélhez nincs megjeleníthető tartalom.</p>}
                        <Link to={`${base}/hirek/${n.slug}`} className="text-xs underline opacity-70 mt-3 inline-block">Megnyitás külön oldalon</Link>
                      </>
                    )}
                  </div>
                );
              })}
              {!session?.user && <p className="text-xs opacity-70">Lépj be a Fiókom fülön, hogy lásd, mely hírlevelek mentek ki a te címedre.</p>}
            </div>
          </div>
        )}

        {tab === "fiok" && (
          session?.user ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border p-3" style={{ borderColor: `${text}22` }}>
                <span className="text-sm truncate">{session.user.email}</span>
                <button className="text-xs underline opacity-70" onClick={() => void supabase.auth.signOut()}>Kilépés</button>
              </div>
              <h2 className="text-sm uppercase tracking-widest opacity-70">Foglalásaim</h2>
              {myBookings.length === 0 ? <p className="text-sm opacity-70">Még nincs foglalásod.</p> : myBookings.map((b) => (
                <div key={b.id} className="border p-3 text-sm" style={{ borderColor: `${text}22` }}>
                  <p className="font-medium">{productTitle(b.product_id)}</p>
                  <p className="text-xs opacity-70">
                    {new Date(b.starts_at).toLocaleString("hu-HU")} · {b.duration_min} perc · {b.status === "confirmed" ? "visszaigazolva" : b.status === "cancelled" ? "lemondva" : "függőben"}
                    {b.location ? ` · ${b.location}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="border p-4 space-y-3 max-w-md" style={{ borderColor: `${text}22` }}>
              <p className="text-sm">Lépj be, hogy lásd a foglalásaidat és a szolgáltatások állapotát.</p>
              <input className={inputCls} style={inputStyle} placeholder="E-mail" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} />
              <input className={inputCls} style={inputStyle} type="password" placeholder="Jelszó" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 text-xs uppercase" style={{ background: accent, color: bg }} disabled={busy} onClick={() => void doAuth("in")}>Belépés</button>
                <button className="flex-1 border px-4 py-2 text-xs uppercase" style={{ borderColor: `${text}44`, color: text }} disabled={busy} onClick={() => void doAuth("up")}>Regisztráció</button>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default BrandHub;

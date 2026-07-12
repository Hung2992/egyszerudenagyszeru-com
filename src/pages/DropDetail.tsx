import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Trophy, ShoppingCart, Bell, Users, Zap, Timer, ShieldAlert } from "lucide-react";
import DropCountdown from "@/components/DropCountdown";
import { generateBrowserFingerprint, getOrCreateDropSessionId } from "@/lib/drop-fingerprint";

interface Drop {
  id: string;
  name: string;
  slug: string;
  teaser_text: string | null;
  hero_image_url: string | null;
  drop_type: "first_come" | "raffle";
  starts_at: string;
  ends_at: string | null;
  raffle_draw_at: string | null;
  total_units: number;
  reserved_count: number;
  sold_count: number;
  hold_minutes: number;
  winner_checkout_minutes: number;
  require_captcha: boolean;
  status: "draft" | "scheduled" | "open" | "closed" | "drawn" | "sold_out";
  price_override: number | null;
  product_id: string | null;
  partner_product_id: string | null;
}

interface MyEntry { id: string; is_winner: boolean; winner_position: number | null; checkout_deadline: string | null; checkout_completed_at: string | null; }
interface MyReservation { id: string; status: string; expires_at: string; order_id: string | null; quantity: number; }

export default function DropDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [entry, setEntry] = useState<MyEntry | null>(null);
  const [reservation, setReservation] = useState<MyReservation | null>(null);
  const [notifiedCount, setNotifiedCount] = useState(0);
  const [raffleCount, setRaffleCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const sessionId = useMemo(() => getOrCreateDropSessionId(), []);

  const loadAll = async () => {
    if (!slug) return;
    setLoading(true);
    const { data: d } = await supabase.from("product_drops").select("*").eq("slug", slug).maybeSingle();
    if (!d) { setLoading(false); return; }
    setDrop(d as Drop);

    const { data: session } = await supabase.auth.getUser();
    setSignedIn(!!session.user);
    setUserEmail(session.user?.email ?? "");

    // Public counts
    const { count: rc } = await supabase.from("drop_raffle_entries").select("id", { count: "exact", head: true }).eq("drop_id", (d as Drop).id);
    setRaffleCount(rc ?? 0);
    const { count: nc } = await supabase.from("drop_notifications").select("id", { count: "exact", head: true }).eq("drop_id", (d as Drop).id);
    setNotifiedCount(nc ?? 0);

    // My entry / reservation (csak bejelentkezve)
    if (session.user) {
      const { data: e } = await supabase.from("drop_raffle_entries").select("id, is_winner, winner_position, checkout_deadline, checkout_completed_at").eq("drop_id", (d as Drop).id).eq("user_id", session.user.id).maybeSingle();
      setEntry((e as MyEntry) ?? null);
      const { data: r } = await supabase.from("drop_reservations").select("id, status, expires_at, order_id, quantity").eq("drop_id", (d as Drop).id).eq("user_id", session.user.id).eq("status", "active").maybeSingle();
      setReservation((r as MyReservation) ?? null);
    }

    // View event (best effort)
    supabase.from("drop_events").insert({ drop_id: (d as Drop).id, event_type: "viewed", session_id: sessionId, payload: {} }).then(() => {});

    setLoading(false);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [slug]);

  // Realtime — drop mezők (reserved_count, status)
  useEffect(() => {
    if (!drop?.id) return;
    const ch = supabase
      .channel(`drop_${drop.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "product_drops", filter: `id=eq.${drop.id}` }, (p) => {
        setDrop((prev) => (prev ? { ...prev, ...(p.new as Drop) } : prev));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [drop?.id]);

  const enterRaffle = async () => {
    if (!drop) return;
    const email = signedIn ? userEmail : emailInput.trim();
    if (!email) { toast.error("Email megadása kötelező"); return; }
    setSubmitting(true);
    try {
      const fp = await generateBrowserFingerprint();
      const { data, error } = await supabase.functions.invoke("drop-enter-raffle", {
        body: { drop_id: drop.id, email, fingerprint: fp, session_id: sessionId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Sikeres jelentkezés! 🎟️");
      loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Nem sikerült jelentkezni");
    } finally {
      setSubmitting(false);
    }
  };

  const reserveSlot = async () => {
    if (!drop) return;
    if (!signedIn) { navigate("/auth"); return; }
    setSubmitting(true);
    try {
      const fp = await generateBrowserFingerprint();
      const { data, error } = await supabase.functions.invoke("drop-reserve", {
        body: { drop_id: drop.id, quantity: 1, fingerprint: fp, session_id: sessionId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Foglalás sikeres — irány a fizetés!");
      // Elmentjük a foglalás lejáratát, hogy a checkoutban látszódjon
      try {
        sessionStorage.setItem("drop_reservation", JSON.stringify({
          drop_id: drop.id, reservation_id: (data as any).reservation_id,
          expires_at: (data as any).expires_at, product_id: drop.product_id ?? drop.partner_product_id,
        }));
      } catch { /* ignore */ }
      navigate("/checkout");
    } catch (e: any) {
      toast.error(mapError(e?.message));
    } finally {
      setSubmitting(false);
    }
  };

  const subscribe = async () => {
    if (!drop) return;
    const email = signedIn ? userEmail : emailInput.trim();
    if (!email) { toast.error("Email szükséges"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("drop-subscribe", {
        body: { drop_id: drop.id, email, session_id: sessionId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Értesítést küldünk! 🔔");
      setNotifiedCount((c) => c + 1);
    } catch (e: any) {
      toast.error(e?.message ?? "Nem sikerült feliratkozni");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Layout><div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div></Layout>;
  }
  if (!drop) {
    return <Layout><div className="max-w-2xl mx-auto p-10 text-center"><h1 className="text-2xl font-bold">Nincs ilyen drop</h1><Button className="mt-4" onClick={() => navigate("/shop")}>Vissza a shopba</Button></div></Layout>;
  }

  const startsAt = new Date(drop.starts_at);
  const isBeforeStart = startsAt.getTime() > Date.now();
  const remaining = Math.max(0, drop.total_units - drop.reserved_count);
  const fillPct = Math.min(100, Math.round((drop.reserved_count / drop.total_units) * 100));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="relative border overflow-hidden">
          {drop.hero_image_url && (
            <img src={drop.hero_image_url} alt={drop.name} className="w-full h-64 md:h-96 object-cover" loading="eager" />
          )}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold border ${
              drop.status === "open" ? "bg-primary text-primary-foreground" :
              drop.status === "scheduled" ? "bg-background" :
              drop.status === "sold_out" || drop.status === "closed" ? "bg-destructive text-destructive-foreground" :
              "bg-muted"
            }`}>{drop.status}</span>
            <span className="px-2 py-1 text-[10px] uppercase tracking-widest font-bold border bg-background">
              {drop.drop_type === "raffle" ? "🎟️ Raffle" : "⚡ First come"}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">{drop.name}</h1>
          {drop.teaser_text && <p className="text-muted-foreground mt-3 text-lg">{drop.teaser_text}</p>}
        </div>

        {/* Countdown + stats */}
        <Card className="p-6 space-y-6">
          {isBeforeStart ? (
            <DropCountdown targetDate={drop.starts_at} label="Indulás" onExpire={loadAll} />
          ) : drop.drop_type === "raffle" && drop.raffle_draw_at && drop.status !== "drawn" ? (
            <DropCountdown targetDate={drop.raffle_draw_at} label="Húzásig hátra" onExpire={loadAll} />
          ) : drop.status === "open" && drop.ends_at ? (
            <DropCountdown targetDate={drop.ends_at} label="Zárásig" onExpire={loadAll} />
          ) : (
            <div className="text-center text-lg font-bold uppercase tracking-widest">
              {drop.status === "drawn" ? "🏆 A húzás megtörtént" : drop.status === "sold_out" ? "🚫 Elkelt" : drop.status === "closed" ? "Lezárt drop" : ""}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
            <div>
              <div className="text-2xl font-bold">{remaining}<span className="text-sm text-muted-foreground">/{drop.total_units}</span></div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Elérhető</div>
            </div>
            <div>
              <div className="text-2xl font-bold flex items-center justify-center gap-1"><Users className="h-4 w-4" />{drop.drop_type === "raffle" ? raffleCount : notifiedCount}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{drop.drop_type === "raffle" ? "Jelentkező" : "Feliratkozó"}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{fillPct}%</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Foglalt</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${fillPct}%` }} />
          </div>
        </Card>

        {/* Actions */}
        <Card className="p-6 space-y-4">
          {!signedIn && (
            <Input placeholder="A te emailed" value={emailInput} onChange={e => setEmailInput(e.target.value)} type="email" />
          )}

          {/* Scheduled -> feliratkozás */}
          {drop.status === "scheduled" && isBeforeStart && (
            <Button onClick={subscribe} disabled={submitting} className="w-full h-12">
              {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : <><Bell className="h-4 w-4 mr-2" /> Értesíts, ha indul</>}
            </Button>
          )}

          {/* Open + raffle -> jelentkezés */}
          {drop.drop_type === "raffle" && ["scheduled","open"].includes(drop.status) && !isBeforeStart && !entry && (
            <Button onClick={enterRaffle} disabled={submitting} className="w-full h-12">
              {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : <><Zap className="h-4 w-4 mr-2" /> Jelentkezem a raffle-re</>}
            </Button>
          )}

          {/* Open + first_come -> foglalás */}
          {drop.drop_type === "first_come" && drop.status === "open" && !reservation && remaining > 0 && (
            <Button onClick={reserveSlot} disabled={submitting} className="w-full h-12">
              {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : <><ShoppingCart className="h-4 w-4 mr-2" /> Foglalj most — {drop.hold_minutes} perced van fizetni</>}
            </Button>
          )}

          {/* Aktív foglalás */}
          {reservation && (
            <div className="border-2 border-primary bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold"><Timer className="h-4 w-4" /> Aktív foglalásod van</div>
              <DropCountdown targetDate={reservation.expires_at} compact label="Fizetésig" />
              <Button className="w-full" onClick={() => navigate("/checkout")}>Fizetéshez</Button>
            </div>
          )}

          {/* Már jelentkeztél */}
          {entry && !entry.is_winner && drop.status !== "drawn" && (
            <div className="text-center p-4 border">
              <div className="text-2xl mb-2">✅</div>
              <div className="font-bold">Már jelentkeztél</div>
              <div className="text-sm text-muted-foreground">A húzás után értesítünk emailben.</div>
            </div>
          )}

          {/* Nyertes! */}
          {entry?.is_winner && !entry.checkout_completed_at && (
            <div className="border-2 border-primary bg-primary/10 p-4 space-y-3">
              <div className="text-center">
                <Trophy className="h-10 w-10 mx-auto text-primary" />
                <div className="text-2xl font-black mt-2">NYERTÉL! 🏆</div>
                <div className="text-sm text-muted-foreground">#{entry.winner_position} nyertes</div>
              </div>
              {entry.checkout_deadline && <DropCountdown targetDate={entry.checkout_deadline} label="Fizetési határidő" onExpire={loadAll} />}
              <Button className="w-full" onClick={() => reserveSlot()}>Fizetéshez</Button>
            </div>
          )}

          {/* Nem nyert */}
          {entry && !entry.is_winner && drop.status === "drawn" && (
            <div className="text-center p-4 border">
              <div className="text-2xl mb-2">😢</div>
              <div className="font-bold">Sajnos most nem nyertél</div>
              <div className="text-sm text-muted-foreground">Legközelebb más szerencse!</div>
            </div>
          )}

          {(drop.status === "sold_out" || drop.status === "closed") && !reservation && (
            <div className="text-center p-4 border">
              <div className="text-2xl mb-2">🚫</div>
              <div className="font-bold">{drop.status === "sold_out" ? "Elkelt" : "A drop lezárt"}</div>
              <Button variant="outline" className="mt-3" onClick={subscribe}>Értesíts a következőről</Button>
            </div>
          )}

          {drop.require_captcha && (
            <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Bot-védelemmel védett drop
            </p>
          )}
        </Card>
      </div>
    </Layout>
  );
}

function mapError(msg?: string): string {
  const m: Record<string, string> = {
    drop_not_open: "A drop most nem elérhető",
    sold_out: "Elkelt — sajnos elfogyott",
    max_per_user_reached: "Már foglaltad a maximum darabszámot",
    captcha_failed: "Bot-védelmi ellenőrzés sikertelen",
    suspicious_activity: "Gyanús aktivitás — blokkolva",
    too_many_entries_from_ip: "Túl sok próbálkozás egy hálózatból",
    already_entered: "Már jelentkeztél erre a raffle-re",
    wrong_drop_type: "Ez nem first-come drop",
    entry_window_closed: "A jelentkezési időszak lezárult",
  };
  return m[msg ?? ""] ?? msg ?? "Ismeretlen hiba";
}

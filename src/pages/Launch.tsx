import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import LaunchHero from "@/components/LaunchHero";
import PreorderShowcase from "@/components/PreorderShowcase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Rocket, Calendar, ShoppingCart, Users, Vote, Sparkles, Lock, Mail, Check, Share2, Flame, AlertTriangle } from "lucide-react";

interface LaunchProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url: string | null;
  launch_status: "live" | "coming_soon" | "pre_order" | "waitlist";
  launch_date: string | null;
  teaser_image_url: string | null;
  teaser_description: string | null;
  preorder_enabled: boolean;
  preorder_deposit_percent: number;
  preorder_limit: number | null;
  preorder_count: number;
  waitlist_count: number;
  is_sneak_peek: boolean;
  poll_votes: number;
  share_count?: number;
  early_access_enabled?: boolean;
  early_access_top_n?: number;
}

const Countdown = ({ date }: { date: string }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, new Date(date).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="flex gap-2 font-mono text-xs">
      {[["NAP", d], ["ÓRA", h], ["PERC", m], ["MP", s]].map(([l, v]) => (
        <div key={l as string} className="border bg-background/80 backdrop-blur px-2 py-1 text-center min-w-[44px]">
          <div className="text-base font-bold">{String(v).padStart(2, "0")}</div>
          <div className="text-[8px] tracking-widest text-muted-foreground">{l}</div>
        </div>
      ))}
    </div>
  );
};

const LaunchCard = ({ product, onAction }: { product: LaunchProduct; onAction: () => void }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const blurred = product.launch_status === "coming_soon";
  const img = product.teaser_image_url || product.image_url;

  const handleAction = async (action: "preorder" | "waitlist" | "vote") => {
    if (!email || !email.includes("@")) {
      toast({ title: "Email kell", description: "Adj meg egy érvényes emailt.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (action === "preorder") {
        const deposit = (Number(product.price) * product.preorder_deposit_percent / 100) * qty;
        const { error } = await supabase.from("product_preorders").insert({
          product_id: product.id, customer_email: email, customer_name: name,
          quantity: qty, deposit_amount: deposit, total_amount: Number(product.price) * qty,
          status: "pending",
        });
        if (error) throw error;
        toast({ title: "Előrendelés rögzítve!", description: `Foglaló: ${deposit.toLocaleString()} Ft. Hamarosan emailt küldünk.` });
      } else if (action === "waitlist") {
        const { error } = await supabase.from("product_waitlist").insert({
          product_id: product.id, email, name, source: "launch_page",
        });
        if (error) throw error;
        toast({ title: "Felvettünk a várólistára!", description: "Értesítünk amikor elérhető lesz." });
      } else {
        const { error } = await supabase.from("product_polls").insert({
          product_id: product.id, voter_email: email, comment: comment || null,
        });
        if (error) throw error;
        toast({ title: "Köszönjük a szavazatod!", description: "Hangod számít." });
      }
      setDone(true);
      onAction();
    } catch (e: any) {
      toast({
        title: "Hiba",
        description: e.message?.includes("duplicate") ? "Már regisztráltál ezzel az emaillel." : e.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const STATUS_BADGE: Record<string, { label: string; cls: string; icon: any }> = {
    coming_soon: { label: "Hamarosan", cls: "bg-blue-500 text-white", icon: Calendar },
    pre_order: { label: "Előrendelhető", cls: "bg-accent text-accent-foreground", icon: ShoppingCart },
    waitlist: { label: "Várólista", cls: "bg-yellow-500 text-black", icon: Users },
    live: { label: "Élő", cls: "bg-green-500 text-white", icon: Check },
  };
  const badge = STATUS_BADGE[product.launch_status];
  const Icon = badge.icon;

  return (
    <div className="border bg-card group relative overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {img ? (
          <img src={img} alt={product.name} className={`w-full h-full object-cover transition-all duration-500 ${blurred ? "blur-md scale-110" : "group-hover:scale-105"}`} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <Lock className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${badge.cls}`}>
            <Icon className="h-3 w-3" /> {badge.label}
          </span>
          {product.is_sneak_peek && (
            <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-purple-500 text-white flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Sneak peek
            </span>
          )}
        </div>
        {product.launch_date && product.launch_status !== "live" && (
          <div className="absolute bottom-2 left-2 right-2">
            <Countdown date={product.launch_date} />
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div>
          <h3 className="text-sm font-bold">{product.name}</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{product.category}</p>
        </div>

        {product.teaser_description && (
          <p className="text-xs text-muted-foreground italic line-clamp-3">{product.teaser_description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          {product.preorder_count > 0 && <span>📦 {product.preorder_count} előrendelés</span>}
          {product.waitlist_count > 0 && <span>👥 {product.waitlist_count} várakozó</span>}
          {product.is_sneak_peek && <span>🗳 {product.poll_votes} szavazat</span>}
        </div>

        {!open && !done && (
          <div className="space-y-1">
            <Button size="sm" className="w-full rounded-none uppercase tracking-wider text-[10px] h-8" onClick={() => setOpen(true)}>
              {product.launch_status === "pre_order" && product.preorder_enabled ? `Előrendelés (${product.preorder_deposit_percent}% foglaló)` :
               product.launch_status === "waitlist" || product.launch_status === "coming_soon" ? "Feliratkozás várólistára" :
               "Szavazok rá"}
            </Button>
            <Link to={`/launch/${product.id}`} className="block text-center text-[10px] uppercase tracking-wider text-muted-foreground hover:text-accent py-1">
              Részletek · méretek · galéria →
            </Link>
          </div>
        )}

        {done && (
          <div className="space-y-2">
            <div className="text-center py-1 text-xs text-green-500 font-bold uppercase tracking-wider">
              <Check className="h-4 w-4 inline mr-1" /> Köszönjük!
            </div>
            <Button
              size="sm" variant="outline"
              className="w-full rounded-none uppercase tracking-wider text-[10px] h-8"
              onClick={async () => {
                const url = `${window.location.origin}/launch?ref=${product.id}`;
                const text = `Nézd meg: ${product.name} hamarosan érkezik! 🔥`;
                if (navigator.share) {
                  try { await navigator.share({ title: product.name, text, url }); } catch {}
                } else {
                  await navigator.clipboard.writeText(`${text}\n${url}`);
                  toast({ title: "Link másolva!", description: "Oszd meg és kerülj előbbre a várólistán!" });
                }
              }}
            >
              <Share2 className="h-3 w-3 mr-1" /> Megosztás (3 share = 1 hely előrébb)
            </Button>
          </div>
        )}

        {open && !done && (
          <div className="space-y-2 pt-2 border-t">
            <Input placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} className="rounded-none text-xs h-8" />
            <Input placeholder="Név (opcionális)" value={name} onChange={e => setName(e.target.value)} className="rounded-none text-xs h-8" />

            {product.launch_status === "pre_order" && product.preorder_enabled && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider">Mennyiség:</span>
                  <Input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} className="rounded-none text-xs h-8 w-20" />
                </div>
                <div className="text-[11px] bg-accent/10 border border-accent/30 p-2">
                  <div>Teljes ár: <strong>{(Number(product.price) * qty).toLocaleString()} Ft</strong></div>
                  <div>Foglaló most: <strong className="text-accent">{(Number(product.price) * qty * product.preorder_deposit_percent / 100).toLocaleString()} Ft</strong></div>
                </div>
                <Button size="sm" className="w-full rounded-none uppercase tracking-wider text-[10px] h-8" disabled={submitting} onClick={() => handleAction("preorder")}>
                  <ShoppingCart className="h-3 w-3 mr-1" /> Előrendelés rögzítése
                </Button>
              </>
            )}

            {(product.launch_status === "waitlist" || product.launch_status === "coming_soon") && !product.is_sneak_peek && (
              <Button size="sm" className="w-full rounded-none uppercase tracking-wider text-[10px] h-8" disabled={submitting} onClick={() => handleAction("waitlist")}>
                <Mail className="h-3 w-3 mr-1" /> Értesítést kérek
              </Button>
            )}

            {product.is_sneak_peek && (
              <>
                <Textarea placeholder="Megjegyzés (opcionális)" value={comment} onChange={e => setComment(e.target.value)} className="rounded-none text-xs" rows={2} />
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" className="rounded-none uppercase tracking-wider text-[10px] h-8" disabled={submitting} onClick={() => handleAction("waitlist")}>
                    <Mail className="h-3 w-3 mr-1" /> Várólista
                  </Button>
                  <Button size="sm" className="rounded-none uppercase tracking-wider text-[10px] h-8" disabled={submitting} onClick={() => handleAction("vote")}>
                    <Vote className="h-3 w-3 mr-1" /> Szavazok
                  </Button>
                </div>
              </>
            )}

            <button onClick={() => setOpen(false)} className="w-full text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider">Mégse</button>
          </div>
        )}
      </div>
    </div>
  );
};

const Launch = () => {
  const [products, setProducts] = useState<LaunchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "coming_soon" | "pre_order" | "waitlist" | "sneak_peek">("all");

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shop_products")
      .select("id, name, category, price, image_url, launch_status, launch_date, teaser_image_url, teaser_description, preorder_enabled, preorder_deposit_percent, preorder_limit, preorder_count, waitlist_count, is_sneak_peek, poll_votes")
      .neq("launch_status", "live")
      .eq("is_active", true)
      .order("launch_date", { ascending: true, nullsFirst: false });
    setProducts((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = products.filter(p => {
    if (filter === "all") return true;
    if (filter === "sneak_peek") return p.is_sneak_peek;
    return p.launch_status === filter;
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <LaunchHero />
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent/30 bg-accent/5 text-accent text-[10px] font-bold uppercase tracking-widest">
            <Rocket className="h-3 w-3" /> Launch Center
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Hamarosan érkező különlegességek</h1>
          <p className="text-sm text-muted-foreground">
            Légy te az első! Előrendelés foglalóval, várólista early access-szel, vagy szavazz a következő drop-ra.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { key: "all", label: "Minden launch" },
            { key: "coming_soon", label: "Hamarosan" },
            { key: "pre_order", label: "Előrendelhető" },
            { key: "waitlist", label: "Várólista" },
            { key: "sneak_peek", label: "Sneak peek (szavazás)" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                filter === f.key ? "border-accent text-accent bg-accent/10" : "text-muted-foreground hover:text-foreground border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square border bg-muted/30 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Rocket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Még nincs launch termék ebben a kategóriában.</p>
            <Link to="/shop" className="text-xs text-accent uppercase tracking-wider mt-3 inline-block">Nézd meg az élő boltot →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(p => <LaunchCard key={p.id} product={p} onAction={fetchProducts} />)}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Launch;

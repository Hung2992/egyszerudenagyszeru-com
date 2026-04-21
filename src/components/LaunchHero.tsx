import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Rocket, Mail, Users, Flame } from "lucide-react";

interface FeaturedProduct {
  id: string;
  name: string;
  category: string;
  launch_date: string | null;
  teaser_image_url: string | null;
  image_url: string | null;
  teaser_description: string | null;
  preorder_count: number;
  waitlist_count: number;
}

const Counter = ({ date }: { date: string }) => {
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
    <div className="flex gap-3 justify-center">
      {[["NAP", d], ["ÓRA", h], ["PERC", m], ["MP", s]].map(([l, v]) => (
        <div key={l as string} className="bg-background/90 backdrop-blur border border-accent/30 px-4 py-3 text-center min-w-[70px]">
          <div className="text-3xl font-bold tabular-nums">{String(v).padStart(2, "0")}</div>
          <div className="text-[10px] tracking-widest text-muted-foreground mt-1">{l}</div>
        </div>
      ))}
    </div>
  );
};

const LaunchHero = () => {
  const [featured, setFeatured] = useState<FeaturedProduct | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [totalSubs, setTotalSubs] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("shop_products")
        .select("id, name, category, launch_date, teaser_image_url, image_url, teaser_description, preorder_count, waitlist_count")
        .neq("launch_status", "live")
        .eq("is_active", true)
        .or("featured_launch.eq.true,launch_status.eq.coming_soon")
        .order("featured_launch", { ascending: false })
        .order("launch_date", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      setFeatured(data as any);

      const { count } = await supabase
        .from("launch_subscribers")
        .select("id", { count: "exact", head: true });
      setTotalSubs(count || 0);
    })();
  }, []);

  const subscribe = async () => {
    if (!email.includes("@")) {
      toast({ title: "Adj meg egy érvényes emailt", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("launch_subscribers").insert({
      email: email.trim().toLowerCase(),
      source: "hero",
      interested_product_id: featured?.id || null,
    });
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
      setTotalSubs(s => s + 1);
      toast({ title: "Feliratkoztál! 🔥", description: "Elsőként szólunk a nyitásnál." });
    }
    setSubmitting(false);
  };

  if (!featured) return null;

  const img = featured.teaser_image_url || featured.image_url;

  return (
    <div className="relative overflow-hidden border bg-gradient-to-br from-background via-background to-accent/5 p-6 md:p-10">
      {img && (
        <div className="absolute inset-0 opacity-20">
          <img src={img} alt="" className="w-full h-full object-cover blur-2xl scale-110" />
        </div>
      )}
      <div className="relative space-y-6 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent/40 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest">
          <Flame className="h-3 w-3" /> Hamarosan • Limitált • Kiemelt drop
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{featured.category}</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{featured.name}</h2>
          {featured.teaser_description && (
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto italic">{featured.teaser_description}</p>
          )}
        </div>

        {featured.launch_date && <Counter date={featured.launch_date} />}

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> <strong className="text-foreground">{totalSubs}</strong> feliratkozó</span>
          {featured.waitlist_count > 0 && <span>👥 <strong className="text-foreground">{featured.waitlist_count}</strong> várakozó</span>}
          {featured.preorder_count > 0 && <span>📦 <strong className="text-foreground">{featured.preorder_count}</strong> előrendelés</span>}
        </div>

        {!done ? (
          <div className="max-w-md mx-auto space-y-2">
            <p className="text-xs text-muted-foreground">Légy te az első, aki értesül a nyitásról + 10% kedvezmény az első rendelésre</p>
            <div className="flex gap-2">
              <Input
                placeholder="email@cimed.hu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-none h-11 text-sm"
                onKeyDown={e => e.key === "Enter" && subscribe()}
              />
              <Button onClick={subscribe} disabled={submitting} className="rounded-none h-11 uppercase tracking-wider text-xs">
                <Mail className="h-4 w-4 mr-1" /> Feliratkozom
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-accent font-bold uppercase tracking-wider">
            <Rocket className="h-4 w-4 inline mr-1" /> Elsőként szólunk a drop-nál!
          </div>
        )}
      </div>
    </div>
  );
};

export default LaunchHero;

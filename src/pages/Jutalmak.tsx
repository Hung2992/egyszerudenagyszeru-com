// Jutalmak - Gamification oldal (napi bejelentkezés, küldetések, jelvények)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useGamification } from "@/hooks/useGamification";
import { Trophy, Flame, Star, Check, Zap, Award, Calendar, Eye, Heart, Share2, ShoppingBag, Ruler, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Quest {
  key: string;
  title: string;
  description: string;
  xp_reward: number;
  points_reward: number;
  icon: string | null;
}

interface Completion {
  quest_key: string;
  completed_date: string;
}

interface Badge {
  key: string;
  title: string;
  description: string;
  icon: any;
  requirement: (data: any) => boolean;
}

const ICON_MAP: Record<string, any> = {
  calendar: Calendar,
  eye: Eye,
  heart: Heart,
  star: Star,
  share: Share2,
  "shopping-bag": ShoppingBag,
  ruler: Ruler,
};

const ALL_BADGES: Badge[] = [
  { key: "first_login", title: "Üdv nálunk!", description: "Első bejelentkezés", icon: Star,
    requirement: (d) => (d.total_xp || 0) > 0 },
  { key: "streak_3", title: "3 napos streak", description: "3 egymást követő napon jelentkeztél be", icon: Flame,
    requirement: (d) => (d.longest_streak || 0) >= 3 },
  { key: "streak_7", title: "Egy hét!", description: "7 napos streak", icon: Flame,
    requirement: (d) => (d.longest_streak || 0) >= 7 },
  { key: "streak_30", title: "Igazi hűséges", description: "30 napos streak", icon: Trophy,
    requirement: (d) => (d.longest_streak || 0) >= 30 },
  { key: "level_5", title: "Kezdő fejlesztő", description: "Elérted az 5-ös szintet", icon: Zap,
    requirement: (d) => (d.level || 1) >= 5 },
  { key: "level_10", title: "Rutinos", description: "Elérted a 10-es szintet", icon: Zap,
    requirement: (d) => (d.level || 1) >= 10 },
  { key: "level_25", title: "Elit", description: "Elérted a 25-ös szintet", icon: Award,
    requirement: (d) => (d.level || 1) >= 25 },
  { key: "xp_500", title: "500 XP", description: "Gyűjts össze 500 XP-t", icon: Star,
    requirement: (d) => (d.total_xp || 0) >= 500 },
  { key: "xp_2000", title: "2000 XP", description: "Gyűjts össze 2000 XP-t", icon: Trophy,
    requirement: (d) => (d.total_xp || 0) >= 2000 },
];

const JutalmakPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<Set<string>>(new Set());
  const { state, awardXp, reload } = useGamification(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth");
      else setUserId(data.user.id);
    });
  }, [navigate]);

  useEffect(() => {
    (async () => {
      const { data: q } = await (supabase.from("daily_quests" as any) as any)
        .select("*").eq("active", true).order("sort_order");
      setQuests(q || []);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const { data } = await (supabase.from("quest_completions" as any) as any)
        .select("quest_key, completed_date").eq("user_id", userId).eq("completed_date", today);
      setCompletions(data || []);
      const { data: badges } = await (supabase.from("user_badges" as any) as any)
        .select("badge_key").eq("user_id", userId);
      setUnlockedBadges(new Set((badges || []).map((b: any) => b.badge_key)));
    })();
  }, [userId, state?.total_xp]);

  // Auto-check and unlock badges
  useEffect(() => {
    if (!userId || !state) return;
    (async () => {
      for (const b of ALL_BADGES) {
        if (!unlockedBadges.has(b.key) && b.requirement(state)) {
          await (supabase.from("user_badges" as any) as any).insert({
            user_id: userId, badge_key: b.key,
          }).then(() => {
            toast({ title: `🏆 Új jelvény: ${b.title}!`, description: b.description });
          }, () => {});
        }
      }
    })();
  }, [state, userId, unlockedBadges]);

  const isDone = (key: string) => completions.some(c => c.quest_key === key);

  const claim = async (q: Quest) => {
    if (isDone(q.key)) return;
    const result = await awardXp(q.key, q.xp_reward);
    if (result.success) {
      toast({
        title: `+${q.xp_reward} XP!`,
        description: result.levelUp ? `🎉 Szintet léptél! Új szint: ${result.newLevel}` : q.title,
      });
      setCompletions(prev => [...prev, { quest_key: q.key, completed_date: new Date().toISOString().slice(0, 10) }]);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-widest">Jutalmak</h1>
          <p className="text-sm text-muted-foreground">Napi küldetések, szintek és jelvények</p>
        </div>

        {/* SZINT / XP */}
        {state && (
          <div className="border border-foreground bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Jelenlegi szint</p>
                <p className="text-4xl font-bold">{state.level}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Összes XP</p>
                <p className="text-2xl font-bold text-accent">{state.total_xp}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] uppercase tracking-wider mb-1">
                <span>{state.xp} / 100 XP</span>
                <span className="text-muted-foreground">{state.xp_to_next} XP a következő szintig</span>
              </div>
              <div className="w-full h-2 bg-muted overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${state.progress_percent}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-lg font-bold leading-none">{state.streak_days}</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">napos streak</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-6">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold leading-none">{state.longest_streak}</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">leghosszabb</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KÜLDETÉSEK */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest">Napi küldetések</h2>
          <div className="space-y-2">
            {quests.map(q => {
              const done = isDone(q.key);
              const Icon = ICON_MAP[q.icon || ""] || Star;
              return (
                <div key={q.key} className={`border p-4 flex items-center gap-3 ${done ? "border-accent bg-accent/5" : "border-border bg-card"}`}>
                  <div className={`w-10 h-10 flex items-center justify-center border ${done ? "border-accent bg-accent text-accent-foreground" : "border-foreground"}`}>
                    {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{q.title}</p>
                    <p className="text-[11px] text-muted-foreground">{q.description}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs font-bold text-accent">+{q.xp_reward} XP</p>
                    {q.points_reward > 0 && <p className="text-[10px] text-muted-foreground">+{q.points_reward} pont</p>}
                    {!done && q.key !== "daily_login" && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-none uppercase" onClick={() => claim(q)}>
                        Igénylés
                      </Button>
                    )}
                    {done && <span className="text-[10px] text-accent uppercase tracking-wider">✓ Kész</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* JELVÉNYEK */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest">Jelvények ({unlockedBadges.size}/{ALL_BADGES.length})</h2>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {ALL_BADGES.map(b => {
              const unlocked = unlockedBadges.has(b.key);
              const Icon = b.icon;
              return (
                <div key={b.key} className={`border p-3 text-center space-y-2 ${unlocked ? "border-accent bg-accent/5" : "border-border bg-card opacity-40"}`}>
                  <div className={`w-10 h-10 mx-auto flex items-center justify-center border ${unlocked ? "border-accent" : "border-muted"}`}>
                    {unlocked ? <Icon className="w-5 h-5 text-accent" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider">{b.title}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{b.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="pt-4 border-t border-border text-center">
          <Button variant="outline" onClick={() => navigate("/loyalty")} className="rounded-none uppercase text-xs">
            Hűségprogram megtekintése
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default JutalmakPage;

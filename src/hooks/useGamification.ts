// Gamification hook - XP hozzáadás, streak kezelés
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";

const XP_PER_LEVEL = 100;

export interface GamiState {
  level: number;
  xp: number;
  total_xp: number;
  xp_to_next: number;
  progress_percent: number;
  streak_days: number;
  longest_streak: number;
}

export const useGamification = (userId?: string | null) => {
  const [state, setState] = useState<GamiState | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await (supabase.from("user_gamification" as any) as any)
      .select("*").eq("user_id", userId).maybeSingle();
    if (data) {
      const xp_to_next = XP_PER_LEVEL - (data.xp || 0);
      setState({
        level: data.level || 1,
        xp: data.xp || 0,
        total_xp: data.total_xp || 0,
        xp_to_next,
        progress_percent: ((data.xp || 0) / XP_PER_LEVEL) * 100,
        streak_days: data.streak_days || 0,
        longest_streak: data.longest_streak || 0,
      });
    } else {
      setState({ level: 1, xp: 0, total_xp: 0, xp_to_next: XP_PER_LEVEL, progress_percent: 0, streak_days: 0, longest_streak: 0 });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Napi bejelentkezés kezelés - streak & login quest
  useEffect(() => {
    if (!userId) return;
    const key = `edn_daily_login_${userId}`;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(key) === today) return;

    (async () => {
      const { data: cur } = await (supabase.from("user_gamification" as any) as any)
        .select("*").eq("user_id", userId).maybeSingle();

      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let newStreak = 1;
      let newLongest = cur?.longest_streak || 0;
      if (cur?.last_login_date === yesterday) {
        newStreak = (cur.streak_days || 0) + 1;
      }
      if (newStreak > newLongest) newLongest = newStreak;

      // insert quest completion (napi bejelentkezés)
      await (supabase.from("quest_completions" as any) as any).insert({
        user_id: userId,
        quest_key: "daily_login",
        completed_date: today,
        xp_earned: 10,
      });

      const newXp = (cur?.xp || 0) + 10;
      const newTotal = (cur?.total_xp || 0) + 10;
      const levelUp = newXp >= XP_PER_LEVEL;
      const finalLevel = levelUp ? (cur?.level || 1) + 1 : (cur?.level || 1);
      const finalXp = levelUp ? newXp - XP_PER_LEVEL : newXp;

      await (supabase.from("user_gamification" as any) as any).upsert({
        user_id: userId,
        level: finalLevel,
        xp: finalXp,
        total_xp: newTotal,
        streak_days: newStreak,
        longest_streak: newLongest,
        last_login_date: today,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      localStorage.setItem(key, today);
      load();
    })();
  }, [userId, load]);

  const awardXp = useCallback(async (questKey: string, xp: number) => {
    if (!userId) return { success: false };
    const today = new Date().toISOString().slice(0, 10);

    // check already done today
    const { data: existing } = await (supabase.from("quest_completions" as any) as any)
      .select("id").eq("user_id", userId).eq("quest_key", questKey).eq("completed_date", today).maybeSingle();
    if (existing) return { success: false, alreadyDone: true };

    await (supabase.from("quest_completions" as any) as any).insert({
      user_id: userId, quest_key: questKey, completed_date: today, xp_earned: xp,
    });

    const { data: cur } = await (supabase.from("user_gamification" as any) as any)
      .select("*").eq("user_id", userId).maybeSingle();

    const newXp = (cur?.xp || 0) + xp;
    const newTotal = (cur?.total_xp || 0) + xp;
    const levelUp = newXp >= XP_PER_LEVEL;
    const finalLevel = levelUp ? (cur?.level || 1) + 1 : (cur?.level || 1);
    const finalXp = levelUp ? newXp - XP_PER_LEVEL : newXp;

    await (supabase.from("user_gamification" as any) as any).upsert({
      user_id: userId,
      level: finalLevel,
      xp: finalXp,
      total_xp: newTotal,
      streak_days: cur?.streak_days || 0,
      longest_streak: cur?.longest_streak || 0,
      last_login_date: cur?.last_login_date || today,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    load();
    return { success: true, levelUp, newLevel: finalLevel };
  }, [userId, load]);

  return { state, loading, awardXp, reload: load };
};

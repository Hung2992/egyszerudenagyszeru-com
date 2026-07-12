import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";

export type GiveawayStatus = {
  loading: boolean;
  /** Globally enabled by admin */
  isEnabled: boolean;
  /** Currently within the active window (or no window set) AND enabled */
  isActive: boolean;
  /** Active window has ended */
  hasEnded: boolean;
  /** Active window has not started yet */
  notStarted: boolean;
  startDate: Date | null;
  endDate: Date | null;
};

const DEFAULT: GiveawayStatus = {
  loading: true,
  isEnabled: false,
  isActive: false,
  hasEnded: false,
  notStarted: false,
  startDate: null,
  endDate: null,
};

const CACHE_KEY = "lovable:giveaway_settings_cache";

type CachedSettings = {
  is_enabled: boolean;
  start_date: string | null;
  end_date: string | null;
};

const readCache = (): CachedSettings | null => {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedSettings) : null;
  } catch {
    return null;
  }
};

const writeCache = (v: CachedSettings) => {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(v));
  } catch {
    /* noop */
  }
};

export const useGiveawayStatus = (): GiveawayStatus => {
  const [status, setStatus] = useState<GiveawayStatus>(DEFAULT);

  useEffect(() => {
    let cancelled = false;

    const compute = (
      isEnabled: boolean,
      startDate: Date | null,
      endDate: Date | null,
    ): GiveawayStatus => {
      const now = new Date();
      const notStarted = !!startDate && now < startDate;
      const hasEnded = !!endDate && now > endDate;
      const isActive = isEnabled && !notStarted && !hasEnded;
      return {
        loading: false,
        isEnabled,
        isActive,
        hasEnded,
        notStarted,
        startDate,
        endDate,
      };
    };

    const applySettings = (s: CachedSettings) => {
      const isEnabled = s.is_enabled ?? true;
      const startDate = s.start_date ? new Date(s.start_date) : null;
      const endDate = s.end_date ? new Date(s.end_date) : null;
      setStatus(compute(isEnabled, startDate, endDate));
    };

    // Warm from localStorage cache immediately (avoids UI flicker on flaky mobile networks)
    const cached = readCache();
    if (cached) applySettings(cached);

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("giveaway_settings")
          .select("is_enabled, start_date, end_date")
          .eq("id", 1)
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;

        const settings: CachedSettings = {
          is_enabled: data?.is_enabled ?? true,
          start_date: data?.start_date ?? null,
          end_date: data?.end_date ?? null,
        };
        writeCache(settings);
        applySettings(settings);
      } catch (err) {
        if (cancelled) return;
        console.warn("[giveaway] fetch failed, using cache/default", err);
        // If we already applied cache above, keep it. Otherwise fall back to safe default (disabled).
        if (!cached) {
          setStatus({ ...DEFAULT, loading: false });
        }
      }
    };

    load();

    // Re-evaluate every minute so countdown / end transitions automatically
    const interval = setInterval(() => {
      setStatus((prev) => {
        if (prev.loading) return prev;
        const now = new Date();
        const notStarted = !!prev.startDate && now < prev.startDate;
        const hasEnded = !!prev.endDate && now > prev.endDate;
        return {
          ...prev,
          notStarted,
          hasEnded,
          isActive: prev.isEnabled && !notStarted && !hasEnded,
        };
      });
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
};

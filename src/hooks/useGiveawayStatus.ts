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

    const load = async () => {
      const { data } = await supabase
        .from("giveaway_settings")
        .select("is_enabled, start_date, end_date")
        .eq("id", 1)
        .maybeSingle();

      if (cancelled) return;

      const isEnabled = data?.is_enabled ?? true;
      const startDate = data?.start_date ? new Date(data.start_date) : null;
      const endDate = data?.end_date ? new Date(data.end_date) : null;
      setStatus(compute(isEnabled, startDate, endDate));
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

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type PgEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimeSubscriptionOptions {
  /** Egyedi channel név. Ha ütközik, dev módban figyelmeztetést ír. */
  channel: string;
  /** Tábla neve a `public` sémában (vagy `schema.table` formában). */
  table: string;
  /** Alapérték: "*" — minden esemény. */
  event?: PgEvent;
  /** Postgres filter (pl. `partner_id=eq.${id}`). */
  filter?: string;
  /** Callback minden változásra. Instabil referencia is OK — ref-be van fogva. */
  onChange: (payload: any) => void;
  /** Ha false, a hook nem iratkozik fel. Hasznos feltételes indításhoz. */
  enabled?: boolean;
  /** Extra deps a channel újraépítéséhez (pl. filter érték). */
  deps?: ReadonlyArray<unknown>;
}

// Dev-only registry a dupla-feliratkozás gyors felismerésére.
const activeChannels = new Map<string, number>();

/**
 * Egységes, biztonságos Realtime feliratkozás Supabase `postgres_changes`-hez.
 *
 * - Cleanup: automatikusan `removeChannel` unmountkor / dep változáskor.
 * - Callback ref: az `onChange` friss verzióját mindig meghívja, nem építi újra a channelt.
 * - Duplikáció-védelem: dev módban warn, ha ugyanaz a `channel` név már aktív.
 */
export function useRealtimeSubscription({
  channel,
  table,
  event = "*",
  filter,
  onChange,
  enabled = true,
  deps = [],
}: RealtimeSubscriptionOptions): void {
  const cbRef = useRef(onChange);
  useEffect(() => { cbRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!enabled) return;

    const count = (activeChannels.get(channel) ?? 0) + 1;
    activeChannels.set(channel, count);
    if (count > 1 && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        `[realtime] Dupla channel név érzékelve: "${channel}" (${count} aktív). ` +
          `Használj egyedi nevet (pl. entity-id postfixszel).`,
      );
    }

    const ch: RealtimeChannel = supabase
      .channel(channel)
      .on(
        // @ts-expect-error - supabase types szűk stringet várnak, de futásidőben stringet fogad
        "postgres_changes",
        { event, schema: "public", table, ...(filter ? { filter } : {}) },
        (payload: any) => cbRef.current(payload),
      )
      .subscribe();

    return () => {
      const c = (activeChannels.get(channel) ?? 1) - 1;
      if (c <= 0) activeChannels.delete(channel);
      else activeChannels.set(channel, c);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, table, event, filter, enabled, ...deps]);
}

// Realtime sync health monitor: detects channel errors, timeouts, and stale subscriptions.
// Reports issues to admin_notifications + toast + console so sync problems surface immediately.
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";

export type RealtimeIssue =
  | "channel_error"
  | "channel_timeout"
  | "channel_closed_unexpectedly"
  | "stale_subscription"
  | "missed_events";

interface ReportArgs {
  issue: RealtimeIssue;
  channel: string;
  partnerId?: string | null;
  storefrontId?: string | null;
  details?: Record<string, unknown>;
}

const ISSUE_TITLES: Record<RealtimeIssue, string> = {
  channel_error: "Realtime csatorna hiba",
  channel_timeout: "Realtime csatorna timeout",
  channel_closed_unexpectedly: "Realtime csatorna váratlanul lezárult",
  stale_subscription: "Realtime feliratkozás elavult",
  missed_events: "Realtime eventek elmaradtak",
};

export const reportRealtimeIssue = async ({ issue, channel, partnerId, storefrontId, details }: ReportArgs) => {
  const title = ISSUE_TITLES[issue];
  const message = `Csatorna: ${channel}${partnerId ? ` • Partner: ${partnerId}` : ""}${storefrontId ? ` • Storefront: ${storefrontId}` : ""}`;
  // 1. Browser console (developer visibility)
  console.warn(`[realtime-sync] ${title}`, { channel, partnerId, storefrontId, details });
  // 2. User toast (immediate awareness)
  toast({
    title,
    description: "Próbáljuk újra szinkronizálni — frissítsd az oldalt, ha az adatok nem jönnek meg.",
    variant: "destructive",
  });
  // 3. Persist to admin_notifications (admin/dev review)
  try {
    await supabase.from("admin_notifications").insert({
      type: "realtime_sync_error",
      title,
      message,
      data: {
        issue,
        channel,
        partner_id: partnerId ?? null,
        storefront_id: storefrontId ?? null,
        details: details ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        url: typeof window !== "undefined" ? window.location.href : null,
        ts: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("[realtime-sync] could not persist issue", e);
  }
};

/** Wrap supabase channel .subscribe() callback to capture status transitions. */
export const wrapSubscribeStatus = (
  channel: string,
  partnerId?: string | null,
  storefrontId?: string | null,
) => {
  return (status: string, err?: unknown) => {
    if (status === "CHANNEL_ERROR") {
      void reportRealtimeIssue({ issue: "channel_error", channel, partnerId, storefrontId, details: { err: String(err ?? "") } });
    } else if (status === "TIMED_OUT") {
      void reportRealtimeIssue({ issue: "channel_timeout", channel, partnerId, storefrontId });
    } else if (status === "CLOSED") {
      // Closed mid-session (not on unmount) → log
      void reportRealtimeIssue({ issue: "channel_closed_unexpectedly", channel, partnerId, storefrontId });
    }
  };
};

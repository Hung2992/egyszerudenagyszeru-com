import { supabase } from "@/integrations/supabase/untyped-client";

export type RecoveryEvent =
  | "link_opened"
  | "page_view"
  | "save_success"
  | "save_error"
  | "token_invalid"
  | "token_expired"
  | "new_link_requested";

const SESSION_KEY = "pwd_recovery_session";

export function getRecoverySessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `${Date.now()}`;
  }
}

export async function logRecoveryEvent(
  event_type: RecoveryEvent,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabase.from("password_recovery_events").insert({
      event_type,
      session_id: getRecoverySessionId(),
      metadata,
    });
  } catch (e) {
    console.warn("recovery analytics failed", e);
  }
}

export function classifyTokenError(message?: string | null): "token_expired" | "token_invalid" {
  const m = (message || "").toLowerCase();
  if (m.includes("expired")) return "token_expired";
  return "token_invalid";
}

// AI eseménykövetés helper - fire-and-forget, sose blokkol
import { supabase } from "@/integrations/supabase/untyped-client";

export type AiEventType =
  | "assistant_open"
  | "assistant_message"
  | "assistant_recommend"
  | "assistant_product_click"
  | "cart_suggestion_shown"
  | "cart_suggestion_click"
  | "cart_suggestion_added"
  | "cart_suggestion_purchased"
  | "marketing_campaign_generated"
  | "marketing_segment_generated";

const SESSION_KEY = "edn-ai-session";

const getSessionId = (): string => {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `s_${Date.now()}`;
  }
};

export const trackAiEvent = async (
  eventType: AiEventType,
  source: string,
  metadata: Record<string, any> = {},
  productId?: string
): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await (supabase.from("ai_events" as any) as any).insert({
      user_id: userData?.user?.id || null,
      session_id: getSessionId(),
      event_type: eventType,
      source,
      product_id: productId || null,
      metadata,
    });
  } catch {
    // silent - analytics never blocks UX
  }
};

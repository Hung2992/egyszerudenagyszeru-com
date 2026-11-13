// Minden AI-ügynök, amelynek hívásait az AEGIS felügyeli (Edge Function nevek).
export const AEGIS_AGENTS = [
  "admin-ai-assistant", "ai-bulk-ingest", "ai-knowledge-consolidate", "ai-knowledge-consolidate-cron", "ai-knowledge-process",
  "ai-marketing-auto", "ai-marketing-ceo", "ai-meta-learn", "ai-product-studio", "ai-self-learn", "ai-self-reflect",
  "ai-studio-generate-bg", "ai-studio-health-check", "ai-studio-render", "ar-commerce-optimizer", "ar-style-recommend",
  "detect-order-fraud", "drop-ai-analyze", "drop-copilot", "fashion-stylist", "partner-acquisition-agent", "partner-action-engine",
  "partner-ai-marketing", "partner-business-advisor", "partner-business-pulse", "partner-campaign-plan", "partner-command-router",
  "partner-design-command", "partner-fulfillment-center", "partner-product-builder", "partner-recruitment-agent",
  "partner-section-redesign", "partner-site-builder", "partner-web-agent", "partner-workflow-engine", "personal-home",
  "price-negotiate", "product-embed", "scrape-product", "shopping-assistant", "tts-clone-voice-v2", "virtual-tryon",
  "visual-search", "voice-transcribe", "voice-tts",
] as const;

export type AgentState = "active" | "paused" | "isolated" | "revoked" | "killed";
export const STATE_LABEL: Record<AgentState, string> = {
  active: "Aktív", paused: "Szüneteltetve", isolated: "Elkülönítve", revoked: "Jogosultság visszavonva", killed: "Leállítva",
};
/** Leállított ügynök csak részletes (min. 20 karakteres) indoklással indítható újra; minden váltáshoz min. 5 karakter kell. */
export function reasonOk(from: AgentState, to: AgentState, reason: string): boolean {
  const n = reason.trim().length;
  if (n < 5) return false;
  return !(from === "killed" && to === "active" && n < 20);
}

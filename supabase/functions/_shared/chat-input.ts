// Normalises caller-supplied chat history: only user/assistant turns, bounded size.
// Callers can never inject system/tool messages that override server instructions.
export function sanitizeChatMessages(
  raw: unknown,
  opts: { maxMessages?: number; maxChars?: number } = {},
): { role: "user" | "assistant"; content: string }[] {
  const maxMessages = opts.maxMessages ?? 20;
  const maxChars = opts.maxChars ?? 2000;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, maxChars) }))
    .filter((m) => m.content.trim().length > 0)
    .slice(-maxMessages);
}

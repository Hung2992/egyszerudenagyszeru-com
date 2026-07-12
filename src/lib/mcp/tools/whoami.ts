import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "whoami",
  title: "Ki vagyok bejelentkezve",
  description: "Visszaadja a hívó fél felhasználói azonosítóját és email címét.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Nem vagy bejelentkezve." }], isError: true };
    }
    const info = {
      userId: ctx.getUserId(),
      email: ctx.getUserEmail(),
      clientId: ctx.getClientId(),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(info) }],
      structuredContent: info,
    };
  },
});

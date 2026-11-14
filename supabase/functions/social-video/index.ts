// Admin-only TikTok video drafts for contractual software rental posts.
// Generates a vertical clip, stores it in the private social-videos bucket and
// returns a short-lived signed link. Never publishes anything.
import { installAiMeter } from "../_shared/ai-meter.ts";
installAiMeter("social-video");
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { downloadVideo, generateVideo, getVideo, GatewayError } from "npm:@lovable.dev/ai-gateway@0.1.11";
import { z } from "npm:zod@3";
import type {} from "../_shared/generated-gateway/models.d.ts";

const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), topic: z.string().min(3).max(120), text: z.string().min(10).max(800) }),
  z.object({ action: z.literal("status"), id: z.string().regex(/^[A-Za-z0-9_\-:.]{4,200}$/) }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: c } = await db.auth.getClaims(auth.slice(7));
    const uid = c?.claims?.sub;
    if (!uid) return j({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await db.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return j({ error: "Admin access required" }, 403);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return j({ error: "Érvénytelen kérés" }, 400);
    const body = parsed.data;

    if (body.action === "start") {
      const prompt = `Vertical 9:16 short social video, sleek dark minimalist look, black background with gold accents. A small business owner in a modern Hungarian office calmly managing their whole business from one software dashboard on a laptop and phone: orders, calendar, customers and finances flow together. Smooth camera moves, warm confident mood, no readable text, no logos, no prices, no on-screen words. Theme: ${body.topic}. Context: ${body.text.replace(/https?:\/\/\S+/g, "").slice(0, 400)}`;
      const job = await generateVideo({ model: "google/gemini-omni-1.1-flash", input: prompt, response_format: { type: "video", aspect_ratio: "9:16", duration: "8s", resolution: "720p" } });
      return j({ id: job.id, status: job.status, progress: job.progress });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const path = `${body.id.replace(/[^A-Za-z0-9_\-]/g, "_")}.mp4`;
    const sign = async () => {
      const { data, error } = await admin.storage.from("social-videos").createSignedUrl(path, 7 * 86400);
      return error ? null : data.signedUrl;
    };
    const existing = await sign();
    if (existing) return j({ id: body.id, status: "completed", progress: 100, url: existing });
    // deno-lint-ignore no-explicit-any
    const job = await getVideo(body.id) as any;
    if (job?.status === "failed") return j({ id: body.id, status: "failed", error: job?.error?.message ?? "A videó nem készült el." });
    if (job?.status !== "completed") return j({ id: body.id, status: job?.status ?? "in_progress", progress: job?.progress ?? 0 });
    const bin = await downloadVideo(body.id);
    const bytes = new Uint8Array(await (await bin.blob()).arrayBuffer());
    const up = await admin.storage.from("social-videos").upload(path, bytes, { contentType: "video/mp4", upsert: false });
    if (up.error && !/exists/i.test(up.error.message)) return j({ error: up.error.message }, 500);
    return j({ id: body.id, status: "completed", progress: 100, url: await sign() });
  } catch (e) {
    if (e instanceof GatewayError) { console.error("social-video gateway", e.code, e.httpStatus, e.message); return j({ error: e.message, code: e.code }, e.httpStatus ?? 502); }
    console.error("social-video", (e as Error).message);
    return j({ error: "A videókészítés sikertelen." }, 500);
  }
});

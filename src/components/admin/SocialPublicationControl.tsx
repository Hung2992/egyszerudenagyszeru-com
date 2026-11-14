import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, FlaskConical, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Event = { id: string; event_type: string; created_at: string; platform: string; payload: { content?: string; rendered_content?: string; executor?: string; result?: string; reason?: string; test_only?: boolean; external_calls?: number } };
const labels: Record<string, string> = { approved: "Jóváhagyva", publication_attempt: "Publikálási kísérlet", test_publication_attempt: "Tesztpublikálási kísérlet", cancelled: "Visszavonva", provider_confirmed: "Szolgáltató visszaigazolta", provider_accepted: "Szolgáltató átvette", execution_claimed: "Végrehajtás lefoglalva" };

export default function SocialPublicationControl({ onCreated }: { onCreated: () => void }) {
  const [uid, setUid] = useState<string | null>(null);
  const [testPermission, setTestPermission] = useState(false);
  const [livePermission, setLivePermission] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user?.id;
    if (!id) return;
    setUid(id);
    const [permissions, log] = await Promise.all([
      supabase.from("social_publish_permissions").select("mode,revoked_at").eq("user_id", id),
      supabase.from("social_publish_events").select("id,event_type,created_at,platform,payload").order("created_at", { ascending: false }).limit(100),
    ]);
    if (permissions.error || log.error) { toast.error(permissions.error?.message ?? log.error?.message); return; }
    setTestPermission(permissions.data?.some(p => p.mode === "test" && !p.revoked_at) ?? false);
    setLivePermission(permissions.data?.some(p => p.mode === "live" && !p.revoked_at) ?? false);
    setEvents(log.data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const permission = async (mode: "test" | "live", enabled: boolean) => {
    if (!uid || !window.confirm(`${enabled ? "Engedélyezed" : "Visszavonod"} a saját ${mode === "test" ? "teszt" : "éles"} publikálási jogosultságodat?`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("social_set_permission", { _user: uid, _mode: mode, _enabled: enabled });
    setBusy(false);
    if (error) toast.error(error.message); else await load();
  };
  const create = async () => {
    if (!content.trim()) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("social-publisher", { body: { action: "enqueue", platform: "facebook", media_type: "text", content: content.trim(), test_only: true } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setContent(""); onCreated(); await load(); toast.success("Teszttervezet létrehozva");
  };
  return <div className="space-y-6">
    <section className="border-b border-border pb-5 space-y-3">
      <h2 className="font-display text-xl flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Publikálási engedélyek</h2>
      <p className="text-sm text-muted-foreground">Saját fiók · Teszt: {testPermission ? "engedélyezve" : "tiltva"} · Éles: {livePermission ? "engedélyezve" : "tiltva"}</p>
      <div className="flex flex-wrap gap-2"><Button disabled={busy} variant="outline" onClick={() => void permission("test", !testPermission)}>Tesztengedély {testPermission ? "visszavonása" : "megadása"}</Button><Button disabled={busy} variant="outline" onClick={() => void permission("live", !livePermission)}>Éles engedély {livePermission ? "visszavonása" : "megadása"}</Button></div>
    </section>
    <section className="space-y-3"><h2 className="font-display text-xl flex items-center gap-2"><FlaskConical className="h-5 w-5" />Közzététel nélküli teszt</h2><Textarea aria-label="Tesztbejegyzés tartalma" value={content} onChange={e => setContent(e.target.value)} /><Button disabled={busy || !content.trim()} onClick={() => void create()}>Teszttervezet létrehozása</Button></section>
    <section className="space-y-3"><div className="flex justify-between gap-2 items-center"><h2 className="font-display text-xl">Jóváhagyási és publikálási napló</h2><Button variant="ghost" size="icon" title="Napló frissítése" aria-label="Napló frissítése" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button></div>
      {events.map(event => <article key={event.id} className="border-b border-border py-4 space-y-2"><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><time>{new Date(event.created_at).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })}</time><span>{event.platform}</span><span>{event.payload.test_only ? "TESZT" : "ÉLES"}</span></div><h3 className="font-display">{labels[event.event_type] ?? event.event_type}</h3><p className="text-sm whitespace-pre-wrap break-words">{event.payload.rendered_content ?? event.payload.content ?? "Korábbi esemény · tartalompillanatkép nem áll rendelkezésre"}</p><p className="text-xs text-muted-foreground break-all">Végrehajtó: {event.payload.executor ?? "Korábbi esemény · nincs rögzítve"}</p>{(event.payload.result || event.payload.reason) && <p className="text-xs">Eredmény: {event.payload.result ?? event.payload.reason}{event.payload.external_calls === 0 ? " · 0 külső hívás" : ""}</p>}</article>)}
    </section>
  </div>;
}
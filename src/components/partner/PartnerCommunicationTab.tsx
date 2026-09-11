import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import PartnerGatewayPanel from "./PartnerGatewayPanel";
import PartnerCommSurvey from "./PartnerCommSurvey";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_min: number;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
};

type Hook = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
};

type UsageRow = {
  day: string;
  channel: string;
  provider: string | null;
  sent_count: number;
  failed_count: number;
  cost_total: number;
};

type EventRow = {
  id: string;
  event: string;
  channel: string | null;
  provider: string | null;
  created_at: string;
};

const EVENTS = ["message.sent", "message.delivered", "message.failed"];

function randomKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "apex_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function PartnerCommunicationTab({ partnerId }: { partnerId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [keyName, setKeyName] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [k, w, u, e] = await Promise.all([
      supabase.from("comm_api_keys").select("id, name, key_prefix, scopes, rate_limit_per_min, active, last_used_at, created_at")
        .eq("partner_id", partnerId).order("created_at", { ascending: false }),
      supabase.from("comm_webhooks").select("id, url, events, active, created_at")
        .eq("partner_id", partnerId).order("created_at", { ascending: false }),
      supabase.from("comm_usage").select("day, channel, provider, sent_count, failed_count, cost_total")
        .eq("partner_id", partnerId).order("day", { ascending: false }).limit(30),
      supabase.from("comm_events").select("id, event, channel, provider, created_at")
        .eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(30),
    ]);
    setKeys((k.data as ApiKey[]) || []);
    setHooks((w.data as Hook[]) || []);
    setUsage((u.data as UsageRow[]) || []);
    setEvents((e.data as EventRow[]) || []);
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const createKey = async () => {
    if (!keyName.trim()) return toast.error("Adj nevet a kulcsnak");
    setBusy(true);
    const raw = randomKey();
    const { error } = await supabase.from("comm_api_keys").insert({
      partner_id: partnerId,
      name: keyName.trim().slice(0, 60),
      key_prefix: raw.slice(0, 12),
      key_hash: await sha256Hex(raw),
    });
    setBusy(false);
    if (error) return toast.error("Nem sikerült létrehozni a kulcsot");
    setNewKey(raw);
    setKeyName("");
    toast.success("Kulcs létrehozva – most másold ki, később nem jelenik meg újra");
    void load();
  };

  const toggleKey = async (id: string, active: boolean) => {
    await supabase.from("comm_api_keys").update({ active, revoked_at: active ? null : new Date().toISOString() }).eq("id", id);
    void load();
  };

  const createHook = async () => {
    if (!/^https:\/\/.+/.test(hookUrl.trim())) return toast.error("Csak https címet fogadunk el");
    setBusy(true);
    const secret = randomKey().replace("apex_", "whsec_");
    const { error } = await supabase.from("comm_webhooks").insert({
      partner_id: partnerId,
      url: hookUrl.trim().slice(0, 500),
      secret,
      events: EVENTS,
    });
    setBusy(false);
    if (error) return toast.error("Nem sikerült menteni a webhookot");
    setNewSecret(secret);
    setHookUrl("");
    toast.success("Webhook mentve");
    void load();
  };

  const removeHook = async (id: string) => {
    await supabase.from("comm_webhooks").delete().eq("id", id);
    void load();
  };

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apex-comm-api/messages`;

  return (
    <div className="space-y-4">
      <PartnerGatewayPanel partnerId={partnerId} />
      <PartnerCommSurvey partnerId={partnerId} />

      <Card className="rounded-none">
        <CardHeader><CardTitle className="text-base">API kulcsok</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input className="rounded-none" placeholder="Kulcs neve (pl. Webshop értesítések)"
              value={keyName} onChange={(e) => setKeyName(e.target.value)} />
            <Button className="rounded-none" disabled={busy} onClick={createKey}>Új kulcs</Button>
          </div>
          {newKey && (
            <div className="border border-primary/40 bg-muted/40 p-3 text-xs break-all">
              <p className="font-medium mb-1">Az új kulcsod (csak most látható):</p>
              <code>{newKey}</code>
            </div>
          )}
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 border p-2 text-sm">
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground break-all">{k.key_prefix}… · {k.rate_limit_per_min} üzenet/perc</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={k.active ? "default" : "secondary"} className="rounded-none">
                    {k.active ? "aktív" : "letiltva"}
                  </Badge>
                  <Button size="sm" variant="outline" className="rounded-none"
                    onClick={() => toggleKey(k.id, !k.active)}>
                    {k.active ? "Letiltás" : "Bekapcsolás"}
                  </Button>
                </div>
              </div>
            ))}
            {keys.length === 0 && <p className="text-sm text-muted-foreground">Még nincs kulcsod.</p>}
          </div>
          <div className="border p-3 text-xs bg-muted/30 space-y-1">
            <p className="font-medium">Küldés a saját rendszeredből:</p>
            <code className="block break-all">POST {apiUrl}</code>
            <code className="block break-all">X-API-Key: a kulcsod</code>
            <code className="block break-all">{`{"channel":"sms","to":"+36301234567","body":"Úton a csomagod"}`}</code>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader><CardTitle className="text-base">Webhookok (kézbesítési visszajelzés)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input className="rounded-none" placeholder="https://sajatoldalam.hu/apex-webhook"
              value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} />
            <Button className="rounded-none" disabled={busy} onClick={createHook}>Hozzáadás</Button>
          </div>
          {newSecret && (
            <div className="border border-primary/40 bg-muted/40 p-3 text-xs break-all">
              <p className="font-medium mb-1">Aláíró titok (X-Apex-Signature ellenőrzéshez):</p>
              <code>{newSecret}</code>
            </div>
          )}
          {hooks.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 border p-2 text-sm">
              <div className="break-all">
                <p>{h.url}</p>
                <p className="text-xs text-muted-foreground">{h.events.join(", ")}</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-none" onClick={() => removeHook(h.id)}>Törlés</Button>
            </div>
          ))}
          {hooks.length === 0 && <p className="text-sm text-muted-foreground">Még nincs webhook.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-none">
          <CardHeader><CardTitle className="text-base">Felhasználás</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {usage.map((u, i) => (
              <div key={i} className="flex justify-between border-b py-1">
                <span>{u.day} · {u.channel}</span>
                <span className="text-muted-foreground">{u.sent_count} kiment / {u.failed_count} hibás</span>
              </div>
            ))}
            {usage.length === 0 && <p className="text-muted-foreground">Még nincs forgalom.</p>}
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader><CardTitle className="text-base">Napló</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {events.map((e) => (
              <div key={e.id} className="flex justify-between border-b py-1">
                <span>{e.event}</span>
                <span className="text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("hu-HU", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            {events.length === 0 && <p className="text-muted-foreground">Még nincs esemény.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

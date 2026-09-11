import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Account = {
  id: string;
  label: string;
  driver: string;
  channels: string[];
  endpoint: string | null;
  default_sender: string | null;
  active: boolean;
  last_ok_at: string | null;
  last_error: string | null;
  credentials_set: boolean;
};

type Sender = {
  id: string;
  channel: string;
  sender: string;
  label: string | null;
  active: boolean;
};

const DRIVERS = [
  { value: "twilio", label: "Twilio fiók" },
  { value: "gatewayapi", label: "GatewayAPI (SMS)" },
  { value: "http_generic", label: "Saját HTTP átjáró" },
];

const CHANNEL_LABEL: Record<string, string> = { sms: "SMS", whatsapp: "WhatsApp", voice: "Hívás" };

export default function PartnerGatewayPanel({ partnerId }: { partnerId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [busy, setBusy] = useState(false);

  const [label, setLabel] = useState("");
  const [driver, setDriver] = useState("gatewayapi");
  const [channels, setChannels] = useState<string[]>(["sms"]);
  const [endpoint, setEndpoint] = useState("");
  const [defaultSender, setDefaultSender] = useState("");
  const [credA, setCredA] = useState("");
  const [credB, setCredB] = useState("");

  const [senderChannel, setSenderChannel] = useState("sms");
  const [senderValue, setSenderValue] = useState("");
  const [senderLabel, setSenderLabel] = useState("");

  const [testChannel, setTestChannel] = useState("sms");
  const [testTo, setTestTo] = useState("");
  const [testBody, setTestBody] = useState("Teszt üzenet a saját átjárónkból.");

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("apex-gateway", { body });
    if (error) throw error;
    return data as Record<string, unknown>;
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await call({ action: "list_accounts" });
      setAccounts((res.accounts as Account[]) || []);
    } catch {
      setAccounts([]);
    }
    const { data } = await supabase
      .from("comm_sender_numbers")
      .select("id, channel, sender, label, active")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });
    setSenders((data as Sender[]) || []);
  }, [call, partnerId]);

  useEffect(() => { void load(); }, [load]);

  const credentialFields = () => {
    if (driver === "twilio") return { a: "Account SID", b: "Auth token" };
    if (driver === "gatewayapi") return { a: "API token", b: "" };
    return { a: "Fejléc neve (pl. Authorization)", b: "Fejléc értéke" };
  };

  const saveAccount = async () => {
    if (!label.trim()) return toast.error("Adj nevet a szolgáltatónak");
    const credentials: Record<string, string> = {};
    if (driver === "twilio") {
      if (!credA.trim() || !credB.trim()) return toast.error("Add meg a Twilio azonosítókat");
      credentials.account_sid = credA.trim();
      credentials.auth_token = credB.trim();
    } else if (driver === "gatewayapi") {
      if (!credA.trim()) return toast.error("Add meg az API tokent");
      credentials.api_token = credA.trim();
    } else {
      if (!endpoint.trim()) return toast.error("Add meg a saját átjáród címét");
      if (credA.trim()) { credentials.auth_header = credA.trim(); credentials.auth_value = credB.trim(); }
    }
    setBusy(true);
    try {
      await call({
        action: "save_account",
        label: label.trim(),
        driver,
        channels,
        endpoint: endpoint.trim() || null,
        default_sender: defaultSender.trim() || null,
        credentials,
      });
      toast.success("Szolgáltató mentve");
      setLabel(""); setEndpoint(""); setDefaultSender(""); setCredA(""); setCredB("");
      void load();
    } catch {
      toast.error("Nem sikerült menteni a szolgáltatót");
    }
    setBusy(false);
  };

  const removeAccount = async (id: string) => {
    try {
      await call({ action: "delete_account", id });
      toast.success("Törölve");
      void load();
    } catch {
      toast.error("Nem sikerült törölni");
    }
  };

  const addSender = async () => {
    if (!senderValue.trim()) return toast.error("Add meg a számot vagy feladónevet");
    const { error } = await supabase.from("comm_sender_numbers").insert({
      partner_id: partnerId,
      channel: senderChannel,
      sender: senderValue.trim().slice(0, 40),
      label: senderLabel.trim() || null,
    });
    if (error) return toast.error("Nem sikerült menteni");
    setSenderValue(""); setSenderLabel("");
    toast.success("Feladó mentve");
    void load();
  };

  const removeSender = async (id: string) => {
    await supabase.from("comm_sender_numbers").delete().eq("id", id);
    void load();
  };

  const sendTest = async () => {
    if (!/^\+?[0-9]{6,20}$/.test(testTo.replace(/\s/g, ""))) return toast.error("Érvénytelen telefonszám");
    setBusy(true);
    try {
      const res = await call({
        action: "test",
        channel: testChannel,
        to: testTo.replace(/\s/g, ""),
        body: testBody.slice(0, 500),
      });
      if (res.status === "sent") toast.success(`Kiment a(z) ${res.provider} szolgáltatón keresztül`);
      else if (res.status === "no_provider") toast.error("Nincs bekötött szolgáltató – add hozzá fent");
      else toast.error(`Sikertelen: ${String(res.error ?? "")}`.slice(0, 120));
      void load();
    } catch {
      toast.error("A küldés nem sikerült");
    }
    setBusy(false);
  };

  const fields = credentialFields();

  return (
    <div className="space-y-4">
      <Card className="rounded-none">
        <CardHeader><CardTitle className="text-base">Saját átjáró – szolgáltatók</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input className="rounded-none" placeholder="Megnevezés (pl. Fő SMS szolgáltató)"
              value={label} onChange={(e) => setLabel(e.target.value)} />
            <Select value={driver} onValueChange={setDriver}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DRIVERS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className="rounded-none" placeholder={fields.a} value={credA} onChange={(e) => setCredA(e.target.value)} />
            {fields.b && (
              <Input className="rounded-none" type="password" placeholder={fields.b}
                value={credB} onChange={(e) => setCredB(e.target.value)} />
            )}
            <Input className="rounded-none" placeholder="Végpont (saját átjáróhoz, https://…)"
              value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
            <Input className="rounded-none" placeholder="Alap feladó (szám vagy név)"
              value={defaultSender} onChange={(e) => setDefaultSender(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {["sms", "whatsapp", "voice"].map((c) => (
              <Button key={c} type="button" size="sm" className="rounded-none"
                variant={channels.includes(c) ? "default" : "outline"}
                onClick={() => setChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}>
                {CHANNEL_LABEL[c]}
              </Button>
            ))}
            <Button className="rounded-none ml-auto" disabled={busy} onClick={saveAccount}>Mentés</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A hozzáférési adatokat titkosítva tároljuk, utólag senki nem tudja visszaolvasni őket.
          </p>

          <div className="space-y-2">
            {accounts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border p-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{a.label}</p>
                  <p className="text-xs text-muted-foreground break-all">
                    {a.driver} · {a.channels.map((c) => CHANNEL_LABEL[c] ?? c).join(", ")}
                    {a.default_sender ? ` · feladó: ${a.default_sender}` : ""}
                  </p>
                  {a.last_error && <p className="text-xs text-destructive break-all">Hiba: {a.last_error}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.active ? "default" : "secondary"} className="rounded-none">
                    {a.last_ok_at ? "működik" : a.active ? "aktív" : "kikapcsolva"}
                  </Badge>
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => removeAccount(a.id)}>Törlés</Button>
                </div>
              </div>
            ))}
            {accounts.length === 0 && <p className="text-sm text-muted-foreground">Még nincs saját szolgáltatód bekötve.</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader><CardTitle className="text-base">Saját SMS / WhatsApp számok</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={senderChannel} onValueChange={setSenderChannel}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CHANNEL_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className="rounded-none" placeholder="+3630… vagy feladónév"
              value={senderValue} onChange={(e) => setSenderValue(e.target.value)} />
            <Input className="rounded-none" placeholder="Megnevezés (nem kötelező)"
              value={senderLabel} onChange={(e) => setSenderLabel(e.target.value)} />
          </div>
          <Button className="rounded-none" onClick={addSender}>Feladó hozzáadása</Button>
          <div className="space-y-2">
            {senders.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 border p-2 text-sm">
                <span>{CHANNEL_LABEL[s.channel] ?? s.channel} · {s.sender}{s.label ? ` (${s.label})` : ""}</span>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => removeSender(s.id)}>Törlés</Button>
              </div>
            ))}
            {senders.length === 0 && <p className="text-sm text-muted-foreground">Még nincs saját feladószámod.</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader><CardTitle className="text-base">Értesítés küldése ügyfélnek</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={testChannel} onValueChange={setTestChannel}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CHANNEL_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className="rounded-none sm:col-span-2" placeholder="+36301234567"
              value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          </div>
          <Textarea className="rounded-none" rows={3} value={testBody} onChange={(e) => setTestBody(e.target.value)} />
          <Button className="rounded-none" disabled={busy} onClick={sendTest}>Küldés</Button>
        </CardContent>
      </Card>
    </div>
  );
}

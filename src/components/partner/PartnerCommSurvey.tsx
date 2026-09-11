import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const PROVIDERS = [
  { value: "twilio", label: "Twilio (SMS, WhatsApp, hívás)" },
  { value: "gatewayapi", label: "GatewayAPI (SMS)" },
  { value: "http_generic", label: "Saját / egyéb szolgáltató" },
  { value: "undecided", label: "Még nem tudom – kérek segítséget" },
];

const CHANNELS = [
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "voice", label: "Telefonhívás" },
  { value: "email", label: "E-mail" },
];

const MESSAGE_TYPES = [
  { value: "order_confirm", label: "Rendelés visszaigazolás" },
  { value: "shipping", label: "Csomag feladva / úton" },
  { value: "booking", label: "Időpont visszaigazolás és emlékeztető" },
  { value: "marketing", label: "Akciók, hírlevél" },
  { value: "otp", label: "Belépési kód (OTP)" },
  { value: "support", label: "Ügyfélszolgálati válasz" },
];

const VOLUMES = ["0-100 / hó", "100-1000 / hó", "1000-10000 / hó", "10000+ / hó"];

type Survey = {
  preferred_provider: string | null;
  account_owner: string | null;
  sms_sender: string | null;
  whatsapp_sender: string | null;
  channels: string[];
  message_types: string[];
  monthly_volume: string | null;
  notes: string | null;
  status: string;
  updated_at: string | null;
};

export default function PartnerCommSurvey({ partnerId }: { partnerId: string }) {
  const [provider, setProvider] = useState("twilio");
  const [owner, setOwner] = useState("");
  const [smsSender, setSmsSender] = useState("");
  const [waSender, setWaSender] = useState("");
  const [channels, setChannels] = useState<string[]>(["sms"]);
  const [types, setTypes] = useState<string[]>(["order_confirm"]);
  const [volume, setVolume] = useState(VOLUMES[0]);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<Survey | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("partner_comm_survey")
      .select("preferred_provider, account_owner, sms_sender, whatsapp_sender, channels, message_types, monthly_volume, notes, status, updated_at")
      .eq("partner_id", partnerId)
      .maybeSingle();
    const row = data as Survey | null;
    if (row) {
      setSaved(row);
      setProvider(row.preferred_provider || "twilio");
      setOwner(row.account_owner || "");
      setSmsSender(row.sms_sender || "");
      setWaSender(row.whatsapp_sender || "");
      setChannels(row.channels?.length ? row.channels : ["sms"]);
      setTypes(row.message_types?.length ? row.message_types : []);
      setVolume(row.monthly_volume || VOLUMES[0]);
      setNotes(row.notes || "");
    }
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const submit = async () => {
    if (!channels.length) return toast.error("Válassz legalább egy csatornát");
    setBusy(true);
    const { error } = await supabase.from("partner_comm_survey").upsert(
      {
        partner_id: partnerId,
        preferred_provider: provider,
        account_owner: owner.trim().slice(0, 120) || null,
        sms_sender: smsSender.trim().slice(0, 40) || null,
        whatsapp_sender: waSender.trim().slice(0, 40) || null,
        channels,
        message_types: types,
        monthly_volume: volume,
        notes: notes.trim().slice(0, 1000) || null,
        status: "submitted",
      },
      { onConflict: "partner_id" },
    );
    setBusy(false);
    if (error) return toast.error("Nem sikerült elküldeni: " + error.message);
    toast.success("Köszönjük! A válaszaidat rögzítettük.");
    void load();
  };

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle className="text-base">Kérdőív – melyik fiókodat kössük be?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {saved && (
          <Badge variant="secondary" className="rounded-none">
            Kitöltve{saved.updated_at ? ` · ${new Date(saved.updated_at).toLocaleString("hu-HU")}` : ""}
          </Badge>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">1. Melyik szolgáltató fiókját szeretnéd bekötni?</p>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="rounded-none" placeholder="Kinek a nevén van a fiók? (cég vagy személy)"
            value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">2. Milyen feladószámot használnál?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input className="rounded-none" placeholder="SMS feladó (+3630… vagy név)"
              value={smsSender} onChange={(e) => setSmsSender(e.target.value)} />
            <Input className="rounded-none" placeholder="WhatsApp szám (+3630…)"
              value={waSender} onChange={(e) => setWaSender(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">3. Mely csatornákon üzennél?</p>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <Button key={c.value} type="button" size="sm" className="rounded-none"
                variant={channels.includes(c.value) ? "default" : "outline"}
                onClick={() => toggle(channels, setChannels, c.value)}>
                {c.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">4. Milyen üzeneteket küldenél?</p>
          <div className="flex flex-wrap gap-2">
            {MESSAGE_TYPES.map((t) => (
              <Button key={t.value} type="button" size="sm" className="rounded-none"
                variant={types.includes(t.value) ? "default" : "outline"}
                onClick={() => toggle(types, setTypes, t.value)}>
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">5. Havonta körülbelül hány üzenet?</p>
          <Select value={volume} onValueChange={setVolume}>
            <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VOLUMES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Textarea className="rounded-none" rows={3} placeholder="Bármi egyéb, amit tudnunk kell"
          value={notes} onChange={(e) => setNotes(e.target.value)} />

        <Button className="rounded-none" disabled={busy} onClick={submit}>
          {saved ? "Válaszok frissítése" : "Kérdőív elküldése"}
        </Button>
        <p className="text-xs text-muted-foreground">
          A válaszaidat csak te és a platform csapata látja. A tényleges belépési adatokat sosem ide,
          hanem a fenti titkosított szolgáltató-űrlapba írd be.
        </p>
      </CardContent>
    </Card>
  );
}

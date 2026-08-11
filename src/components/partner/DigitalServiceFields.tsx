// Digitális termék és szolgáltatás specifikus mezők a partner termékszerkesztőhöz.
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadPartnerMedia } from "@/lib/partner-storage";
import { toast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface Props {
  fulfillment: "physical" | "digital" | "service";
  partnerId: string;
  attributes: Record<string, any>;
  setAttributes: (a: Record<string, any>) => void;
}

const DigitalServiceFields = ({ fulfillment, partnerId, attributes, setAttributes }: Props) => {
  const [uploading, setUploading] = useState(false);
  const set = (k: string, v: any) => setAttributes({ ...attributes, [k]: v });

  if (fulfillment === "physical") return null;

  const uploadFile = async (file: File) => {
    setUploading(true);
    const path = await uploadPartnerMedia("partner-product-images", partnerId, file);
    setUploading(false);
    if (!path) { toast({ title: "Feltöltés sikertelen", variant: "destructive" }); return; }
    set("digital_files", [...(attributes.digital_files || []), { path, name: file.name, size: file.size }]);
  };

  if (fulfillment === "digital") {
    const delivery = attributes.digital_delivery || "file";
    return (
      <div className="border border-foreground/20 p-3 space-y-3">
        <Label className="text-sm font-bold uppercase tracking-wider">Digitális termék beállítások</Label>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Kézbesítés módja</Label>
            <Select value={delivery} onValueChange={(v) => set("digital_delivery", v)}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="file">Letölthető fájl</SelectItem>
                <SelectItem value="link">Külső hozzáférési link</SelectItem>
                <SelectItem value="license">Licenckulcs / kód</SelectItem>
                <SelectItem value="email">Kézi e-mailes kiküldés</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Fájlformátum</Label>
            <Input className="rounded-none" value={attributes.digital_format || ""} onChange={(e) => set("digital_format", e.target.value)} placeholder="pl. PDF, MP3, ZIP" />
          </div>
        </div>

        {delivery === "file" && (
          <div>
            <Label className="text-xs">Fájlok feltöltése</Label>
            <Input type="file" multiple className="rounded-none" disabled={uploading}
              onChange={(e) => { const fs = e.target.files; if (fs) Array.from(fs).forEach((f) => void uploadFile(f)); }} />
            {uploading && <div className="text-xs text-muted-foreground mt-1">Feltöltés…</div>}
            <div className="space-y-1 mt-2">
              {(attributes.digital_files || []).map((f: any, i: number) => (
                <div key={i} className="flex items-center justify-between border border-foreground/20 px-2 py-1 text-xs">
                  <span className="truncate">{f.name} · {Math.round((f.size || 0) / 1024)} KB</span>
                  <button type="button" onClick={() => set("digital_files", (attributes.digital_files || []).filter((_: any, x: number) => x !== i))}>
                    <X className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {delivery === "link" && (
          <div>
            <Label className="text-xs">Hozzáférési URL</Label>
            <Input className="rounded-none" value={attributes.digital_url || ""} onChange={(e) => set("digital_url", e.target.value)} placeholder="https://…" />
          </div>
        )}

        {delivery === "license" && (
          <div>
            <Label className="text-xs">Licenckulcsok (soronként egy)</Label>
            <Textarea className="rounded-none" rows={4} value={attributes.digital_licenses || ""} onChange={(e) => set("digital_licenses", e.target.value)} placeholder="ABCD-1234-EFGH" />
            <p className="text-[10px] text-muted-foreground mt-1">A készlet a beírt kulcsok számával egyezzen meg.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Hozzáférés (nap)</Label>
            <Input type="number" className="rounded-none" value={attributes.access_days || ""} onChange={(e) => set("access_days", e.target.value)} placeholder="üres = örök" />
          </div>
          <div>
            <Label className="text-xs">Letöltési limit</Label>
            <Input type="number" className="rounded-none" value={attributes.download_limit || ""} onChange={(e) => set("download_limit", e.target.value)} placeholder="pl. 3" />
          </div>
          <div>
            <Label className="text-xs">Előfizetés</Label>
            <div className="flex items-center gap-2 h-10">
              <Switch checked={!!attributes.is_subscription} onCheckedChange={(v) => set("is_subscription", v)} />
              <span className="text-xs text-muted-foreground">{attributes.is_subscription ? "Igen" : "Nem"}</span>
            </div>
          </div>
        </div>

        {attributes.is_subscription && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Számlázási ciklus</Label>
              <Select value={attributes.billing_interval || "month"} onValueChange={(v) => set("billing_interval", v)}>
                <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Heti</SelectItem>
                  <SelectItem value="month">Havi</SelectItem>
                  <SelectItem value="year">Éves</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Próbaidőszak (nap)</Label>
              <Input type="number" className="rounded-none" value={attributes.trial_days || ""} onChange={(e) => set("trial_days", e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs">Licencfeltételek / felhasználási jog</Label>
          <Textarea className="rounded-none" rows={2} value={attributes.license_terms || ""} onChange={(e) => set("license_terms", e.target.value)} placeholder="pl. személyes használatra, tovább nem értékesíthető" />
        </div>
      </div>
    );
  }

  // Szolgáltatás
  return (
    <div className="border border-foreground/20 p-3 space-y-3">
      <Label className="text-sm font-bold uppercase tracking-wider">Szolgáltatás beállítások</Label>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Elszámolás</Label>
          <Select value={attributes.pricing_unit || "fixed"} onValueChange={(v) => set("pricing_unit", v)}>
            <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fix ár / alkalom</SelectItem>
              <SelectItem value="hour">Óradíj</SelectItem>
              <SelectItem value="day">Napidíj</SelectItem>
              <SelectItem value="project">Projekt alapú</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Időtartam (perc)</Label>
          <Input type="number" className="rounded-none" value={attributes.duration_min || ""} onChange={(e) => set("duration_min", e.target.value)} placeholder="pl. 60" />
        </div>
        <div>
          <Label className="text-xs">Vállalási idő</Label>
          <Input className="rounded-none" value={attributes.lead_time || ""} onChange={(e) => set("lead_time", e.target.value)} placeholder="pl. 2–3 munkanap" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Teljesítés helye</Label>
          <Select value={attributes.service_location || "online"} onValueChange={(v) => set("service_location", v)}>
            <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="onsite">Ügyfélnél (kiszállás)</SelectItem>
              <SelectItem value="shop">Saját telephelyen</SelectItem>
              <SelectItem value="hybrid">Vegyes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Ellátott terület</Label>
          <Input className="rounded-none" value={attributes.service_area || ""} onChange={(e) => set("service_area", e.target.value)} placeholder="pl. Budapest + 50 km" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Napi kapacitás (foglalás)</Label>
          <Input type="number" className="rounded-none" value={attributes.daily_capacity || ""} onChange={(e) => set("daily_capacity", e.target.value)} placeholder="pl. 4" />
        </div>
        <div>
          <Label className="text-xs">Foglalási link (opcionális)</Label>
          <Input className="rounded-none" value={attributes.booking_url || ""} onChange={(e) => set("booking_url", e.target.value)} placeholder="https://…" />
        </div>
      </div>

      <div>
        <Label className="text-xs">Elérhetőség / nyitvatartás</Label>
        <Input className="rounded-none" value={attributes.availability || ""} onChange={(e) => set("availability", e.target.value)} placeholder="pl. H–P 9:00–17:00" />
      </div>

      <div>
        <Label className="text-xs">Mit tartalmaz a szolgáltatás</Label>
        <Textarea className="rounded-none" rows={2} value={attributes.service_includes || ""} onChange={(e) => set("service_includes", e.target.value)} placeholder="pl. felmérés, kivitelezés, 1 kör javítás" />
      </div>

      <div>
        <Label className="text-xs">Lemondási feltételek</Label>
        <Textarea className="rounded-none" rows={2} value={attributes.cancellation_policy || ""} onChange={(e) => set("cancellation_policy", e.target.value)} placeholder="pl. 24 órán belüli lemondás díjköteles" />
      </div>
    </div>
  );
};

export default DigitalServiceFields;

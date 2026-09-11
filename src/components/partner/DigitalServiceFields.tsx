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
  fulfillment: "physical" | "digital" | "course" | "service";
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

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Verzió</Label>
            <Input className="rounded-none" value={attributes.digital_version || ""} onChange={(e) => set("digital_version", e.target.value)} placeholder="pl. 2.1" />
          </div>
          <div>
            <Label className="text-xs">Nyelv</Label>
            <Input className="rounded-none" value={attributes.language || ""} onChange={(e) => set("language", e.target.value)} placeholder="pl. magyar" />
          </div>
          <div>
            <Label className="text-xs">Fájlméret</Label>
            <Input className="rounded-none" value={attributes.file_size || ""} onChange={(e) => set("file_size", e.target.value)} placeholder="pl. 240 MB" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Ingyenes minta / demó link</Label>
            <Input className="rounded-none" value={attributes.demo_url || ""} onChange={(e) => set("demo_url", e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <Label className="text-xs">Eszközkorlát (hány gépen)</Label>
            <Input type="number" className="rounded-none" value={attributes.device_limit || ""} onChange={(e) => set("device_limit", e.target.value)} placeholder="pl. 2" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2">
            <Switch checked={!!attributes.free_updates} onCheckedChange={(v) => set("free_updates", v)} />
            <span className="text-xs">Ingyenes frissítések</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!attributes.watermark} onCheckedChange={(v) => set("watermark", v)} />
            <span className="text-xs">Vízjel a fájlon</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!attributes.commercial_use} onCheckedChange={(v) => set("commercial_use", v)} />
            <span className="text-xs">Üzleti felhasználás</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Támogatás időtartama</Label>
            <Input className="rounded-none" value={attributes.support_period || ""} onChange={(e) => set("support_period", e.target.value)} placeholder="pl. 6 hónap e-mail support" />
          </div>
          <div>
            <Label className="text-xs">Pénzvisszafizetési garancia</Label>
            <Input className="rounded-none" value={attributes.refund_policy || ""} onChange={(e) => set("refund_policy", e.target.value)} placeholder="pl. 14 nap" />
          </div>
        </div>

        <div>
          <Label className="text-xs">Rendszerkövetelmények</Label>
          <Textarea className="rounded-none" rows={2} value={attributes.requirements || ""} onChange={(e) => set("requirements", e.target.value)} placeholder="pl. Windows 10+, 8 GB RAM" />
        </div>
      </div>
    );
  }

  if (fulfillment === "course") {
    const lessons: any[] = attributes.lessons || [];
    const setLessons = (l: any[]) => setAttributes({ ...attributes, lessons: l, lesson_count: l.length });
    return (
      <div className="border border-foreground/20 p-3 space-y-3">
        <Label className="text-sm font-bold uppercase tracking-wider">Kurzus beállítások</Label>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Forma</Label>
            <Select value={attributes.course_mode || "online"} onValueChange={(v) => set("course_mode", v)}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online, saját tempó</SelectItem>
                <SelectItem value="live">Élő online</SelectItem>
                <SelectItem value="onsite">Személyes jelenlét</SelectItem>
                <SelectItem value="hybrid">Vegyes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Szint</Label>
            <Select value={attributes.course_level || "beginner"} onValueChange={(v) => set("course_level", v)}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Kezdő</SelectItem>
                <SelectItem value="intermediate">Haladó</SelectItem>
                <SelectItem value="advanced">Profi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Teljes hossz (perc)</Label>
            <Input type="number" className="rounded-none" value={attributes.course_minutes || ""} onChange={(e) => set("course_minutes", e.target.value)} placeholder="pl. 240" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Hozzáférés (nap)</Label>
            <Input type="number" className="rounded-none" value={attributes.access_days || ""} onChange={(e) => set("access_days", e.target.value)} placeholder="üres = örök" />
          </div>
          <div>
            <Label className="text-xs">Kezdés dátuma</Label>
            <Input type="date" className="rounded-none" value={attributes.course_start || ""} onChange={(e) => set("course_start", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Oklevél</Label>
            <div className="flex items-center gap-2 h-10">
              <Switch checked={!!attributes.certificate} onCheckedChange={(v) => set("certificate", v)} />
              <span className="text-xs text-muted-foreground">{attributes.certificate ? "Igen" : "Nem"}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Tananyag – modulok / leckék ({lessons.length})</Label>
            <button type="button" className="text-xs border border-foreground/20 px-2 py-1 hover:border-foreground"
              onClick={() => setLessons([...lessons, { title: "", module: "", minutes: "", free: false }])}>+ Lecke</button>
          </div>
          {lessons.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_80px_auto_auto] gap-1 items-center">
              <Input className="rounded-none" placeholder="Modul" value={l.module || ""}
                onChange={(e) => setLessons(lessons.map((x, ix) => ix === i ? { ...x, module: e.target.value } : x))} />
              <Input className="rounded-none" placeholder="Lecke címe" value={l.title || ""}
                onChange={(e) => setLessons(lessons.map((x, ix) => ix === i ? { ...x, title: e.target.value } : x))} />
              <Input type="number" className="rounded-none" placeholder="perc" value={l.minutes || ""}
                onChange={(e) => setLessons(lessons.map((x, ix) => ix === i ? { ...x, minutes: e.target.value } : x))} />
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Switch checked={!!l.free} onCheckedChange={(v) => setLessons(lessons.map((x, ix) => ix === i ? { ...x, free: v } : x))} />
                ingyenes
              </div>
              <button type="button" onClick={() => setLessons(lessons.filter((_, ix) => ix !== i))}>
                <X className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>

        <div>
          <Label className="text-xs">Tananyag fájlok (opcionális)</Label>
          <Input type="file" multiple className="rounded-none" disabled={uploading}
            onChange={(e) => { const fs = e.target.files; if (fs) Array.from(fs).forEach((f) => void uploadFile(f)); }} />
          <div className="space-y-1 mt-2">
            {(attributes.digital_files || []).map((f: any, i: number) => (
              <div key={i} className="flex items-center justify-between border border-foreground/20 px-2 py-1 text-xs">
                <span className="truncate">{f.name}</span>
                <button type="button" onClick={() => set("digital_files", (attributes.digital_files || []).filter((_: any, x: number) => x !== i))}>
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs">Kinek szól / előfeltételek</Label>
          <Textarea className="rounded-none" rows={2} value={attributes.course_audience || ""} onChange={(e) => set("course_audience", e.target.value)} placeholder="pl. kezdő webshop tulajdonosoknak, előismeret nem szükséges" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Max. létszám</Label>
            <Input type="number" className="rounded-none" value={attributes.max_students || ""} onChange={(e) => set("max_students", e.target.value)} placeholder="pl. 20" />
          </div>
          <div>
            <Label className="text-xs">Nyelv</Label>
            <Input className="rounded-none" value={attributes.language || ""} onChange={(e) => set("language", e.target.value)} placeholder="pl. magyar" />
          </div>
          <div>
            <Label className="text-xs">Oktató neve</Label>
            <Input className="rounded-none" value={attributes.instructor || ""} onChange={(e) => set("instructor", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Élő alkalmak (heti)</Label>
            <Input className="rounded-none" value={attributes.live_schedule || ""} onChange={(e) => set("live_schedule", e.target.value)} placeholder="pl. kedd 18:00" />
          </div>
          <div>
            <Label className="text-xs">Helyszín / platform</Label>
            <Input className="rounded-none" value={attributes.course_platform || ""} onChange={(e) => set("course_platform", e.target.value)} placeholder="pl. Zoom, Budapest" />
          </div>
          <div>
            <Label className="text-xs">Ütemezett kiadás (nap)</Label>
            <Input type="number" className="rounded-none" value={attributes.drip_days || ""} onChange={(e) => set("drip_days", e.target.value)} placeholder="0 = mind azonnal" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2">
            <Switch checked={!!attributes.community_access} onCheckedChange={(v) => set("community_access", v)} />
            <span className="text-xs">Zárt közösség</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!attributes.mentoring} onCheckedChange={(v) => set("mentoring", v)} />
            <span className="text-xs">1:1 konzultáció</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!attributes.lifetime_access} onCheckedChange={(v) => set("lifetime_access", v)} />
            <span className="text-xs">Örök hozzáférés</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Részletfizetés (hány részlet)</Label>
            <Input type="number" className="rounded-none" value={attributes.installments || ""} onChange={(e) => set("installments", e.target.value)} placeholder="pl. 3" />
          </div>
          <div>
            <Label className="text-xs">Pénzvisszafizetési garancia</Label>
            <Input className="rounded-none" value={attributes.refund_policy || ""} onChange={(e) => set("refund_policy", e.target.value)} placeholder="pl. 14 nap" />
          </div>
        </div>

        <div>
          <Label className="text-xs">Mit tanul meg a résztvevő (soronként egy)</Label>
          <Textarea className="rounded-none" rows={3} value={attributes.learning_outcomes || ""} onChange={(e) => set("learning_outcomes", e.target.value)} placeholder={"Saját webshop indítása\nTermékfotózás alapjai"} />
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

      <div className="border-t border-foreground/20 pt-3 space-y-3">
        <div className="flex items-center gap-2">
          <Switch checked={attributes.booking_enabled !== false} onCheckedChange={(v) => set("booking_enabled", v)} />
          <span className="text-xs font-bold uppercase tracking-wider">Időpontfoglalás a naptárban</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Munkanapok</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {["H", "K", "Sze", "Cs", "P", "Szo", "V"].map((d, i) => {
                const days: number[] = attributes.work_days || [1, 2, 3, 4, 5];
                const idx = i + 1;
                const on = days.includes(idx);
                return (
                  <button key={d} type="button"
                    className={`px-2 py-1 text-xs border ${on ? "border-primary text-primary" : "border-foreground/20 text-muted-foreground"}`}
                    onClick={() => set("work_days", on ? days.filter((x) => x !== idx) : [...days, idx].sort())}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Kezdés</Label>
              <Input type="time" className="rounded-none" value={attributes.work_from || "09:00"} onChange={(e) => set("work_from", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Zárás</Label>
              <Input type="time" className="rounded-none" value={attributes.work_to || "17:00"} onChange={(e) => set("work_to", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Szünet két munka közt (perc)</Label>
            <Input type="number" className="rounded-none" value={attributes.buffer_min || ""} onChange={(e) => set("buffer_min", e.target.value)} placeholder="pl. 15" />
          </div>
          <div>
            <Label className="text-xs">Legkorábbi foglalás (óra)</Label>
            <Input type="number" className="rounded-none" value={attributes.min_notice_hours || ""} onChange={(e) => set("min_notice_hours", e.target.value)} placeholder="pl. 24" />
          </div>
          <div>
            <Label className="text-xs">Előre foglalható (nap)</Label>
            <Input type="number" className="rounded-none" value={attributes.max_advance_days || ""} onChange={(e) => set("max_advance_days", e.target.value)} placeholder="pl. 60" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Előleg (%)</Label>
            <Input type="number" className="rounded-none" value={attributes.deposit_percent || ""} onChange={(e) => set("deposit_percent", e.target.value)} placeholder="pl. 30" />
          </div>
          <div>
            <Label className="text-xs">Kiszállási díj (Ft)</Label>
            <Input type="number" className="rounded-none" value={attributes.travel_fee || ""} onChange={(e) => set("travel_fee", e.target.value)} placeholder="pl. 5000" />
          </div>
          <div>
            <Label className="text-xs">Sürgősségi felár (%)</Label>
            <Input type="number" className="rounded-none" value={attributes.rush_fee_percent || ""} onChange={(e) => set("rush_fee_percent", e.target.value)} placeholder="pl. 50" />
          </div>
        </div>

        <div>
          <Label className="text-xs">Online egyeztetés linkje</Label>
          <Input className="rounded-none" value={attributes.meeting_url || ""} onChange={(e) => set("meeting_url", e.target.value)} placeholder="Zoom / Meet link" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Kiegészítő szolgáltatások ({(attributes.service_addons || []).length})</Label>
            <button type="button" className="text-xs border border-foreground/20 px-2 py-1 hover:border-foreground"
              onClick={() => set("service_addons", [...(attributes.service_addons || []), { name: "", price: "" }])}>+ Extra</button>
          </div>
          {(attributes.service_addons || []).map((a: any, i: number) => (
            <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-1 items-center">
              <Input className="rounded-none" placeholder="Extra neve" value={a.name || ""}
                onChange={(e) => set("service_addons", (attributes.service_addons || []).map((x: any, ix: number) => ix === i ? { ...x, name: e.target.value } : x))} />
              <Input type="number" className="rounded-none" placeholder="Ft" value={a.price || ""}
                onChange={(e) => set("service_addons", (attributes.service_addons || []).map((x: any, ix: number) => ix === i ? { ...x, price: e.target.value } : x))} />
              <button type="button" onClick={() => set("service_addons", (attributes.service_addons || []).filter((_: any, ix: number) => ix !== i))}>
                <X className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>

        <div>
          <Label className="text-xs">Garancia / utómunka</Label>
          <Input className="rounded-none" value={attributes.service_warranty || ""} onChange={(e) => set("service_warranty", e.target.value)} placeholder="pl. 6 hónap garancia" />
        </div>
      </div>
    </div>
  );
};

export default DigitalServiceFields;

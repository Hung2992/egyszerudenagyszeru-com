import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, KeyRound, Download, GraduationCap, CalendarClock } from "lucide-react";

interface Props { partnerId: string }

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("hu-HU") : "—");

export default function PartnerDigitalDeliveryTab({ partnerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [l, d, e, a] = await Promise.all([
      supabase.from("partner_license_keys").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(200),
      supabase.from("partner_download_access").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(200),
      supabase.from("partner_course_enrollments").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(200),
      supabase.from("partner_appointments").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(200),
    ]);
    setLicenses(l.data || []);
    setDownloads(d.data || []);
    setEnrollments(e.data || []);
    setAppointments(a.data || []);
    setLoading(false);
  };

  useEffect(() => { if (partnerId) load(); /* eslint-disable-next-line */ }, [partnerId]);

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Vágólapra másolva"); };

  const patch = async (table: any, id: string, values: Record<string, any>) => {
    const { error } = await supabase.from(table).update(values).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Mentve");
    load();
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-none" />)}</div>;

  const stat = (icon: any, label: string, value: number) => {
    const Icon = icon;
    return (
      <Card className="rounded-none">
        <CardContent className="p-4 flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-xl font-bold">{value}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stat(KeyRound, "Licenckulcs", licenses.length)}
        {stat(Download, "Letöltés", downloads.length)}
        {stat(GraduationCap, "Beiratkozás", enrollments.length)}
        {stat(CalendarClock, "Időpont", appointments.length)}
      </div>

      <Tabs defaultValue="licenses">
        <TabsList className="rounded-none flex-wrap h-auto">
          <TabsTrigger value="licenses" className="rounded-none">Licenckulcsok</TabsTrigger>
          <TabsTrigger value="downloads" className="rounded-none">Letöltések</TabsTrigger>
          <TabsTrigger value="courses" className="rounded-none">Kurzusok</TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-none">Időpontok</TabsTrigger>
        </TabsList>

        <TabsContent value="licenses" className="mt-4 space-y-2">
          {licenses.length === 0 && <p className="text-sm text-muted-foreground">Még nincs kiadott licenckulcs.</p>}
          {licenses.map((l) => (
            <Card key={l.id} className="rounded-none">
              <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-mono font-bold">{l.license_key}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.customer_email || "—"} · {l.license_type} · {l.activations}/{l.seats} aktiválás · lejár: {fmt(l.expires_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={l.status === "active" ? "default" : "secondary"} className="rounded-none">{l.status}</Badge>
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => copy(l.license_key)}><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" className="rounded-none"
                    onClick={() => patch("partner_license_keys", l.id, { status: l.status === "active" ? "revoked" : "active" })}>
                    {l.status === "active" ? "Visszavonás" : "Aktiválás"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="downloads" className="mt-4 space-y-2">
          {downloads.length === 0 && <p className="text-sm text-muted-foreground">Még nincs letöltési hozzáférés.</p>}
          {downloads.map((d) => (
            <Card key={d.id} className="rounded-none">
              <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-medium">{d.file_name || "Fájl"}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.customer_email || "—"} · {d.downloads_used}/{d.download_limit ?? "∞"} letöltés · lejár: {fmt(d.expires_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={d.status === "active" ? "default" : "secondary"} className="rounded-none">{d.status}</Badge>
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => copy(d.token)}>Token</Button>
                  <Button size="sm" variant="outline" className="rounded-none"
                    onClick={() => patch("partner_download_access", d.id, { downloads_used: 0 })}>Limit nullázása</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="courses" className="mt-4 space-y-2">
          {enrollments.length === 0 && <p className="text-sm text-muted-foreground">Még nincs beiratkozás.</p>}
          {enrollments.map((e) => (
            <Card key={e.id} className="rounded-none">
              <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-medium">{e.customer_email || "Tanuló"}</div>
                  <div className="text-xs text-muted-foreground">
                    Haladás: {e.progress_percent}% · hozzáférés: {fmt(e.access_until)} · oklevél: {e.certificate_issued ? "kiadva" : "nincs"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={100} defaultValue={e.progress_percent} className="rounded-none w-20 h-8"
                    onBlur={(ev) => {
                      const v = Math.max(0, Math.min(100, Number(ev.target.value)));
                      if (v !== e.progress_percent) patch("partner_course_enrollments", e.id, { progress_percent: v, status: v >= 100 ? "completed" : "in_progress" });
                    }} />
                  <Button size="sm" variant="outline" className="rounded-none" disabled={e.certificate_issued}
                    onClick={() => patch("partner_course_enrollments", e.id, { certificate_issued: true })}>Oklevél</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="appointments" className="mt-4 space-y-2">
          {appointments.length === 0 && <p className="text-sm text-muted-foreground">Még nincs időpont.</p>}
          {appointments.map((a) => (
            <Card key={a.id} className="rounded-none">
              <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-medium">{a.customer_name || a.customer_email || "Ügyfél"}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmt(a.starts_at)} · {a.duration_min ?? "—"} perc · {a.location || "helyszín nincs megadva"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="datetime-local" className="rounded-none w-52 h-8"
                    defaultValue={a.starts_at ? new Date(a.starts_at).toISOString().slice(0, 16) : ""}
                    onBlur={(ev) => ev.target.value && patch("partner_appointments", a.id, { starts_at: new Date(ev.target.value).toISOString(), status: "booked" })} />
                  <Badge variant="outline" className="rounded-none">{a.status}</Badge>
                  <Button size="sm" variant="outline" className="rounded-none"
                    onClick={() => patch("partner_appointments", a.id, { status: "completed" })}>Teljesítve</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

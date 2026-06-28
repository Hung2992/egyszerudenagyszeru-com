import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Activity, Download, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Evt = {
  id: string; storefront_id: string | null; partner_id: string;
  event_type: string; url: string | null; url_type: string | null;
  created_at: string; user_agent: string | null; context: any;
};

const EVENT_TYPES = ["save_click", "publish_request_click", "preview_click", "share_token_click", "preview_url_open"];
const URL_TYPES = ["custom_domain", "subdomain", "path", "preview_editor", "share_token"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

const AdminPartnerButtonAnalyticsTab = () => {
  const [events, setEvents] = useState<Evt[]>([]);
  const [partners, setPartners] = useState<{ id: string; company_name: string | null; full_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<string>(daysAgoISO(30));
  const [to, setTo] = useState<string>(todayISO());
  const [partnerId, setPartnerId] = useState<string>("all");
  const [urlType, setUrlType] = useState<string>("all");
  const [eventType, setEventType] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("partner_storefront_button_events")
      .select("*")
      .gte("created_at", `${from}T00:00:00Z`)
      .lte("created_at", `${to}T23:59:59Z`)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (partnerId !== "all") q = q.eq("partner_id", partnerId);
    if (urlType !== "all") q = q.eq("url_type", urlType);
    if (eventType !== "all") q = q.eq("event_type", eventType);
    const { data, error } = await q;
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); }
    setEvents((data as any[]) || []);
    const { data: ps } = await supabase.from("partners").select("id, company_name, full_name").order("company_name");
    setPartners((ps as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [from, to, partnerId, urlType, eventType]);

  // Aggregations
  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) {
      const d = e.created_at.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    }
    // ensure each day in range present
    const out: { day: string; count: number }[] = [];
    const start = new Date(from); const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      out.push({ day: k.slice(5), count: map[k] || 0 });
    }
    return out;
  }, [events, from, to]);

  const byUrlType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) { const k = e.url_type || "unknown"; map[k] = (map[k] || 0) + 1; }
    return Object.entries(map).map(([url_type, count]) => ({ url_type, count })).sort((a, b) => b.count - a.count);
  }, [events]);

  const byEventType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) { map[e.event_type] = (map[e.event_type] || 0) + 1; }
    return Object.entries(map).map(([event_type, count]) => ({ event_type, count })).sort((a, b) => b.count - a.count);
  }, [events]);

  const byPartner = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) { map[e.partner_id] = (map[e.partner_id] || 0) + 1; }
    const lookup = new Map(partners.map(p => [p.id, p.company_name || p.full_name || p.id.slice(0, 8)]));
    return Object.entries(map)
      .map(([pid, count]) => ({ partner: lookup.get(pid) || pid.slice(0, 8), count }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
  }, [events, partners]);

  const exportCsv = () => {
    const rows = [
      ["created_at", "event_type", "url_type", "partner_id", "storefront_id", "url"],
      ...events.map(e => [e.created_at, e.event_type, e.url_type ?? "", e.partner_id, e.storefront_id ?? "", e.url ?? ""]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `partner-button-events-${from}_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const total = events.length;
  const previewOpens = events.filter(e => e.event_type === "preview_url_open").length;
  const publishClicks = events.filter(e => e.event_type === "publish_request_click").length;
  const ctr = publishClicks > 0 && total > 0 ? ((publishClicks / total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2"><Activity className="w-5 h-5" /><h2 className="font-bold text-lg">Partner storefront gomb-analitika</h2></div>

      {/* Filters */}
      <Card className="rounded-none border-foreground/20 p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div>
          <Label className="text-xs uppercase">Időszak kezdete</Label>
          <Input className="rounded-none" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs uppercase">vége</Label>
          <Input className="rounded-none" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs uppercase">Partner</Label>
          <Select value={partnerId} onValueChange={setPartnerId}>
            <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mind</SelectItem>
              {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.company_name || p.full_name || p.id.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">URL típus</Label>
          <Select value={urlType} onValueChange={setUrlType}>
            <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mind</SelectItem>
              {URL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">Esemény</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mind</SelectItem>
              {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" className="rounded-none" onClick={load} disabled={loading}>
            <RefreshCw className="h-3 w-3 mr-1" /> Frissít
          </Button>
          <Button variant="outline" className="rounded-none" onClick={exportCsv} disabled={!events.length}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Összes esemény", value: total.toString() },
          { label: "Előnézet megnyitás", value: previewOpens.toString() },
          { label: "Publikálás kérés", value: publishClicks.toString() },
          { label: "Publikálás konverzió", value: `${ctr}%` },
        ].map(k => (
          <Card key={k.label} className="rounded-none border-foreground/20 p-4">
            <div className="text-xs uppercase text-muted-foreground">{k.label}</div>
            <div className="text-2xl font-bold">{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Daily timeline */}
      <Card className="rounded-none border-foreground/20 p-4">
        <h3 className="font-medium mb-3">Napi events</h3>
        <ChartContainer config={{ count: { label: "Események", color: "hsl(var(--primary))" } }} className="h-64 w-full">
          <ResponsiveContainer>
            <LineChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </Card>

      {/* URL type breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-none border-foreground/20 p-4">
          <h3 className="font-medium mb-3">URL típus szerinti megoszlás</h3>
          <ChartContainer config={{ count: { label: "Események", color: "hsl(var(--accent))" } }} className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={byUrlType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="url_type" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>

        <Card className="rounded-none border-foreground/20 p-4">
          <h3 className="font-medium mb-3">Esemény típusok</h3>
          <ChartContainer config={{ count: { label: "Számláló", color: "hsl(var(--primary))" } }} className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={byEventType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="event_type" type="category" tick={{ fontSize: 10 }} width={140} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      </div>

      {/* Top partners */}
      <Card className="rounded-none border-foreground/20 p-4">
        <h3 className="font-medium mb-3">Top 10 partner (események száma)</h3>
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Partner</TableHead><TableHead className="text-right">Események</TableHead></TableRow></TableHeader>
          <TableBody>
            {byPartner.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="font-bold">{i + 1}</TableCell>
                <TableCell>{p.partner}</TableCell>
                <TableCell className="text-right">{p.count}</TableCell>
              </TableRow>
            ))}
            {!byPartner.length && <TableRow><TableCell colSpan={3} className="text-muted-foreground text-sm">Nincs adat.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      {/* Recent events */}
      <Card className="rounded-none border-foreground/20 p-4">
        <h3 className="font-medium mb-3">Legutóbbi 50 esemény</h3>
        <div className="overflow-auto max-h-96">
          <Table>
            <TableHeader><TableRow><TableHead>Idő</TableHead><TableHead>Esemény</TableHead><TableHead>URL típus</TableHead><TableHead>URL</TableHead></TableRow></TableHeader>
            <TableBody>
              {events.slice(0, 50).map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.created_at).toLocaleString("hu-HU")}</TableCell>
                  <TableCell><Badge variant="outline" className="rounded-none text-[10px]">{e.event_type}</Badge></TableCell>
                  <TableCell className="text-xs">{e.url_type || "-"}</TableCell>
                  <TableCell className="text-xs font-mono truncate max-w-xs">{e.url || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default AdminPartnerButtonAnalyticsTab;

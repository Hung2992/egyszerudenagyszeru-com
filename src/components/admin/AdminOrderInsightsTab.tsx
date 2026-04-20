import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  TrendingUp, AlertTriangle, FileText, Sparkles, RefreshCw,
  ShieldAlert, Receipt, Clock, CheckCircle, Download, Eye,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--destructive))", "hsl(var(--muted))"];
const fmtMoney = (n: number) => new Intl.NumberFormat("hu-HU").format(Math.round(n)) + " Ft";

interface Stats {
  revenue7d: { date: string; revenue: number; orders: number }[];
  paymentMix: { name: string; value: number }[];
  pendingCount: number;
  paidCount: number;
  cancelledCount: number;
  refundRate: number;
  totalRevenue: number;
}

export default function AdminOrderInsightsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [fraudList, setFraudList] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: orders }, { data: fraud }, { data: invs }, { data: events }] = await Promise.all([
        supabase.from("orders").select("created_at,status,total_amount,payment_method").gte("created_at", since),
        supabase.from("fraud_signals").select("*, orders(customer_email,total_amount,status)").gte("risk_score", 25).order("risk_score", { ascending: false }).limit(30),
        supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("order_events").select("*").order("created_at", { ascending: false }).limit(40),
      ]);

      // Build daily aggregates
      const daily: Record<string, { revenue: number; orders: number }> = {};
      const pmMix: Record<string, number> = {};
      let pending = 0, paid = 0, cancelled = 0, refunded = 0, totalRev = 0;
      for (const o of orders || []) {
        const d = (o.created_at as string).slice(0, 10);
        if (!daily[d]) daily[d] = { revenue: 0, orders: 0 };
        if (o.status !== "cancelled" && o.status !== "refunded") {
          daily[d].revenue += Number(o.total_amount || 0);
          totalRev += Number(o.total_amount || 0);
        }
        daily[d].orders += 1;
        const pm = o.payment_method || "ismeretlen";
        pmMix[pm] = (pmMix[pm] || 0) + 1;
        if (o.status === "pending") pending++;
        else if (o.status === "paid" || o.status === "completed" || o.status === "shipped") paid++;
        else if (o.status === "cancelled") cancelled++;
        else if (o.status === "refunded") refunded++;
      }
      const revenue7d = Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date: date.slice(5), ...v }));
      const total = orders?.length || 1;
      setStats({
        revenue7d,
        paymentMix: Object.entries(pmMix).map(([name, value]) => ({ name, value })),
        pendingCount: pending,
        paidCount: paid,
        cancelledCount: cancelled,
        refundRate: Math.round((refunded / total) * 100),
        totalRevenue: totalRev,
      });
      setFraudList(fraud || []);
      setInvoices(invs || []);
      setRecentEvents(events || []);
    } catch (e: any) {
      toast.error("Betöltési hiba: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runAutomation = async () => {
    setRunning("automation");
    try {
      const { data, error } = await supabase.functions.invoke("order-automation", { body: {} });
      if (error) throw error;
      toast.success(`Lefutott: ${data?.stats?.reminded || 0} emlékeztető, ${data?.stats?.cancelled || 0} auto-cancel, ${data?.stats?.invoiced || 0} számla, ${data?.stats?.fraud_blocked || 0} blokk`);
      await load();
    } catch (e: any) {
      toast.error("Hiba: " + e.message);
    } finally { setRunning(null); }
  };

  const runFraud = async () => {
    setRunning("fraud");
    try {
      const { data, error } = await supabase.functions.invoke("detect-order-fraud", { body: {} });
      if (error) throw error;
      toast.success(`AI elemzés kész: ${data?.analyzed || 0} rendelés`);
      await load();
    } catch (e: any) {
      toast.error("Hiba: " + e.message);
    } finally { setRunning(null); }
  };

  const generateInvoice = async (orderId: string) => {
    setRunning("invoice-" + orderId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", { body: { orderId, force: true } });
      if (error) throw error;
      toast.success(`Számla: ${data?.invoice_number}`);
      if (data?.pdf_url) window.open(data.pdf_url, "_blank");
      await load();
    } catch (e: any) {
      toast.error("Hiba: " + e.message);
    } finally { setRunning(null); }
  };

  const downloadInvoice = async (path: string) => {
    const { data } = await supabase.storage.from("invoices").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const reviewFraud = async (id: string, outcome: "legit" | "fraud") => {
    const { error } = await supabase.from("fraud_signals").update({
      reviewed: true, review_outcome: outcome, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Mentve"); await load(); }
  };

  const riskBadge = (level: string) => {
    const variants: Record<string, string> = {
      critical: "bg-destructive text-destructive-foreground",
      high: "bg-destructive/70 text-destructive-foreground",
      medium: "bg-yellow-500/80 text-white",
      low: "bg-muted text-muted-foreground",
    };
    return <Badge className={variants[level] || variants.low}>{level.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Rendelés Intelligencia
          </h2>
          <p className="text-sm text-muted-foreground">AI csalásfelismerés • Auto-számlázás • Bevétel analitika</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Frissítés
          </Button>
          <Button size="sm" onClick={runAutomation} disabled={!!running}>
            <Clock className="w-4 h-4 mr-2" /> Automatizáció futtatása
          </Button>
          <Button size="sm" variant="secondary" onClick={runFraud} disabled={!!running}>
            <ShieldAlert className="w-4 h-4 mr-2" /> AI csalás-elemzés
          </Button>
        </div>
      </div>

      {/* KPI kártyák */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><TrendingUp className="w-3 h-3" /> 7 napos bevétel</div>
            <div className="text-2xl font-bold mt-1">{stats ? fmtMoney(stats.totalRevenue) : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><Clock className="w-3 h-3" /> Függő rendelés</div>
            <div className="text-2xl font-bold mt-1 text-accent">{stats?.pendingCount ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><CheckCircle className="w-3 h-3" /> Sikeres rendelés</div>
            <div className="text-2xl font-bold mt-1 text-primary">{stats?.paidCount ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><AlertTriangle className="w-3 h-3" /> Refund ráta</div>
            <div className="text-2xl font-bold mt-1 text-destructive">{stats?.refundRate ?? 0}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="charts">
        <TabsList>
          <TabsTrigger value="charts">📊 Grafikonok</TabsTrigger>
          <TabsTrigger value="fraud">🛡️ Csalásgyanú ({fraudList.length})</TabsTrigger>
          <TabsTrigger value="invoices">🧾 Számlák ({invoices.length})</TabsTrigger>
          <TabsTrigger value="events">📜 Események</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Napi bevétel és rendelésszám</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={stats?.revenue7d || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Bevétel (Ft)" strokeWidth={2} />
                  <Line type="monotone" dataKey="orders" stroke="hsl(var(--accent))" name="Rendelések" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Fizetési mód megoszlása</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={stats?.paymentMix || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {(stats?.paymentMix || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive" /> AI által észlelt gyanús rendelések
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fraudList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nincs gyanús rendelés. Futtasd az AI elemzést.</p>
              ) : (
                <div className="space-y-3">
                  {fraudList.map((f: any) => (
                    <div key={f.id} className="border border-border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {riskBadge(f.risk_level)}
                          <span className="font-bold">{f.risk_score} pont</span>
                          <span className="text-sm text-muted-foreground">• {f.orders?.customer_email}</span>
                          <span className="text-sm font-medium">{fmtMoney(Number(f.orders?.total_amount || 0))}</span>
                        </div>
                        {!f.reviewed && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => reviewFraud(f.id, "legit")}>✓ Rendben</Button>
                            <Button size="sm" variant="destructive" onClick={() => reviewFraud(f.id, "fraud")}>✕ Csalás</Button>
                          </div>
                        )}
                        {f.reviewed && <Badge variant="outline">Áttekintve: {f.review_outcome}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {(f.signals || []).map((s: any, i: number) => (
                          <div key={i}>• {s.description} <span className="text-foreground/60">(+{s.weight})</span></div>
                        ))}
                      </div>
                      {f.ai_reasoning && (
                        <div className="text-xs bg-muted/40 p-2 rounded italic">
                          <Sparkles className="w-3 h-3 inline mr-1" /> {f.ai_reasoning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Kiállított számlák
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Számlaszám</TableHead>
                    <TableHead>Vevő</TableHead>
                    <TableHead>Összeg</TableHead>
                    <TableHead>Dátum</TableHead>
                    <TableHead>Művelet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nincs még számla</TableCell></TableRow>
                  ) : invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="text-sm">{inv.customer_name}<br /><span className="text-xs text-muted-foreground">{inv.customer_email}</span></TableCell>
                      <TableCell className="font-medium">{fmtMoney(Number(inv.total_amount))}</TableCell>
                      <TableCell className="text-xs">{new Date(inv.created_at).toLocaleDateString("hu-HU")}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => downloadInvoice(inv.pdf_url)}>
                          <Download className="w-3 h-3 mr-1" /> PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader><CardTitle className="text-base">Friss rendelés-események</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentEvents.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm border-l-2 border-primary/40 pl-3 py-1">
                    <Badge variant="outline" className="text-xs">{e.event_type}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("hu-HU")}</span>
                    <span className="text-xs">{e.triggered_by}</span>
                    {e.previous_status && <span className="text-xs">{e.previous_status} → {e.new_status}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

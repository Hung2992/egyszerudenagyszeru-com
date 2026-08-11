// Partner rendelés- és ügyfélkezelés: státusz frissítés, szállítási adatok, ügyféllista.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Truck, RefreshCw, Search, Download } from "lucide-react";

interface Props { partnerId: string }

interface POrder {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: any;
  items: any;
  total_huf: number | null;
  partner_payout_huf: number | null;
  status: string | null;
  payment_status: string | null;
  tracking_number: string | null;
  carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

const STATUSES = [
  { value: "new", label: "Új" },
  { value: "processing", label: "Feldolgozás alatt" },
  { value: "shipped", label: "Feladva" },
  { value: "delivered", label: "Kézbesítve" },
  { value: "cancelled", label: "Lemondva" },
];

const fmt = (n: number | null) => `${Number(n || 0).toLocaleString("hu-HU")} Ft`;
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString("hu-HU") : "—");

const PartnerOrdersTab = ({ partnerId }: Props) => {
  const [orders, setOrders] = useState<POrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<Record<string, { tracking: string; carrier: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_orders")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(300);
    setOrders((data as POrder[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (partnerId) void load(); /* eslint-disable-next-line */ }, [partnerId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && String(o.status) !== statusFilter) return false;
      if (!needle) return true;
      return [o.order_number, o.customer_name, o.customer_email, o.tracking_number]
        .some((v) => String(v || "").toLowerCase().includes(needle));
    });
  }, [orders, q, statusFilter]);

  const updateOrder = async (id: string, patch: Record<string, any>) => {
    setSaving(id);
    const { error } = await supabase.from("partner_orders").update(patch).eq("id", id);
    setSaving(null);
    if (error) {
      toast({ title: "Mentés sikertelen", description: error.message, variant: "destructive" });
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    toast({ title: "Mentve", description: "A rendelés frissült." });
  };

  const setStatus = (o: POrder, status: string) => {
    const patch: Record<string, any> = { status };
    if (status === "shipped" && !o.shipped_at) patch.shipped_at = new Date().toISOString();
    if (status === "delivered" && !o.delivered_at) patch.delivered_at = new Date().toISOString();
    void updateOrder(o.id, patch);
  };

  const saveTracking = (o: POrder) => {
    const e = editing[o.id];
    if (!e) return;
    void updateOrder(o.id, {
      tracking_number: e.tracking || null,
      carrier: e.carrier || null,
      ...(e.tracking && !o.shipped_at ? { shipped_at: new Date().toISOString(), status: "shipped" } : {}),
    });
  };

  // Ügyféllista aggregálás
  const customers = useMemo(() => {
    const map = new Map<string, { name: string; email: string; phone: string; orders: number; total: number; last: string }>();
    for (const o of orders) {
      const key = (o.customer_email || o.customer_name || o.id).toLowerCase();
      const cur = map.get(key) || {
        name: o.customer_name || "—", email: o.customer_email || "—", phone: o.customer_phone || "—",
        orders: 0, total: 0, last: o.created_at,
      };
      cur.orders += 1;
      cur.total += Number(o.total_huf || 0);
      if (new Date(o.created_at) > new Date(cur.last)) cur.last = o.created_at;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [orders]);

  const exportCsv = () => {
    const rows = [
      ["Rendelés", "Dátum", "Ügyfél", "Email", "Összeg", "Kifizetés", "Státusz", "Csomagszám"],
      ...filtered.map((o) => [
        o.order_number || o.id.slice(0, 8), dt(o.created_at), o.customer_name || "", o.customer_email || "",
        String(o.total_huf || 0), String(o.partner_payout_huf || 0), o.status || "", o.tracking_number || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = `rendelesek-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-none" />)}</div>;

  return (
    <Tabs defaultValue="orders" className="space-y-4">
      <TabsList className="rounded-none">
        <TabsTrigger value="orders" className="rounded-none">Rendelések ({orders.length})</TabsTrigger>
        <TabsTrigger value="customers" className="rounded-none">Ügyfelek ({customers.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="orders" className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Keresés</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="rounded-none pl-8" placeholder="Rendelésszám, név, e-mail, csomagszám" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="w-48">
            <Label className="text-xs">Státusz</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Összes</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="rounded-none" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button variant="outline" className="rounded-none" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-2" />Frissítés</Button>
        </div>

        {filtered.length === 0 ? (
          <Card className="rounded-none border-border p-8 text-center text-sm text-muted-foreground">
            Nincs megjeleníthető rendelés.
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const e = editing[o.id] ?? { tracking: o.tracking_number || "", carrier: o.carrier || "" };
              const items = Array.isArray(o.items) ? o.items : [];
              return (
                <Card key={o.id} className="rounded-none border-border p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold">#{o.order_number || o.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{dt(o.created_at)} • {o.customer_name || "—"} • {o.customer_email || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-none">{o.payment_status || "—"}</Badge>
                      <span className="font-bold">{fmt(o.total_huf)}</span>
                      <Select value={String(o.status || "new")} onValueChange={(v) => setStatus(o, v)}>
                        <SelectTrigger className="rounded-none w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {items.map((it: any, i: number) => (
                        <span key={i}>{it.title || it.name || "Tétel"} × {it.qty || it.quantity || 1}{i < items.length - 1 ? " • " : ""}</span>
                      ))}
                    </div>
                  )}

                  {items.length > 0 && <OrderFulfillmentPlan items={items} />}


                  {o.shipping_address && (
                    <div className="text-xs text-muted-foreground">
                      Szállítás: {[o.shipping_address.postal_code, o.shipping_address.city, o.shipping_address.address, o.shipping_address.street]
                        .filter(Boolean).join(", ") || "—"}
                    </div>
                  )}

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-40">
                      <Label className="text-xs">Futár</Label>
                      <Input className="rounded-none" placeholder="GLS / Foxpost…" value={e.carrier}
                        onChange={(ev) => setEditing((p) => ({ ...p, [o.id]: { ...e, carrier: ev.target.value } }))} />
                    </div>
                    <div className="w-56">
                      <Label className="text-xs">Csomagszám</Label>
                      <Input className="rounded-none" placeholder="Tracking" value={e.tracking}
                        onChange={(ev) => setEditing((p) => ({ ...p, [o.id]: { ...e, tracking: ev.target.value } }))} />
                    </div>
                    <Button size="sm" className="rounded-none" disabled={saving === o.id} onClick={() => saveTracking(o)}>
                      <Truck className="h-4 w-4 mr-2" /> Mentés
                    </Button>
                    <span className="text-xs text-muted-foreground">Feladva: {dt(o.shipped_at)} • Kézbesítve: {dt(o.delivered_at)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="customers">
        <Card className="rounded-none border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Név</TableHead><TableHead>E-mail</TableHead><TableHead>Telefon</TableHead>
                <TableHead className="text-right">Rendelés</TableHead><TableHead className="text-right">Összesen</TableHead><TableHead>Utolsó</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Még nincs ügyfeled.</TableCell></TableRow>
              ) : customers.map((c, i) => (
                <TableRow key={i}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="text-xs">{c.email}</TableCell>
                  <TableCell className="text-xs">{c.phone}</TableCell>
                  <TableCell className="text-right">{c.orders}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(c.total)}</TableCell>
                  <TableCell className="text-xs">{dt(c.last)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PartnerOrdersTab;

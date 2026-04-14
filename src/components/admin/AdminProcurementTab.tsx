import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Plus, Trash2, Save, X, Pencil, Link, Loader2, Package, ArrowRight, BarChart3 } from "lucide-react";
import ProcurementStats from "./ProcurementStats";
import ProcurementAiChat from "./ProcurementAiChat";

interface ProcurementOrder {
  id: string;
  supplier_name: string;
  supplier_url: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  tracking_number: string | null;
  expected_arrival: string | null;
  actual_arrival: string | null;
  notes: string | null;
  linked_product_id: string | null;
  created_at: string;
}

interface ShopProduct {
  id: string;
  name: string;
  stock: number;
  category: string;
}

const emptyForm = {
  supplier_name: "",
  supplier_url: "",
  product_name: "",
  product_sku: "",
  quantity: 1,
  unit_cost: 0,
  currency: "HUF",
  payment_method: "bank_card",
  notes: "",
  expected_arrival: "",
  linked_product_id: "",
};

const ORDER_STATUSES = [
  { value: "draft", label: "Piszkozat", color: "secondary" },
  { value: "ordered", label: "Megrendelve", color: "default" },
  { value: "shipped", label: "Szállítás alatt", color: "outline" },
  { value: "received", label: "Megérkezett", color: "default" },
  { value: "cancelled", label: "Törölve", color: "destructive" },
] as const;

const PAYMENT_STATUSES = [
  { value: "pending", label: "Függőben" },
  { value: "paid", label: "Kifizetve" },
  { value: "refunded", label: "Visszatérítve" },
];

const AdminProcurementTab = () => {
  const [orders, setOrders] = useState<ProcurementOrder[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [importMode, setImportMode] = useState<"single" | "batch">("single");
  const [batchUrls, setBatchUrls] = useState("");
  const [batchResults, setBatchResults] = useState<any[]>([]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("admin_procurement_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setOrders(data as ProcurementOrder[]);
    setLoading(false);
  };

  const fetchShopProducts = async () => {
    const { data } = await supabase
      .from("shop_products")
      .select("id, name, stock, category")
      .order("name");
    if (data) setShopProducts(data as ShopProduct[]);
  };

  useEffect(() => { fetchOrders(); fetchShopProducts(); }, []);

  const importFromUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-product", {
        body: { url: importUrl.trim() },
      });
      if (error) throw error;
      if (!data?.success || !data?.data) {
        toast({ title: "Hiba", description: data?.error || "Nem sikerült a termék kinyerése", variant: "destructive" });
        return;
      }
      const p = data.data;
      setForm({
        ...emptyForm,
        supplier_name: p.supplier_name || "",
        supplier_url: importUrl.trim(),
        product_name: p.product_name || "",
        product_sku: p.product_sku || "",
        unit_cost: p.unit_cost || 0,
        currency: ["HUF", "EUR", "USD"].includes(p.currency) ? p.currency : "HUF",
        quantity: 1,
        payment_method: "bank_card",
        notes: p.image_url ? `Kép: ${p.image_url}` : "",
        expected_arrival: "",
        linked_product_id: "",
      });
      setShowForm(true);
      setEditingId(null);
      toast({ title: "Termék importálva!", description: `${p.product_name} - ${p.unit_cost} ${p.currency}` });
    } catch (err: any) {
      toast({ title: "Hiba", description: err.message || "Import sikertelen", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const importBatchFromUrls = async () => {
    const urls = batchUrls.split("\n").map(u => u.trim()).filter(u => u.startsWith("http"));
    if (urls.length === 0) {
      toast({ title: "Hiba", description: "Adj meg legalább egy érvényes URL-t!", variant: "destructive" });
      return;
    }
    if (urls.length > 20) {
      toast({ title: "Hiba", description: "Maximum 20 URL egyszerre!", variant: "destructive" });
      return;
    }
    setImporting(true);
    setBatchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-product", {
        body: { urls },
      });
      if (error) throw error;
      if (!data?.success || !data?.results) {
        toast({ title: "Hiba", description: "Tömeges import sikertelen", variant: "destructive" });
        return;
      }

      const successful = data.results.filter((r: any) => r.success);
      const failed = data.results.filter((r: any) => !r.success);

      // Insert all successful as procurement orders
      for (const r of successful) {
        const p = r.data;
        await supabase.from("admin_procurement_orders").insert({
          supplier_name: p.supplier_name || "Ismeretlen",
          product_name: p.product_name || "Ismeretlen termék",
          product_sku: p.product_sku || null,
          unit_cost: p.unit_cost || 0,
          currency: ["HUF", "EUR", "USD"].includes(p.currency) ? p.currency : "HUF",
          quantity: 1,
          payment_method: "bank_card",
          notes: p.image_url ? `Kép: ${p.image_url}` : null,
        });
      }

      setBatchResults(data.results);
      toast({
        title: "Tömeges import kész!",
        description: `${successful.length} sikeres, ${failed.length} sikertelen`,
      });
      fetchOrders();
      setBatchUrls("");
    } catch (err: any) {
      toast({ title: "Hiba", description: err.message || "Import sikertelen", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const save = async () => {
    if (!form.supplier_name.trim() || !form.product_name.trim()) {
      toast({ title: "Hiba", description: "Beszállító és terméknév kötelező!", variant: "destructive" });
      return;
    }
    const payload: any = {
      supplier_name: form.supplier_name,
      supplier_url: form.supplier_url || null,
      product_name: form.product_name,
      product_sku: form.product_sku || null,
      quantity: form.quantity,
      unit_cost: form.unit_cost,
      currency: form.currency,
      payment_method: form.payment_method,
      notes: form.notes || null,
      expected_arrival: form.expected_arrival || null,
      linked_product_id: form.linked_product_id || null,
    };

    if (editingId) {
      const { error } = await supabase.from("admin_procurement_orders").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Beszerzés frissítve" });
    } else {
      const { error } = await supabase.from("admin_procurement_orders").insert(payload);
      if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Beszerzés hozzáadva" });
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    fetchOrders();
  };

  const updateStatus = async (id: string, field: "order_status" | "payment_status", value: string) => {
    const update: any = field === "order_status" ? { order_status: value } : { payment_status: value };
    if (value === "received") Object.assign(update, { actual_arrival: new Date().toISOString().split("T")[0] });
    await supabase.from("admin_procurement_orders").update(update).eq("id", id);
    
    if (field === "order_status" && value === "received") {
      const order = orders.find(o => o.id === id);
      if (order?.linked_product_id) {
        toast({ title: "Készlet frissítve!", description: `+${order.quantity} db hozzáadva a készlethez automatikusan.` });
      }
    }
    
    fetchOrders();
    fetchShopProducts();
  };

  const remove = async (id: string) => {
    await supabase.from("admin_procurement_orders").delete().eq("id", id);
    toast({ title: "Törölve" });
    fetchOrders();
  };

  const edit = (o: ProcurementOrder) => {
    setForm({
      supplier_name: o.supplier_name,
      supplier_url: o.supplier_url || "",
      product_name: o.product_name,
      product_sku: o.product_sku || "",
      quantity: o.quantity,
      unit_cost: o.unit_cost,
      currency: o.currency,
      payment_method: o.payment_method,
      notes: o.notes || "",
      expected_arrival: o.expected_arrival || "",
      linked_product_id: o.linked_product_id || "",
    });
    setEditingId(o.id);
    setShowForm(true);
  };

  const getLinkedProductName = (id: string | null) => {
    if (!id) return null;
    return shopProducts.find(p => p.id === id)?.name || "Ismeretlen";
  };

  const totalSpent = orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + Number(o.total_cost), 0);
  const pendingCount = orders.filter(o => o.order_status === "ordered" || o.order_status === "shipped").length;

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <h2 className="font-bold text-lg">Beszerzés / Előrendelés</h2>
        </div>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}>
          <Plus className="w-4 h-4 mr-1" /> Új beszerzés
        </Button>
      </div>

      {/* URL Import */}
      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Link className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Termék importálása linkből</Label>
        </div>
        <p className="text-xs text-muted-foreground">Illeszd be bármely webshop terméklink-jét — az AI automatikusan kitölti az adatokat.</p>
        <div className="flex gap-2 mb-2">
          <Button size="sm" variant={importMode === "single" ? "default" : "outline"} onClick={() => setImportMode("single")}>
            Egy link
          </Button>
          <Button size="sm" variant={importMode === "batch" ? "default" : "outline"} onClick={() => setImportMode("batch")}>
            Tömeges (max 20)
          </Button>
        </div>
        {importMode === "single" ? (
          <div className="flex gap-2">
            <Input
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              placeholder="https://www.shein.com/product/..."
              className="flex-1"
              disabled={importing}
            />
            <Button size="sm" onClick={importFromUrl} disabled={importing || !importUrl.trim()}>
              {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Link className="w-4 h-4 mr-1" />}
              {importing ? "Importálás..." : "Importálás"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={batchUrls}
              onChange={e => setBatchUrls(e.target.value)}
              placeholder={"https://www.shein.com/product/1\nhttps://www.zara.com/product/2\nhttps://www.hm.com/product/3"}
              rows={5}
              className="w-full border rounded-md p-2 text-sm bg-background"
              disabled={importing}
            />
            <Button size="sm" onClick={importBatchFromUrls} disabled={importing || !batchUrls.trim()}>
              {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Package className="w-4 h-4 mr-1" />}
              {importing ? "Importálás folyamatban..." : "Összes importálása"}
            </Button>
          </div>
        )}
        {batchResults.length > 0 && (
          <div className="text-xs space-y-1 border-t pt-2">
            <p className="font-medium">Eredmények:</p>
            {batchResults.map((r, i) => (
              <div key={i} className={`flex items-center gap-1 ${r.success ? "text-green-500" : "text-destructive"}`}>
                <span>{r.success ? "✓" : "✗"}</span>
                <span>{r.success ? r.data?.product_name : r.error}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Összes beszerzés</p>
          <p className="text-2xl font-bold">{orders.length}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Folyamatban</p>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Összköltség (kifizetve)</p>
          <p className="text-2xl font-bold">{totalSpent.toLocaleString("hu-HU")} Ft</p>
        </div>
      </div>

      {/* Stats toggle */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setShowStats(!showStats)}>
          <BarChart3 className="w-4 h-4 mr-1" /> {showStats ? "Statisztikák elrejtése" : "Statisztikák"}
        </Button>
      </div>
      {showStats && <ProcurementStats orders={orders as any} />}

      {/* AI Assistant */}
      <ProcurementAiChat />
      {/* Form */}
      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">{editingId ? "Beszerzés szerkesztése" : "Új beszerzés rögzítése"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Beszállító neve *</Label>
              <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} placeholder="pl. Shein, AliExpress" />
            </div>
            <div>
              <Label>Beszállító URL</Label>
              <Input value={form.supplier_url} onChange={e => setForm({ ...form, supplier_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Termék neve *</Label>
              <Input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} placeholder="pl. Oversize póló fekete" />
            </div>
            <div>
              <Label>SKU / Cikkszám</Label>
              <Input value={form.product_sku} onChange={e => setForm({ ...form, product_sku: e.target.value })} />
            </div>
            <div>
              <Label>Mennyiség</Label>
              <Input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label>Egységár</Label>
              <Input type="number" min={0} value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Pénznem</Label>
              <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HUF">HUF</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fizetési mód</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_card">Bankkártya</SelectItem>
                  <SelectItem value="bank_transfer">Átutalás</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="other">Egyéb</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Várható érkezés</Label>
              <Input type="date" value={form.expected_arrival} onChange={e => setForm({ ...form, expected_arrival: e.target.value })} />
            </div>
            {/* Linked product selector */}
            <div>
              <Label className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                Kapcsolódó webshop termék
              </Label>
              <Select value={form.linked_product_id || "none"} onValueChange={v => setForm({ ...form, linked_product_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Válassz terméket..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nincs összekapcsolva —</SelectItem>
                  {shopProducts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.stock} db - {p.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Ha összekapcsolod, a "Megérkezett" státuszra váltáskor automatikusan frissül a készlet.
              </p>
            </div>
          </div>
          <div>
            <Label>Megjegyzés</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Save className="w-4 h-4 mr-1" /> {editingId ? "Mentés" : "Rögzítés"}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}><X className="w-4 h-4 mr-1" /> Mégse</Button>
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Termék</TableHead>
              <TableHead>Beszállító</TableHead>
              <TableHead>Db</TableHead>
              <TableHead>Összeg</TableHead>
              <TableHead>Webshop termék</TableHead>
              <TableHead>Rendelés</TableHead>
              <TableHead>Fizetés</TableHead>
              <TableHead>Dátum</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map(o => (
              <TableRow key={o.id}>
                <TableCell>
                  <p className="font-medium text-sm">{o.product_name}</p>
                  {o.product_sku && <p className="text-xs text-muted-foreground">{o.product_sku}</p>}
                </TableCell>
                <TableCell>
                  {o.supplier_url ? (
                    <a href={o.supplier_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">{o.supplier_name}</a>
                  ) : (
                    <span className="text-sm">{o.supplier_name}</span>
                  )}
                </TableCell>
                <TableCell>{o.quantity}</TableCell>
                <TableCell className="font-medium">{Number(o.total_cost).toLocaleString("hu-HU")} {o.currency}</TableCell>
                <TableCell>
                  {o.linked_product_id ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded">
                      <ArrowRight className="w-3 h-3" />
                      {getLinkedProductName(o.linked_product_id)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Select value={o.order_status} onValueChange={v => updateStatus(o.id, "order_status", v)}>
                    <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={o.payment_status} onValueChange={v => updateStatus(o.id, "payment_status", v)}>
                    <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString("hu-HU")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => edit(o)}><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(o.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Még nincs beszerzési rendelés. Importálj egy terméket linkből vagy kattints az "Új beszerzés" gombra!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminProcurementTab;

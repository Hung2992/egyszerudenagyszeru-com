import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ShoppingCart, Plus, Trash2, Save, X, Pencil, Link, Loader2, Package, ArrowRight,
  BarChart3, AlertTriangle, TrendingUp, Clock, CheckCircle2, CreditCard, Truck,
  Filter, Search, ArrowUpDown, Zap, Target, Download, Copy, RefreshCw, Eye,
  DollarSign, Star, Calendar, ChevronDown, ChevronUp, Layers, Shield, Hash
} from "lucide-react";
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
  selling_price: number;
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
  priority: string;
  margin_percent: number | null;
  category: string;
  profit_amount: number | null;
  created_at: string;
}

interface ShopProduct {
  id: string;
  name: string;
  stock: number;
  category: string;
  price: number;
}

const emptyForm = {
  supplier_name: "",
  supplier_url: "",
  product_name: "",
  product_sku: "",
  quantity: 1,
  unit_cost: 0,
  selling_price: 0,
  currency: "HUF",
  payment_method: "bank_card",
  notes: "",
  expected_arrival: "",
  linked_product_id: "",
  priority: "normal",
  category: "general",
  tracking_number: "",
};

const ORDER_STATUSES = [
  { value: "draft", label: "Piszkozat", color: "text-muted-foreground bg-secondary/40 border-border" },
  { value: "ordered", label: "Megrendelve", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { value: "shipped", label: "Szállítás alatt", color: "text-accent bg-accent/10 border-accent/20" },
  { value: "received", label: "Megérkezett", color: "text-green-500 bg-green-500/10 border-green-500/20" },
  { value: "cancelled", label: "Törölve", color: "text-destructive bg-destructive/10 border-destructive/20" },
] as const;

const PAYMENT_STATUSES = [
  { value: "pending", label: "Függőben", color: "text-yellow-500" },
  { value: "paid", label: "Kifizetve", color: "text-green-500" },
  { value: "refunded", label: "Visszatérítve", color: "text-destructive" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Alacsony", color: "text-muted-foreground" },
  { value: "normal", label: "Normál", color: "text-foreground" },
  { value: "high", label: "Magas", color: "text-yellow-500" },
  { value: "urgent", label: "Sürgős", color: "text-destructive" },
];

const CATEGORY_OPTIONS = [
  { value: "general", label: "Általános" },
  { value: "clothing", label: "Ruházat" },
  { value: "accessories", label: "Kiegészítők" },
  { value: "electronics", label: "Elektronika" },
  { value: "packaging", label: "Csomagolás" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Egyéb" },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOrderStatus, setFilterOrderStatus] = useState("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortField, setSortField] = useState<"created_at" | "total_cost" | "priority" | "expected_arrival" | "margin_percent">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);

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
      .select("id, name, stock, category, price")
      .order("name");
    if (data) setShopProducts(data as ShopProduct[]);
  };

  useEffect(() => { fetchOrders(); fetchShopProducts(); }, []);

  // ====== ADVANCED ANALYTICS ======
  const advAnalytics = useMemo(() => {
    const now = new Date();
    const thisMonth = orders.filter(o => {
      const d = new Date(o.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = orders.filter(o => {
      const d = new Date(o.created_at);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });

    const totalCostAll = orders.reduce((s, o) => s + Number(o.total_cost || 0), 0);
    const totalPaidCost = orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + Number(o.total_cost || 0), 0);
    const totalProfitAll = orders.filter(o => o.selling_price > 0).reduce((s, o) => s + (o.selling_price - o.unit_cost) * o.quantity, 0);
    const thisMonthCost = thisMonth.reduce((s, o) => s + Number(o.total_cost || 0), 0);
    const lastMonthCost = lastMonth.reduce((s, o) => s + Number(o.total_cost || 0), 0);
    const costTrend = lastMonthCost > 0 ? ((thisMonthCost - lastMonthCost) / lastMonthCost * 100) : 0;

    const supplierMap: Record<string, { count: number; cost: number; onTime: number; total: number }> = {};
    orders.forEach(o => {
      const s = o.supplier_name || "Ismeretlen";
      if (!supplierMap[s]) supplierMap[s] = { count: 0, cost: 0, onTime: 0, total: 0 };
      supplierMap[s].count++;
      supplierMap[s].cost += Number(o.total_cost || 0);
      supplierMap[s].total++;
      if (o.order_status === "received" && o.expected_arrival && o.actual_arrival) {
        if (new Date(o.actual_arrival) <= new Date(o.expected_arrival)) supplierMap[s].onTime++;
      }
    });
    const topSuppliers = Object.entries(supplierMap)
      .map(([name, d]) => ({ name, ...d, reliability: d.total > 0 ? Math.round(d.onTime / d.total * 100) : 0 }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    const categoryMap: Record<string, number> = {};
    orders.forEach(o => { categoryMap[o.category || "general"] = (categoryMap[o.category || "general"] || 0) + Number(o.total_cost || 0); });
    const categoryBreakdown = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    const avgDeliveryDays = orders
      .filter(o => o.order_status === "received" && o.actual_arrival && o.created_at)
      .map(o => (new Date(o.actual_arrival!).getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24))
      .reduce((s, d, _, a) => s + d / a.length, 0);

    const roi = totalPaidCost > 0 ? ((totalProfitAll / totalPaidCost) * 100) : 0;

    // Reorder alerts - products linked to procurement with low stock
    const lowStockLinked = orders
      .filter(o => o.linked_product_id && o.order_status === "received")
      .map(o => {
        const product = shopProducts.find(p => p.id === o.linked_product_id);
        return product && product.stock <= 5 ? { order: o, product } : null;
      })
      .filter(Boolean) as { order: ProcurementOrder; product: ShopProduct }[];

    return {
      totalCostAll, totalPaidCost, totalProfitAll, thisMonthCost, lastMonthCost, costTrend,
      topSuppliers, categoryBreakdown, avgDeliveryDays, roi, lowStockLinked,
      thisMonthCount: thisMonth.length, lastMonthCount: lastMonth.length,
    };
  }, [orders, shopProducts]);

  const importFromUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-product", { body: { url: importUrl.trim() } });
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
        priority: "normal",
        category: "general",
        selling_price: 0,
        tracking_number: "",
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
    if (urls.length === 0) { toast({ title: "Hiba", description: "Adj meg legalább egy érvényes URL-t!", variant: "destructive" }); return; }
    if (urls.length > 20) { toast({ title: "Hiba", description: "Maximum 20 URL egyszerre!", variant: "destructive" }); return; }
    setImporting(true);
    setBatchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-product", { body: { urls } });
      if (error) throw error;
      if (!data?.success || !data?.results) { toast({ title: "Hiba", description: "Tömeges import sikertelen", variant: "destructive" }); return; }
      const successful = data.results.filter((r: any) => r.success);
      const failed = data.results.filter((r: any) => !r.success);
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
      toast({ title: "Tömeges import kész!", description: `${successful.length} sikeres, ${failed.length} sikertelen` });
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
      selling_price: form.selling_price,
      currency: form.currency,
      payment_method: form.payment_method,
      notes: form.notes || null,
      expected_arrival: form.expected_arrival || null,
      linked_product_id: form.linked_product_id || null,
      priority: form.priority,
      category: form.category,
      tracking_number: form.tracking_number || null,
    };

    if (editingId) {
      const { error } = await supabase.from("admin_procurement_orders").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Beszerzés frissítve ✓" });
    } else {
      const { error } = await supabase.from("admin_procurement_orders").insert(payload);
      if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Beszerzés hozzáadva ✓" });
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    fetchOrders();
  };

  const updateField = async (id: string, field: string, value: any) => {
    const update: any = { [field]: value };
    if (field === "order_status" && value === "received") {
      update.actual_arrival = new Date().toISOString().split("T")[0];
    }
    await supabase.from("admin_procurement_orders").update(update).eq("id", id);

    if (field === "order_status" && value === "received") {
      const order = orders.find(o => o.id === id);
      if (order?.linked_product_id) {
        toast({ title: "📦 Készlet automatikusan frissítve!", description: `+${order.quantity} db hozzáadva` });
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
      selling_price: o.selling_price || 0,
      currency: o.currency,
      payment_method: o.payment_method,
      notes: o.notes || "",
      expected_arrival: o.expected_arrival || "",
      linked_product_id: o.linked_product_id || "",
      priority: o.priority || "normal",
      category: o.category || "general",
      tracking_number: o.tracking_number || "",
    });
    setEditingId(o.id);
    setShowForm(true);
  };

  // ====== DUPLICATE ORDER ======
  const duplicateOrder = async (o: ProcurementOrder) => {
    const payload: any = {
      supplier_name: o.supplier_name,
      supplier_url: o.supplier_url,
      product_name: o.product_name,
      product_sku: o.product_sku,
      quantity: o.quantity,
      unit_cost: o.unit_cost,
      selling_price: o.selling_price,
      currency: o.currency,
      payment_method: o.payment_method,
      notes: o.notes ? `[Másolat] ${o.notes}` : "[Másolat]",
      expected_arrival: null,
      linked_product_id: o.linked_product_id,
      priority: o.priority,
      category: o.category,
    };
    const { error } = await supabase.from("admin_procurement_orders").insert(payload);
    if (error) { toast({ title: "Duplikálás sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Beszerzés duplikálva ✓", description: o.product_name });
    fetchOrders();
  };

  const autoLinkProduct = (o: ProcurementOrder) => {
    const match = shopProducts.find(p =>
      p.name.toLowerCase().includes(o.product_name.toLowerCase()) ||
      o.product_name.toLowerCase().includes(p.name.toLowerCase())
    );
    if (match) {
      updateField(o.id, "linked_product_id", match.id);
      toast({ title: "Automatikusan összekapcsolva!", description: match.name });
    } else {
      toast({ title: "Nem találtam egyező terméket", variant: "destructive" });
    }
  };

  // ====== BATCH OPERATIONS ======
  const batchUpdateStatus = async (field: string, value: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      const update: any = { [field]: value };
      if (field === "order_status" && value === "received") {
        update.actual_arrival = new Date().toISOString().split("T")[0];
      }
      await supabase.from("admin_procurement_orders").update(update).eq("id", id);
    }
    toast({ title: `${ids.length} tétel frissítve!` });
    setSelectedIds(new Set());
    fetchOrders();
    fetchShopProducts();
  };

  const batchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      await supabase.from("admin_procurement_orders").delete().eq("id", id);
    }
    toast({ title: `${ids.length} tétel törölve!` });
    setSelectedIds(new Set());
    fetchOrders();
  };

  // ====== EXPORT ======
  const exportCSV = () => {
    const headers = ["Termék", "SKU", "Beszállító", "Mennyiség", "Egységár", "Össz. költség", "Eladási ár", "Margin %", "Profit", "Kategória", "Prioritás", "Rendelés státusz", "Fizetés", "Tracking", "Várható érkezés", "Tényleges érkezés", "Pénznem", "Dátum"];
    const rows = orders.map(o => [
      o.product_name,
      o.product_sku || "-",
      o.supplier_name,
      o.quantity,
      o.unit_cost,
      o.total_cost || 0,
      o.selling_price || 0,
      o.margin_percent != null ? `${o.margin_percent}%` : "-",
      o.selling_price > 0 ? (o.selling_price - o.unit_cost) * o.quantity : 0,
      CATEGORY_OPTIONS.find(c => c.value === o.category)?.label || o.category,
      PRIORITY_OPTIONS.find(p => p.value === o.priority)?.label || o.priority,
      ORDER_STATUSES.find(s => s.value === o.order_status)?.label || o.order_status,
      PAYMENT_STATUSES.find(s => s.value === o.payment_status)?.label || o.payment_status,
      o.tracking_number || "-",
      o.expected_arrival || "-",
      o.actual_arrival || "-",
      o.currency,
      new Date(o.created_at).toLocaleDateString("hu-HU"),
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beszerzesek_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportálva!" });
  };

  const getLinkedProductName = (id: string | null) => {
    if (!id) return null;
    return shopProducts.find(p => p.id === id)?.name || "Ismeretlen";
  };

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITY_OPTIONS.find(o => o.value === priority);
    if (!p) return null;
    const colors: Record<string, string> = {
      low: "text-muted-foreground bg-secondary/40 border-border",
      normal: "text-foreground bg-secondary/40 border-border",
      high: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
      urgent: "text-destructive bg-destructive/10 border-destructive/20 animate-pulse",
    };
    return <span className={`border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${colors[priority] || ""}`}>{p.label}</span>;
  };

  // Filtering & sorting
  let filteredOrders = orders;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredOrders = filteredOrders.filter(o =>
      o.product_name.toLowerCase().includes(q) ||
      o.supplier_name.toLowerCase().includes(q) ||
      (o.product_sku && o.product_sku.toLowerCase().includes(q)) ||
      (o.tracking_number && o.tracking_number.toLowerCase().includes(q))
    );
  }
  if (filterOrderStatus !== "all") filteredOrders = filteredOrders.filter(o => o.order_status === filterOrderStatus);
  if (filterPaymentStatus !== "all") filteredOrders = filteredOrders.filter(o => o.payment_status === filterPaymentStatus);
  if (filterPriority !== "all") filteredOrders = filteredOrders.filter(o => o.priority === filterPriority);
  if (filterCategory !== "all") filteredOrders = filteredOrders.filter(o => o.category === filterCategory);

  filteredOrders = [...filteredOrders].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "total_cost") return (Number(a.total_cost) - Number(b.total_cost)) * dir;
    if (sortField === "margin_percent") return ((a.margin_percent || 0) - (b.margin_percent || 0)) * dir;
    if (sortField === "priority") {
      const pOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      return ((pOrder[a.priority as keyof typeof pOrder] || 0) - (pOrder[b.priority as keyof typeof pOrder] || 0)) * dir;
    }
    if (sortField === "expected_arrival") {
      return ((a.expected_arrival || "9999") > (b.expected_arrival || "9999") ? 1 : -1) * dir;
    }
    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
  });

  // Stats
  const totalSpent = orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + Number(o.total_cost || 0), 0);
  const pendingCount = orders.filter(o => o.order_status === "ordered" || o.order_status === "shipped").length;
  const totalProfit = orders.filter(o => o.selling_price > 0).reduce((s, o) => s + (o.selling_price - o.unit_cost) * o.quantity, 0);
  const urgentCount = orders.filter(o => o.priority === "urgent" || o.priority === "high").length;
  const avgMargin = orders.filter(o => o.margin_percent != null).reduce((s, o) => s + (o.margin_percent || 0), 0) / (orders.filter(o => o.margin_percent != null).length || 1);
  const overdueCount = orders.filter(o => o.expected_arrival && new Date(o.expected_arrival) < new Date() && o.order_status !== "received" && o.order_status !== "cancelled").length;
  const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.has(o.id));

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <h2 className="font-bold text-lg uppercase tracking-wider">Beszerzés / Előrendelés</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export
          </Button>
          <Button size="sm" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}>
            <Plus className="w-4 h-4 mr-1" /> Új beszerzés
          </Button>
        </div>
      </div>

      {/* Enhanced stats dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Összes</span>
          <p className="text-xl font-bold text-foreground">{orders.length}</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-accent">Folyamatban</span>
          <p className="text-xl font-bold text-accent">{pendingCount}</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Összköltség</span>
          <p className="text-lg font-bold text-foreground">{totalSpent.toLocaleString("hu-HU")} Ft</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-green-500">💰 Profit</span>
          <p className="text-lg font-bold text-green-500">{totalProfit.toLocaleString("hu-HU")} Ft</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Átl. margin</span>
          <p className="text-xl font-bold text-foreground">{avgMargin.toFixed(1)}%</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">ROI</span>
          <p className={`text-xl font-bold ${advAnalytics.roi > 0 ? "text-green-500" : "text-destructive"}`}>{advAnalytics.roi.toFixed(1)}%</p>
        </div>
        {urgentCount > 0 && (
          <div className="border border-destructive/30 bg-destructive/5 p-3">
            <span className="text-[10px] font-medium uppercase tracking-widest text-destructive">🔥 Sürgős</span>
            <p className="text-xl font-bold text-destructive">{urgentCount}</p>
          </div>
        )}
      </div>

      {/* Advanced analytics toggle */}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowAdvancedAnalytics(!showAdvancedAnalytics)}>
          <BarChart3 className="w-3.5 h-3.5 mr-1" /> {showAdvancedAnalytics ? "Analitika elrejtése" : "Részletes analitika"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowStats(!showStats)}>
          <BarChart3 className="w-4 h-4 mr-1" /> {showStats ? "Grafikonok elrejtése" : "Grafikonok"}
        </Button>
      </div>

      {/* Advanced analytics panel */}
      {showAdvancedAnalytics && (
        <div className="border border-accent/20 bg-accent/5 p-4 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" /> Részletes beszerzési analitika
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Ez a hónap</span>
              <p className="text-lg font-bold">{advAnalytics.thisMonthCount} rendelés</p>
              <p className="text-xs text-accent">{advAnalytics.thisMonthCost.toLocaleString("hu-HU")} Ft</p>
            </div>
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Előző hónap</span>
              <p className="text-lg font-bold">{advAnalytics.lastMonthCount} rendelés</p>
              <p className="text-xs text-muted-foreground">{advAnalytics.lastMonthCost.toLocaleString("hu-HU")} Ft</p>
            </div>
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Költség trend</span>
              <p className={`text-lg font-bold flex items-center gap-1 ${advAnalytics.costTrend > 0 ? "text-destructive" : "text-green-500"}`}>
                {advAnalytics.costTrend > 0 ? <TrendingUp className="w-4 h-4" /> : "↓"}
                {advAnalytics.costTrend > 0 ? "+" : ""}{advAnalytics.costTrend.toFixed(1)}%
              </p>
            </div>
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Átl. szállítási idő</span>
              <p className="text-lg font-bold">{advAnalytics.avgDeliveryDays.toFixed(1)} nap</p>
            </div>
          </div>

          {/* Supplier performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                <Star className="inline w-3 h-3 mr-1" />Top beszállítók (megbízhatóság)
              </span>
              <div className="space-y-2">
                {advAnalytics.topSuppliers.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium truncate mr-2">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{s.count} rendelés</span>
                      <span className={`font-bold ${s.reliability > 70 ? "text-green-500" : s.reliability > 40 ? "text-yellow-500" : "text-destructive"}`}>
                        {s.reliability}% ✓
                      </span>
                    </div>
                  </div>
                ))}
                {advAnalytics.topSuppliers.length === 0 && <p className="text-xs text-muted-foreground">Nincs adat</p>}
              </div>
            </div>
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                <Layers className="inline w-3 h-3 mr-1" />Kategória bontás
              </span>
              <div className="space-y-2">
                {advAnalytics.categoryBreakdown.map(([cat, cost], i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{CATEGORY_OPTIONS.find(c => c.value === cat)?.label || cat}</span>
                    <span className="font-bold text-accent">{Math.round(cost).toLocaleString("hu-HU")} Ft</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reorder alerts */}
      {advAnalytics.lowStockLinked.length > 0 && (
        <div className="border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-500">Újrarendelési javaslatok ({advAnalytics.lowStockLinked.length})</span>
          </div>
          {advAnalytics.lowStockLinked.slice(0, 3).map(({ order, product }, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-card border border-border p-2">
              <div>
                <span className="font-medium">{product.name}</span>
                <span className="text-destructive ml-2">({product.stock} db maradt)</span>
              </div>
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => duplicateOrder(order)}>
                <Copy className="w-3 h-3 mr-1" /> Újrarendelés
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {overdueCount > 0 && (
        <div className="border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
          <p className="text-sm font-bold text-yellow-500">{overdueCount} beszerzés határideje lejárt! Ellenőrizd a szállítást.</p>
        </div>
      )}

      {/* URL Import */}
      <div className="border border-border p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Link className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Termék importálása linkből</Label>
        </div>
        <p className="text-xs text-muted-foreground">Illeszd be bármely webshop terméklink-jét — az AI automatikusan kitölti az adatokat.</p>
        <div className="flex gap-2 mb-2">
          <Button size="sm" variant={importMode === "single" ? "default" : "outline"} onClick={() => setImportMode("single")}>Egy link</Button>
          <Button size="sm" variant={importMode === "batch" ? "default" : "outline"} onClick={() => setImportMode("batch")}>Tömeges (max 20)</Button>
        </div>
        {importMode === "single" ? (
          <div className="flex gap-2">
            <Input value={importUrl} onChange={e => setImportUrl(e.target.value)} placeholder="https://www.shein.com/product/..." className="flex-1" disabled={importing} />
            <Button size="sm" onClick={importFromUrl} disabled={importing || !importUrl.trim()}>
              {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Link className="w-4 h-4 mr-1" />}
              {importing ? "Importálás..." : "Importálás"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea value={batchUrls} onChange={e => setBatchUrls(e.target.value)} placeholder={"https://www.shein.com/product/1\nhttps://www.zara.com/product/2"} rows={5} className="w-full border border-border p-2 text-sm bg-background" disabled={importing} />
            <Button size="sm" onClick={importBatchFromUrls} disabled={importing || !batchUrls.trim()}>
              {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Package className="w-4 h-4 mr-1" />}
              {importing ? "Importálás folyamatban..." : "Összes importálása"}
            </Button>
          </div>
        )}
        {batchResults.length > 0 && (
          <div className="text-xs space-y-1 border-t border-border pt-2">
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

      {/* Stats & AI */}
      {showStats && <ProcurementStats orders={orders as any} />}
      <ProcurementAiChat />

      {/* Filters & search */}
      <div className="border border-border p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Szűrés & keresés</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Keresés..." className="h-8 text-xs pl-8" />
          </div>
          <Select value={filterOrderStatus} onValueChange={setFilterOrderStatus}>
            <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Rendelés" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mind</SelectItem>
              {ORDER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
            <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="Fizetés" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mind</SelectItem>
              {PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="Prioritás" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mind</SelectItem>
              {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="Kategória" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mind</SelectItem>
              {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={`${sortField}_${sortDir}`} onValueChange={v => {
            const parts = v.split("_");
            const d = parts.pop() as "asc" | "desc";
            const f = parts.join("_") as typeof sortField;
            setSortField(f); setSortDir(d);
          }}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at_desc">Legújabb</SelectItem>
              <SelectItem value="created_at_asc">Legrégebbi</SelectItem>
              <SelectItem value="total_cost_desc">Legdrágább</SelectItem>
              <SelectItem value="total_cost_asc">Legolcsóbb</SelectItem>
              <SelectItem value="margin_percent_desc">Legjobb margin</SelectItem>
              <SelectItem value="margin_percent_asc">Legrosszabb margin</SelectItem>
              <SelectItem value="priority_desc">Prioritás ↓</SelectItem>
              <SelectItem value="expected_arrival_asc">Érkezés ↑</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Batch actions */}
      {selectedIds.size > 0 && (
        <div className="border border-accent/30 bg-accent/5 p-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-accent">{selectedIds.size} kiválasztva</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => batchUpdateStatus("order_status", "ordered")}>
            <Package className="w-3 h-3 mr-1" /> Megrendelve
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => batchUpdateStatus("order_status", "received")}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Megérkezett
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => batchUpdateStatus("payment_status", "paid")}>
            <CreditCard className="w-3 h-3 mr-1" /> Kifizetve
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={batchDelete}>
            <Trash2 className="w-3 h-3 mr-1" /> Törlés
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
            Kiválasztás törlése
          </Button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="border border-accent/20 bg-accent/5 p-4 space-y-3">
          <h3 className="font-semibold uppercase tracking-wider text-sm">{editingId ? "Beszerzés szerkesztése" : "Új beszerzés rögzítése"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Beszállító neve *</Label>
              <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} placeholder="pl. Shein, AliExpress" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Beszállító URL</Label>
              <Input value={form.supplier_url} onChange={e => setForm({ ...form, supplier_url: e.target.value })} placeholder="https://..." className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Termék neve *</Label>
              <Input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} placeholder="pl. Oversize póló" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">SKU / Cikkszám</Label>
              <Input value={form.product_sku} onChange={e => setForm({ ...form, product_sku: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Mennyiség</Label>
              <Input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Beszerzési ár (egység)</Label>
              <Input type="number" min={0} value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Eladási ár</Label>
              <Input type="number" min={0} value={form.selling_price} onChange={e => setForm({ ...form, selling_price: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Pénznem</Label>
              <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HUF">HUF</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fizetési mód</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_card">💳 Bankkártya</SelectItem>
                  <SelectItem value="bank_transfer">🏦 Átutalás</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="cash">💵 Készpénz</SelectItem>
                  <SelectItem value="other">Egyéb</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prioritás</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Kategória</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Várható érkezés</Label>
              <Input type="date" value={form.expected_arrival} onChange={e => setForm({ ...form, expected_arrival: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Nyomkövetési szám</Label>
              <Input value={form.tracking_number} onChange={e => setForm({ ...form, tracking_number: e.target.value })} placeholder="Tracking #" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Webshop termék</Label>
              <Select value={form.linked_product_id || "none"} onValueChange={v => setForm({ ...form, linked_product_id: v === "none" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Válassz..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nincs —</SelectItem>
                  {shopProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock} db)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.selling_price > 0 && form.unit_cost > 0 && (
            <div className="bg-green-500/10 border border-green-500/20 p-3 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-green-500 font-bold">Kalkuláció</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                <div>
                  <span className="text-muted-foreground">Profit/db</span>
                  <p className="font-bold text-green-500">{(form.selling_price - form.unit_cost).toLocaleString()} {form.currency}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Margin</span>
                  <p className="font-bold text-green-500">{((form.selling_price - form.unit_cost) / form.selling_price * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Össz profit</span>
                  <p className="font-bold text-green-500">{((form.selling_price - form.unit_cost) * form.quantity).toLocaleString()} {form.currency}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Össz költség</span>
                  <p className="font-bold text-accent">{(form.unit_cost * form.quantity).toLocaleString()} {form.currency}</p>
                </div>
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Megjegyzés</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="text-xs" />
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
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => {
                    if (allSelected) setSelectedIds(new Set());
                    else setSelectedIds(new Set(filteredOrders.map(o => o.id)));
                  }}
                  className="accent-[hsl(var(--accent))]"
                />
              </TableHead>
              <TableHead className="text-[10px]">P</TableHead>
              <TableHead className="text-[10px]">Termék</TableHead>
              <TableHead className="text-[10px]">Beszállító</TableHead>
              <TableHead className="text-[10px]">Db</TableHead>
              <TableHead className="text-[10px]">Költség</TableHead>
              <TableHead className="text-[10px]">Eladási ár</TableHead>
              <TableHead className="text-[10px]">Margin</TableHead>
              <TableHead className="text-[10px]">Webshop</TableHead>
              <TableHead className="text-[10px]">Rendelés</TableHead>
              <TableHead className="text-[10px]">Fizetés</TableHead>
              <TableHead className="text-[10px]">Érkezés</TableHead>
              <TableHead className="text-[10px]">Tracking</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map(o => {
              const isOverdue = o.expected_arrival && new Date(o.expected_arrival) < new Date() && o.order_status !== "received" && o.order_status !== "cancelled";
              const orderStatusInfo = ORDER_STATUSES.find(s => s.value === o.order_status);
              const isSelected = selectedIds.has(o.id);
              const profitPerUnit = o.selling_price > 0 ? o.selling_price - o.unit_cost : 0;

              return (
                <TableRow key={o.id} className={`${isOverdue ? "bg-destructive/5" : ""} ${isSelected ? "bg-accent/5" : ""}`}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const next = new Set(selectedIds);
                        if (isSelected) next.delete(o.id); else next.add(o.id);
                        setSelectedIds(next);
                      }}
                      className="accent-[hsl(var(--accent))]"
                    />
                  </TableCell>
                  <TableCell>{getPriorityBadge(o.priority)}</TableCell>
                  <TableCell>
                    <p className="font-medium text-xs">{o.product_name}</p>
                    {o.product_sku && <p className="text-[10px] text-muted-foreground font-mono">{o.product_sku}</p>}
                    {o.category !== "general" && <span className="text-[9px] text-muted-foreground">{CATEGORY_OPTIONS.find(c => c.value === o.category)?.label}</span>}
                  </TableCell>
                  <TableCell>
                    {o.supplier_url ? (
                      <a href={o.supplier_url} target="_blank" rel="noopener noreferrer" className="text-xs underline">{o.supplier_name}</a>
                    ) : (
                      <span className="text-xs">{o.supplier_name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{o.quantity}</TableCell>
                  <TableCell className="text-xs font-medium">{Number(o.total_cost || 0).toLocaleString("hu-HU")} {o.currency}</TableCell>
                  <TableCell className="text-xs">{o.selling_price > 0 ? `${o.selling_price.toLocaleString("hu-HU")} ${o.currency}` : "—"}</TableCell>
                  <TableCell>
                    {o.margin_percent != null ? (
                      <span className={`text-xs font-bold ${o.margin_percent > 30 ? "text-green-500" : o.margin_percent > 15 ? "text-yellow-500" : "text-destructive"}`}>
                        {o.margin_percent.toFixed(1)}%
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {o.linked_product_id ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5">
                        <ArrowRight className="w-2.5 h-2.5" />{getLinkedProductName(o.linked_product_id)}
                      </span>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => autoLinkProduct(o)}>
                        <Zap className="w-3 h-3 mr-0.5" />Auto
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select value={o.order_status} onValueChange={v => updateField(o.id, "order_status", v)}>
                      <SelectTrigger className={`h-7 text-[10px] w-[110px] border ${orderStatusInfo?.color || ""}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={o.payment_status} onValueChange={v => updateField(o.id, "payment_status", v)}>
                      <SelectTrigger className="h-7 text-[10px] w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="text-[10px]">
                      {o.expected_arrival && (
                        <span className={isOverdue ? "text-destructive font-bold" : "text-muted-foreground"}>
                          {isOverdue && "⚠ "}
                          {new Date(o.expected_arrival).toLocaleDateString("hu-HU")}
                        </span>
                      )}
                      {o.actual_arrival && <p className="text-green-500">✓ {new Date(o.actual_arrival).toLocaleDateString("hu-HU")}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground font-mono">{o.tracking_number || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => edit(o)} title="Szerkesztés"><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateOrder(o)} title="Duplikálás"><Copy className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(o.id)} title="Törlés"><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                  {orders.length === 0 ? "Még nincs beszerzési rendelés." : "Nincs találat a szűrésre."}
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

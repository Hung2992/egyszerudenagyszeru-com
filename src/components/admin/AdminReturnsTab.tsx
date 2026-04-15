import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Pencil, Trash2, Check, RotateCcw, ArrowLeftRight, Save, CreditCard, Banknote,
  Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, DollarSign, FileText,
  Download, Search, Filter, TrendingDown, TrendingUp, Calendar, Eye, EyeOff,
  Zap, BarChart3, Shield, History, Copy, ChevronDown, ChevronUp
} from "lucide-react";

interface OrderDetails {
  total_amount: number;
  customer_email: string;
  shipping_name: string | null;
  status: string;
  payment_method: string | null;
}

interface ReturnRequest {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  request_type: string;
  status: string;
  refund_amount: number;
  exchange_product_id: string | null;
  admin_notes: string | null;
  description?: string | null;
  preferred_refund_method?: string | null;
  refund_status: string;
  refund_processed_at: string | null;
  refund_transaction_id: string | null;
  bank_card_last4: string | null;
  refund_notes: string | null;
  created_at: string;
  orders?: OrderDetails | OrderDetails[] | null;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Függőben", icon: Clock, color: "text-yellow-500" },
  { value: "approved", label: "Jóváhagyva", icon: CheckCircle2, color: "text-emerald-500" },
  { value: "rejected", label: "Elutasítva", icon: XCircle, color: "text-destructive" },
  { value: "processing", label: "Feldolgozás alatt", icon: RefreshCw, color: "text-blue-400" },
  { value: "completed", label: "Befejezve", icon: CheckCircle2, color: "text-green-500" },
];

const REFUND_STATUS_OPTIONS = [
  { value: "pending", label: "Visszatérítés függőben", icon: Clock, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  { value: "processing", label: "Visszatérítés folyamatban", icon: RefreshCw, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { value: "completed", label: "Visszatérítve ✓", icon: CheckCircle2, color: "text-green-500 bg-green-500/10 border-green-500/20" },
  { value: "failed", label: "Visszatérítés sikertelen", icon: AlertTriangle, color: "text-destructive bg-destructive/10 border-destructive/20" },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "border-border bg-secondary/40 text-muted-foreground",
  approved: "border-accent/20 bg-accent/10 text-accent",
  rejected: "border-destructive/20 bg-destructive/10 text-destructive",
  processing: "border-border bg-secondary/40 text-foreground",
  completed: "border-border bg-card text-foreground",
};

const getOrderDetails = (request: ReturnRequest): OrderDetails | null => {
  if (Array.isArray(request.orders)) return request.orders[0] ?? null;
  return request.orders ?? null;
};

const AdminReturnsTab = () => {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRefundStatus, setFilterRefundStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refundDrafts, setRefundDrafts] = useState<Record<string, string>>({});
  const [refundTransactionDrafts, setRefundTransactionDrafts] = useState<Record<string, string>>({});
  const [refundCardDrafts, setRefundCardDrafts] = useState<Record<string, string>>({});
  const [refundNotesDrafts, setRefundNotesDrafts] = useState<Record<string, string>>({});
  const [expandedRefund, setExpandedRefund] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sortField, setSortField] = useState<"created_at" | "refund_amount">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("return_requests")
      .select("*, orders(total_amount, customer_email, shipping_name, status, payment_method)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Nem sikerült betölteni a kérelmeket", description: error.message, variant: "destructive" });
      return;
    }

    const requestRows = (data || []) as ReturnRequest[];
    setRequests(requestRows);
    setRefundDrafts(Object.fromEntries(requestRows.map((r) => [r.id, String(r.refund_amount ?? 0)])));
    setRefundTransactionDrafts(Object.fromEntries(requestRows.map((r) => [r.id, r.refund_transaction_id || ""])));
    setRefundCardDrafts(Object.fromEntries(requestRows.map((r) => [r.id, r.bank_card_last4 || ""])));
    setRefundNotesDrafts(Object.fromEntries(requestRows.map((r) => [r.id, r.refund_notes || ""])));
  };

  useEffect(() => { fetchRequests(); }, []);

  // ====== ANALYTICS ======
  const analytics = useMemo(() => {
    const now = new Date();
    const thisMonth = requests.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = requests.filter(r => {
      const d = new Date(r.created_at);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });

    const totalRefunded = requests.filter(r => r.refund_status === "completed").reduce((s, r) => s + (r.refund_amount || 0), 0);
    const thisMonthRefunded = thisMonth.filter(r => r.refund_status === "completed").reduce((s, r) => s + (r.refund_amount || 0), 0);
    const lastMonthRefunded = lastMonth.filter(r => r.refund_status === "completed").reduce((s, r) => s + (r.refund_amount || 0), 0);
    const refundTrend = lastMonthRefunded > 0 ? ((thisMonthRefunded - lastMonthRefunded) / lastMonthRefunded * 100) : 0;

    const avgProcessingDays = requests
      .filter(r => r.refund_status === "completed" && r.refund_processed_at)
      .map(r => (new Date(r.refund_processed_at!).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))
      .reduce((s, d, _, a) => s + d / a.length, 0);

    const returnRate = requests.filter(r => r.request_type === "return").length;
    const exchangeRate = requests.filter(r => r.request_type === "exchange").length;
    const approvalRate = requests.length > 0
      ? (requests.filter(r => r.status === "approved" || r.status === "completed").length / requests.length * 100)
      : 0;

    const byReason: Record<string, number> = {};
    requests.forEach(r => { byReason[r.reason] = (byReason[r.reason] || 0) + 1; });
    const topReasons = Object.entries(byReason).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const bankCardRefunds = requests.filter(r => r.preferred_refund_method === "bank_card" && r.refund_status === "completed").length;
    const cashRefunds = requests.filter(r => r.preferred_refund_method === "cash" && r.refund_status === "completed").length;

    // Overdue: approved but no refund for >3 days
    const overdueRefunds = requests.filter(r => {
      if (r.status !== "approved" || r.refund_status === "completed" || r.refund_status === "failed") return false;
      const daysSince = (now.getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 3;
    });

    return {
      totalRefunded, thisMonthRefunded, lastMonthRefunded, refundTrend,
      avgProcessingDays, returnRate, exchangeRate, approvalRate,
      topReasons, bankCardRefunds, cashRefunds, overdueRefunds,
      thisMonthCount: thisMonth.length, lastMonthCount: lastMonth.length,
    };
  }, [requests]);

  const updateStatus = async (request: ReturnRequest, status: string) => {
    const updatePayload: Record<string, unknown> = { status };
    if (status === "rejected") {
      updatePayload.refund_amount = 0;
      updatePayload.refund_status = "failed";
    }
    if (status === "approved" && request.refund_status === "pending") {
      updatePayload.refund_status = "processing";
    }
    const { error } = await supabase.from("return_requests").update(updatePayload as any).eq("id", request.id);
    if (error) { toast({ title: "Státusz mentése sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Státusz frissítve: ${STATUS_OPTIONS.find(o => o.value === status)?.label}` });
    fetchRequests();
  };

  const updateRefundStatus = async (request: ReturnRequest, refundStatus: string) => {
    const updatePayload: Record<string, unknown> = { refund_status: refundStatus };
    if (refundStatus === "completed") {
      updatePayload.refund_processed_at = new Date().toISOString();
      if (request.status !== "completed") updatePayload.status = "completed";
    }
    const { error } = await supabase.from("return_requests").update(updatePayload as any).eq("id", request.id);
    if (error) { toast({ title: "Visszatérítés státusz mentése sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: refundStatus === "completed" ? "💰 Visszatérítés teljesítve!" : "Visszatérítés státusz frissítve" });
    fetchRequests();
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase.from("return_requests").update({ admin_notes: adminNotes.trim() || null } as any).eq("id", id);
    if (error) { toast({ title: "Megjegyzés mentése sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Megjegyzés mentve!" });
    setEditingId(null);
    setAdminNotes("");
    fetchRequests();
  };

  const saveRefundAmount = async (request: ReturnRequest) => {
    const refundAmount = Number(refundDrafts[request.id] ?? 0);
    const orderDetails = getOrderDetails(request);
    const orderTotal = Number(orderDetails?.total_amount ?? 0);
    if (Number.isNaN(refundAmount) || refundAmount < 0) { toast({ title: "Érvénytelen összeg", variant: "destructive" }); return; }
    if (request.status === "rejected") { toast({ title: "Elutasított kérelemhez nem menthető visszatérítés", variant: "destructive" }); return; }
    if (orderTotal > 0 && refundAmount > orderTotal) { toast({ title: "Túl magas visszatérítés", description: `Maximum: ${orderTotal.toLocaleString()} Ft`, variant: "destructive" }); return; }
    const { error } = await supabase.from("return_requests").update({ refund_amount: refundAmount } as any).eq("id", request.id);
    if (error) { toast({ title: "Visszatérítés mentése sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Visszatérítési összeg mentve" });
    fetchRequests();
  };

  const saveRefundDetails = async (request: ReturnRequest) => {
    const payload: Record<string, unknown> = {
      refund_transaction_id: refundTransactionDrafts[request.id]?.trim() || null,
      bank_card_last4: refundCardDrafts[request.id]?.trim() || null,
      refund_notes: refundNotesDrafts[request.id]?.trim() || null,
    };
    const { error } = await supabase.from("return_requests").update(payload as any).eq("id", request.id);
    if (error) { toast({ title: "Visszatérítés adatok mentése sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Visszatérítés részletek mentve ✓" });
    fetchRequests();
  };

  const processRefund = async (request: ReturnRequest) => {
    const refundAmount = Number(refundDrafts[request.id] ?? request.refund_amount ?? 0);
    if (refundAmount <= 0) { toast({ title: "Nincs visszatérítendő összeg", variant: "destructive" }); return; }
    const transactionId = refundTransactionDrafts[request.id]?.trim() || `REF-${Date.now().toString(36).toUpperCase()}`;
    const cardLast4 = refundCardDrafts[request.id]?.trim() || null;
    const refundNotes = refundNotesDrafts[request.id]?.trim() || null;
    const orderDetails = getOrderDetails(request);

    const payload: Record<string, unknown> = {
      refund_status: "completed",
      refund_processed_at: new Date().toISOString(),
      refund_amount: refundAmount,
      refund_transaction_id: transactionId,
      bank_card_last4: cardLast4,
      refund_notes: refundNotes,
      status: "completed",
    };
    const { error } = await supabase.from("return_requests").update(payload as any).eq("id", request.id);
    if (error) { toast({ title: "Visszatérítés feldolgozása sikertelen", description: error.message, variant: "destructive" }); return; }

    // Auto-create refund record in Financial Center
    const refundRecord: Record<string, unknown> = {
      order_id: request.order_id,
      customer_name: orderDetails?.shipping_name || orderDetails?.customer_email || "Ismeretlen vásárló",
      amount: refundAmount,
      currency: "HUF",
      reason: request.reason,
      method: request.preferred_refund_method === "bank_card" ? "bank_card" : request.preferred_refund_method === "cash" ? "cash" : "bank_transfer",
      status: "completed",
      bank_details: cardLast4 ? { card_last4: cardLast4 } : null,
      notes: `Auto: ${request.request_type === "return" ? "Visszáru" : "Csere"} #${request.order_id.slice(0, 8).toUpperCase()} — Tranzakció: ${transactionId}${refundNotes ? ` — ${refundNotes}` : ""}`,
    };
    await supabase.from("refunds").insert(refundRecord as any);

    // Auto-update order status to reflect refund
    if (request.order_id) {
      await supabase.from("orders").update({ status: "refunded" } as any).eq("id", request.order_id);
    }

    toast({ title: "💰 Visszatérítés sikeresen feldolgozva!", description: `${refundAmount.toLocaleString()} Ft visszatérítve — Pénzügyi Központba is rögzítve` });
    fetchRequests();
  };

  // ====== BATCH OPERATIONS ======
  const batchApprove = async () => {
    const ids = Array.from(selectedIds);
    const eligible = requests.filter(r => ids.includes(r.id) && r.status === "pending");
    if (eligible.length === 0) { toast({ title: "Nincs jóváhagyható kérelem a kiválasztottak között", variant: "destructive" }); return; }
    for (const req of eligible) {
      await supabase.from("return_requests").update({ status: "approved", refund_status: "processing" } as any).eq("id", req.id);
    }
    toast({ title: `${eligible.length} kérelem jóváhagyva!` });
    setSelectedIds(new Set());
    fetchRequests();
  };

  const batchProcessRefund = async () => {
    const ids = Array.from(selectedIds);
    const eligible = requests.filter(r => ids.includes(r.id) && r.status === "approved" && r.refund_status !== "completed" && r.refund_amount > 0);
    if (eligible.length === 0) { toast({ title: "Nincs feldolgozható visszatérítés", variant: "destructive" }); return; }
    for (const req of eligible) {
      const od = getOrderDetails(req);
      const txId = req.refund_transaction_id || `REF-${Date.now().toString(36).toUpperCase()}-${req.id.slice(0, 4)}`;
      await supabase.from("return_requests").update({
        refund_status: "completed",
        refund_processed_at: new Date().toISOString(),
        refund_transaction_id: txId,
        status: "completed",
      } as any).eq("id", req.id);

      // Auto-create refund in Financial Center
      await supabase.from("refunds").insert({
        order_id: req.order_id,
        customer_name: od?.shipping_name || od?.customer_email || "Ismeretlen",
        amount: req.refund_amount,
        currency: "HUF",
        reason: req.reason,
        method: req.preferred_refund_method === "bank_card" ? "bank_card" : "bank_transfer",
        status: "completed",
        notes: `Auto batch: ${req.request_type === "return" ? "Visszáru" : "Csere"} #${req.order_id.slice(0, 8).toUpperCase()} — ${txId}`,
      } as any);

      // Auto-update order
      await supabase.from("orders").update({ status: "refunded" } as any).eq("id", req.order_id);
    }
    toast({ title: `💰 ${eligible.length} visszatérítés feldolgozva!`, description: `Összesen: ${eligible.reduce((s, r) => s + r.refund_amount, 0).toLocaleString()} Ft — Pénzügyi Központba rögzítve` });
    setSelectedIds(new Set());
    fetchRequests();
  };

  const deleteRequest = async (id: string) => {
    const { error } = await supabase.from("return_requests").delete().eq("id", id);
    if (error) { toast({ title: "Kérelem törlése sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Kérelem törölve!" });
    fetchRequests();
  };

  // ====== EXPORT ======
  const exportCSV = () => {
    const headers = ["Rendelés kód", "Típus", "Státusz", "Visszatérítés státusz", "Összeg (Ft)", "Módszer", "Kártya", "Tranzakció ID", "Indok", "Dátum", "Feldolgozva"];
    const rows = requests.map(r => [
      `#${r.order_id.slice(0, 8).toUpperCase()}`,
      r.request_type === "return" ? "Visszaküldés" : "Csere",
      STATUS_OPTIONS.find(s => s.value === r.status)?.label || r.status,
      REFUND_STATUS_OPTIONS.find(s => s.value === r.refund_status)?.label || r.refund_status,
      r.refund_amount,
      r.preferred_refund_method === "bank_card" ? "Bankkártya" : r.preferred_refund_method === "cash" ? "Készpénz" : "-",
      r.bank_card_last4 ? `****${r.bank_card_last4}` : "-",
      r.refund_transaction_id || "-",
      r.reason,
      new Date(r.created_at).toLocaleDateString("hu-HU"),
      r.refund_processed_at ? new Date(r.refund_processed_at).toLocaleDateString("hu-HU") : "-",
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visszateritesek_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportálva!" });
  };

  // ====== FILTERING & SORTING ======
  let filtered = requests;
  if (filterStatus !== "all") filtered = filtered.filter(r => r.status === filterStatus);
  if (filterRefundStatus !== "all") filtered = filtered.filter(r => r.refund_status === filterRefundStatus);
  if (filterType !== "all") filtered = filtered.filter(r => r.request_type === filterType);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r => {
      const od = getOrderDetails(r);
      return r.order_id.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        (od?.customer_email && od.customer_email.toLowerCase().includes(q)) ||
        (od?.shipping_name && od.shipping_name.toLowerCase().includes(q)) ||
        (r.refund_transaction_id && r.refund_transaction_id.toLowerCase().includes(q));
    });
  }

  filtered = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "refund_amount") return (a.refund_amount - b.refund_amount) * dir;
    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const totalRefunded = requests.filter(r => r.refund_status === "completed").reduce((s, r) => s + (r.refund_amount || 0), 0);
  const pendingRefunds = requests.filter(r => r.refund_status === "processing" || (r.refund_status === "pending" && r.status === "approved"));
  const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allSelected) { setSelectedIds(new Set()); }
    else { setSelectedIds(new Set(filtered.map(r => r.id))); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold uppercase tracking-wider">
          Visszáru / Csere / Visszatérítés ({requests.length})
          {pendingCount > 0 && <span className="ml-2 text-sm text-accent">({pendingCount} függőben)</span>}
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAnalytics(!showAnalytics)}>
            <BarChart3 className="w-3.5 h-3.5 mr-1" /> {showAnalytics ? "Analitika elrejtése" : "Analitika"}
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Összes</span>
          <p className="text-xl font-bold text-foreground">{requests.length}</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-accent">Függőben</span>
          <p className="text-xl font-bold text-accent">{pendingCount}</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Visszaküldés</span>
          <p className="text-xl font-bold text-foreground">{analytics.returnRate}</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Csere</span>
          <p className="text-xl font-bold text-foreground">{analytics.exchangeRate}</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-green-500">💰 Visszatérítve</span>
          <p className="text-lg font-bold text-green-500">{totalRefunded.toLocaleString()} Ft</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Jóváhagyás %</span>
          <p className="text-xl font-bold text-foreground">{analytics.approvalRate.toFixed(0)}%</p>
        </div>
      </div>

      {/* Advanced analytics panel */}
      {showAnalytics && (
        <div className="border border-accent/20 bg-accent/5 p-4 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" /> Részletes analitika
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Ez a hónap</span>
              <p className="text-lg font-bold">{analytics.thisMonthCount} kérelem</p>
              <p className="text-xs text-green-500">{analytics.thisMonthRefunded.toLocaleString()} Ft visszatérítve</p>
            </div>
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Előző hónap</span>
              <p className="text-lg font-bold">{analytics.lastMonthCount} kérelem</p>
              <p className="text-xs text-muted-foreground">{analytics.lastMonthRefunded.toLocaleString()} Ft</p>
            </div>
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Visszatérítés trend</span>
              <p className={`text-lg font-bold flex items-center gap-1 ${analytics.refundTrend > 0 ? "text-destructive" : "text-green-500"}`}>
                {analytics.refundTrend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {analytics.refundTrend > 0 ? "+" : ""}{analytics.refundTrend.toFixed(1)}%
              </p>
            </div>
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Átl. feldolg. idő</span>
              <p className="text-lg font-bold">{analytics.avgProcessingDays.toFixed(1)} nap</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Visszatérítési módok</span>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold">{analytics.bankCardRefunds} bankkártyás</span>
                </div>
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-bold">{analytics.cashRefunds} készpénzes</span>
                </div>
              </div>
            </div>
            <div className="border border-border bg-card p-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Top visszaküldési okok</span>
              <div className="space-y-1">
                {analytics.topReasons.map(([reason, count], i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground truncate mr-2">{reason}</span>
                    <span className="font-bold text-accent">{count}</span>
                  </div>
                ))}
                {analytics.topReasons.length === 0 && <p className="text-xs text-muted-foreground">Nincs adat</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overdue refunds alert */}
      {analytics.overdueRefunds.length > 0 && (
        <div className="border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 animate-pulse" />
          <div>
            <p className="text-sm font-bold text-destructive">⚠ {analytics.overdueRefunds.length} visszatérítés késedelmes! (3+ nap)</p>
            <p className="text-xs text-muted-foreground">Összesen: {analytics.overdueRefunds.reduce((s, r) => s + (r.refund_amount || 0), 0).toLocaleString()} Ft</p>
          </div>
        </div>
      )}

      {/* Pending refunds alert */}
      {pendingRefunds.length > 0 && (
        <div className="border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-yellow-500">{pendingRefunds.length} visszatérítés vár feldolgozásra!</p>
            <p className="text-xs text-muted-foreground">Összesen: {pendingRefunds.reduce((s, r) => s + (r.refund_amount || 0), 0).toLocaleString()} Ft</p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="border border-border p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Szűrés & keresés</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Keresés (email, kód, tranzakció)..." className="h-8 text-xs pl-8" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-7 border border-input bg-background px-2 text-xs rounded-sm">
            <option value="all">Mind (státusz)</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterRefundStatus} onChange={e => setFilterRefundStatus(e.target.value)} className="h-7 border border-input bg-background px-2 text-xs rounded-sm">
            <option value="all">Mind (visszatérítés)</option>
            {REFUND_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-7 border border-input bg-background px-2 text-xs rounded-sm">
            <option value="all">Mind (típus)</option>
            <option value="return">Visszaküldés</option>
            <option value="exchange">Csere</option>
          </select>
          <select value={`${sortField}_${sortDir}`} onChange={e => {
            const [f, d] = e.target.value.split("_") as [typeof sortField, typeof sortDir];
            setSortField(f); setSortDir(d);
          }} className="h-7 border border-input bg-background px-2 text-xs rounded-sm">
            <option value="created_at_desc">Legújabb</option>
            <option value="created_at_asc">Legrégebbi</option>
            <option value="refund_amount_desc">Legnagyobb összeg</option>
            <option value="refund_amount_asc">Legkisebb összeg</option>
          </select>
        </div>
      </div>

      {/* Batch actions */}
      {selectedIds.size > 0 && (
        <div className="border border-accent/30 bg-accent/5 p-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-accent">{selectedIds.size} kiválasztva</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={batchApprove}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Tömeges jóváhagyás
          </Button>
          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={batchProcessRefund}>
            <Zap className="w-3 h-3 mr-1" /> Tömeges visszatérítés
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
            Kiválasztás törlése
          </Button>
        </div>
      )}

      {/* Requests list */}
      <div className="space-y-3">
        {/* Select all */}
        {filtered.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="accent-[hsl(var(--accent))]" />
            Összes kiválasztása ({filtered.length})
          </label>
        )}

        {filtered.map((request) => {
          const orderDetails = getOrderDetails(request);
          const orderTotal = Number(orderDetails?.total_amount ?? 0);
          const isRejected = request.status === "rejected";
          const refundStatusInfo = REFUND_STATUS_OPTIONS.find(s => s.value === request.refund_status) || REFUND_STATUS_OPTIONS[0];
          const RefundIcon = refundStatusInfo.icon;
          const isRefundExpanded = expandedRefund === request.id;
          const isSelected = selectedIds.has(request.id);
          const daysSinceCreated = Math.floor((Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24));
          const isOverdue = request.status === "approved" && request.refund_status !== "completed" && request.refund_status !== "failed" && daysSinceCreated > 3;
          const refundPercent = orderTotal > 0 ? ((request.refund_amount / orderTotal) * 100) : 0;

          return (
            <div key={request.id} className={`space-y-3 border p-4 transition-colors ${isOverdue ? "border-destructive/40 bg-destructive/5" : isSelected ? "border-accent/40 bg-accent/5" : "border-border bg-card"}`}>
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      const next = new Set(selectedIds);
                      if (isSelected) next.delete(request.id); else next.add(request.id);
                      setSelectedIds(next);
                    }}
                    className="mt-1 accent-[hsl(var(--accent))]"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {request.request_type === "return" ? <RotateCcw className="h-4 w-4 text-accent" /> : <ArrowLeftRight className="h-4 w-4 text-accent" />}
                      <span className="text-sm font-semibold text-foreground">{request.request_type === "return" ? "Visszaküldés" : "Csere"}</span>
                      <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE_STYLES[request.status] || STATUS_BADGE_STYLES.pending}`}>
                        {STATUS_OPTIONS.find(s => s.value === request.status)?.label || request.status}
                      </span>
                      {request.request_type === "return" && (
                        <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${refundStatusInfo.color}`}>
                          <RefundIcon className="h-3 w-3" />
                          {refundStatusInfo.label}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="rounded-sm border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive animate-pulse">
                          ⚠ KÉSEDELMES
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-mono text-accent">#{request.order_id.slice(0, 8).toUpperCase()}</span>
                      {" • "}{new Date(request.created_at).toLocaleDateString("hu-HU")}
                      {" • "}<Clock className="inline h-3 w-3" /> {daysSinceCreated} napja
                    </p>
                    {orderDetails && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {orderDetails.shipping_name ? `${orderDetails.shipping_name} • ` : ""}
                        {orderDetails.customer_email} • Rendelés: {orderTotal.toLocaleString()} Ft
                        {orderDetails.payment_method && ` • Fizetve: ${orderDetails.payment_method === "card" ? "💳 Kártyával" : orderDetails.payment_method}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={request.status} onChange={e => updateStatus(request, e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-xs">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRequest(request.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-muted/50 p-3 text-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Indok</span>
                <p className="mt-1 text-foreground">{request.reason}</p>
              </div>

              {request.description && (
                <div className="bg-secondary/30 p-3 text-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vásárlói megjegyzés</span>
                  <p className="mt-1 text-foreground">{request.description}</p>
                </div>
              )}

              {/* Preferred refund method */}
              {request.preferred_refund_method && (
                <div className="bg-secondary/30 p-3 text-sm flex items-center gap-3">
                  {request.preferred_refund_method === "bank_card" ? <CreditCard className="h-5 w-5 text-blue-400" /> : <Banknote className="h-5 w-5 text-green-500" />}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vásárló kért visszatérítési módja</span>
                    <p className="font-bold text-foreground">
                      {request.preferred_refund_method === "bank_card" ? "💳 Bankkártyára visszatérítés" : "💵 Készpénz visszatérítés"}
                    </p>
                  </div>
                </div>
              )}

              {/* ====== REFUND MANAGEMENT PANEL ====== */}
              <div className="border-2 border-accent/20 bg-accent/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {request.request_type === "exchange" ? "Árkülönbözet / visszatérítés kezelése" : "💰 Visszatérítés kezelése"}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpandedRefund(isRefundExpanded ? null : request.id)}>
                    {isRefundExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                    {isRefundExpanded ? "Összezár" : "Részletek"}
                  </Button>
                </div>

                {/* Refund amount + quick set buttons */}
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="number" min={0} step="1"
                    value={refundDrafts[request.id] ?? "0"}
                    onChange={e => setRefundDrafts(c => ({ ...c, [request.id]: e.target.value }))}
                    className="h-9 flex-1 min-w-[120px]"
                    placeholder="0"
                    disabled={isRejected}
                  />
                  {orderTotal > 0 && (
                    <>
                      <Button size="sm" variant="outline" className="rounded-none text-[10px] h-9" onClick={() => setRefundDrafts(c => ({ ...c, [request.id]: String(orderTotal) }))} disabled={isRejected}>100%</Button>
                      <Button size="sm" variant="outline" className="rounded-none text-[10px] h-9" onClick={() => setRefundDrafts(c => ({ ...c, [request.id]: String(Math.round(orderTotal * 0.5)) }))} disabled={isRejected}>50%</Button>
                      <Button size="sm" variant="outline" className="rounded-none text-[10px] h-9" onClick={() => setRefundDrafts(c => ({ ...c, [request.id]: String(Math.round(orderTotal * 0.25)) }))} disabled={isRejected}>25%</Button>
                    </>
                  )}
                  <Button size="sm" className="rounded-none" onClick={() => saveRefundAmount(request)} disabled={isRejected}>
                    <Save className="mr-1 h-3.5 w-3.5" /> Mentés
                  </Button>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Aktuális: <span className="font-bold text-accent">{(request.refund_amount || 0).toLocaleString()} Ft</span>
                    {orderTotal > 0 && <span> • Max: {orderTotal.toLocaleString()} Ft</span>}
                  </span>
                  {refundPercent > 0 && (
                    <span className="font-bold text-accent">{refundPercent.toFixed(0)}% visszatérítés</span>
                  )}
                </div>

                {/* Refund progress bar */}
                {orderTotal > 0 && request.refund_amount > 0 && (
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${Math.min(refundPercent, 100)}%` }}
                    />
                  </div>
                )}

                {/* Refund status controls */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground self-center mr-1">Visszatérítés státusz:</span>
                  {REFUND_STATUS_OPTIONS.map(rs => {
                    const RSIcon = rs.icon;
                    return (
                      <button
                        key={rs.value}
                        onClick={() => updateRefundStatus(request, rs.value)}
                        disabled={isRejected}
                        className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${
                          request.refund_status === rs.value ? rs.color : "text-muted-foreground border-border hover:border-accent/30"
                        } ${isRejected ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <RSIcon className="h-3 w-3" />{rs.label}
                      </button>
                    );
                  })}
                </div>

                {/* Expanded refund details */}
                {isRefundExpanded && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tranzakció azonosító</label>
                        <Input
                          value={refundTransactionDrafts[request.id] || ""}
                          onChange={e => setRefundTransactionDrafts(c => ({ ...c, [request.id]: e.target.value }))}
                          placeholder="REF-XXXXXXXX"
                          className="mt-1 h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bankkártya utolsó 4 szám</label>
                        <Input
                          value={refundCardDrafts[request.id] || ""}
                          onChange={e => setRefundCardDrafts(c => ({ ...c, [request.id]: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                          placeholder="1234"
                          maxLength={4}
                          className="mt-1 h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visszatérítés megjegyzés</label>
                      <Textarea
                        value={refundNotesDrafts[request.id] || ""}
                        onChange={e => setRefundNotesDrafts(c => ({ ...c, [request.id]: e.target.value }))}
                        placeholder="Pl. Bankkártyára visszautalva 2 munkanapon belül..."
                        className="mt-1 min-h-[50px] text-xs"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={() => saveRefundDetails(request)}>
                        <FileText className="mr-1 h-3 w-3" /> Részletek mentése
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-none text-xs bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => processRefund(request)}
                        disabled={isRejected || request.refund_status === "completed"}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {request.refund_status === "completed" ? "Visszatérítve ✓" : "Visszatérítés véglegesítése"}
                      </Button>
                    </div>

                    {/* Completed refund info */}
                    {request.refund_status === "completed" && request.refund_processed_at && (
                      <div className="bg-green-500/10 border border-green-500/20 p-3 text-xs space-y-1">
                        <p className="font-bold text-green-500">✅ Visszatérítés teljesítve</p>
                        <p className="text-muted-foreground">Dátum: {new Date(request.refund_processed_at).toLocaleString("hu-HU")}</p>
                        {request.refund_transaction_id && <p className="text-muted-foreground">Tranzakció: <span className="font-mono">{request.refund_transaction_id}</span></p>}
                        {request.bank_card_last4 && <p className="text-muted-foreground">Kártya: •••• {request.bank_card_last4}</p>}
                        {request.refund_notes && <p className="text-muted-foreground">Megjegyzés: {request.refund_notes}</p>}
                        <p className="text-muted-foreground">Feldolgozási idő: {Math.ceil((new Date(request.refund_processed_at).getTime() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24))} nap</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Admin notes */}
              {editingId === request.id ? (
                <div className="space-y-2">
                  <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className="min-h-[60px] rounded-none text-xs" placeholder="Admin megjegyzés..." />
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-none text-xs" onClick={() => saveNotes(request.id)}><Check className="mr-1 h-3 w-3" /> Mentés</Button>
                    <Button size="sm" variant="ghost" className="rounded-none text-xs" onClick={() => setEditingId(null)}>Mégse</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {request.admin_notes && <p className="flex-1 text-xs italic text-muted-foreground">{request.admin_notes}</p>}
                  <Button size="sm" variant="ghost" className="rounded-none text-xs" onClick={() => { setEditingId(request.id); setAdminNotes(request.admin_notes || ""); }}>
                    <Pencil className="mr-1 h-3 w-3" /> Megjegyzés
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nincs visszáru/csere kérelem.</p>}
      </div>
    </div>
  );
};

export default AdminReturnsTab;

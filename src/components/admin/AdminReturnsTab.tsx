import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Check, RotateCcw, ArrowLeftRight, Save, CreditCard, Banknote, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, DollarSign, FileText } from "lucide-react";

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
  const [refundDrafts, setRefundDrafts] = useState<Record<string, string>>({});
  const [refundTransactionDrafts, setRefundTransactionDrafts] = useState<Record<string, string>>({});
  const [refundCardDrafts, setRefundCardDrafts] = useState<Record<string, string>>({});
  const [refundNotesDrafts, setRefundNotesDrafts] = useState<Record<string, string>>({});
  const [expandedRefund, setExpandedRefund] = useState<string | null>(null);

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
    if (error) {
      toast({ title: "Státusz mentése sikertelen", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Státusz frissítve: ${STATUS_OPTIONS.find((o) => o.value === status)?.label}` });
    fetchRequests();
  };

  const updateRefundStatus = async (request: ReturnRequest, refundStatus: string) => {
    const updatePayload: Record<string, unknown> = { refund_status: refundStatus };
    if (refundStatus === "completed") {
      updatePayload.refund_processed_at = new Date().toISOString();
      if (request.status !== "completed") {
        updatePayload.status = "completed";
      }
    }
    const { error } = await supabase.from("return_requests").update(updatePayload as any).eq("id", request.id);
    if (error) {
      toast({ title: "Visszatérítés státusz mentése sikertelen", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: refundStatus === "completed" ? "💰 Visszatérítés teljesítve!" : "Visszatérítés státusz frissítve" });
    fetchRequests();
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase.from("return_requests").update({ admin_notes: adminNotes.trim() || null } as any).eq("id", id);
    if (error) {
      toast({ title: "Megjegyzés mentése sikertelen", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Megjegyzés mentve!" });
    setEditingId(null);
    setAdminNotes("");
    fetchRequests();
  };

  const saveRefundAmount = async (request: ReturnRequest) => {
    const refundAmount = Number(refundDrafts[request.id] ?? 0);
    const orderDetails = getOrderDetails(request);
    const orderTotal = Number(orderDetails?.total_amount ?? 0);

    if (Number.isNaN(refundAmount) || refundAmount < 0) {
      toast({ title: "Érvénytelen összeg", variant: "destructive" });
      return;
    }
    if (request.status === "rejected") {
      toast({ title: "Elutasított kérelemhez nem menthető visszatérítés", variant: "destructive" });
      return;
    }
    if (orderTotal > 0 && refundAmount > orderTotal) {
      toast({ title: "Túl magas visszatérítés", description: `Maximum: ${orderTotal.toLocaleString()} Ft`, variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("return_requests").update({ refund_amount: refundAmount } as any).eq("id", request.id);
    if (error) {
      toast({ title: "Visszatérítés mentése sikertelen", description: error.message, variant: "destructive" });
      return;
    }
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
    if (error) {
      toast({ title: "Visszatérítés adatok mentése sikertelen", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Visszatérítés részletek mentve ✓" });
    fetchRequests();
  };

  const processRefund = async (request: ReturnRequest) => {
    const refundAmount = Number(refundDrafts[request.id] ?? request.refund_amount ?? 0);
    if (refundAmount <= 0) {
      toast({ title: "Nincs visszatérítendő összeg", variant: "destructive" });
      return;
    }

    const payload: Record<string, unknown> = {
      refund_status: "completed",
      refund_processed_at: new Date().toISOString(),
      refund_amount: refundAmount,
      refund_transaction_id: refundTransactionDrafts[request.id]?.trim() || `REF-${Date.now().toString(36).toUpperCase()}`,
      bank_card_last4: refundCardDrafts[request.id]?.trim() || null,
      refund_notes: refundNotesDrafts[request.id]?.trim() || null,
      status: "completed",
    };

    const { error } = await supabase.from("return_requests").update(payload as any).eq("id", request.id);
    if (error) {
      toast({ title: "Visszatérítés feldolgozása sikertelen", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "💰 Visszatérítés sikeresen feldolgozva!", description: `${refundAmount.toLocaleString()} Ft visszatérítve` });
    fetchRequests();
  };

  const deleteRequest = async (id: string) => {
    const { error } = await supabase.from("return_requests").delete().eq("id", id);
    if (error) {
      toast({ title: "Kérelem törlése sikertelen", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Kérelem törölve!" });
    fetchRequests();
  };

  const filtered = filterStatus === "all" ? requests : requests.filter((r) => r.status === filterStatus);
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const totalRefunded = requests.filter(r => r.refund_status === "completed").reduce((s, r) => s + (r.refund_amount || 0), 0);
  const pendingRefunds = requests.filter(r => r.refund_status === "processing" || (r.refund_status === "pending" && r.status === "approved"));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">
          Visszáru / Csere / Visszatérítés ({requests.length})
          {pendingCount > 0 && <span className="ml-2 text-sm text-accent">({pendingCount} függőben)</span>}
        </h2>
      </div>

      {/* Enhanced stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
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
          <p className="text-xl font-bold text-foreground">{requests.filter((r) => r.request_type === "return").length}</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Csere</span>
          <p className="text-xl font-bold text-foreground">{requests.filter((r) => r.request_type === "exchange").length}</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-green-500">💰 Visszatérítve</span>
          <p className="text-xl font-bold text-green-500">{totalRefunded.toLocaleString()} Ft</p>
        </div>
      </div>

      {/* Pending refunds alert */}
      {pendingRefunds.length > 0 && (
        <div className="border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-yellow-500">{pendingRefunds.length} visszatérítés vár feldolgozásra!</p>
            <p className="text-xs text-muted-foreground">Összesen: {pendingRefunds.reduce((s, r) => s + (r.refund_amount || 0), 0).toLocaleString()} Ft</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterStatus("all")} className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${filterStatus === "all" ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground"}`}>Mind</button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s.value} onClick={() => setFilterStatus(s.value)} className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${filterStatus === s.value ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground"}`}>{s.label}</button>
        ))}
      </div>

      {/* Requests list */}
      <div className="space-y-3">
        {filtered.map((request) => {
          const orderDetails = getOrderDetails(request);
          const orderTotal = Number(orderDetails?.total_amount ?? 0);
          const isRejected = request.status === "rejected";
          const refundStatusInfo = REFUND_STATUS_OPTIONS.find(s => s.value === request.refund_status) || REFUND_STATUS_OPTIONS[0];
          const RefundIcon = refundStatusInfo.icon;
          const isRefundExpanded = expandedRefund === request.id;

          return (
            <div key={request.id} className="space-y-3 border border-border bg-card p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {request.request_type === "return" ? <RotateCcw className="h-4 w-4 text-accent" /> : <ArrowLeftRight className="h-4 w-4 text-accent" />}
                    <span className="text-sm font-semibold text-foreground">{request.request_type === "return" ? "Visszaküldés" : "Csere"}</span>
                    <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE_STYLES[request.status] || STATUS_BADGE_STYLES.pending}`}>
                      {STATUS_OPTIONS.find((s) => s.value === request.status)?.label || request.status}
                    </span>
                    {/* Refund status badge */}
                    {request.request_type === "return" && (
                      <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${refundStatusInfo.color}`}>
                        <RefundIcon className="h-3 w-3" />
                        {refundStatusInfo.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    #{request.order_id.slice(0, 8).toUpperCase()} • {new Date(request.created_at).toLocaleDateString("hu-HU")}
                  </p>
                  {orderDetails && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {orderDetails.shipping_name ? `${orderDetails.shipping_name} • ` : ""}
                      {orderDetails.customer_email} • Rendelés: {orderTotal.toLocaleString()} Ft
                      {orderDetails.payment_method && ` • Fizetve: ${orderDetails.payment_method === "card" ? "💳 Kártyával" : orderDetails.payment_method}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select value={request.status} onChange={(e) => updateStatus(request, e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-xs">
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
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
                    {isRefundExpanded ? "Összezár" : "Részletek"}
                  </Button>
                </div>

                {/* Refund amount */}
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="number" min={0} step="1"
                    value={refundDrafts[request.id] ?? "0"}
                    onChange={(e) => setRefundDrafts((c) => ({ ...c, [request.id]: e.target.value }))}
                    className="h-9 flex-1 min-w-[120px]"
                    placeholder="0"
                    disabled={isRejected}
                  />
                  {request.request_type === "return" && orderTotal > 0 && (
                    <Button size="sm" variant="outline" className="rounded-none" onClick={() => setRefundDrafts((c) => ({ ...c, [request.id]: String(orderTotal) }))} disabled={isRejected}>
                      Teljes összeg
                    </Button>
                  )}
                  <Button size="sm" className="rounded-none" onClick={() => saveRefundAmount(request)} disabled={isRejected}>
                    <Save className="mr-1 h-3.5 w-3.5" /> Összeg mentése
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Aktuális: <span className="font-bold text-accent">{(request.refund_amount || 0).toLocaleString()} Ft</span>
                  {orderTotal > 0 && <span> • Maximum: {orderTotal.toLocaleString()} Ft</span>}
                </p>

                {/* Refund status controls */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground self-center mr-1">Visszatérítés státusz:</span>
                  {REFUND_STATUS_OPTIONS.map((rs) => {
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
                          onChange={(e) => setRefundTransactionDrafts(c => ({ ...c, [request.id]: e.target.value }))}
                          placeholder="REF-XXXXXXXX"
                          className="mt-1 h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bankkártya utolsó 4 szám</label>
                        <Input
                          value={refundCardDrafts[request.id] || ""}
                          onChange={(e) => setRefundCardDrafts(c => ({ ...c, [request.id]: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
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
                        onChange={(e) => setRefundNotesDrafts(c => ({ ...c, [request.id]: e.target.value }))}
                        placeholder="Pl. Bankkártyára visszautalva 2 munkanapon belül..."
                        className="mt-1 min-h-[50px] text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
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
                        {request.refund_transaction_id && <p className="text-muted-foreground">Tranzakció: {request.refund_transaction_id}</p>}
                        {request.bank_card_last4 && <p className="text-muted-foreground">Kártya: •••• {request.bank_card_last4}</p>}
                        {request.refund_notes && <p className="text-muted-foreground">Megjegyzés: {request.refund_notes}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Admin notes */}
              {editingId === request.id ? (
                <div className="space-y-2">
                  <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="min-h-[60px] rounded-none text-xs" placeholder="Admin megjegyzés..." />
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

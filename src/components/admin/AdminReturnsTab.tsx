import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Check, RotateCcw, ArrowLeftRight, Save } from "lucide-react";

interface OrderDetails {
  total_amount: number;
  customer_email: string;
  shipping_name: string | null;
  status: string;
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
  created_at: string;
  orders?: OrderDetails | OrderDetails[] | null;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Függőben" },
  { value: "approved", label: "Jóváhagyva" },
  { value: "rejected", label: "Elutasítva" },
  { value: "processing", label: "Feldolgozás alatt" },
  { value: "completed", label: "Befejezve" },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "border-border bg-secondary/40 text-muted-foreground",
  approved: "border-accent/20 bg-accent/10 text-accent",
  rejected: "border-destructive/20 bg-destructive/10 text-destructive",
  processing: "border-border bg-secondary/40 text-foreground",
  completed: "border-border bg-card text-foreground",
};

const getOrderDetails = (request: ReturnRequest): OrderDetails | null => {
  if (Array.isArray(request.orders)) {
    return request.orders[0] ?? null;
  }

  return request.orders ?? null;
};

const AdminReturnsTab = () => {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [refundDrafts, setRefundDrafts] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("return_requests")
      .select("*, orders(total_amount, customer_email, shipping_name, status)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Nem sikerült betölteni a kérelmeket", description: error.message, variant: "destructive" });
      return;
    }

    const requestRows = (data || []) as ReturnRequest[];
    setRequests(requestRows);
    setRefundDrafts(Object.fromEntries(requestRows.map((request) => [request.id, String(request.refund_amount ?? 0)])));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (request: ReturnRequest, status: string) => {
    const updatePayload: Record<string, unknown> = { status };

    if (status === "rejected") {
      updatePayload.refund_amount = 0;
    }

    const { error } = await supabase.from("return_requests").update(updatePayload as any).eq("id", request.id);

    if (error) {
      toast({ title: "Státusz mentése sikertelen", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: `Státusz frissítve: ${STATUS_OPTIONS.find((option) => option.value === status)?.label}` });
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
      toast({ title: "Érvénytelen összeg", description: "A visszatérítés összege nem lehet negatív.", variant: "destructive" });
      return;
    }

    if (request.status === "rejected") {
      toast({ title: "Elutasított kérelemhez nem menthető visszatérítés", variant: "destructive" });
      return;
    }

    if (orderTotal > 0 && refundAmount > orderTotal) {
      toast({
        title: "Túl magas visszatérítés",
        description: `A visszatérítés maximuma ennél a rendelésnél ${orderTotal.toLocaleString()} Ft lehet.`,
        variant: "destructive",
      });
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

  const deleteRequest = async (id: string) => {
    const { error } = await supabase.from("return_requests").delete().eq("id", id);

    if (error) {
      toast({ title: "Kérelem törlése sikertelen", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Kérelem törölve!" });
    fetchRequests();
  };

  const filtered = filterStatus === "all" ? requests : requests.filter((request) => request.status === filterStatus);
  const pendingCount = requests.filter((request) => request.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">
          Visszáru / Csere ({requests.length})
          {pendingCount > 0 && <span className="ml-2 text-sm text-accent">({pendingCount} függőben)</span>}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
          <p className="text-xl font-bold text-foreground">{requests.filter((request) => request.request_type === "return").length}</p>
        </div>
        <div className="border border-border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Csere</span>
          <p className="text-xl font-bold text-foreground">{requests.filter((request) => request.request_type === "exchange").length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus("all")}
          className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${filterStatus === "all" ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground"}`}
        >
          Mind
        </button>
        {STATUS_OPTIONS.map((statusOption) => (
          <button
            key={statusOption.value}
            onClick={() => setFilterStatus(statusOption.value)}
            className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${filterStatus === statusOption.value ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground"}`}
          >
            {statusOption.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((request) => {
          const orderDetails = getOrderDetails(request);
          const orderTotal = Number(orderDetails?.total_amount ?? 0);
          const isRejected = request.status === "rejected";

          return (
            <div key={request.id} className="space-y-3 border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {request.request_type === "return" ? <RotateCcw className="h-4 w-4 text-accent" /> : <ArrowLeftRight className="h-4 w-4 text-accent" />}
                    <span className="text-sm font-semibold text-foreground">{request.request_type === "return" ? "Visszaküldés" : "Csere"}</span>
                    <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE_STYLES[request.status] || STATUS_BADGE_STYLES.pending}`}>
                      {STATUS_OPTIONS.find((statusOption) => statusOption.value === request.status)?.label || request.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">#{request.order_id.slice(0, 8)} • {new Date(request.created_at).toLocaleDateString("hu-HU")}</p>
                  {orderDetails && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {orderDetails.shipping_name ? `${orderDetails.shipping_name} • ` : ""}
                      {orderDetails.customer_email} • Rendelés: {orderTotal.toLocaleString()} Ft
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={request.status}
                    onChange={(event) => updateStatus(request, event.target.value)}
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {STATUS_OPTIONS.map((statusOption) => (
                      <option key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </option>
                    ))}
                  </select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRequest(request.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

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

              <div className="space-y-2 border border-border p-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {request.request_type === "exchange" ? "Árkülönbözet / visszatérítés kezelése" : "Visszatérítés kezelése"}
                </span>

                <div className="flex flex-wrap gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={refundDrafts[request.id] ?? "0"}
                    onChange={(event) => setRefundDrafts((current) => ({ ...current, [request.id]: event.target.value }))}
                    className="h-9 flex-1"
                    placeholder="0"
                    disabled={isRejected}
                  />

                  {request.request_type === "return" && orderTotal > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => setRefundDrafts((current) => ({ ...current, [request.id]: String(orderTotal) }))}
                      disabled={isRejected}
                    >
                      Teljes összeg
                    </Button>
                  )}

                  <Button size="sm" className="rounded-none" onClick={() => saveRefundAmount(request)} disabled={isRejected}>
                    <Save className="mr-1 h-3.5 w-3.5" /> Mentés
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Aktuális összeg: <span className="font-bold text-accent">{(request.refund_amount || 0).toLocaleString()} Ft</span>
                  {orderTotal > 0 && <span> • Maximum: {orderTotal.toLocaleString()} Ft</span>}
                </p>
              </div>

              {editingId === request.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    className="min-h-[60px] rounded-none text-xs"
                    placeholder="Admin megjegyzés..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-none text-xs" onClick={() => saveNotes(request.id)}>
                      <Check className="mr-1 h-3 w-3" /> Mentés
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-none text-xs" onClick={() => setEditingId(null)}>
                      Mégse
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {request.admin_notes && <p className="flex-1 text-xs italic text-muted-foreground">{request.admin_notes}</p>}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-none text-xs"
                    onClick={() => {
                      setEditingId(request.id);
                      setAdminNotes(request.admin_notes || "");
                    }}
                  >
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

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Check, RotateCcw, ArrowLeftRight, Save } from "lucide-react";

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
  orders?: {
    total_amount: number;
    customer_email: string;
    shipping_name: string | null;
    status: string;
  } | {
    total_amount: number;
    customer_email: string;
    shipping_name: string | null;
    status: string;
  }[] | null;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Függőben", color: "text-yellow-500" },
  { value: "approved", label: "Jóváhagyva", color: "text-green-500" },
  { value: "rejected", label: "Elutasítva", color: "text-destructive" },
  { value: "processing", label: "Feldolgozás alatt", color: "text-blue-400" },
  { value: "completed", label: "Befejezve", color: "text-accent" },
];

const AdminReturnsTab = () => {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [refundDrafts, setRefundDrafts] = useState<Record<string, string>>({});

  const getOrderDetails = (request: ReturnRequest) => {
    if (Array.isArray(request.orders)) {
      return request.orders[0] ?? null;
    }

    return request.orders ?? null;
  };

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

  useEffect(() => { fetchRequests(); }, []);

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

    toast({ title: `Státusz frissítve: ${STATUS_OPTIONS.find(s => s.value === status)?.label}` });
    fetchRequests();
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase.from("return_requests").update({ admin_notes: adminNotes } as any).eq("id", id);

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
        variant: "destructive"
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

  const filtered = filterStatus === "all" ? requests : requests.filter(r => r.status === filterStatus);
  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">
          Visszáru / Csere ({requests.length})
          {pendingCount > 0 && <span className="ml-2 text-sm text-yellow-500">({pendingCount} függőben)</span>}
        </h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Összes</span>
          <p className="text-xl font-bold">{requests.length}</p>
        </div>
        <div className="border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-yellow-500">Függőben</span>
          <p className="text-xl font-bold text-yellow-500">{pendingCount}</p>
        </div>
        <div className="border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Visszaküldés</span>
          <p className="text-xl font-bold">{requests.filter(r => r.request_type === "return").length}</p>
        </div>
        <div className="border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Csere</span>
          <p className="text-xl font-bold">{requests.filter(r => r.request_type === "exchange").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus("all")} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${filterStatus === "all" ? "border-accent text-accent bg-accent/10" : "text-muted-foreground"}`}>Mind</button>
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value)} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${filterStatus === s.value ? "border-accent text-accent bg-accent/10" : "text-muted-foreground"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id} className="border bg-card p-4 space-y-3">
            {(() => {
              const orderDetails = getOrderDetails(r);

              return (
                <>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {r.request_type === "return" ? <RotateCcw className="h-4 w-4 text-accent" /> : <ArrowLeftRight className="h-4 w-4 text-accent" />}
                  <span className="text-sm font-semibold">{r.request_type === "return" ? "Visszaküldés" : "Csere"}</span>
                  <span className="text-xs text-muted-foreground font-mono">#{r.order_id.slice(0, 8)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString("hu-HU")} • User: {r.user_id.slice(0, 8)}...</p>
                {orderDetails && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {orderDetails.shipping_name ? `${orderDetails.shipping_name} • ` : ""}
                    {orderDetails.customer_email} • {Number(orderDetails.total_amount ?? 0).toLocaleString()} Ft
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={r.status}
                  onChange={e => updateStatus(r, e.target.value)}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRequest(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="bg-muted/50 p-3 text-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Indok:</span>
              <p className="mt-1">{r.reason}</p>
            </div>
            {r.description && (
              <div className="bg-secondary/30 p-3 text-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vásárlói megjegyzés:</span>
                <p className="mt-1">{r.description}</p>
              </div>
            )}
            <div className="border border-border p-3 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {r.request_type === "exchange" ? "Árkülönbözet / visszatérítés kezelése" : "Visszatérítés kezelése"}
              </span>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={refundDrafts[r.id] ?? "0"}
                  onChange={(e) => setRefundDrafts((current) => ({ ...current, [r.id]: e.target.value }))}
                  className="h-9"
                  placeholder="0"
                  disabled={r.status === "rejected"}
                />
                {r.request_type === "return" && Number(orderDetails?.total_amount ?? 0) > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-none"
                    onClick={() => setRefundDrafts((current) => ({ ...current, [r.id]: String(orderDetails?.total_amount ?? 0) }))}
                    disabled={r.status === "rejected"}
                  >
                    Teljes összeg
                  </Button>
                )}
                <Button size="sm" className="rounded-none" onClick={() => saveRefundAmount(r)} disabled={r.status === "rejected"}>
                  <Save className="h-3.5 w-3.5 mr-1" /> Mentés
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Aktuális összeg: <span className="font-bold text-accent">{(r.refund_amount || 0).toLocaleString()} Ft</span>
                {Number(orderDetails?.total_amount ?? 0) > 0 && (
                  <span> • Maximum: {Number(orderDetails?.total_amount ?? 0).toLocaleString()} Ft</span>
                )}
              </p>
            </div>
            {/* Admin notes */}
            {editingId === r.id ? (
              <div className="space-y-2">
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className="rounded-none min-h-[60px] text-xs" placeholder="Admin megjegyzés..." />
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-none text-xs" onClick={() => saveNotes(r.id)}><Check className="h-3 w-3 mr-1" /> Mentés</Button>
                  <Button size="sm" variant="ghost" className="rounded-none text-xs" onClick={() => setEditingId(null)}>Mégse</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {r.admin_notes && <p className="text-xs text-muted-foreground italic flex-1">{r.admin_notes}</p>}
                <Button size="sm" variant="ghost" className="rounded-none text-xs" onClick={() => { setEditingId(r.id); setAdminNotes(r.admin_notes || ""); }}>
                  <Pencil className="h-3 w-3 mr-1" /> Megjegyzés
                </Button>
              </div>
            )}
                </>
              );
            })()}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nincs visszáru/csere kérelem.</p>
        )}
      </div>
    </div>
  );
};

export default AdminReturnsTab;

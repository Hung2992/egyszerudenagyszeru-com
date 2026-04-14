import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Check, RotateCcw, ArrowLeftRight } from "lucide-react";

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
  created_at: string;
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

  const fetchRequests = async () => {
    const { data } = await supabase.from("return_requests").select("*").order("created_at", { ascending: false });
    if (data) setRequests(data as any);
  };

  useEffect(() => { fetchRequests(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("return_requests").update({ status } as any).eq("id", id);
    toast({ title: `Státusz frissítve: ${STATUS_OPTIONS.find(s => s.value === status)?.label}` });
    fetchRequests();
  };

  const saveNotes = async (id: string) => {
    await supabase.from("return_requests").update({ admin_notes: adminNotes } as any).eq("id", id);
    toast({ title: "Megjegyzés mentve!" });
    setEditingId(null);
    setAdminNotes("");
    fetchRequests();
  };

  const deleteRequest = async (id: string) => {
    await supabase.from("return_requests").delete().eq("id", id);
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
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {r.request_type === "return" ? <RotateCcw className="h-4 w-4 text-accent" /> : <ArrowLeftRight className="h-4 w-4 text-accent" />}
                  <span className="text-sm font-semibold">{r.request_type === "return" ? "Visszaküldés" : "Csere"}</span>
                  <span className="text-xs text-muted-foreground font-mono">#{r.order_id.slice(0, 8)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString("hu-HU")} • User: {r.user_id.slice(0, 8)}...</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={r.status}
                  onChange={e => updateStatus(r.id, e.target.value)}
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
            {r.refund_amount > 0 && (
              <p className="text-sm">Visszatérítés: <span className="font-bold text-accent">{r.refund_amount.toLocaleString()} Ft</span></p>
            )}
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

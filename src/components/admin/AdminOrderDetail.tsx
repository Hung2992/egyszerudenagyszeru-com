import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { X, Package, Truck, CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";

interface Order {
  id: string;
  user_id: string | null;
  status: string;
  total_amount: number;
  shipping_name: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_zip: string | null;
  shipping_phone: string | null;
  payment_method: string | null;
  coupon_code: string | null;
  discount_amount: number | null;
  items: any;
  created_at: string;
  procurement_status?: string;
}

interface Props {
  order: Order;
  onClose: () => void;
  onUpdate: () => void;
}

const STATUSES = ["pending", "processing", "packed", "shipped", "delivered", "cancelled"];

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  processing: Package,
  packed: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Függőben",
  processing: "Feldolgozás",
  packed: "Csomagolva",
  shipped: "Elküldve",
  delivered: "Kézbesítve",
  cancelled: "Törölve",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Készpénz",
  card: "Bankkártya",
  cod: "Utánvét",
  transfer: "Átutalás",
};

const AdminOrderDetail = ({ order, onClose, onUpdate }: Props) => {
  const [updating, setUpdating] = useState(false);
  const items = Array.isArray(order.items) ? order.items : [];
  const currentIdx = STATUSES.indexOf(order.status);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    await supabase.from("orders").update({ status: newStatus } as any).eq("id", order.id);
    toast({ title: `Státusz: ${STATUS_LABELS[newStatus]}` });
    onUpdate();
    setUpdating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider">Rendelés részletei</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">#{order.id.slice(0, 12)}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-5">
          {/* Status Timeline */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Státusz</h3>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {STATUSES.filter(s => s !== "cancelled").map((s, i) => {
                const Icon = STATUS_ICONS[s];
                const isActive = STATUSES.indexOf(s) <= currentIdx && order.status !== "cancelled";
                const isCurrent = s === order.status;
                return (
                  <div key={s} className="flex items-center">
                    <button
                      onClick={() => updateStatus(s)}
                      disabled={updating}
                      className={`flex flex-col items-center gap-1 px-2 py-1.5 border transition-colors min-w-[60px] ${
                        isCurrent ? "bg-accent text-accent-foreground border-accent" :
                        isActive ? "bg-accent/20 text-accent border-accent/30" :
                        "text-muted-foreground border-border hover:border-foreground/30"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-[9px] uppercase tracking-wider font-medium">{STATUS_LABELS[s]}</span>
                    </button>
                    {i < 4 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-0.5 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
            {order.status !== "cancelled" && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-none text-[10px] uppercase tracking-wider h-7 mt-2 text-destructive border-destructive/30"
                onClick={() => updateStatus("cancelled")}
                disabled={updating}
              >
                <XCircle className="h-3 w-3 mr-1" /> Rendelés törlése
              </Button>
            )}
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vásárló</h3>
              <p className="text-sm font-medium text-foreground">{order.shipping_name || "—"}</p>
              {order.shipping_phone && <p className="text-xs text-muted-foreground">📱 {order.shipping_phone}</p>}
            </div>
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Szállítási cím</h3>
              <p className="text-sm text-foreground">
                {[order.shipping_zip, order.shipping_city].filter(Boolean).join(", ")}
              </p>
              <p className="text-sm text-foreground">{order.shipping_address || "—"}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fizetés</h3>
              <p className="text-sm text-foreground">{PAYMENT_LABELS[order.payment_method || ""] || order.payment_method || "—"}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dátum</h3>
              <p className="text-sm text-foreground">
                {new Date(order.created_at).toLocaleDateString("hu-HU", {
                  year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                })}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Tételek</h3>
            <div className="border divide-y">
              {items.length > 0 ? items.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  {item.image_url && (
                    <img src={item.image_url} alt="" className="h-10 w-10 object-cover border flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name || "Termék"}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      {item.size && <span>Méret: {item.size}</span>}
                      {item.color && <span>Szín: {item.color}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-foreground">{((item.price || 0) * (item.quantity || 1)).toLocaleString()} Ft</p>
                    <p className="text-[10px] text-muted-foreground">{item.quantity || 1} × {(item.price || 0).toLocaleString()} Ft</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4">Nincs tételinformáció</p>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="border p-3 space-y-1">
            {order.coupon_code && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Kupon: <span className="font-mono text-accent">{order.coupon_code}</span></span>
                <span>-{(order.discount_amount || 0).toLocaleString()} Ft</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t">
              <span>Összesen</span>
              <span className="text-accent">{order.total_amount.toLocaleString()} Ft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;

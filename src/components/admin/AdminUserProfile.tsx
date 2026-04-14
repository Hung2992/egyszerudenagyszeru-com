import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { X, ShoppingCart, DollarSign, Calendar, User } from "lucide-react";

interface ProfileRow {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  preferred_payment: string | null;
  created_at: string;
  user_id: string | null;
}

interface UserOrder {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: any;
}

interface Props {
  user: ProfileRow;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Függőben", processing: "Feldolgozás", packed: "Csomagolva",
  shipped: "Elküldve", delivered: "Kézbesítve", cancelled: "Törölve",
};

const AdminUserProfile = ({ user, onClose }: Props) => {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserOrders();
  }, [user]);

  const fetchUserOrders = async () => {
    if (!user.user_id) { setLoading(false); return; }
    const { data } = await supabase
      .from("orders")
      .select("id, status, total_amount, created_at, items")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false });
    if (data) setOrders(data as any);
    setLoading(false);
  };

  const totalSpent = orders.reduce((s, o) => s + o.total_amount, 0);
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 border bg-accent/10 flex items-center justify-center">
              <User className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{user.display_name || "Névtelen"}</h2>
              <p className="text-xs text-muted-foreground">{user.email || "—"}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border p-3 text-center">
              <ShoppingCart className="h-4 w-4 text-accent mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{orders.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Rendelés</p>
            </div>
            <div className="border p-3 text-center">
              <DollarSign className="h-4 w-4 text-accent mx-auto mb-1" />
              <p className="text-lg font-bold text-accent">{totalSpent.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ft költés</p>
            </div>
            <div className="border p-3 text-center">
              <Calendar className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{new Date(user.created_at).toLocaleDateString("hu-HU")}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Reg. dátum</p>
            </div>
          </div>

          {/* User Details */}
          <div className="border p-3 space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adatok</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {user.phone && <div><span className="text-muted-foreground">Telefon:</span> <span className="text-foreground">{user.phone}</span></div>}
              {user.city && <div><span className="text-muted-foreground">Város:</span> <span className="text-foreground">{user.city}</span></div>}
              {user.preferred_payment && <div><span className="text-muted-foreground">Fizetés:</span> <span className="text-foreground">{user.preferred_payment}</span></div>}
              <div><span className="text-muted-foreground">Teljesített:</span> <span className="text-foreground">{deliveredOrders} rendelés</span></div>
            </div>
          </div>

          {/* Order History */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Rendelési előzmények</h3>
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Betöltés...</p>
            ) : orders.length > 0 ? (
              <div className="border divide-y max-h-60 overflow-y-auto">
                {orders.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">#{o.id.slice(0, 8)}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("hu-HU")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-accent">{o.total_amount.toLocaleString()} Ft</p>
                      <span className={`text-[9px] uppercase tracking-wider font-bold ${
                        o.status === "delivered" ? "text-green-400" :
                        o.status === "cancelled" ? "text-destructive" : "text-muted-foreground"
                      }`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 border">Még nincs rendelése</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserProfile;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { CalendarClock, Plus, Trash2, Bell } from "lucide-react";

interface Props { userId: string; }

const ProductPreorders = ({ userId }: Props) => {
  const [preorders, setPreorders] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchData = async () => {
    const { data } = await (supabase.from("product_preorders" as any) as any)
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setPreorders(data || []);
    setLoaded(true);
  };

  useEffect(() => { fetchData(); }, [userId]);

  const create = async () => {
    setSaving(true);
    await (supabase.from("product_preorders" as any) as any).insert({
      user_id: userId, notify_email: email || null, status: "waiting",
    });
    toast({ title: "Előjegyzés rögzítve! ✓" });
    setEmail(""); setShowForm(false); setSaving(false);
    fetchData();
  };

  const remove = async (id: string) => {
    await (supabase.from("product_preorders" as any) as any).delete().eq("id", id);
    toast({ title: "Előjegyzés törölve" }); fetchData();
  };

  if (!loaded) return null;

  const statusLabel: Record<string, string> = {
    waiting: "Várakozik",
    notified: "Értesítve",
    purchased: "Megvásárolva",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-accent" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Limitált termék előjegyzés</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="text-accent hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">Iratkozz fel limitált/drop termékekre és értesítünk amint elérhetőek!</p>

      {showForm && (
        <div className="border border-border p-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Értesítési email (opcionális)</p>
            <Input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com" className="rounded-none h-9 text-xs" />
          </div>
          <Button onClick={create} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
            <Bell className="h-3 w-3 mr-1" />{saving ? "Mentés..." : "Feliratkozás"}
          </Button>
        </div>
      )}

      {preorders.length > 0 ? (
        <div className="space-y-2">
          {preorders.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between border border-border p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 ${
                    p.status === "waiting" ? "bg-accent/10 text-accent" :
                    p.status === "notified" ? "bg-primary/10 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>{statusLabel[p.status] || p.status}</span>
                </div>
                {p.notify_email && <p className="text-[9px] text-muted-foreground mt-0.5">{p.notify_email}</p>}
                <span className="text-[9px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("hu-HU")}
                </span>
              </div>
              <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <p className="text-xs text-muted-foreground text-center py-4">Nincs aktív előjegyzésed</p>
      )}
    </div>
  );
};

export default ProductPreorders;

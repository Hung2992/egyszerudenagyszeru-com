import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Undo2, Save, CreditCard, Banknote } from "lucide-react";

const METHODS = [
  { value: "courier", label: "Futár" },
  { value: "post", label: "Posta" },
  { value: "store", label: "Üzletben" },
];

const REFUND_METHODS = [
  { value: "bank_card", label: "Bankkártyára", icon: CreditCard },
  { value: "cash", label: "Készpénz", icon: Banknote },
];

const REASONS = [
  "Nem megfelelő méret",
  "Nem tetszik az anyag",
  "Sérült termék",
  "Nem egyezik a leírással",
  "Egyéb",
];

interface Props { userId: string; }

const ReturnPreferences = ({ userId }: Props) => {
  const [method, setMethod] = useState("courier");
  const [reason, setReason] = useState("");
  const [autoLabel, setAutoLabel] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [refundMethod, setRefundMethod] = useState("bank_card");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await (supabase.from("return_preferences" as any) as any)
        .select("*").eq("user_id", userId).maybeSingle();
      if (data) {
        setMethod(data.preferred_method || "courier");
        setReason(data.default_reason || "");
        setAutoLabel(data.auto_label ?? false);
        setPickupAddress(data.pickup_address || "");
        setRefundMethod(data.preferred_refund_method || "bank_card");
      }
      setLoaded(true);
    };
    fetchData();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase.from("return_preferences" as any) as any).upsert({
      user_id: userId,
      preferred_method: method,
      default_reason: reason || null,
      auto_label: autoLabel,
      pickup_address: pickupAddress || null,
      preferred_refund_method: refundMethod,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) {
      toast({ title: "Mentés sikertelen", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Visszaküldési preferenciák mentve! ✓" });
    }
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Undo2 className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Visszaküldési preferenciák</p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Preferált visszaküldési mód</p>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(m => (
              <button key={m.value} onClick={() => setMethod(m.value)}
                className={`text-[10px] px-3 py-2.5 border transition-all ${
                  method === m.value
                    ? "border-accent text-accent bg-accent/10 font-bold"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >{m.label}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Visszatérítés módja</p>
          <div className="grid grid-cols-2 gap-2">
            {REFUND_METHODS.map(rm => {
              const Icon = rm.icon;
              return (
                <button key={rm.value} onClick={() => setRefundMethod(rm.value)}
                  className={`flex items-center justify-center gap-1.5 text-[10px] px-3 py-2.5 border transition-all ${
                    refundMethod === rm.value
                      ? "border-accent text-accent bg-accent/10 font-bold"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {rm.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Alapértelmezett ok</p>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map(r => (
              <button key={r} onClick={() => setReason(reason === r ? "" : r)}
                className={`text-[10px] px-2.5 py-1.5 border transition-all ${
                  reason === r
                    ? "border-accent text-accent bg-accent/10 font-bold"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >{r}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-xs text-foreground">Automatikus címke generálás</span>
          <Switch checked={autoLabel} onCheckedChange={setAutoLabel} />
        </div>

        {method === "courier" && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Felvételi cím</p>
            <Input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)}
              placeholder="Cím ahonnan a futár felveszi..." className="rounded-none h-9 text-xs" />
          </div>
        )}
      </div>

      <Button onClick={save} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
        <Save className="h-3 w-3 mr-1" />
        {saving ? "Mentés..." : "Preferenciák mentése"}
      </Button>
    </div>
  );
};

export default ReturnPreferences;

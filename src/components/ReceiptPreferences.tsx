import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { FileText, Save } from "lucide-react";

interface Props { userId: string; }

const ReceiptPreferences = ({ userId }: Props) => {
  const [isDigital, setIsDigital] = useState(true);
  const [email, setEmail] = useState("");
  const [receipts, setReceipts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [prefRes, receiptRes] = await Promise.all([
        (supabase.from("receipt_preferences" as any) as any).select("*").eq("user_id", userId).maybeSingle(),
        (supabase.from("digital_receipts" as any) as any).select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      ]);
      if (prefRes.data) {
        setIsDigital(prefRes.data.is_digital_preferred ?? true);
        setEmail(prefRes.data.receipt_email || "");
      }
      setReceipts(receiptRes.data || []);
      setLoaded(true);
    };
    fetch();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    await (supabase.from("receipt_preferences" as any) as any).upsert({
      user_id: userId,
      is_digital_preferred: isDigital,
      receipt_email: email || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Nyugta beállítások mentve! ✓" });
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Digitális nyugták</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-xs text-foreground">Digitális nyugta preferálása</span>
          <Switch checked={isDigital} onCheckedChange={setIsDigital} />
        </div>

        {isDigital && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Nyugta e-mail cím</p>
            <Input value={email} onChange={e => setEmail(e.target.value)}
              type="email" placeholder="email@example.com" className="rounded-none h-9 text-xs" />
          </div>
        )}

        <Button onClick={save} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
          <Save className="h-3 w-3 mr-1" />
          {saving ? "Mentés..." : "Beállítások mentése"}
        </Button>

        {receipts.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Korábbi nyugták</p>
            <div className="space-y-1.5">
              {receipts.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between border border-border p-2">
                  <div>
                    <p className="text-xs text-foreground">Rendelés #{r.order_id?.slice(0, 8) || "—"}</p>
                    <p className="text-[9px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("hu-HU")}</p>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-accent">{r.receipt_type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptPreferences;

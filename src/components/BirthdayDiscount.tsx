import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Cake, Save } from "lucide-react";

interface Props { userId: string; }

const BirthdayDiscount = ({ userId }: Props) => {
  const [birthday, setBirthday] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(10);
  const [lastSentYear, setLastSentYear] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase.from("birthday_discounts" as any) as any)
        .select("*").eq("user_id", userId).maybeSingle();
      if (data) {
        setBirthday(data.birthday || "");
        setDiscountCode(data.discount_code || "");
        setDiscountPercent(data.discount_percent || 10);
        setLastSentYear(data.last_sent_year);
      }
      setLoaded(true);
    };
    fetch();
  }, [userId]);

  const save = async () => {
    if (!birthday) { toast({ title: "Add meg a születésnapodat!", variant: "destructive" }); return; }
    setSaving(true);
    await (supabase.from("birthday_discounts" as any) as any).upsert({
      user_id: userId, birthday, discount_code: discountCode || null,
      discount_percent: discountPercent, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Születésnapi kedvezmény beállítva! ✓" });
    setSaving(false);
  };

  if (!loaded) return null;

  const currentYear = new Date().getFullYear();
  const alreadySent = lastSentYear === currentYear;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Cake className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Születésnapi kedvezmény</p>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Születésnap</p>
          <Input value={birthday} onChange={e => setBirthday(e.target.value)}
            type="date" className="rounded-none h-9 text-xs" />
        </div>
        {birthday && (
          <div className="border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Kedvezmény mértéke</span>
              <span className="text-sm font-bold text-accent">{discountPercent}%</span>
            </div>
            {discountCode && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Kuponkód</span>
                <span className="text-xs font-bold text-foreground tracking-wider">{discountCode}</span>
              </div>
            )}
            {alreadySent ? (
              <p className="text-[9px] text-green-500 uppercase tracking-wider">✓ Idei kedvezmény már kiküldve</p>
            ) : (
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">A születésnapodon automatikusan kapod a kedvezményt</p>
            )}
          </div>
        )}
      </div>
      <Button onClick={save} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
        <Save className="h-3 w-3 mr-1" />{saving ? "Mentés..." : "Születésnap mentése"}
      </Button>
    </div>
  );
};

export default BirthdayDiscount;

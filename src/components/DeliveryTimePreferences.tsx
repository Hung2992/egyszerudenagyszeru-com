import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Clock, Save } from "lucide-react";

const SLOTS = [
  { value: "anytime", label: "Bármikor" },
  { value: "morning", label: "Délelőtt (8–12)" },
  { value: "afternoon", label: "Délután (12–17)" },
  { value: "evening", label: "Este (17–21)" },
];

interface Props { userId: string; }

const DeliveryTimePreferences = ({ userId }: Props) => {
  const [slot, setSlot] = useState("anytime");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase.from("delivery_time_preferences" as any) as any)
        .select("*").eq("user_id", userId).maybeSingle();
      if (data) {
        setSlot(data.preferred_slot || "anytime");
        setInstructions(data.special_instructions || "");
      }
      setLoaded(true);
    };
    fetch();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    await (supabase.from("delivery_time_preferences" as any) as any).upsert({
      user_id: userId,
      preferred_slot: slot,
      special_instructions: instructions || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Szállítási idő mentve! ✓" });
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Szállítási idő preferencia</p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Preferált idősáv</p>
          <div className="grid grid-cols-2 gap-2">
            {SLOTS.map(s => (
              <button key={s.value} onClick={() => setSlot(s.value)}
                className={`text-[10px] px-3 py-2.5 border transition-all ${
                  slot === s.value
                    ? "border-accent text-accent bg-accent/10 font-bold"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >{s.label}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Különleges utasítások</p>
          <Input value={instructions} onChange={e => setInstructions(e.target.value)}
            placeholder="Pl. csengő nem működik, kérem hívjon..." className="rounded-none h-9 text-xs" />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
        <Save className="h-3 w-3 mr-1" />
        {saving ? "Mentés..." : "Idő mentése"}
      </Button>
    </div>
  );
};

export default DeliveryTimePreferences;

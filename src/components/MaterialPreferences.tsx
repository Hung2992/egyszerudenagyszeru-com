import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ShieldAlert, Save } from "lucide-react";

const ALLERGY_OPTIONS = ["Nikkel", "Latex", "Műbőr", "Gyapjú", "Poliészter", "Nylon", "Akril", "Réz"];
const MATERIAL_OPTIONS = ["Szintetikus", "Műszál", "Spandex", "Poliuretán", "PVC", "Gumi"];

interface Props { userId: string; }

const MaterialPreferences = ({ userId }: Props) => {
  const [allergies, setAllergies] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase.from("material_preferences" as any) as any)
        .select("*").eq("user_id", userId).maybeSingle();
      if (data) {
        setAllergies(data.allergies || []);
        setMaterials(data.sensitive_materials || []);
        setNotes(data.notes || "");
      }
      setLoaded(true);
    };
    fetch();
  }, [userId]);

  const toggle = (list: string[], setList: (v: string[]) => void, val: string) => {
    setList(list.includes(val) ? list.filter(v => v !== val) : [...list, val]);
  };

  const save = async () => {
    setSaving(true);
    await (supabase.from("material_preferences" as any) as any).upsert({
      user_id: userId, allergies, sensitive_materials: materials, notes: notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Anyag preferenciák mentve! ✓" });
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Anyag / Allergén szűrő</p>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Allergiák</p>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGY_OPTIONS.map(opt => (
              <button key={opt} onClick={() => toggle(allergies, setAllergies, opt)}
                className={`text-[10px] px-2.5 py-1.5 border transition-all ${
                  allergies.includes(opt) ? "border-destructive text-destructive bg-destructive/10 font-bold"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}>{opt}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Érzékeny anyagok</p>
          <div className="flex flex-wrap gap-1.5">
            {MATERIAL_OPTIONS.map(opt => (
              <button key={opt} onClick={() => toggle(materials, setMaterials, opt)}
                className={`text-[10px] px-2.5 py-1.5 border transition-all ${
                  materials.includes(opt) ? "border-destructive text-destructive bg-destructive/10 font-bold"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}>{opt}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Megjegyzés</p>
          <Input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Pl. bőrirritáció poliésztertől..." className="rounded-none h-9 text-xs" />
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
        <Save className="h-3 w-3 mr-1" />{saving ? "Mentés..." : "Preferenciák mentése"}
      </Button>
    </div>
  );
};

export default MaterialPreferences;

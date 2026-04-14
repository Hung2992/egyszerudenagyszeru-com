import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Ruler, Save } from "lucide-react";

interface SizeData {
  top_size: string;
  bottom_size: string;
  shoe_size: string;
  height_cm: string;
  weight_kg: string;
  body_type: string;
  notes: string;
}

const BODY_TYPES = ["Slim", "Regular", "Athletic", "Relaxed"];
const TOP_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const BOTTOM_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];

interface Props {
  userId: string;
}

const UserSizeProfile = ({ userId }: Props) => {
  const [data, setData] = useState<SizeData>({
    top_size: "", bottom_size: "", shoe_size: "",
    height_cm: "", weight_kg: "", body_type: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: row } = await (supabase.from("user_size_profiles" as any) as any)
        .select("*").eq("user_id", userId).maybeSingle();
      if (row) {
        setData({
          top_size: row.top_size || "",
          bottom_size: row.bottom_size || "",
          shoe_size: row.shoe_size || "",
          height_cm: row.height_cm?.toString() || "",
          weight_kg: row.weight_kg?.toString() || "",
          body_type: row.body_type || "",
          notes: row.notes || "",
        });
      }
      setLoaded(true);
    };
    fetch();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    await (supabase.from("user_size_profiles" as any) as any).upsert({
      user_id: userId,
      top_size: data.top_size || null,
      bottom_size: data.bottom_size || null,
      shoe_size: data.shoe_size || null,
      height_cm: data.height_cm ? parseFloat(data.height_cm) : null,
      weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
      body_type: data.body_type || null,
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Méretprofil mentve! ✓" });
    setSaving(false);
  };

  if (!loaded) return null;

  const SizeButtons = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(value === opt ? "" : opt)}
          className={`text-[10px] px-2.5 py-1.5 border transition-all ${
            value === opt
              ? "border-accent text-accent bg-accent/10 font-bold"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Ruler className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Méretprofil</p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Felső méret</p>
          <SizeButtons options={TOP_SIZES} value={data.top_size} onChange={v => setData(d => ({ ...d, top_size: v }))} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Alsó méret</p>
          <SizeButtons options={BOTTOM_SIZES} value={data.bottom_size} onChange={v => setData(d => ({ ...d, bottom_size: v }))} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Cipőméret</p>
          <SizeButtons options={SHOE_SIZES} value={data.shoe_size} onChange={v => setData(d => ({ ...d, shoe_size: v }))} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Testalkat</p>
          <SizeButtons options={BODY_TYPES} value={data.body_type} onChange={v => setData(d => ({ ...d, body_type: v }))} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Magasság (cm)</p>
            <Input value={data.height_cm} onChange={e => setData(d => ({ ...d, height_cm: e.target.value }))}
              type="number" placeholder="175" className="rounded-none h-9 text-xs" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Testsúly (kg)</p>
            <Input value={data.weight_kg} onChange={e => setData(d => ({ ...d, weight_kg: e.target.value }))}
              type="number" placeholder="75" className="rounded-none h-9 text-xs" />
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Megjegyzés</p>
          <Input value={data.notes} onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
            placeholder="Pl. szélesebb váll, hosszabb kar..." className="rounded-none h-9 text-xs" />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
        <Save className="h-3 w-3 mr-1" />
        {saving ? "Mentés..." : "Méretprofil mentése"}
      </Button>
    </div>
  );
};

export default UserSizeProfile;

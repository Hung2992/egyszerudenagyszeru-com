import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Package, Save, Gift, Leaf } from "lucide-react";

interface PackData {
  packaging_type: string;
  gift_wrap: boolean;
  gift_message: string;
  eco_packaging: boolean;
  special_instructions: string;
}

const PACK_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "minimal", label: "Minimál" },
  { value: "premium", label: "Prémium" },
];

interface Props {
  userId: string;
}

const PackagingPreferences = ({ userId }: Props) => {
  const [data, setData] = useState<PackData>({
    packaging_type: "standard", gift_wrap: false, gift_message: "",
    eco_packaging: false, special_instructions: "",
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: row } = await (supabase.from("packaging_preferences" as any) as any)
        .select("*").eq("user_id", userId).maybeSingle();
      if (row) {
        setData({
          packaging_type: row.packaging_type || "standard",
          gift_wrap: row.gift_wrap || false,
          gift_message: row.gift_message || "",
          eco_packaging: row.eco_packaging || false,
          special_instructions: row.special_instructions || "",
        });
      }
      setLoaded(true);
    };
    fetch();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    await (supabase.from("packaging_preferences" as any) as any).upsert({
      user_id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Csomagolási beállítások mentve! ✓" });
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Package className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Csomagolás</p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Csomagolás típusa</p>
          <div className="flex gap-2">
            {PACK_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setData(d => ({ ...d, packaging_type: t.value }))}
                className={`flex-1 text-[10px] uppercase tracking-wider py-2 border transition-all ${
                  data.packaging_type === t.value
                    ? "border-accent text-accent bg-accent/10 font-bold"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Leaf className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs text-foreground">Eco csomagolás</span>
          </div>
          <Switch checked={data.eco_packaging} onCheckedChange={v => setData(d => ({ ...d, eco_packaging: v }))} />
        </div>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Gift className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs text-foreground">Ajándék csomagolás</span>
          </div>
          <Switch checked={data.gift_wrap} onCheckedChange={v => setData(d => ({ ...d, gift_wrap: v }))} />
        </div>

        {data.gift_wrap && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ajándék üzenet</p>
            <Input value={data.gift_message} onChange={e => setData(d => ({ ...d, gift_message: e.target.value }))}
              placeholder="Boldog születésnapot!..." className="rounded-none h-9 text-xs" />
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Speciális utasítások</p>
          <Input value={data.special_instructions} onChange={e => setData(d => ({ ...d, special_instructions: e.target.value }))}
            placeholder="Pl. ne használj ragasztószalagot..." className="rounded-none h-9 text-xs" />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
        <Save className="h-3 w-3 mr-1" />
        {saving ? "Mentés..." : "Beállítások mentése"}
      </Button>
    </div>
  );
};

export default PackagingPreferences;

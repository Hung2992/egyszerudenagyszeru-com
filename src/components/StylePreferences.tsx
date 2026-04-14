import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Palette, Save } from "lucide-react";

const COLOR_OPTIONS = ["Fekete", "Fehér", "Szürke", "Bézs", "Khaki", "Olívazöld", "Krém", "Antracit", "Piros", "Kék"];
const STYLE_OPTIONS = ["Streetwear", "Minimál", "Casual", "Sporty", "Oversized", "Slim Fit", "Vintage", "Elegáns"];

interface Props { userId: string; }

const StylePreferences = ({ userId }: Props) => {
  const [favColors, setFavColors] = useState<string[]>([]);
  const [favStyles, setFavStyles] = useState<string[]>([]);
  const [avoidColors, setAvoidColors] = useState<string[]>([]);
  const [avoidStyles, setAvoidStyles] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: row } = await (supabase.from("style_preferences" as any) as any)
        .select("*").eq("user_id", userId).maybeSingle();
      if (row) {
        setFavColors(row.favorite_colors || []);
        setFavStyles(row.favorite_styles || []);
        setAvoidColors(row.avoid_colors || []);
        setAvoidStyles(row.avoid_styles || []);
        setNotes(row.notes || "");
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
    await (supabase.from("style_preferences" as any) as any).upsert({
      user_id: userId,
      favorite_colors: favColors,
      favorite_styles: favStyles,
      avoid_colors: avoidColors,
      avoid_styles: avoidStyles,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Stílus preferenciák mentve! ✓" });
    setSaving(false);
  };

  if (!loaded) return null;

  const ChipList = ({ options, selected, onToggle, accent }: { options: string[]; selected: string[]; onToggle: (v: string) => void; accent: boolean }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt} onClick={() => onToggle(opt)}
          className={`text-[10px] px-2.5 py-1.5 border transition-all ${
            selected.includes(opt)
              ? accent ? "border-accent text-accent bg-accent/10 font-bold" : "border-destructive text-destructive bg-destructive/10 font-bold"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}
        >{opt}</button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stílus preferenciák</p>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Kedvenc színek</p>
          <ChipList options={COLOR_OPTIONS} selected={favColors} onToggle={v => toggle(favColors, setFavColors, v)} accent />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Kedvenc stílusok</p>
          <ChipList options={STYLE_OPTIONS} selected={favStyles} onToggle={v => toggle(favStyles, setFavStyles, v)} accent />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Kerülendő színek</p>
          <ChipList options={COLOR_OPTIONS} selected={avoidColors} onToggle={v => toggle(avoidColors, setAvoidColors, v)} accent={false} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Kerülendő stílusok</p>
          <ChipList options={STYLE_OPTIONS} selected={avoidStyles} onToggle={v => toggle(avoidStyles, setAvoidStyles, v)} accent={false} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Megjegyzés</p>
          <Input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Pl. csak sötét tónusok, laza fazon..." className="rounded-none h-9 text-xs" />
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
        <Save className="h-3 w-3 mr-1" />
        {saving ? "Mentés..." : "Preferenciák mentése"}
      </Button>
    </div>
  );
};

export default StylePreferences;

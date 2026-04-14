import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Globe, Save } from "lucide-react";

const LANGUAGES = [
  { value: "hu", label: "Magyar" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "ro", label: "Română" },
];

const CURRENCIES = [
  { value: "HUF", label: "HUF (Ft)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "USD", label: "USD ($)" },
  { value: "RON", label: "RON (lei)" },
];

const DATE_FORMATS = [
  { value: "YYYY.MM.DD", label: "2026.04.12" },
  { value: "DD/MM/YYYY", label: "12/04/2026" },
  { value: "MM/DD/YYYY", label: "04/12/2026" },
];

interface Props { userId: string; }

const LocalePreferences = ({ userId }: Props) => {
  const [language, setLanguage] = useState("hu");
  const [currency, setCurrency] = useState("HUF");
  const [dateFormat, setDateFormat] = useState("YYYY.MM.DD");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase.from("locale_preferences" as any) as any)
        .select("*").eq("user_id", userId).maybeSingle();
      if (data) {
        setLanguage(data.language || "hu");
        setCurrency(data.currency || "HUF");
        setDateFormat(data.date_format || "YYYY.MM.DD");
      }
      setLoaded(true);
    };
    fetch();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    await (supabase.from("locale_preferences" as any) as any).upsert({
      user_id: userId, language, currency, date_format: dateFormat,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Nyelvi beállítások mentve! ✓" });
    setSaving(false);
  };

  if (!loaded) return null;

  const ChipGrid = ({ options, selected, onSelect }: { options: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void }) => (
    <div className="grid grid-cols-2 gap-2">
      {options.map(o => (
        <button key={o.value} onClick={() => onSelect(o.value)}
          className={`text-[10px] px-3 py-2.5 border transition-all ${
            selected === o.value ? "border-accent text-accent bg-accent/10 font-bold"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}>{o.label}</button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nyelv és pénznem</p>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Nyelv</p>
          <ChipGrid options={LANGUAGES} selected={language} onSelect={setLanguage} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Pénznem</p>
          <ChipGrid options={CURRENCIES} selected={currency} onSelect={setCurrency} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Dátumformátum</p>
          <ChipGrid options={DATE_FORMATS} selected={dateFormat} onSelect={setDateFormat} />
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
        <Save className="h-3 w-3 mr-1" />{saving ? "Mentés..." : "Beállítások mentése"}
      </Button>
    </div>
  );
};

export default LocalePreferences;

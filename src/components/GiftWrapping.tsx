import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Gift, Save } from "lucide-react";

const STYLES = [
  { value: "classic", label: "Klasszikus" },
  { value: "premium", label: "Prémium" },
  { value: "eco", label: "Öko" },
  { value: "minimal", label: "Minimál" },
];

interface Props { userId: string; }

const GiftWrapping = ({ userId }: Props) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [style, setStyle] = useState("classic");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase.from("gift_wrapping_preferences" as any) as any)
        .select("*").eq("user_id", userId).maybeSingle();
      if (data) {
        setIsEnabled(data.is_enabled ?? false);
        setStyle(data.wrapping_style || "classic");
        setMessage(data.default_message || "");
      }
      setLoaded(true);
    };
    fetch();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    await (supabase.from("gift_wrapping_preferences" as any) as any).upsert({
      user_id: userId, is_enabled: isEnabled, wrapping_style: style,
      default_message: message || null, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    toast({ title: "Ajándékcsomagolás beállítva! ✓" });
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Gift className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ajándékcsomagolás</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-xs text-foreground">Ajándékcsomagolás alapértelmezetten</span>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>

        {isEnabled && (
          <>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Csomagolási stílus</p>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map(s => (
                  <button key={s.value} onClick={() => setStyle(s.value)}
                    className={`text-[10px] px-3 py-2.5 border transition-all ${
                      style === s.value
                        ? "border-accent text-accent bg-accent/10 font-bold"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}>{s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Alapértelmezett üzenet</p>
              <Input value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Pl. Boldog szülinapot! 🎉" className="rounded-none h-9 text-xs" />
            </div>
          </>
        )}
      </div>
      <Button onClick={save} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
        <Save className="h-3 w-3 mr-1" />{saving ? "Mentés..." : "Beállítások mentése"}
      </Button>
    </div>
  );
};

export default GiftWrapping;

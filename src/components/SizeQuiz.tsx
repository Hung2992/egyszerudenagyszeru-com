import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Ruler, X, Check } from "lucide-react";

interface SizeQuizProps {
  open: boolean;
  onClose: () => void;
  productCategory?: string;
}

const BODY_TYPES = [
  { value: "slim", label: "Vékony", emoji: "🏃" },
  { value: "regular", label: "Átlagos", emoji: "🧍" },
  { value: "athletic", label: "Sportos", emoji: "💪" },
  { value: "plus", label: "Teltebb", emoji: "🐻" },
];

const calculateSize = (height: number, weight: number, bodyType: string, category?: string): string => {
  const bmi = weight / ((height / 100) ** 2);
  
  if (category === "Cipők") {
    const shoeSize = Math.round(height * 0.27 + (bodyType === "plus" ? 1 : 0));
    return `${Math.max(36, Math.min(47, shoeSize))}`;
  }
  
  let size: string;
  if (bmi < 18.5) size = "XS";
  else if (bmi < 21) size = bodyType === "slim" ? "XS" : "S";
  else if (bmi < 24) size = bodyType === "athletic" ? "M" : "S";
  else if (bmi < 27) size = bodyType === "athletic" ? "L" : "M";
  else if (bmi < 30) size = "L";
  else if (bmi < 33) size = "XL";
  else size = "XXL";

  if (height > 185 && size !== "XXL") {
    const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
    const idx = sizes.indexOf(size);
    if (idx < sizes.length - 1) size = sizes[idx + 1];
  }

  return size;
};

const SizeQuiz = ({ open, onClose, productCategory }: SizeQuizProps) => {
  const [step, setStep] = useState(0);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bodyType, setBodyType] = useState("regular");
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (open) {
      setStep(0);
      setResult(null);
    }
  }, [open]);

  if (!open) return null;

  const handleCalculate = async () => {
    const h = parseInt(height);
    const w = parseInt(weight);
    if (!h || !w || h < 100 || h > 250 || w < 30 || w > 250) {
      toast({ title: "Érvénytelen adatok", variant: "destructive" });
      return;
    }
    const size = calculateSize(h, w, bodyType, productCategory);
    setResult(size);

    if (userId) {
      setSaving(true);
      await (supabase.from("size_quiz_results" as any) as any).upsert({
        user_id: userId,
        height: h,
        weight: w,
        body_type: bodyType,
        recommended_size: size,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-background border m-4 animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Virtuális Próbafülke</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {result ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-accent">{result}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Az ajánlott méreted: <span className="text-accent">{result}</span></p>
                <p className="text-xs text-muted-foreground mt-1">
                  {parseInt(height)} cm / {parseInt(weight)} kg / {BODY_TYPES.find(b => b.value === bodyType)?.label}
                </p>
              </div>
              <div className="border border-border p-3 text-xs text-muted-foreground space-y-1">
                <p>💡 Ez egy orientáló ajánlás. Minden termék eltérő lehet.</p>
                <p>📏 A pontos méretekért nézd meg a <a href="/size-guide" className="text-accent hover:underline">mérettáblázatot</a>.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-none uppercase tracking-wider text-[10px] h-9" onClick={() => { setStep(0); setResult(null); }}>
                  Újra
                </Button>
                <Button className="flex-1 rounded-none uppercase tracking-wider text-[10px] h-9" onClick={onClose}>
                  <Check className="h-3 w-3 mr-1" />
                  Rendben
                </Button>
              </div>
            </div>
          ) : step === 0 ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground text-center">Add meg az adataidat és ajánlunk méretet!</p>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Magasság (cm)</label>
                <Input
                  type="number"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  placeholder="pl. 175"
                  className="rounded-none h-10"
                  min={100}
                  max={250}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Súly (kg)</label>
                <Input
                  type="number"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="pl. 75"
                  className="rounded-none h-10"
                  min={30}
                  max={250}
                />
              </div>
              <Button
                className="w-full rounded-none uppercase tracking-wider text-[10px] h-10"
                onClick={() => height && weight ? setStep(1) : null}
                disabled={!height || !weight}
              >
                Következő lépés
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Testalkat</p>
              <div className="grid grid-cols-2 gap-2">
                {BODY_TYPES.map(bt => (
                  <button
                    key={bt.value}
                    onClick={() => setBodyType(bt.value)}
                    className={`p-4 border text-center transition-all ${
                      bodyType === bt.value
                        ? "border-accent bg-accent/10 text-accent font-bold"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{bt.emoji}</span>
                    <span className="text-xs uppercase tracking-wider">{bt.label}</span>
                  </button>
                ))}
              </div>
              <Button
                className="w-full rounded-none uppercase tracking-wider text-[10px] h-10"
                onClick={handleCalculate}
                disabled={saving}
              >
                <Ruler className="h-3 w-3 mr-1" />
                {saving ? "Számítás..." : "Méret kiszámítása"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SizeQuiz;

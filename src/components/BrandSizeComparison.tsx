import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Scaling, Plus, Trash2, Save } from "lucide-react";

interface Props { userId: string; }

const BrandSizeComparison = ({ userId }: Props) => {
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [brandA, setBrandA] = useState("");
  const [sizeA, setSizeA] = useState("");
  const [brandB, setBrandB] = useState("");
  const [sizeB, setSizeB] = useState("");
  const [category, setCategory] = useState("general");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const CATEGORIES = ["general", "felső", "alsó", "cipő", "kiegészítő"];

  const fetchComparisons = async () => {
    const { data } = await (supabase.from("brand_size_comparisons" as any) as any)
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setComparisons(data || []);
    setLoaded(true);
  };

  useEffect(() => { fetchComparisons(); }, [userId]);

  const create = async () => {
    if (!brandA.trim() || !sizeA.trim() || !brandB.trim() || !sizeB.trim()) {
      toast({ title: "Töltsd ki az összes mezőt!", variant: "destructive" }); return;
    }
    setSaving(true);
    await (supabase.from("brand_size_comparisons" as any) as any).insert({
      user_id: userId, brand_a: brandA, size_a: sizeA, brand_b: brandB, size_b: sizeB, category,
    });
    toast({ title: "Méret-összehasonlítás mentve! ✓" });
    setBrandA(""); setSizeA(""); setBrandB(""); setSizeB("");
    setShowForm(false); setSaving(false);
    fetchComparisons();
  };

  const remove = async (id: string) => {
    await (supabase.from("brand_size_comparisons" as any) as any).delete().eq("id", id);
    toast({ title: "Összehasonlítás törölve" }); fetchComparisons();
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Scaling className="h-4 w-4 text-accent" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Márkaközi méretek</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="text-accent hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {showForm && (
        <div className="border border-border p-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Kategória</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`text-[10px] px-2.5 py-1.5 border transition-all capitalize ${
                    category === c ? "border-accent text-accent bg-accent/10 font-bold"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Márka A</p>
              <Input value={brandA} onChange={e => setBrandA(e.target.value)}
                placeholder="Nike" className="rounded-none h-9 text-xs" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Méret A</p>
              <Input value={sizeA} onChange={e => setSizeA(e.target.value)}
                placeholder="M" className="rounded-none h-9 text-xs" />
            </div>
          </div>
          <div className="flex items-center justify-center text-muted-foreground text-[10px]">= megfelel =</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Márka B</p>
              <Input value={brandB} onChange={e => setBrandB(e.target.value)}
                placeholder="Adidas" className="rounded-none h-9 text-xs" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Méret B</p>
              <Input value={sizeB} onChange={e => setSizeB(e.target.value)}
                placeholder="L" className="rounded-none h-9 text-xs" />
            </div>
          </div>
          <Button onClick={create} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
            <Save className="h-3 w-3 mr-1" />{saving ? "Mentés..." : "Összehasonlítás mentése"}
          </Button>
        </div>
      )}
      {comparisons.length > 0 ? (
        <div className="space-y-2">
          {comparisons.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between border border-border p-3">
              <div>
                <p className="text-xs text-foreground">
                  <span className="font-bold">{c.brand_a}</span> {c.size_a} = <span className="font-bold">{c.brand_b}</span> {c.size_b}
                </p>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground capitalize">{c.category}</span>
              </div>
              <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <p className="text-xs text-muted-foreground text-center py-4">Még nincs méret-összehasonlításod</p>
      )}
    </div>
  );
};

export default BrandSizeComparison;

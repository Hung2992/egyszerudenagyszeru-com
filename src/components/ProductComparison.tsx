import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ArrowLeftRight, Plus, Trash2, Save } from "lucide-react";

interface Props { userId: string; }

const ProductComparison = ({ userId }: Props) => {
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchComparisons = async () => {
    const { data } = await (supabase.from("product_comparisons" as any) as any)
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setComparisons(data || []);
    setLoaded(true);
  };

  useEffect(() => { fetchComparisons(); }, [userId]);

  const create = async () => {
    if (!newName.trim()) { toast({ title: "Add meg az összehasonlítás nevét!", variant: "destructive" }); return; }
    setSaving(true);
    await (supabase.from("product_comparisons" as any) as any).insert({
      user_id: userId,
      name: newName,
      product_ids: [],
    });
    toast({ title: "Összehasonlítás létrehozva! ✓" });
    setNewName("");
    setShowForm(false);
    setSaving(false);
    fetchComparisons();
  };

  const remove = async (id: string) => {
    await (supabase.from("product_comparisons" as any) as any).delete().eq("id", id);
    toast({ title: "Összehasonlítás törölve" });
    fetchComparisons();
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-accent" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Termék összehasonlító</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="text-accent hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {showForm && (
        <div className="border border-border p-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Összehasonlítás neve</p>
            <Input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Pl. Pólók összehasonlítása" className="rounded-none h-9 text-xs" />
          </div>
          <Button onClick={create} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
            <Save className="h-3 w-3 mr-1" />
            {saving ? "Mentés..." : "Létrehozás"}
          </Button>
        </div>
      )}

      {comparisons.length > 0 ? (
        <div className="space-y-2">
          {comparisons.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between border border-border p-3">
              <div>
                <p className="text-xs font-bold text-foreground">{c.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {(c.product_ids?.length || 0)} termék
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("hu-HU")}
                  </span>
                </div>
              </div>
              <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <p className="text-xs text-muted-foreground text-center py-4">Még nincs összehasonlításod</p>
      )}
    </div>
  );
};

export default ProductComparison;

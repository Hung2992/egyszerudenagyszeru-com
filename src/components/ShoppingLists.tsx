import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ListChecks, Plus, Trash2, Save } from "lucide-react";

interface Props { userId: string; }

interface ShoppingList {
  id?: string;
  name: string;
  description: string;
  is_public: boolean;
}

const ShoppingLists = ({ userId }: Props) => {
  const [lists, setLists] = useState<any[]>([]);
  const [newList, setNewList] = useState<ShoppingList>({ name: "", description: "", is_public: false });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchLists = async () => {
    const { data } = await (supabase.from("shopping_lists" as any) as any)
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setLists(data || []);
    setLoaded(true);
  };

  useEffect(() => { fetchLists(); }, [userId]);

  const saveList = async () => {
    if (!newList.name.trim()) { toast({ title: "Add meg a lista nevét!", variant: "destructive" }); return; }
    setSaving(true);
    await (supabase.from("shopping_lists" as any) as any).insert({
      user_id: userId,
      name: newList.name,
      description: newList.description || null,
      is_public: newList.is_public,
    });
    toast({ title: "Lista létrehozva! ✓" });
    setNewList({ name: "", description: "", is_public: false });
    setShowForm(false);
    setSaving(false);
    fetchLists();
  };

  const deleteList = async (id: string) => {
    await (supabase.from("shopping_lists" as any) as any).delete().eq("id", id);
    toast({ title: "Lista törölve" });
    fetchLists();
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-accent" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shopping listák</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="text-accent hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {showForm && (
        <div className="border border-border p-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Lista neve</p>
            <Input value={newList.name} onChange={e => setNewList({ ...newList, name: e.target.value })}
              placeholder="Pl. Nyári ruhatár" className="rounded-none h-9 text-xs" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Leírás</p>
            <Input value={newList.description} onChange={e => setNewList({ ...newList, description: e.target.value })}
              placeholder="Opcionális leírás..." className="rounded-none h-9 text-xs" />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Publikus lista</span>
            <Switch checked={newList.is_public} onCheckedChange={v => setNewList({ ...newList, is_public: v })} />
          </div>
          <Button onClick={saveList} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
            <Save className="h-3 w-3 mr-1" />
            {saving ? "Mentés..." : "Lista létrehozása"}
          </Button>
        </div>
      )}

      {lists.length > 0 ? (
        <div className="space-y-2">
          {lists.map((l: any) => (
            <div key={l.id} className="flex items-center justify-between border border-border p-3">
              <div>
                <p className="text-xs font-bold text-foreground">{l.name}</p>
                {l.description && <p className="text-[9px] text-muted-foreground mt-0.5">{l.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {new Date(l.created_at).toLocaleDateString("hu-HU")}
                  </span>
                  {l.is_public && <span className="text-[9px] uppercase tracking-wider text-accent">Publikus</span>}
                </div>
              </div>
              <button onClick={() => deleteList(l.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <p className="text-xs text-muted-foreground text-center py-4">Még nincs shopping listád</p>
      )}
    </div>
  );
};

export default ShoppingLists;

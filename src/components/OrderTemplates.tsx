import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ClipboardList, Plus, Trash2, Save } from "lucide-react";

interface Props { userId: string; }

const OrderTemplates = ({ userId }: Props) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchTemplates = async () => {
    const { data } = await (supabase.from("order_templates" as any) as any)
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setTemplates(data || []);
    setLoaded(true);
  };

  useEffect(() => { fetchTemplates(); }, [userId]);

  const create = async () => {
    if (!newName.trim()) { toast({ title: "Add meg a sablon nevét!", variant: "destructive" }); return; }
    setSaving(true);
    await (supabase.from("order_templates" as any) as any).insert({
      user_id: userId, name: newName, notes: newNotes || null, product_ids: [], quantities: [],
    });
    toast({ title: "Sablon létrehozva! ✓" });
    setNewName(""); setNewNotes(""); setShowForm(false); setSaving(false);
    fetchTemplates();
  };

  const remove = async (id: string) => {
    await (supabase.from("order_templates" as any) as any).delete().eq("id", id);
    toast({ title: "Sablon törölve" }); fetchTemplates();
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-accent" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rendelés sablonok</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="text-accent hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {showForm && (
        <div className="border border-border p-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sablon neve</p>
            <Input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Pl. Heti alapcsomag" className="rounded-none h-9 text-xs" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Megjegyzés</p>
            <Input value={newNotes} onChange={e => setNewNotes(e.target.value)}
              placeholder="Opcionális..." className="rounded-none h-9 text-xs" />
          </div>
          <Button onClick={create} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
            <Save className="h-3 w-3 mr-1" />{saving ? "Mentés..." : "Sablon létrehozása"}
          </Button>
        </div>
      )}
      {templates.length > 0 ? (
        <div className="space-y-2">
          {templates.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between border border-border p-3">
              <div>
                <p className="text-xs font-bold text-foreground">{t.name}</p>
                {t.notes && <p className="text-[9px] text-muted-foreground mt-0.5">{t.notes}</p>}
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {(t.product_ids?.length || 0)} termék • {new Date(t.created_at).toLocaleDateString("hu-HU")}
                </span>
              </div>
              <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <p className="text-xs text-muted-foreground text-center py-4">Még nincs rendelés sablonod</p>
      )}
    </div>
  );
};

export default OrderTemplates;

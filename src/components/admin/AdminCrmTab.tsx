import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Users, UserPlus } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

interface Member {
  id: string;
  group_id: string;
  user_id: string;
  added_at: string;
}

const AdminCrmTab = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", color: "#3b82f6" });
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newMemberId, setNewMemberId] = useState("");

  const fetchData = async () => {
    const [gRes, mRes] = await Promise.all([
      supabase.from("customer_groups").select("*").order("created_at"),
      supabase.from("customer_group_members").select("*"),
    ]);
    if (gRes.data) setGroups(gRes.data as Group[]);
    if (mRes.data) setMembers(mRes.data as Member[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addGroup = async () => {
    if (!form.name.trim()) return;
    const { error } = await supabase.from("customer_groups").insert({ name: form.name, description: form.description || null, color: form.color });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Csoport létrehozva" }); setShowForm(false); setForm({ name: "", description: "", color: "#3b82f6" }); fetchData(); }
  };

  const deleteGroup = async (id: string) => {
    await supabase.from("customer_groups").delete().eq("id", id);
    toast({ title: "Csoport törölve" }); fetchData();
  };

  const addMember = async () => {
    if (!selectedGroup || !newMemberId.trim()) return;
    const { error } = await supabase.from("customer_group_members").insert({ group_id: selectedGroup, user_id: newMemberId });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Tag hozzáadva" }); setNewMemberId(""); fetchData(); }
  };

  const removeMember = async (id: string) => {
    await supabase.from("customer_group_members").delete().eq("id", id);
    fetchData();
  };

  const groupMembers = (gid: string) => members.filter(m => m.group_id === gid);

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Users className="w-5 h-5" /><h2 className="font-bold text-lg">Ügyfélkezelés (CRM)</h2></div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Új csoport</Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label>Csoport neve</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Leírás</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Szín</Label><Input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="h-10" /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addGroup}>Mentés</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Mégse</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {groups.map(g => (
          <div key={g.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="font-medium">{g.name}</span>
                {g.description && <span className="text-xs text-muted-foreground">– {g.description}</span>}
                <Badge variant="secondary">{groupMembers(g.id).length} tag</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}><UserPlus className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteGroup(g.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
            {selectedGroup === g.id && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input placeholder="Felhasználó ID (UUID)" value={newMemberId} onChange={e => setNewMemberId(e.target.value)} className="max-w-sm" />
                  <Button size="sm" onClick={addMember}>Hozzáadás</Button>
                </div>
                {groupMembers(g.id).length > 0 && (
                  <Table>
                    <TableHeader><TableRow><TableHead>Felhasználó ID</TableHead><TableHead>Hozzáadva</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {groupMembers(g.id).map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs">{m.user_id.slice(0, 12)}…</TableCell>
                          <TableCell className="text-xs">{new Date(m.added_at).toLocaleString("hu")}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        ))}
        {groups.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek ügyfélcsoportok.</p>}
      </div>
    </div>
  );
};

export default AdminCrmTab;

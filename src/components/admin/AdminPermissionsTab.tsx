import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Users } from "lucide-react";

const PERMISSIONS = [
  { key: "manage_products", label: "Termékek kezelése" },
  { key: "manage_orders", label: "Rendelések kezelése" },
  { key: "manage_coupons", label: "Kuponok kezelése" },
  { key: "manage_inventory", label: "Készlet kezelése" },
  { key: "manage_shipping", label: "Szállítás kezelése" },
  { key: "manage_marketing", label: "Marketing kezelése" },
  { key: "view_analytics", label: "Analitika megtekintése" },
  { key: "manage_support", label: "Ügyfélszolgálat kezelése" },
  { key: "manage_settings", label: "Beállítások kezelése" },
];

interface StaffPerm {
  id: string;
  user_id: string;
  permission_name: string;
  is_active: boolean;
}

interface UserRole {
  user_id: string;
  role: string;
}

const AdminPermissionsTab = () => {
  const [perms, setPerms] = useState<StaffPerm[]>([]);
  const [users, setUsers] = useState<UserRole[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [permRes, userRes] = await Promise.all([
      supabase.from("staff_permissions").select("*"),
      supabase.from("user_roles").select("*"),
    ]);
    if (permRes.data) setPerms(permRes.data);
    if (userRes.data) setUsers(userRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const staffUserIds = [...new Set([...users.filter(u => u.role !== "admin").map(u => u.user_id), ...perms.map(p => p.user_id)])];

  const togglePerm = async (userId: string, permName: string, current: boolean) => {
    const existing = perms.find(p => p.user_id === userId && p.permission_name === permName);
    if (existing) {
      await supabase.from("staff_permissions").update({ is_active: !current }).eq("id", existing.id);
    } else {
      await supabase.from("staff_permissions").insert({ user_id: userId, permission_name: permName, is_active: true });
    }
    fetchData();
  };

  const addStaff = async () => {
    if (!newUserId.trim()) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: newUserId, role: "moderator" as any });
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Munkatárs hozzáadva" });
      setNewUserId("");
      fetchData();
    }
  };

  const removePerm = async (userId: string) => {
    await supabase.from("staff_permissions").delete().eq("user_id", userId);
    await supabase.from("user_roles").delete().eq("user_id", userId).neq("role", "admin");
    toast({ title: "Munkatárs eltávolítva" });
    fetchData();
  };

  const hasPerm = (userId: string, permName: string) => {
    const p = perms.find(x => x.user_id === userId && x.permission_name === permName);
    return p?.is_active ?? false;
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        <h2 className="font-bold text-lg">Jogosultságok kezelése</h2>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Felhasználó ID (UUID)" value={newUserId} onChange={e => setNewUserId(e.target.value)} className="max-w-md" />
        <Button onClick={addStaff} size="sm"><Plus className="w-4 h-4 mr-1" /> Hozzáadás</Button>
      </div>

      {staffUserIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nincsenek munkatársak hozzárendelve.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Felhasználó</TableHead>
                {PERMISSIONS.map(p => <TableHead key={p.key} className="text-center text-xs">{p.label}</TableHead>)}
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffUserIds.map(uid => (
                <TableRow key={uid}>
                  <TableCell className="font-mono text-xs">{uid.slice(0, 8)}…</TableCell>
                  {PERMISSIONS.map(p => (
                    <TableCell key={p.key} className="text-center">
                      <Switch checked={hasPerm(uid, p.key)} onCheckedChange={() => togglePerm(uid, p.key, hasPerm(uid, p.key))} />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removePerm(uid)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminPermissionsTab;

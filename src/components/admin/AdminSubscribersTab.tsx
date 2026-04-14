import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  created_at: string;
}

const AdminSubscribersTab = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("launch_subscribers")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setSubscribers(data);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Feliratkozók
        </h2>
        <Badge variant="secondary">{subscribers.length} feliratkozó</Badge>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Betöltés...</p>
      ) : subscribers.length === 0 ? (
        <p className="text-muted-foreground">Még nincs feliratkozó.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Feliratkozás dátuma</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.email}</TableCell>
                <TableCell>
                  {new Date(s.created_at).toLocaleString("hu-HU")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AdminSubscribersTab;

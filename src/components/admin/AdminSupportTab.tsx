import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send } from "lucide-react";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
}

const AdminSupportTab = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setTickets(data);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const updateTicket = async (id: string, updates: Partial<Ticket>) => {
    const { error } = await supabase.from("support_tickets").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Frissítve" });
      fetchTickets();
      if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, ...updates } as Ticket);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;
    await updateTicket(selectedTicket.id, { admin_reply: reply, status: "answered" });
    setReply("");
  };

  const filtered = filterStatus === "all" ? tickets : tickets.filter(t => t.status === filterStatus);

  const statusColor = (s: string) => {
    switch (s) {
      case "open": return "destructive";
      case "answered": return "default";
      case "closed": return "secondary";
      default: return "outline";
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "high": return "destructive";
      case "urgent": return "destructive";
      default: return "outline";
    }
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-3">
        <div className="flex gap-2 items-center">
          <MessageSquare className="w-5 h-5" />
          <h2 className="font-bold text-lg">Ticketek</h2>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes</SelectItem>
            <SelectItem value="open">Nyitott</SelectItem>
            <SelectItem value="answered">Megválaszolt</SelectItem>
            <SelectItem value="closed">Lezárt</SelectItem>
          </SelectContent>
        </Select>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map(t => (
            <div
              key={t.id}
              onClick={() => { setSelectedTicket(t); setReply(t.admin_reply || ""); }}
              className={`p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition ${selectedTicket?.id === t.id ? "border-primary bg-accent/30" : ""}`}
            >
              <p className="font-medium text-sm truncate">{t.subject}</p>
              <div className="flex gap-1 mt-1">
                <Badge variant={statusColor(t.status) as any}>{t.status}</Badge>
                <Badge variant={priorityColor(t.priority) as any}>{t.priority}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{new Date(t.created_at).toLocaleString("hu")}</p>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nincs ticket.</p>}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedTicket ? (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{selectedTicket.subject}</h3>
                <p className="text-xs text-muted-foreground">ID: {selectedTicket.user_id.slice(0, 8)}… · {new Date(selectedTicket.created_at).toLocaleString("hu")}</p>
              </div>
              <Select value={selectedTicket.status} onValueChange={(v) => updateTicket(selectedTicket.id, { status: v })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Nyitott</SelectItem>
                  <SelectItem value="answered">Megválaszolt</SelectItem>
                  <SelectItem value="closed">Lezárt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/50 rounded p-3">
              <p className="text-sm font-medium mb-1">Ügyfél üzenete:</p>
              <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Admin válasz:</p>
              <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Írj választ..." rows={4} />
              <Button onClick={sendReply} className="mt-2" size="sm"><Send className="w-4 h-4 mr-1" /> Válasz küldése</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Válassz ki egy ticketet a bal oldali listából</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupportTab;

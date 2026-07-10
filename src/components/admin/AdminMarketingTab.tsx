import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, X, Check, Send, Users, Mail, Clock } from "lucide-react";
import MarketingAuditLog from "./MarketingAuditLog";

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  subject: string | null;
  content: string | null;
  target_segment: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
}

const CAMPAIGN_TYPES = [
  { value: "newsletter", label: "Hírlevél" },
  { value: "promotion", label: "Promóció" },
  { value: "announcement", label: "Bejelentés" },
  { value: "reminder", label: "Emlékeztető" },
];

const SEGMENTS = [
  { value: "all", label: "Minden felhasználó" },
  { value: "active", label: "Aktív vásárlók (30 nap)" },
  { value: "inactive", label: "Inaktív felhasználók" },
  { value: "high_value", label: "Magas értékű vásárlók" },
  { value: "new", label: "Új regisztrálók (7 nap)" },
];

const AdminMarketingTab = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editCampaign, setEditCampaign] = useState<Partial<Campaign> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchCampaigns = async () => {
    const { data } = await supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false });
    if (data) setCampaigns(data as any);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const saveCampaign = async () => {
    if (!editCampaign?.name) {
      toast({ title: "Hiba", description: "Név kötelező!", variant: "destructive" });
      return;
    }
    const payload = {
      name: editCampaign.name,
      campaign_type: editCampaign.campaign_type || "newsletter",
      subject: editCampaign.subject || null,
      content: editCampaign.content || null,
      target_segment: editCampaign.target_segment || "all",
      status: editCampaign.status || "draft",
      scheduled_at: editCampaign.scheduled_at || null,
    };
    if (editCampaign.id) {
      await supabase.from("marketing_campaigns").update(payload).eq("id", editCampaign.id);
      toast({ title: "Kampány frissítve!" });
    } else {
      await supabase.from("marketing_campaigns").insert(payload);
      toast({ title: "Kampány létrehozva!" });
    }
    setShowForm(false);
    setEditCampaign(null);
    fetchCampaigns();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "sent") updates.sent_at = new Date().toISOString();
    await supabase.from("marketing_campaigns").update(updates).eq("id", id);
    toast({ title: `Kampány ${status === "sent" ? "elküldve" : status === "scheduled" ? "ütemezve" : "frissítve"}!` });
    fetchCampaigns();
  };

  const deleteCampaign = async (id: string) => {
    await supabase.from("marketing_campaigns").delete().eq("id", id);
    toast({ title: "Kampány törölve!" });
    fetchCampaigns();
  };

  const drafts = campaigns.filter(c => c.status === "draft").length;
  const scheduled = campaigns.filter(c => c.status === "scheduled").length;
  const sent = campaigns.filter(c => c.status === "sent").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Marketing kampányok ({campaigns.length})</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { setEditCampaign({ campaign_type: "newsletter", target_segment: "all", status: "draft" }); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Új kampány
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Piszkozat</span>
          <p className="text-xl font-bold">{drafts}</p>
        </div>
        <div className="border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-blue-400">Ütemezett</span>
          <p className="text-xl font-bold text-blue-400">{scheduled}</p>
        </div>
        <div className="border bg-card p-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-accent">Elküldve</span>
          <p className="text-xl font-bold text-accent">{sent}</p>
        </div>
      </div>

      {showForm && editCampaign && (
        <div className="border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">{editCampaign.id ? "Szerkesztés" : "Új kampány"}</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowForm(false); setEditCampaign(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Név *</Label>
              <Input value={editCampaign.name || ""} onChange={e => setEditCampaign({ ...editCampaign, name: e.target.value })} className="mt-1" placeholder="pl. Húsvéti akció hírlevél" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Típus</Label>
              <select value={editCampaign.campaign_type || "newsletter"} onChange={e => setEditCampaign({ ...editCampaign, campaign_type: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Célcsoport</Label>
              <select value={editCampaign.target_segment || "all"} onChange={e => setEditCampaign({ ...editCampaign, target_segment: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ütemezés</Label>
              <Input type="datetime-local" value={editCampaign.scheduled_at ? editCampaign.scheduled_at.slice(0, 16) : ""} onChange={e => setEditCampaign({ ...editCampaign, scheduled_at: e.target.value || null })} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tárgy</Label>
              <Input value={editCampaign.subject || ""} onChange={e => setEditCampaign({ ...editCampaign, subject: e.target.value })} className="mt-1" placeholder="Email tárgya..." />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tartalom</Label>
              <Textarea value={editCampaign.content || ""} onChange={e => setEditCampaign({ ...editCampaign, content: e.target.value })} className="mt-1 rounded-none min-h-[120px] text-xs" placeholder="A kampány tartalma... Használj {name}, {storeName} változókat." />
            </div>
          </div>
          <Button className="rounded-none uppercase tracking-wider text-xs" onClick={saveCampaign}>
            <Check className="h-3.5 w-3.5 mr-1" /> Mentés
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {campaigns.map(c => (
          <div key={c.id} className="flex items-center gap-3 border bg-card p-3">
            <div className="flex-shrink-0">
              {c.status === "sent" ? <Send className="h-5 w-5 text-accent" /> : c.status === "scheduled" ? <Clock className="h-5 w-5 text-blue-400" /> : <Mail className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 border">{CAMPAIGN_TYPES.find(t => t.value === c.campaign_type)?.label}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span><Users className="h-3 w-3 inline mr-1" />{SEGMENTS.find(s => s.value === c.target_segment)?.label}</span>
                {c.sent_at && <span>Küldve: {new Date(c.sent_at).toLocaleDateString("hu-HU")}</span>}
                {c.sent_count > 0 && <span>{c.sent_count} küldés • {c.open_count} megnyitás</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {c.status === "draft" && (
                <>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateStatus(c.id, "scheduled")}>
                    <Clock className="h-3 w-3 mr-1" /> Ütemezés
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs text-accent" onClick={() => updateStatus(c.id, "sent")}>
                    <Send className="h-3 w-3 mr-1" /> Küldés
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditCampaign(c); setShowForm(true); }}>
                <Mail className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCampaign(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek kampányok.</p>
        )}
      </div>
    </div>
  );
};

export default AdminMarketingTab;

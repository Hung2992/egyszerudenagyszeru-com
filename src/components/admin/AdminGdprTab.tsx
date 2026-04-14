import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Trash2, Check, Shield, Cookie, FileText, Save, Download, Eye } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface GdprRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  details: string | null;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
}

interface GdprSettings {
  id: string;
  cookie_consent_enabled: boolean;
  privacy_banner_text: string | null;
  data_retention_days: number;
  privacy_policy: string | null;
}

const REQUEST_TYPES: Record<string, string> = {
  data_export: "Adatexport kérés",
  data_deletion: "Adattörlés kérés",
  consent_withdrawal: "Hozzájárulás visszavonás",
  data_access: "Adathozzáférés",
};

const AdminGdprTab = () => {
  const { userId } = useAdminCheck();
  const [requests, setRequests] = useState<GdprRequest[]>([]);
  const [settings, setSettings] = useState<GdprSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRequests = async () => {
    const { data } = await supabase.from("gdpr_requests").select("*").order("created_at", { ascending: false });
    if (data) setRequests(data as any);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("store_settings").select("id, cookie_consent_enabled, privacy_banner_text, data_retention_days, privacy_policy").limit(1).single();
    if (data) setSettings(data as any);
  };

  useEffect(() => { fetchRequests(); fetchSettings(); }, []);

  const updateRequestStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "completed") {
      updates.processed_at = new Date().toISOString();
      updates.processed_by = userId;
    }
    await supabase.from("gdpr_requests").update(updates).eq("id", id);
    toast({ title: `Kérelem ${status === "completed" ? "feldolgozva" : "frissítve"}!` });
    fetchRequests();
  };

  const deleteRequest = async (id: string) => {
    await supabase.from("gdpr_requests").delete().eq("id", id);
    toast({ title: "Kérelem törölve!" });
    fetchRequests();
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { id, ...payload } = settings;
    await supabase.from("store_settings").update(payload as any).eq("id", id);
    toast({ title: "GDPR beállítások mentve!" });
    setSaving(false);
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold uppercase tracking-wider">Adatvédelem / GDPR</h2>

      {/* GDPR Settings */}
      {settings && (
        <div className="border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Cookie className="h-4 w-4" /> Cookie & adatvédelmi beállítások
            </h3>
            <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={saveSettings} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Mentés..." : "Mentés"}
            </Button>
          </div>

          <label className="flex items-center justify-between border p-4 cursor-pointer hover:border-foreground/30 transition-colors">
            <div className="flex items-center gap-3">
              <Cookie className="h-5 w-5 text-accent" />
              <div>
                <span className="text-sm font-semibold text-foreground">Cookie hozzájárulás banner</span>
                <p className="text-xs text-muted-foreground">Süti elfogadás kérése a látogatóktól</p>
              </div>
            </div>
            <input type="checkbox" checked={settings.cookie_consent_enabled} onChange={e => setSettings({ ...settings, cookie_consent_enabled: e.target.checked })} className="h-5 w-5 rounded border-2 accent-accent" />
          </label>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cookie banner szöveg</Label>
            <Textarea value={settings.privacy_banner_text || ""} onChange={e => setSettings({ ...settings, privacy_banner_text: e.target.value })} className="mt-1 rounded-none min-h-[60px] text-xs" />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Adatmegőrzési idő (nap)</Label>
            <Input type="number" value={settings.data_retention_days} onChange={e => setSettings({ ...settings, data_retention_days: Number(e.target.value) })} className="mt-1 w-32" />
            <p className="text-[10px] text-muted-foreground mt-1">GDPR szerint max 365 nap ajánlott</p>
          </div>
        </div>
      )}

      {/* GDPR Requests */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Shield className="h-4 w-4" /> Adatvédelmi kérelmek ({requests.length})
          {pendingCount > 0 && <span className="text-sm text-yellow-500">({pendingCount} függőben)</span>}
        </h3>

        <div className="space-y-2">
          {requests.map(r => (
            <div key={r.id} className={`border bg-card p-4 space-y-2 ${r.status === "pending" ? "border-yellow-500/30" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{REQUEST_TYPES[r.request_type] || r.request_type}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 border ${
                      r.status === "pending" ? "text-yellow-500 border-yellow-500/30" :
                      r.status === "completed" ? "text-green-500 border-green-500/30" :
                      "text-muted-foreground"
                    }`}>{r.status === "pending" ? "Függőben" : r.status === "completed" ? "Feldolgozva" : r.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleDateString("hu-HU")} • User: {r.user_id.slice(0, 8)}...
                    {r.processed_at && ` • Feldolgozva: ${new Date(r.processed_at).toLocaleDateString("hu-HU")}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {r.status === "pending" && (
                    <Button size="sm" className="rounded-none text-xs" onClick={() => updateRequestStatus(r.id, "completed")}>
                      <Check className="h-3 w-3 mr-1" /> Feldolgozás
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRequest(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {r.details && <p className="text-xs text-muted-foreground bg-muted/50 p-2">{r.details}</p>}
            </div>
          ))}
          {requests.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nincsenek adatvédelmi kérelmek.</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="border bg-card p-5 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider">Gyors műveletek</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-none text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> Összes adat exportálása
          </Button>
          <Button variant="outline" size="sm" className="rounded-none text-xs">
            <Eye className="h-3.5 w-3.5 mr-1" /> Adatvédelmi audit
          </Button>
          <Button variant="outline" size="sm" className="rounded-none text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" /> Adatvédelmi nyilatkozat szerkesztése
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminGdprTab;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, MousePointerClick, FlaskConical, MessageSquareMore, ArrowUpRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PopupRule {
  id: string;
  name: string;
  popup_type: string;
  content: any;
  display_frequency: string;
  is_active: boolean;
  priority: number;
}

interface UpsellRule {
  id: string;
  name: string;
  rule_type: string;
  source_category: string | null;
  discount_pct: number;
  is_active: boolean;
  priority: number;
}

const POPUP_TYPES = [
  { value: "exit_intent", label: "Exit-intent" },
  { value: "timed", label: "Időzített" },
  { value: "scroll", label: "Görgetésre" },
  { value: "first_visit", label: "Első látogatás" },
];

const AdminConversionTab = () => {
  const [popups, setPopups] = useState<PopupRule[]>([]);
  const [upsells, setUpsells] = useState<UpsellRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopupForm, setShowPopupForm] = useState(false);
  const [showUpsellForm, setShowUpsellForm] = useState(false);
  const [popupForm, setPopupForm] = useState({ name: "", popup_type: "exit_intent", title: "", message: "", display_frequency: "once_per_session" });
  const [upsellForm, setUpsellForm] = useState({ name: "", rule_type: "upsell", source_category: "", discount_pct: 10 });

  const fetchData = async () => {
    const [pRes, uRes] = await Promise.all([
      supabase.from("popup_rules").select("*").order("priority"),
      supabase.from("upsell_rules").select("*").order("priority"),
    ]);
    if (pRes.data) setPopups(pRes.data as PopupRule[]);
    if (uRes.data) setUpsells(uRes.data as UpsellRule[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addPopup = async () => {
    if (!popupForm.name.trim()) return;
    const { error } = await supabase.from("popup_rules").insert({
      name: popupForm.name, popup_type: popupForm.popup_type,
      content: { title: popupForm.title, message: popupForm.message },
      display_frequency: popupForm.display_frequency,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Popup szabály létrehozva" }); setShowPopupForm(false); fetchData(); }
  };

  const addUpsell = async () => {
    if (!upsellForm.name.trim()) return;
    const { error } = await supabase.from("upsell_rules").insert({
      name: upsellForm.name, rule_type: upsellForm.rule_type,
      source_category: upsellForm.source_category || null, discount_pct: upsellForm.discount_pct,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Upsell szabály létrehozva" }); setShowUpsellForm(false); fetchData(); }
  };

  const togglePopup = async (id: string, active: boolean) => {
    await supabase.from("popup_rules").update({ is_active: active }).eq("id", id);
    fetchData();
  };

  const toggleUpsell = async (id: string, active: boolean) => {
    await supabase.from("upsell_rules").update({ is_active: active }).eq("id", id);
    fetchData();
  };

  const deletePopup = async (id: string) => { await supabase.from("popup_rules").delete().eq("id", id); fetchData(); };
  const deleteUpsell = async (id: string) => { await supabase.from("upsell_rules").delete().eq("id", id); fetchData(); };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-8">
      {/* Popups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><MessageSquareMore className="w-5 h-5" /><h2 className="font-bold text-lg">Popup szabályok</h2></div>
          <Button size="sm" onClick={() => setShowPopupForm(!showPopupForm)}><Plus className="w-4 h-4 mr-1" /> Új popup</Button>
        </div>

        {showPopupForm && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Név</Label><Input value={popupForm.name} onChange={e => setPopupForm({ ...popupForm, name: e.target.value })} /></div>
              <div>
                <Label>Típus</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={popupForm.popup_type} onChange={e => setPopupForm({ ...popupForm, popup_type: e.target.value })}>
                  {POPUP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><Label>Popup cím</Label><Input value={popupForm.title} onChange={e => setPopupForm({ ...popupForm, title: e.target.value })} /></div>
              <div><Label>Üzenet</Label><Input value={popupForm.message} onChange={e => setPopupForm({ ...popupForm, message: e.target.value })} /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addPopup}>Mentés</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPopupForm(false)}>Mégse</Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader><TableRow><TableHead>Név</TableHead><TableHead>Típus</TableHead><TableHead>Gyakoriság</TableHead><TableHead>Aktív</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {popups.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><Badge variant="outline">{POPUP_TYPES.find(t => t.value === p.popup_type)?.label || p.popup_type}</Badge></TableCell>
                <TableCell className="text-xs">{p.display_frequency}</TableCell>
                <TableCell><Switch checked={p.is_active} onCheckedChange={v => togglePopup(p.id, v)} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => deletePopup(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {popups.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek popup szabályok.</p>}
      </div>

      {/* Upsell/Cross-sell */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><ArrowUpRight className="w-5 h-5" /><h2 className="font-bold text-lg">Upsell / Cross-sell szabályok</h2></div>
          <Button size="sm" onClick={() => setShowUpsellForm(!showUpsellForm)}><Plus className="w-4 h-4 mr-1" /> Új szabály</Button>
        </div>

        {showUpsellForm && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Név</Label><Input value={upsellForm.name} onChange={e => setUpsellForm({ ...upsellForm, name: e.target.value })} /></div>
              <div>
                <Label>Típus</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={upsellForm.rule_type} onChange={e => setUpsellForm({ ...upsellForm, rule_type: e.target.value })}>
                  <option value="upsell">Upsell</option>
                  <option value="cross_sell">Cross-sell</option>
                  <option value="bundle">Csomag ajánlat</option>
                </select>
              </div>
              <div><Label>Forrás kategória</Label><Input value={upsellForm.source_category} onChange={e => setUpsellForm({ ...upsellForm, source_category: e.target.value })} /></div>
              <div><Label>Kedvezmény (%)</Label><Input type="number" value={upsellForm.discount_pct} onChange={e => setUpsellForm({ ...upsellForm, discount_pct: Number(e.target.value) })} /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addUpsell}>Mentés</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowUpsellForm(false)}>Mégse</Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader><TableRow><TableHead>Név</TableHead><TableHead>Típus</TableHead><TableHead>Kedvezmény</TableHead><TableHead>Aktív</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {upsells.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell><Badge variant="outline">{u.rule_type}</Badge></TableCell>
                <TableCell>{u.discount_pct}%</TableCell>
                <TableCell><Switch checked={u.is_active} onCheckedChange={v => toggleUpsell(u.id, v)} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => deleteUpsell(u.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {upsells.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek upsell szabályok.</p>}
      </div>
    </div>
  );
};

export default AdminConversionTab;

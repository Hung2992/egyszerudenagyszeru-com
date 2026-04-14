import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, X, Check, Zap, Clock, Tag } from "lucide-react";

interface PricingRule {
  id: string;
  name: string;
  rule_type: string;
  discount_value: number;
  conditions: any;
  applicable_categories: string[];
  min_quantity: number;
  min_order_amount: number;
  priority: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
}

const RULE_TYPES = [
  { value: "percentage", label: "Százalékos kedvezmény" },
  { value: "fixed", label: "Fix összegű kedvezmény" },
  { value: "quantity", label: "Mennyiségi árazás" },
  { value: "flash_sale", label: "Flash Sale (időzített)" },
  { value: "bundle", label: "Csomag kedvezmény" },
];

const AdminDynamicPricingTab = () => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [editRule, setEditRule] = useState<Partial<PricingRule> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchRules = async () => {
    const { data } = await supabase.from("dynamic_pricing_rules").select("*").order("priority", { ascending: false });
    if (data) setRules(data as any);
  };

  useEffect(() => { fetchRules(); }, []);

  const saveRule = async () => {
    if (!editRule?.name) {
      toast({ title: "Hiba", description: "Név kötelező!", variant: "destructive" });
      return;
    }
    const payload = {
      name: editRule.name,
      rule_type: editRule.rule_type || "percentage",
      discount_value: Number(editRule.discount_value) || 0,
      conditions: editRule.conditions || {},
      applicable_categories: editRule.applicable_categories || [],
      min_quantity: Number(editRule.min_quantity) || 1,
      min_order_amount: Number(editRule.min_order_amount) || 0,
      priority: Number(editRule.priority) || 0,
      is_active: editRule.is_active ?? true,
      valid_from: editRule.valid_from || new Date().toISOString(),
      valid_until: editRule.valid_until || null,
    };
    if (editRule.id) {
      await supabase.from("dynamic_pricing_rules").update(payload).eq("id", editRule.id);
      toast({ title: "Szabály frissítve!" });
    } else {
      await supabase.from("dynamic_pricing_rules").insert(payload);
      toast({ title: "Szabály létrehozva!" });
    }
    setShowForm(false);
    setEditRule(null);
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("dynamic_pricing_rules").delete().eq("id", id);
    toast({ title: "Szabály törölve!" });
    fetchRules();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("dynamic_pricing_rules").update({ is_active: active }).eq("id", id);
    toast({ title: active ? "Szabály aktiválva" : "Szabály letiltva" });
    fetchRules();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Dinamikus árazás ({rules.length})</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { setEditRule({ rule_type: "percentage" }); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Új szabály
        </Button>
      </div>

      {showForm && editRule && (
        <div className="border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">{editRule.id ? "Szerkesztés" : "Új árazási szabály"}</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowForm(false); setEditRule(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Név *</Label>
              <Input value={editRule.name || ""} onChange={e => setEditRule({ ...editRule, name: e.target.value })} className="mt-1" placeholder="pl. Nyári akció -20%" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Típus</Label>
              <select value={editRule.rule_type || "percentage"} onChange={e => setEditRule({ ...editRule, rule_type: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kedvezmény értéke {editRule.rule_type === "percentage" ? "(%)" : "(Ft)"}</Label>
              <Input type="number" value={editRule.discount_value || 0} onChange={e => setEditRule({ ...editRule, discount_value: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prioritás</Label>
              <Input type="number" value={editRule.priority || 0} onChange={e => setEditRule({ ...editRule, priority: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Min. mennyiség</Label>
              <Input type="number" value={editRule.min_quantity || 1} onChange={e => setEditRule({ ...editRule, min_quantity: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Min. rendelési összeg (Ft)</Label>
              <Input type="number" value={editRule.min_order_amount || 0} onChange={e => setEditRule({ ...editRule, min_order_amount: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Érvényes ettől</Label>
              <Input type="datetime-local" value={editRule.valid_from ? editRule.valid_from.slice(0, 16) : ""} onChange={e => setEditRule({ ...editRule, valid_from: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Érvényes eddig</Label>
              <Input type="datetime-local" value={editRule.valid_until ? editRule.valid_until.slice(0, 16) : ""} onChange={e => setEditRule({ ...editRule, valid_until: e.target.value || null })} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kategóriák (vesszővel)</Label>
              <Input value={(editRule.applicable_categories || []).join(", ")} onChange={e => setEditRule({ ...editRule, applicable_categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="mt-1" placeholder="Pólók, Nadrágok (üres = minden)" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={editRule.is_active ?? true} onChange={e => setEditRule({ ...editRule, is_active: e.target.checked })} className="rounded" />
              Aktív
            </label>
          </div>
          <Button className="rounded-none uppercase tracking-wider text-xs" onClick={saveRule}>
            <Check className="h-3.5 w-3.5 mr-1" /> Mentés
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {rules.map(r => {
          const typeLabel = RULE_TYPES.find(t => t.value === r.rule_type)?.label || r.rule_type;
          const isExpired = r.valid_until && new Date(r.valid_until) < new Date();
          return (
            <div key={r.id} className={`flex items-center gap-3 border bg-card p-3 ${isExpired ? "opacity-50" : ""}`}>
              <div className="flex-shrink-0">
                {r.rule_type === "flash_sale" ? <Zap className="h-5 w-5 text-yellow-500" /> : r.rule_type === "quantity" ? <Tag className="h-5 w-5 text-accent" /> : <Tag className="h-5 w-5 text-accent" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{r.name}</span>
                  {!r.is_active && <span className="text-[9px] font-bold uppercase tracking-widest text-destructive">Inaktív</span>}
                  {isExpired && <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Lejárt</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{typeLabel}</span>
                  <span className="font-bold text-accent">{r.rule_type === "percentage" ? `${r.discount_value}%` : `${r.discount_value.toLocaleString()} Ft`}</span>
                  {r.min_quantity > 1 && <span>min {r.min_quantity} db</span>}
                  {r.applicable_categories.length > 0 && <span>{r.applicable_categories.join(", ")}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(r.id, !r.is_active)}>
                  {r.is_active ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditRule(r); setShowForm(true); }}>
                  <Clock className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRule(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {rules.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek dinamikus árazási szabályok.</p>
        )}
      </div>
    </div>
  );
};

export default AdminDynamicPricingTab;

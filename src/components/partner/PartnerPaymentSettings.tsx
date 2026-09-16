// Webshop fizetési beállítások: engedélyezett fizetési módok és a partner valós
// bankszámlája, amelyre a vásárlók az átutalást indítják.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Banknote, Loader2, Save } from "lucide-react";

interface Props { partnerId: string }

const PartnerPaymentSettings = ({ partnerId }: Props) => {
  const [sfId, setSfId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cod, setCod] = useState(true);
  const [transfer, setTransfer] = useState(true);
  const [f, setF] = useState({
    bank_account_holder: "",
    bank_name: "",
    bank_account_number: "",
    bank_iban: "",
    payment_instructions: "",
  });

  useEffect(() => {
    if (!partnerId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("partner_storefronts")
        .select("id,payment_methods,bank_account_holder,bank_name,bank_account_number,bank_iban,payment_instructions")
        .eq("partner_id", partnerId)
        .maybeSingle();
      if (!alive) return;
      if (data) {
        setSfId(data.id);
        const pm: string[] = Array.isArray(data.payment_methods) ? data.payment_methods : ["cod", "transfer"];
        setCod(pm.includes("cod"));
        setTransfer(pm.includes("transfer"));
        setF({
          bank_account_holder: data.bank_account_holder || "",
          bank_name: data.bank_name || "",
          bank_account_number: data.bank_account_number || "",
          bank_iban: data.bank_iban || "",
          payment_instructions: data.payment_instructions || "",
        });
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [partnerId]);

  const save = async () => {
    if (!sfId) return;
    const methods = [cod ? "cod" : null, transfer ? "transfer" : null].filter(Boolean);
    if (!methods.length) {
      toast({ title: "Legalább egy fizetési mód kell", variant: "destructive" });
      return;
    }
    if (transfer && !f.bank_account_number.trim() && !f.bank_iban.trim()) {
      toast({ title: "Add meg a bankszámlaszámot", description: "Átutalásos fizetéshez kötelező.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("partner_storefronts")
      .update({ payment_methods: methods, ...f })
      .eq("id", sfId);
    setSaving(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Fizetési beállítások mentve", description: "A webshop pénztárában azonnal érvényes." });
  };

  if (loading) return null;
  if (!sfId) return null;

  return (
    <Card className="rounded-none p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
        <Banknote className="h-3.5 w-3.5" /> Fizetési módok és bankszámla
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between border border-border p-3">
          <span className="text-sm">Utánvét</span>
          <Switch checked={cod} onCheckedChange={setCod} />
        </div>
        <div className="flex items-center justify-between border border-border p-3">
          <span className="text-sm">Banki átutalás (valós számlára)</span>
          <Switch checked={transfer} onCheckedChange={setTransfer} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Számlatulajdonos</Label>
          <Input className="rounded-none" value={f.bank_account_holder} onChange={(e) => setF({ ...f, bank_account_holder: e.target.value })} placeholder="Cég vagy név" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bank neve</Label>
          <Input className="rounded-none" value={f.bank_name} onChange={(e) => setF({ ...f, bank_name: e.target.value })} placeholder="pl. OTP Bank" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bankszámlaszám</Label>
          <Input className="rounded-none" value={f.bank_account_number} onChange={(e) => setF({ ...f, bank_account_number: e.target.value })} placeholder="11111111-22222222-33333333" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">IBAN (külföldi utaláshoz)</Label>
          <Input className="rounded-none" value={f.bank_iban} onChange={(e) => setF({ ...f, bank_iban: e.target.value })} placeholder="HU00 0000 0000 0000 0000 0000 0000" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Fizetési tájékoztató a vásárlónak</Label>
        <Input className="rounded-none" value={f.payment_instructions} onChange={(e) => setF({ ...f, payment_instructions: e.target.value })} placeholder="pl. A közleménybe írd a rendelésszámot." />
      </div>

      <Button className="rounded-none" onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Mentés
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Az átutalásos rendeléseknél a vásárló a rendelés után látja ezeket az adatokat, a közlemény a rendelésszám.
        A beérkezett fizetést a Pénzügy oldalon jelölheted megérkezettnek.
      </p>
    </Card>
  );
};

export default PartnerPaymentSettings;

import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  onInvited?: () => void;
}

const AdminPartnerInviteDialog = ({ onInvited }: Props) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [partnerType, setPartnerType] = useState<"person" | "company">("person");
  const [commission, setCommission] = useState(500);
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState(10);

  const reset = () => {
    setEmail(""); setFullName(""); setCompanyName(""); setPartnerType("person");
    setCommission(500); setDiscountType("percent"); setDiscountValue(10);
  };

  const send = async () => {
    if (!email || !fullName) {
      toast({ title: "Email és név kötelező", variant: "destructive" });
      return;
    }
    setSending(true);
    const payload: Record<string, unknown> = {
      email, full_name: fullName,
      partner_type: partnerType,
      company_name: partnerType === "company" ? companyName : null,
      commission_per_order_amount: commission,
    };
    if (discountType === "percent") payload.customer_discount_percent = discountValue;
    else payload.customer_discount_amount = discountValue;

    const { data, error } = await supabase.functions.invoke("invite-partner", { body: payload });
    setSending(false);
    if (error || !(data as any)?.ok) {
      toast({ title: "Meghívási hiba", description: error?.message || (data as any)?.error || "ismeretlen hiba", variant: "destructive" });
      return;
    }
    toast({ title: "✅ Partner meghívva", description: `Kupon: ${(data as any).coupon_code || "—"}` });
    reset();
    setOpen(false);
    onInvited?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="rounded-none uppercase tracking-wider text-xs">
          <Mail className="w-4 h-4 mr-1" /> Partner meghívása
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none max-w-lg">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm">Új partner meghívása</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase">Típus</Label>
              <Select value={partnerType} onValueChange={(v) => setPartnerType(v as "person" | "company")}>
                <SelectTrigger className="rounded-none mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Magánszemély</SelectItem>
                  <SelectItem value="company">Cég</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">Email *</Label>
              <Input type="email" className="rounded-none mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="partner@email.hu" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase">Teljes név *</Label>
            <Input className="rounded-none mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          {partnerType === "company" && (
            <div>
              <Label className="text-xs uppercase">Cégnév</Label>
              <Input className="rounded-none mt-1" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 border-t pt-3">
            <div>
              <Label className="text-xs uppercase">Jutalék (Ft / rendelés)</Label>
              <Input type="number" min={0} className="rounded-none mt-1" value={commission} onChange={(e) => setCommission(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs uppercase">Vásárlói kedv. típus</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "amount")}>
                <SelectTrigger className="rounded-none mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">% kedvezmény</SelectItem>
                  <SelectItem value="amount">Ft kedvezmény</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase">{discountType === "percent" ? "%" : "Ft"}</Label>
              <Input type="number" min={0} className="rounded-none mt-1" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground border p-2">
            🔒 Egyedi <code>PARTNER-XXXXXX</code> kupon generálódik, és magic-link emailt küldünk a partnernek.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" className="rounded-none uppercase text-xs" onClick={() => setOpen(false)}>Mégse</Button>
            <Button size="sm" className="rounded-none uppercase text-xs" onClick={send} disabled={sending}>
              <Send className="w-3 h-3 mr-1" /> {sending ? "Küldés..." : "Meghívó küldése"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminPartnerInviteDialog;

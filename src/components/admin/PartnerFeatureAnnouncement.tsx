// Partner bemutató panel: a naptár és a szolgáltatás-funkciók bemutatása, valamint kiküldése a partnereknek.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, ExternalLink, Mail, PhoneCall, Sparkles, Wrench } from "lucide-react";

const ITEMS = [
  { icon: CalendarDays, title: "Napi naptár", text: "Havi nézet és napi bontás: időpont, ügyfél, szolgáltatás, helyszín, időtartam." },
  { icon: PhoneCall, title: "Ma kikkel kell beszélni", text: "A mai ügyfelek listája hívás, e-mail, SMS és „Részletek küldése” gombbal." },
  { icon: Wrench, title: "Digitális / kurzus / szolgáltatás", text: "Külön beállítások: átadás, licenc, oktató, kapacitás, munkanapok, előleg, garancia." },
  { icon: Sparkles, title: "Automatikus visszaigazolás", text: "Új foglalásnál az ügyfél e-mailben megkapja az időpont részleteit." },
];

const PartnerFeatureAnnouncement = () => {
  const [sending, setSending] = useState(false);

  const sendAnnouncement = async () => {
    setSending(true);
    try {
      const { data: partners, error } = await supabase
        .from("partners")
        .select("id, email, full_name, company_name, is_active")
        .not("email", "is", null)
        .limit(500);
      if (error) throw error;

      const targets = ((partners as any[]) || []).filter(p => p.email && p.is_active !== false);
      if (!targets.length) {
        toast({ title: "Nincs kiküldhető partner e-mail cím", variant: "destructive" });
        return;
      }

      const { data: stores } = await supabase
        .from("partner_storefronts")
        .select("partner_id, slug, is_published")
        .in("partner_id", targets.map(p => p.id));
      const slugMap: Record<string, string> = {};
      ((stores as any[]) || []).forEach(s => { if (s.slug && s.is_published) slugMap[s.partner_id] = s.slug; });

      let ok = 0;
      const failed: string[] = [];
      for (const p of targets) {
        const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "partner-feature-announcement",
            recipientEmail: p.email,
            idempotencyKey: `partner-feature-announcement:${p.id}`,
            templateData: {
              full_name: p.full_name || p.company_name || null,
              portal_url: `${window.location.origin}/partner`,
              storefront_url: slugMap[p.id] ? `${window.location.origin}/b/${slugMap[p.id]}` : null,
            },
          },
        });
        if (sendErr) failed.push(p.email); else ok += 1;
      }

      toast({
        title: `Bemutató elküldve: ${ok}/${targets.length} partner`,
        description: failed.length ? `Nem sikerült: ${failed.join(", ")}` : "Minden címzett megkapta.",
        variant: failed.length ? "destructive" : "default",
      });
    } catch (e: any) {
      toast({ title: "Kiküldés sikertelen", description: e?.message || "Ismeretlen hiba", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="rounded-none p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Partner bemutató — Naptár és szolgáltatások</div>
          <p className="text-xs text-muted-foreground">Ezt látják a partnerek a Partner Központban, és ezt kapják meg e-mailben is.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-none" disabled={sending} onClick={() => void sendAnnouncement()}>
            <Mail className="h-4 w-4 mr-2" />{sending ? "Küldés..." : "Bemutató elküldése partnereknek"}
          </Button>
          <Button asChild variant="outline" className="rounded-none">
            <a href="/partner" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />Megnyitás a Partner Központban
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="border border-border p-3">
            <div className="flex items-center gap-2 font-bold text-sm"><Icon className="h-4 w-4 text-primary" />{title}</div>
            <p className="text-xs text-muted-foreground mt-1">{text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default PartnerFeatureAnnouncement;

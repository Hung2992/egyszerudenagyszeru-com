// Partner bemutató: naptár + szolgáltatások bemutatása, egy kattintással kiküldve a kiválasztott partnereknek.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, Send, Sparkles } from "lucide-react";

interface P { id: string; company_name: string | null; full_name: string | null; email: string | null }

const DEFAULT_BULLETS = [
  "Napi naptár: időpontok, helyszín, időtartam egy nézetben.",
  "Ma kikkel kell beszélni: hívás, e-mail, SMS egy kattintással.",
  "Digitális termék, kurzus és szolgáltatás beállítások.",
  "Az ügyfél automatikus visszaigazoló levelet kap a foglalásról.",
].join("\n");

const PartnerFeatureAnnouncement = () => {
  const [partners, setPartners] = useState<P[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [headline, setHeadline] = useState("NAPTÁR ÉS SZOLGÁLTATÁSOK");
  const [intro, setIntro] = useState("Mostantól a Partner Központban napi naptárat vezethetsz, és látod, kikkel kell ma beszélned.");
  const [bullets, setBullets] = useState(DEFAULT_BULLETS);
  const [ctaUrl, setCtaUrl] = useState(`${window.location.origin}/partner`);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from("partners").select("id, company_name, full_name, email")
      .not("email", "is", null).order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setPartners((data as P[]) || []));
  }, []);

  const chosen = partners.filter(p => sel[p.id] && p.email);

  const send = async () => {
    if (!chosen.length) { toast({ title: "Válassz ki legalább egy partnert", variant: "destructive" }); return; }
    setSending(true);
    let ok = 0; let fail = 0;
    for (const p of chosen) {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "partner-feature-announcement",
          recipientEmail: p.email,
          idempotencyKey: `partner-feature-${headline.slice(0, 24)}-${p.id}`,
          templateData: {
            full_name: p.company_name || p.full_name || "",
            headline, intro,
            bullets: bullets.split("\n").map(b => b.trim()).filter(Boolean),
            cta_label: "Megnézem a Partner Központban",
            cta_url: ctaUrl,
          },
        },
      });
      if (error) fail++; else ok++;
    }
    setSending(false);
    toast({ title: `Kiküldve: ${ok} partner`, description: fail ? `${fail} címre nem sikerült.` : undefined, variant: fail ? "destructive" : undefined });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-none p-4 space-y-3">
        <div className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-primary" />Bemutató tartalma</div>
        <div><Label>Főcím</Label><Input className="rounded-none" value={headline} onChange={e => setHeadline(e.target.value)} /></div>
        <div><Label>Bevezető</Label><Textarea className="rounded-none" rows={3} value={intro} onChange={e => setIntro(e.target.value)} /></div>
        <div><Label>Pontok (soronként egy)</Label><Textarea className="rounded-none" rows={5} value={bullets} onChange={e => setBullets(e.target.value)} /></div>
        <div><Label>Gomb linkje</Label><Input className="rounded-none" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} /></div>
      </Card>

      <Card className="rounded-none p-4 space-y-3">
        <div className="flex items-center gap-2 font-bold"><CalendarDays className="h-4 w-4 text-primary" />Előnézet</div>
        <div className="border border-border p-4 space-y-2">
          <div className="text-lg font-bold">{headline}</div>
          <p className="text-sm text-muted-foreground">{intro}</p>
          <ul className="text-sm space-y-1">
            {bullets.split("\n").filter(Boolean).map((b, i) => <li key={i}>• {b}</li>)}
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <div className="font-bold text-sm">Címzettek ({chosen.length}/{partners.length})</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-none"
              onClick={() => setSel(Object.fromEntries(partners.map(p => [p.id, true])))}>Mind</Button>
            <Button size="sm" variant="outline" className="rounded-none" onClick={() => setSel({})}>Egyik sem</Button>
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto border border-border p-2 space-y-1">
          {partners.length === 0 ? <p className="text-sm text-muted-foreground">Nincs e-mail címmel rendelkező partner.</p> : partners.map(p => (
            <label key={p.id} className="flex items-center gap-2 text-sm py-1">
              <Checkbox checked={!!sel[p.id]} onCheckedChange={v => setSel(prev => ({ ...prev, [p.id]: !!v }))} />
              <span className="truncate">{p.company_name || p.full_name || "Partner"} — {p.email}</span>
            </label>
          ))}
        </div>
        <Button className="rounded-none w-full" disabled={sending || !chosen.length} onClick={() => void send()}>
          <Send className="h-4 w-4 mr-2" />{sending ? "Küldés..." : `Küldés (${chosen.length} partner)`}
        </Button>
      </Card>
    </div>
  );
};

export default PartnerFeatureAnnouncement;

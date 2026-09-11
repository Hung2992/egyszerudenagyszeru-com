// Partner bemutató panel: a naptár és a szolgáltatás-funkciók bemutatása az alkalmazáson belül.
// Szándékosan NEM küld tömeges e-mailt: a partnerek a Partner Központban látják a bemutatót.
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ExternalLink, PhoneCall, Sparkles, Wrench } from "lucide-react";

const ITEMS = [
  { icon: CalendarDays, title: "Napi naptár", text: "Havi nézet és napi bontás: időpont, ügyfél, szolgáltatás, helyszín, időtartam." },
  { icon: PhoneCall, title: "Ma kikkel kell beszélni", text: "A mai ügyfelek listája hívás, e-mail, SMS és „Részletek küldése” gombbal." },
  { icon: Wrench, title: "Digitális / kurzus / szolgáltatás", text: "Külön beállítások: átadás, licenc, oktató, kapacitás, munkanapok, előleg, garancia." },
  { icon: Sparkles, title: "Automatikus visszaigazolás", text: "Új foglalásnál az ügyfél e-mailben megkapja az időpont részleteit." },
];

const PartnerFeatureAnnouncement = () => (
  <Card className="rounded-none p-4 space-y-4">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Partner bemutató — Naptár és szolgáltatások</div>
        <p className="text-xs text-muted-foreground">Ezt látják a partnerek a Partner Központban. Tömeges hírlevél nem megy ki róla.</p>
      </div>
      <Button asChild variant="outline" className="rounded-none">
        <a href="/partner" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4 mr-2" />Megnyitás a Partner Központban
        </a>
      </Button>
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

export default PartnerFeatureAnnouncement;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const drafts: Record<string, string> = {
  facebook: "Egyszerű de Nagyszerű — teljes üzleti szoftver, szerződéses bérléssel.\nVállalkozásodnak keresel egy közös rendszert? Ismerd meg a platformot és jelentkezz partnernek.\nhttps://egyszerudenagyszeru.com/",
  tiktok: "Egyszerű de Nagyszerű · teljes üzleti szoftver vállalkozásoknak, szerződéses bérléssel.\nIsmerd meg a rendszert, és jelentkezz partnernek!\nhttps://egyszerudenagyszeru.com/",
  linkedin: "Az Egyszerű de Nagyszerű teljes üzleti szoftverét szerződés alapján bérelhetik partnereink.\nVállalkozói partnereket keresünk. Ismerje meg az ajánlatot és a partnerjelentkezés lehetőségét:\nhttps://egyszerudenagyszeru.com/",
};

export default function SocialPartnerLibrary() {
  const [platform, setPlatform] = useState("facebook");
  const [text, setText] = useState(drafts.facebook);
  return <section className="space-y-4">
    <h2 className="font-display text-xl">Partnerkeresés · szoftverbérlés</h2>
    <p className="text-sm text-muted-foreground">Egyszerű de Nagyszerű · teljes üzleti szoftver · szerződéses bérlés</p>
    <div className="flex flex-wrap gap-2">{Object.keys(drafts).map(p => <Button key={p} variant={p === platform ? "secondary" : "outline"} onClick={() => { setPlatform(p); setText(drafts[p]); }}>{p === "facebook" ? "Facebook" : p === "tiktok" ? "TikTok" : "LinkedIn"}</Button>)}</div>
    <p className="text-xs text-accent">Szövegjavaslat · jóváhagyásra vár</p>
    <Textarea rows={8} aria-label="Partnerkereső szöveg" value={text} onChange={e => setText(e.target.value)} />
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(text); toast.success("Szöveg másolva"); } catch { toast.error("Jelöld ki és másold a szöveget."); } }}><Copy className="mr-2 h-4 w-4" />Szöveg másolása</Button>{platform === "tiktok" && <Button asChild variant="outline"><a href="https://www.tiktok.com/tiktokstudio/upload" target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Kézi TikTok-feltöltés</a></Button>}</div>
    {platform === "tiktok" && <p className="text-sm text-muted-foreground">Videótervezet: a szoftver valódi képernyői → szerződéses bérlés ajánlata → partnerjelentkezés. Közzététel nem történt.</p>}
  </section>;
}
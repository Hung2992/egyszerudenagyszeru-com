import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catalogDraft, platformOutline, sourceLabels, type CatalogItem } from "@/lib/social-catalog";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
export default function SocialContentLibrary() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [platform, setPlatform] = useState("facebook");
  const [store, setStore] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setBusy(true); const { data, error } = await supabase.rpc("social_content_catalog"); setBusy(false); if (error) toast.error(error.message); else setItems(data ?? []); }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (selected) setText(catalogDraft(selected, platform)); }, [selected, platform]);
  const copy = async () => { try { await navigator.clipboard.writeText(text); toast.success("Szöveg másolva · közzététel nem történt"); } catch { toast.error("Másolás nem elérhető; jelöld ki a szöveget."); } };
  return <section className="space-y-5">
    <div className="flex flex-wrap justify-between gap-3"><h2 className="font-display text-xl">Webshop tartalomtár</h2><Button variant="outline" disabled={busy} onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Források frissítése</Button></div>
    <p className="text-xs text-muted-foreground">{items.length} valós forrás · {items.filter(i => i.eligible).length} előkészíthető · blogbejegyzés-forrás nincs rögzítve; a webshopoldalak külön szerepelnek.</p>
    <div className="flex flex-wrap gap-2">{["facebook", "tiktok", "linkedin"].map(p => <Button key={p} variant={platform === p ? "secondary" : "outline"} size="sm" onClick={() => setPlatform(p)}>{p}</Button>)}<Select value={store} onValueChange={setStore}><SelectTrigger className="w-full sm:w-64" aria-label="Tartalomtár webshopja"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Összes webshop</SelectItem>{[...new Set(items.map(i => i.store))].map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><Input className="sm:w-64" aria-label="Tartalom keresése" placeholder="Keresés" value={search} onChange={e => setSearch(e.target.value)} /></div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{items.filter(i => (store === "all" || i.store === store) && `${i.title} ${i.store}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(i => <article key={`${i.source}/${i.id}`} className="min-w-0 border border-border p-4 space-y-2"><p className="text-xs text-accent break-words">{i.store} · {sourceLabels[i.source]}</p><h3 className="font-display break-words">{i.title}</h3><p className="text-xs text-muted-foreground">{i.state} · {i.eligible ? "Előkészíthető" : "Nem publikálható / teszttartalom"}</p><p className="text-xs text-muted-foreground break-words">{platformOutline(i, platform)}</p><Button size="sm" variant="outline" disabled={!i.eligible} onClick={() => setSelected(i)}>Tartalom kiválasztása</Button></article>)}</div>
    {selected && <section className="border-t border-border pt-5 space-y-3"><h3 className="font-display">{selected.store} · {selected.title}</h3><Textarea rows={7} aria-label="Kiválasztott platform szövege" value={text} onChange={e => setText(e.target.value)} /><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" />Szöveg másolása</Button>{platform === "tiktok" && <Button asChild variant="outline"><a href="https://www.tiktok.com/tiktokstudio/upload" target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />TikTok kézi feltöltés</a></Button>}</div><p className="text-xs text-muted-foreground">{platform === "tiktok" ? "Kézi feltöltés: saját videó és TikTok-fiók szükséges. Ez nem API-publikálás, és nem jelöli késznek a decemberi posztot." : "A havi tervben válaszd ki ugyanezt a forrást; a mentett poszt külön jóváhagyásra vár."}</p></section>}
  </section>;
}
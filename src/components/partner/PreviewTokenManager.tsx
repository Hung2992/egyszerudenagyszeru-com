import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Link2, Copy, Ban, Activity } from "lucide-react";

interface Props { storefrontId: string; slug: string; }

const EXPIRY_OPTIONS = [
  { label: "1 óra", hours: 1 },
  { label: "24 óra", hours: 24 },
  { label: "7 nap", hours: 24 * 7 },
];

const PreviewTokenManager = ({ storefrontId, slug }: Props) => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [accessLog, setAccessLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data: tk } = await supabase
      .from("partner_storefront_preview_tokens")
      .select("*")
      .eq("storefront_id", storefrontId)
      .order("created_at", { ascending: false });
    setTokens(tk || []);
    const ids = (tk || []).map((t: any) => t.id);
    if (ids.length) {
      const { data: lg } = await supabase
        .from("partner_storefront_preview_access_log")
        .select("*")
        .in("token_id", ids)
        .order("accessed_at", { ascending: false })
        .limit(50);
      setAccessLog(lg || []);
    } else setAccessLog([]);
    setLoading(false);
  };
  useEffect(() => { if (storefrontId) void load(); }, [storefrontId]);

  const create = async (hours: number) => {
    const expires_at = new Date(Date.now() + hours * 3600_000).toISOString();
    const { data, error } = await supabase
      .from("partner_storefront_preview_tokens")
      .insert({
        storefront_id: storefrontId,
        expires_at,
        label: label || null,
        max_uses: maxUses ? parseInt(maxUses) : null,
      })
      .select("token")
      .maybeSingle();
    if (error || !data) { toast({ title: "Hiba", description: error?.message, variant: "destructive" }); return; }
    const url = `${window.location.origin}/b/${slug}?preview=${data.token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast({ title: "Token létrehozva", description: "Link a vágólapon." });
    setLabel(""); setMaxUses("");
    await load();
  };

  const revoke = async (id: string) => {
    await supabase.from("partner_storefront_preview_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    toast({ title: "Visszavonva" });
    await load();
  };

  const copy = (token: string) => {
    const url = `${window.location.origin}/b/${slug}?preview=${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Másolva" });
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-none border-foreground/20 p-4 space-y-3">
        <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Új megosztó link
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          <Input className="rounded-none" placeholder="Címke (pl. 'tesztelők')" value={label} onChange={e => setLabel(e.target.value)} />
          <Input className="rounded-none" type="number" min={1} placeholder="Max megnyitás (opcionális)" value={maxUses} onChange={e => setMaxUses(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {EXPIRY_OPTIONS.map(o => (
            <Button key={o.hours} size="sm" className="rounded-none" onClick={() => create(o.hours)}>{o.label}</Button>
          ))}
        </div>
      </Card>

      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-widest">Aktív tokenek</div>
        {loading ? <p className="text-sm text-muted-foreground">Betöltés…</p> :
          tokens.length === 0 ? <p className="text-sm text-muted-foreground">Még nincs token.</p> :
          tokens.map(t => {
            const expired = t.expires_at && new Date(t.expires_at) < new Date();
            const revoked = !!t.revoked_at;
            const exhausted = t.max_uses != null && t.use_count >= t.max_uses;
            const active = !expired && !revoked && !exhausted;
            return (
              <Card key={t.id} className="rounded-none border-foreground/20 p-3 space-y-1 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={active ? "default" : "secondary"} className="rounded-none uppercase">
                    {revoked ? "Visszavont" : expired ? "Lejárt" : exhausted ? "Kimerült" : "Aktív"}
                  </Badge>
                  {t.label && <span className="font-bold">{t.label}</span>}
                  <span className="font-mono text-muted-foreground truncate">{t.token}</span>
                  <span className="ml-auto flex gap-1">
                    <Button size="sm" variant="outline" className="rounded-none h-7" onClick={() => copy(t.token)}><Copy className="h-3 w-3" /></Button>
                    {active && <Button size="sm" variant="outline" className="rounded-none h-7" onClick={() => revoke(t.id)}><Ban className="h-3 w-3" /></Button>}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Lejár: {t.expires_at ? new Date(t.expires_at).toLocaleString("hu-HU") : "nincs"} ·
                  Megnyitva: {t.use_count}{t.max_uses ? ` / ${t.max_uses}` : ""} ·
                  {t.last_accessed_at ? ` Utolsó: ${new Date(t.last_accessed_at).toLocaleString("hu-HU")}` : " Még nem nyitották meg"}
                </div>
              </Card>
            );
          })
        }
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Activity className="h-4 w-4" /> Hozzáférési napló (utolsó 50)
        </div>
        {accessLog.length === 0 ? <p className="text-sm text-muted-foreground">Még senki nem nyitotta meg.</p> :
          <div className="divide-y divide-foreground/10 border border-foreground/20">
            {accessLog.map(l => (
              <div key={l.id} className="p-2 text-xs flex flex-wrap items-center gap-2">
                <Badge variant={l.outcome === "allowed" ? "default" : "destructive"} className="rounded-none uppercase">{l.outcome}</Badge>
                <span>{new Date(l.accessed_at).toLocaleString("hu-HU")}</span>
                <span className="font-mono text-muted-foreground">{l.ip || "—"}</span>
                <span className="text-muted-foreground truncate flex-1">{l.user_agent}</span>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
};

export default PreviewTokenManager;

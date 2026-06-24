import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { RotateCcw, History, Eye } from "lucide-react";

interface Props { storefrontId: string | null; onRestored?: () => void; }

const StorefrontVersionsTab = ({ storefrontId, onRestored }: Props) => {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any>(null);

  const load = async () => {
    if (!storefrontId) { setVersions([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("partner_storefront_versions")
      .select("*")
      .eq("storefront_id", storefrontId)
      .order("version_number", { ascending: false })
      .limit(50);
    setVersions(data || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [storefrontId]);

  const restore = async (v: any) => {
    if (!storefrontId) return;
    if (!confirm(`Visszaállítod a #${v.version_number} verziót? A jelenlegi állapotról új snapshot készül.`)) return;
    const snap = { ...v.snapshot };
    delete snap.id; delete snap.created_at; delete snap.updated_at; delete snap.is_published; delete snap.published_at;
    delete snap.last_approved_version_id;
    const { error } = await supabase.from("partner_storefronts").update(snap).eq("id", storefrontId);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Visszaállítva: #${v.version_number}` });
    onRestored?.();
    await load();
  };

  if (!storefrontId) return <p className="text-sm text-muted-foreground">Először mentsd el a storefrontot, hogy verziók készüljenek.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <History className="h-4 w-4" />
        <span className="font-bold uppercase tracking-widest">Verziótörténet</span>
        <span className="text-xs text-muted-foreground">(utolsó 50)</span>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Betöltés…</p> :
        versions.length === 0 ? <p className="text-sm text-muted-foreground">Még nincs verzió.</p> :
        versions.map(v => (
          <Card key={v.id} className="rounded-none border-foreground/20 p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Badge className="rounded-none">#{v.version_number}</Badge>
              <span className="text-xs">{new Date(v.created_at).toLocaleString("hu-HU")}</span>
              {v.is_published_version && <Badge variant="default" className="rounded-none">Publikált</Badge>}
              {v.snapshot?.publish_requested_at && !v.is_published_version && (
                <Badge variant="secondary" className="rounded-none">Publikálás kérve</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-none" onClick={() => setPreview(v)}>
                <Eye className="h-3 w-3 mr-1" /> Adatok
              </Button>
              <Button size="sm" className="rounded-none" onClick={() => restore(v)}>
                <RotateCcw className="h-3 w-3 mr-1" /> Visszaállítás
              </Button>
            </div>
          </Card>
        ))
      }

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-background border border-foreground/20 max-w-2xl w-full max-h-[80vh] overflow-auto p-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold uppercase tracking-widest mb-3">Verzió #{preview.version_number} snapshot</h3>
            <pre className="text-xs overflow-auto bg-muted p-3">{JSON.stringify(preview.snapshot, null, 2)}</pre>
            <Button className="mt-3 rounded-none" onClick={() => setPreview(null)}>Bezárás</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorefrontVersionsTab;

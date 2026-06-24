import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Eye, Globe, Store, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PartnerApprovalsPanel = () => {
  const [tab, setTab] = useState("storefronts");
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold uppercase tracking-widest">Partner jóváhagyások</h2>
        <p className="text-sm text-muted-foreground">Storefront publikációk és domain kérelmek átnézése.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-none">
          <TabsTrigger value="storefronts" className="rounded-none"><Store className="h-4 w-4 mr-1" /> Storefront publikációk</TabsTrigger>
          <TabsTrigger value="domains" className="rounded-none"><Globe className="h-4 w-4 mr-1" /> Domain kérések</TabsTrigger>
        </TabsList>
        <TabsContent value="storefronts"><StorefrontQueue /></TabsContent>
        <TabsContent value="domains"><DomainQueue /></TabsContent>
      </Tabs>
    </div>
  );
};

const StorefrontQueue = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "published" | "all">("pending");
  const [drawer, setDrawer] = useState<any>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("partner_storefronts").select("*, partners(business_name, contact_email)").order("publish_requested_at", { ascending: false, nullsFirst: false });
    if (filter === "pending") q = q.eq("is_published", false).not("publish_requested_at", "is", null);
    else if (filter === "published") q = q.eq("is_published", true);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [filter]);

  const approve = async (r: any) => {
    const { error } = await supabase.from("partner_storefronts").update({
      is_published: true,
      published_at: new Date().toISOString(),
      publish_requested_at: null,
    }).eq("id", r.id);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Storefront publikálva" });
    await load(); setDrawer(null);
  };

  const reject = async (r: any) => {
    if (!note.trim()) { toast({ title: "Add meg az indoklást", variant: "destructive" }); return; }
    const { error } = await supabase.from("partner_storefronts").update({
      publish_requested_at: null,
      meta_description: r.meta_description, // unchanged; just clearing request
    }).eq("id", r.id);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    // Optionally insert a note into admin_notifications or partner_access_log
    toast({ title: "Elutasítva", description: note });
    setNote(""); setDrawer(null); await load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["pending","published","all"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="rounded-none uppercase text-xs" onClick={() => setFilter(f)}>
            {f === "pending" ? "Várakozó" : f === "published" ? "Élesben" : "Összes"}
          </Button>
        ))}
        <Button size="sm" variant="outline" className="rounded-none ml-auto" onClick={load}><RefreshCw className="h-3 w-3" /></Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Betöltés…</p> :
        rows.length === 0 ? <p className="text-sm text-muted-foreground">Nincs ilyen állapotú storefront.</p> :
        rows.map(r => (
          <Card key={r.id} className="rounded-none border-foreground/20 p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="font-bold">{r.display_name} <span className="text-xs text-muted-foreground font-mono">/b/{r.slug}</span></div>
              <div className="text-xs text-muted-foreground">{r.partners?.business_name} · {r.partners?.contact_email}</div>
              {r.publish_requested_at && <div className="text-xs">Kérve: {new Date(r.publish_requested_at).toLocaleString("hu-HU")}</div>}
            </div>
            <Badge className="rounded-none uppercase" variant={r.is_published ? "default" : "secondary"}>
              {r.is_published ? "Élesben" : "Várakozik"}
            </Badge>
            <Button size="sm" variant="outline" className="rounded-none" onClick={() => setDrawer(r)}>
              <Eye className="h-3 w-3 mr-1" /> Részletek
            </Button>
            <Button size="sm" variant="outline" className="rounded-none" asChild>
              <a href={`/b/${r.slug}?preview=admin`} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> Megnéz</a>
            </Button>
            {!r.is_published && (
              <Button size="sm" className="rounded-none" onClick={() => approve(r)}>
                <Check className="h-3 w-3 mr-1" /> Jóváhagy
              </Button>
            )}
          </Card>
        ))
      }

      {drawer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setDrawer(null)}>
          <div className="bg-background border border-foreground/20 max-w-3xl w-full max-h-[85vh] overflow-auto p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold uppercase tracking-widest">{drawer.display_name}</h3>
            <div className="text-xs space-y-1">
              <div><strong>Slug:</strong> {drawer.slug}</div>
              <div><strong>Mottó:</strong> {drawer.tagline}</div>
              <div><strong>SEO title:</strong> {drawer.meta_title}</div>
              <div><strong>SEO description:</strong> {drawer.meta_description}</div>
              <div><strong>Custom domain:</strong> {drawer.custom_domain || "—"}</div>
            </div>
            <Textarea className="rounded-none" rows={3} placeholder="Indoklás elutasításhoz (e-mailben elküldjük a partnernek)" value={note} onChange={e => setNote(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="rounded-none" onClick={() => setDrawer(null)}>Mégse</Button>
              <Button variant="destructive" className="rounded-none" onClick={() => reject(drawer)}><X className="h-3 w-3 mr-1" /> Elutasít</Button>
              {!drawer.is_published && (
                <Button className="rounded-none" onClick={() => approve(drawer)}><Check className="h-3 w-3 mr-1" /> Jóváhagy</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DomainQueue = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("partner_domain_requests").select("*, partners(business_name, contact_email)").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [filter]);

  const setStatus = async (id: string, status: string, admin_note?: string) => {
    const { error } = await supabase.from("partner_domain_requests").update({
      status,
      admin_note: admin_note ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Státusz: ${status}` });
    setNoteFor(null); setNote("");
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["pending","all"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="rounded-none uppercase text-xs" onClick={() => setFilter(f)}>
            {f === "pending" ? "Várakozó" : "Összes"}
          </Button>
        ))}
        <Button size="sm" variant="outline" className="rounded-none ml-auto" onClick={load}><RefreshCw className="h-3 w-3" /></Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Betöltés…</p> :
        rows.length === 0 ? <p className="text-sm text-muted-foreground">Nincs domain kérés.</p> :
        rows.map(r => (
          <Card key={r.id} className="rounded-none border-foreground/20 p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="font-mono font-bold">{r.requested_domain}</div>
                <div className="text-xs text-muted-foreground">{r.partners?.business_name} · {r.partners?.contact_email}</div>
                <div className="text-xs">Beküldve: {new Date(r.created_at).toLocaleString("hu-HU")}</div>
              </div>
              <Badge className="rounded-none uppercase" variant={r.status === "approved" || r.status === "active" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                {r.status}
              </Badge>
            </div>
            <div className="text-[11px] font-mono bg-muted p-2">
              TXT _lovable_partner = {r.verification_token}
            </div>
            {r.admin_note && <div className="text-xs italic">Megjegyzés: {r.admin_note}</div>}
            {noteFor === r.id ? (
              <div className="space-y-2">
                <Textarea className="rounded-none" rows={2} placeholder="Üzenet a partnernek (kötelező elutasításnál)" value={note} onChange={e => setNote(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-none" onClick={() => setStatus(r.id, "approved", note || null)}><Check className="h-3 w-3 mr-1" /> Jóváhagy</Button>
                  <Button size="sm" variant="destructive" className="rounded-none" onClick={() => setStatus(r.id, "rejected", note)}><X className="h-3 w-3 mr-1" /> Elutasít</Button>
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => { setNoteFor(null); setNote(""); }}>Mégse</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" className="rounded-none" onClick={() => setStatus(r.id, "approved")}><Check className="h-3 w-3 mr-1" /> Gyors jóváhagy</Button>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => setStatus(r.id, "active")}>DNS OK → aktiválás</Button>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => { setNoteFor(r.id); setNote(""); }}>Indoklás / elutasítás</Button>
              </div>
            )}
          </Card>
        ))
      }
    </div>
  );
};

export default PartnerApprovalsPanel;

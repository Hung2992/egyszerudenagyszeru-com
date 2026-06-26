import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Eye, Globe, Store, RefreshCw, ExternalLink, GitCompare, FileText, Download, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import StorefrontVersionDiff from "@/components/partner/StorefrontVersionDiff";
import PartnerStorefrontAuditLogTab from "@/components/partner/PartnerStorefrontAuditLogTab";
import AdminPartnerAuditSearch from "@/components/admin/AdminPartnerAuditSearch";
import DomainProofTimeline from "@/components/partner/DomainProofTimeline";

const PORTAL_URL = "https://www.egyszerudenagyszeru.com/partner";

async function sendPartnerEmail(templateName: string, partnerId: string, templateData: Record<string, any>) {
  try {
    const { data: p } = await supabase.from("partners").select("email, full_name, company_name").eq("id", partnerId).maybeSingle();
    if (!p?.email) return;
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName,
        recipientEmail: p.email,
        idempotencyKey: `${templateName}-${partnerId}-${Date.now()}`,
        templateData: { full_name: p.company_name || p.full_name, portal_url: PORTAL_URL, ...templateData },
      },
    });
  } catch (_) { /* swallow */ }
}

const PartnerApprovalsPanel = () => {
  const [tab, setTab] = useState("storefronts");
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold uppercase tracking-widest">Partner jóváhagyások</h2>
        <p className="text-sm text-muted-foreground">Storefront publikációk, domain kérelmek, audit napló.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-none">
          <TabsTrigger value="storefronts" className="rounded-none"><Store className="h-4 w-4 mr-1" /> Storefront publikációk</TabsTrigger>
          <TabsTrigger value="domains" className="rounded-none"><Globe className="h-4 w-4 mr-1" /> Domain kérések</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-none"><FileText className="h-4 w-4 mr-1" /> Audit napló</TabsTrigger>
        </TabsList>
        <TabsContent value="storefronts"><StorefrontQueue /></TabsContent>
        <TabsContent value="domains"><DomainQueue /></TabsContent>
        <TabsContent value="audit"><AdminPartnerAuditSearch /></TabsContent>
      </Tabs>
    </div>
  );
};

const StorefrontQueue = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "published" | "all">("pending");
  const [drawer, setDrawer] = useState<any>(null);
  const [drawerTab, setDrawerTab] = useState("diff");
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("partner_storefronts").select("*, partners(full_name, company_name, email)").order("publish_requested_at", { ascending: false, nullsFirst: false });
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
    // Log explicit approval action
    await supabase.from("partner_storefront_audit_log").insert({
      storefront_id: r.id, partner_id: r.partner_id, action: "publish_approved", note: "Admin jóváhagyta a publikációt.",
    });
    toast({ title: "Storefront publikálva" });
    void sendPartnerEmail("partner-domain-approved", r.partner_id, { domain: `webshop: ${r.display_name}` });
    await load(); setDrawer(null);
  };

  const reject = async (r: any) => {
    if (!note.trim()) { toast({ title: "Add meg az indoklást", variant: "destructive" }); return; }
    const { error } = await supabase.from("partner_storefronts").update({
      publish_requested_at: null,
    }).eq("id", r.id);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    await supabase.from("partner_storefront_audit_log").insert({
      storefront_id: r.id, partner_id: r.partner_id, action: "publish_rejected", note,
    });
    void sendPartnerEmail("partner-domain-rejected", r.partner_id, { domain: `webshop: ${r.display_name}`, admin_note: note });
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
              <div className="text-xs text-muted-foreground">{r.partners?.company_name || r.partners?.full_name} · {r.partners?.email}</div>
              {r.publish_requested_at && <div className="text-xs">Kérve: {new Date(r.publish_requested_at).toLocaleString("hu-HU")}</div>}
            </div>
            <Badge className="rounded-none uppercase" variant={r.is_published ? "default" : "secondary"}>
              {r.is_published ? "Élesben" : "Várakozik"}
            </Badge>
            <Button size="sm" variant="outline" className="rounded-none" onClick={() => { setDrawer(r); setDrawerTab("diff"); }}>
              <Eye className="h-3 w-3 mr-1" /> Részletek + Diff
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
          <div className="bg-background border border-foreground/20 max-w-4xl w-full max-h-[88vh] overflow-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-bold uppercase tracking-widest">{drawer.display_name}</h3>
              <div className="text-xs text-muted-foreground">{drawer.partners?.company_name || drawer.partners?.full_name} · {drawer.partners?.email}</div>
            </div>

            <Tabs value={drawerTab} onValueChange={setDrawerTab}>
              <TabsList className="rounded-none">
                <TabsTrigger value="diff" className="rounded-none"><GitCompare className="h-3 w-3 mr-1" /> Változások</TabsTrigger>
                <TabsTrigger value="meta" className="rounded-none">SEO / Meta</TabsTrigger>
                <TabsTrigger value="tokens" className="rounded-none">Előnézet tokenek</TabsTrigger>
                <TabsTrigger value="audit" className="rounded-none">Audit napló</TabsTrigger>
              </TabsList>
              <TabsContent value="diff" className="pt-3">
                <StorefrontVersionDiff storefrontId={drawer.id} />
              </TabsContent>
              <TabsContent value="meta" className="pt-3">
                <div className="text-xs space-y-1">
                  <div><strong>Slug:</strong> {drawer.slug}</div>
                  <div><strong>Mottó:</strong> {drawer.tagline}</div>
                  <div><strong>SEO title:</strong> {drawer.meta_title}</div>
                  <div><strong>SEO description:</strong> {drawer.meta_description}</div>
                  <div><strong>Kulcsszavak:</strong> {(drawer.seo_keywords || []).join(", ")}</div>
                  <div><strong>Custom domain:</strong> {drawer.custom_domain || "—"}</div>
                  <div><strong>Cég:</strong> {drawer.company_legal_name} · {drawer.company_tax_id}</div>
                  <div><strong>Cím:</strong> {drawer.company_address}</div>
                </div>
              </TabsContent>
              <TabsContent value="tokens" className="pt-3">
                <AdminTokenList storefrontId={drawer.id} />
              </TabsContent>
              <TabsContent value="audit" className="pt-3">
                <PartnerStorefrontAuditLogTab storefrontId={drawer.id} adminView />
              </TabsContent>
            </Tabs>

            <Textarea className="rounded-none" rows={3} placeholder="Indoklás elutasításhoz" value={note} onChange={e => setNote(e.target.value)} />
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

const AdminTokenList = ({ storefrontId }: { storefrontId: string }) => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [logs, setLogs] = useState<Record<string, any[]>>({});

  useEffect(() => {
    (async () => {
      const { data: tk } = await supabase.from("partner_storefront_preview_tokens").select("*").eq("storefront_id", storefrontId).order("created_at", { ascending: false });
      setTokens(tk || []);
      const ids = (tk || []).map((t: any) => t.id);
      if (ids.length) {
        const { data: lg } = await supabase.from("partner_storefront_preview_access_log").select("*").in("token_id", ids).order("accessed_at", { ascending: false }).limit(200);
        const grp: Record<string, any[]> = {};
        for (const r of lg || []) {
          (grp[r.token_id] ||= []).push(r);
        }
        setLogs(grp);
      }
    })();
  }, [storefrontId]);

  if (!tokens.length) return <p className="text-sm text-muted-foreground">Nincs előnézet token.</p>;
  return (
    <div className="space-y-2">
      {tokens.map(t => (
        <Card key={t.id} className="rounded-none border-foreground/20 p-3 text-xs space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={t.revoked_at ? "destructive" : "secondary"} className="rounded-none uppercase">
              {t.revoked_at ? "Visszavont" : new Date(t.expires_at) < new Date() ? "Lejárt" : "Aktív"}
            </Badge>
            {t.label && <span className="font-bold">{t.label}</span>}
            <span className="font-mono text-muted-foreground truncate">{t.token}</span>
          </div>
          <div className="text-muted-foreground">
            Lejár: {new Date(t.expires_at).toLocaleString("hu-HU")} · Megnyitva: {t.use_count}{t.max_uses ? `/${t.max_uses}` : ""}
          </div>
          {logs[t.id]?.length ? (
            <details>
              <summary className="cursor-pointer">{logs[t.id].length} hozzáférés</summary>
              <div className="divide-y divide-foreground/10 mt-1">
                {logs[t.id].slice(0, 30).map((l: any) => (
                  <div key={l.id} className="py-1 flex flex-wrap gap-2">
                    <Badge variant={l.outcome === "allowed" ? "default" : "destructive"} className="rounded-none uppercase text-[10px]">{l.outcome}</Badge>
                    <span>{new Date(l.accessed_at).toLocaleString("hu-HU")}</span>
                    <span className="font-mono">{l.ip || "—"}</span>
                    <span className="truncate flex-1 text-muted-foreground">{l.user_agent}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : <div className="text-muted-foreground">Még nem nyitották meg.</div>}
        </Card>
      ))}
    </div>
  );
};

const DomainQueue = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [forceOk, setForceOk] = useState<Record<string, boolean>>({});
  const [showTimeline, setShowTimeline] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from("partner_domain_requests").select("*, partners(full_name, company_name, email)").order("created_at", { ascending: false });
    if (filter === "pending") q = q.in("status", ["pending", "verifying"]);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [filter]);

  const setStatus = async (id: string, status: string, admin_note?: string) => {
    const r = rows.find(x => x.id === id);
    const updates: any = {
      status,
      admin_note: admin_note ?? null,
      reviewed_at: new Date().toISOString(),
    };
    if (status === "approved" && r) {
      await supabase.from("partner_storefronts").update({ custom_domain: r.requested_domain, custom_domain_status: "approved" }).eq("partner_id", r.partner_id);
    }
    const { error } = await supabase.from("partner_domain_requests").update(updates).eq("id", id);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    if (r) {
      if (status === "approved" || status === "active") {
        void sendPartnerEmail("partner-domain-approved", r.partner_id, { domain: r.requested_domain, admin_note });
      } else if (status === "rejected") {
        void sendPartnerEmail("partner-domain-rejected", r.partner_id, { domain: r.requested_domain, admin_note });
      }
    }
    toast({ title: `Státusz: ${status}` });
    setNoteFor(null); setNote("");
    await load();
  };

  const downloadProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("partner-domain-proofs").createSignedUrl(path, 600);
    if (error || !data) { toast({ title: "Letöltési hiba", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const runDnsCheck = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("verify-partner-domain-dns", { body: { request_id: id } });
    if (error) { toast({ title: "Ellenőrzés hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: `DNS: ${(data as any)?.status}` });
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
        rows.map(r => {
          const verified = r.dns_check_status === "verified";
          const canApprove = verified || !!forceOk[r.id];
          return (
            <Card key={r.id} className="rounded-none border-foreground/20 p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[220px]">
                  <div className="font-mono font-bold">{r.requested_domain}</div>
                  <div className="text-xs text-muted-foreground">{r.partners?.company_name || r.partners?.full_name} · {r.partners?.email}</div>
                  <div className="text-xs">Beküldve: {new Date(r.created_at).toLocaleString("hu-HU")}</div>
                </div>
                <Badge className="rounded-none uppercase" variant={r.status === "approved" || r.status === "active" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                  {r.status}
                </Badge>
                <Badge className="rounded-none uppercase text-[10px]" variant={verified ? "default" : r.dns_check_status === "failed" ? "destructive" : "secondary"}>
                  {verified ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
                  DNS: {r.dns_check_status}
                </Badge>
              </div>
              <div className="text-[11px] font-mono bg-muted p-2">
                TXT _lovable_partner.{r.requested_domain} = {r.verification_token}
              </div>
              {r.dns_check_result && (
                <details className="text-[11px] font-mono bg-muted p-2">
                  <summary className="cursor-pointer">DNS ellenőrzés eredménye ({r.dns_checked_at && new Date(r.dns_checked_at).toLocaleString("hu-HU")})</summary>
                  <pre className="whitespace-pre-wrap break-all mt-1">{JSON.stringify(r.dns_check_result, null, 2)}</pre>
                </details>
              )}
              {r.dns_proof_url && (
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => downloadProof(r.dns_proof_url)}>
                  <Download className="h-3 w-3 mr-1" /> Bizonyíték megnyitása
                </Button>
              )}
              {r.admin_note && <div className="text-xs italic">Megjegyzés: {r.admin_note}</div>}
              {noteFor === r.id ? (
                <div className="space-y-2">
                  <Textarea className="rounded-none" rows={2} placeholder="Üzenet a partnernek" value={note} onChange={e => setNote(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-none" disabled={!canApprove} onClick={() => setStatus(r.id, "approved", note || undefined)}>
                      <Check className="h-3 w-3 mr-1" /> Jóváhagy
                    </Button>
                    <Button size="sm" variant="destructive" className="rounded-none" onClick={() => setStatus(r.id, "rejected", note)}><X className="h-3 w-3 mr-1" /> Elutasít</Button>
                    <Button size="sm" variant="outline" className="rounded-none" onClick={() => { setNoteFor(null); setNote(""); }}>Mégse</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap items-center">
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => runDnsCheck(r.id)}>
                    <ShieldCheck className="h-3 w-3 mr-1" /> DNS újraellenőrzés
                  </Button>
                  <Button size="sm" className="rounded-none" disabled={!canApprove} onClick={() => setStatus(r.id, "approved")}>
                    <Check className="h-3 w-3 mr-1" /> Jóváhagy
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-none" disabled={!verified} onClick={() => setStatus(r.id, "active")}>
                    DNS OK → aktiválás
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => { setNoteFor(r.id); setNote(""); }}>Indoklás / elutasítás</Button>
                  {!verified && (
                    <label className="text-xs flex items-center gap-1 cursor-pointer">
                      <Checkbox checked={!!forceOk[r.id]} onCheckedChange={v => setForceOk(s => ({ ...s, [r.id]: !!v }))} />
                      <span className="uppercase">Manuális override (nem ellenőrzött)</span>
                    </label>
                  )}
                </div>
              )}
            </Card>
          );
        })
      }
    </div>
  );
};

export default PartnerApprovalsPanel;

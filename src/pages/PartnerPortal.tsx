import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { usePartnerCheck } from "@/hooks/usePartnerCheck";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { LogOut, Copy, Check, Download, Banknote, BarChart3, Megaphone, User as UserIcon, ListChecks, RefreshCw, Link2, FileSpreadsheet } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Stats { pending_commission: number; available_commission: number; paid_total: number; total_orders: number; }
interface Referral { id: string; created_at: string; order_id: string; coupon_code: string; order_total: number; commission_amount: number; status: string; }
interface Payout { id: string; amount: number; status: string; requested_at: string; paid_at: string | null; payment_reference: string | null; admin_notes: string | null; }
interface MarketingAsset { id: string; title: string; description: string | null; asset_type: string; asset_url: string | null; text_content: string | null; }

const fmt = (n: number) => `${(n || 0).toLocaleString("hu-HU")} Ft`;

const PartnerPortal = () => {
  const navigate = useNavigate();
  const { partner, isAdmin, loading, claim } = usePartnerCheck();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [copied, setCopied] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ phone: "", address: "", iban: "", tax_number: "", company_name: "" });

  // Szűrők CSV exporthoz / rendelés listához
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  // Audit napló a hozzáférési eseményekhez
  const logAccess = async (event_type: "portal_entered" | "redirected", metadata: Record<string, any> = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("partner_access_log").insert({
        event_type, partner_id: partner?.id ?? null, user_id: user.id, metadata,
      });
    } catch { /* csendes */ }
  };

  useEffect(() => {
    if (loading) return;
    // Hozzáférés szigorítva: csak aktív partner vagy admin léphet be.
    // Paused / revoked / invited fiók NEM léphet be.
    if (isAdmin) return;
    if (!partner) {
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/auth"); return; }
        setClaiming(true);
        const res = await claim();
        setClaiming(false);
        if (!res.ok) {
          toast({ title: "Nincs hozzáférés", description: res.error || "Ez a fiók nincs partnerként regisztrálva.", variant: "destructive" });
          navigate("/");
        }
      })();
      return;
    }
    if (partner.status !== "active") {
      void logAccess("redirected", { reason: partner.status });
      toast({
        title: partner.status === "paused" ? "Partner fiók szüneteltetve" : partner.status === "revoked" ? "Partner hozzáférés visszavonva" : "Partner fiók nem aktív",
        description: "Lépj kapcsolatba az adminnal a hozzáférés visszaállításáért.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    void logAccess("portal_entered", { status: partner.status });
  }, [loading, partner, isAdmin]);

  useEffect(() => {
    if (!partner) return;
    setProfileForm({
      phone: partner.phone || "", address: partner.address || "", iban: partner.iban || "",
      tax_number: partner.tax_number || "", company_name: partner.company_name || "",
    });
    void loadData(partner.id);
  }, [partner?.id]);

  const loadData = async (partnerId: string) => {
    const [statsRes, refRes, payRes, assetRes] = await Promise.all([
      supabase.rpc("get_partner_stats", { _partner_id: partnerId }),
      supabase.from("partner_referrals").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(200),
      supabase.from("partner_payouts").select("*").eq("partner_id", partnerId).order("requested_at", { ascending: false }),
      supabase.from("partner_marketing_assets").select("*").eq("active", true).order("display_order"),
    ]);
    if (statsRes.data) setStats(statsRes.data as Stats);
    if (refRes.data) setReferrals(refRes.data as Referral[]);
    if (payRes.data) setPayouts(payRes.data as Payout[]);
    if (assetRes.data) setAssets(assetRes.data as MarketingAsset[]);
  };

  const handleCopy = async () => {
    if (!partner?.coupon_code) return;
    const ok = await copyToClipboard(partner.coupon_code, "Kuponkód másolva", partner.coupon_code);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const referralLink = partner?.coupon_code ? `${window.location.origin}/?ref=${partner.coupon_code}` : "";
  const handleCopyReferral = async () => {
    if (!referralLink) return;
    await copyToClipboard(referralLink, "Referral link másolva", referralLink);
  };

  // Szűrt referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      const d = new Date(r.created_at).getTime();
      if (filterFrom && d < new Date(filterFrom).getTime()) return false;
      if (filterTo && d > new Date(filterTo).getTime() + 86_399_000) return false;
      return true;
    });
  }, [referrals, filterStatus, filterFrom, filterTo]);

  const exportCsv = async () => {
    if (filteredReferrals.length === 0) {
      toast({ title: "Nincs exportálható sor", description: "Lazíts a szűrőkön és próbáld újra.", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      const headers = ["Datum","Rendeles_ID","Kupon_kod","Rendeles_osszeg_Ft","Jutalek_Ft","Statusz"];
      const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;

      // Nagy mennyiség esetén chunk-okban építjük + microtask-yield → ne fagyjon a UI.
      const total = filteredReferrals.length;
      const chunkSize = 500;
      const lines: string[] = [headers.join(",")];
      for (let i = 0; i < total; i += chunkSize) {
        const slice = filteredReferrals.slice(i, i + chunkSize);
        for (const r of slice) {
          lines.push([
            new Date(r.created_at).toLocaleString("hu-HU"),
            r.order_id, r.coupon_code,
            String(Math.round(Number(r.order_total))),
            String(Math.round(Number(r.commission_amount))),
            r.status,
          ].map(escape).join(","));
        }
        // engedjük lélegezni a böngészőt
        await new Promise((res) => setTimeout(res, 0));
      }

      const csv = "\uFEFF" + lines.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      if (blob.size === 0) throw new Error("Az exportált fájl üres.");
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        const today = new Date().toISOString().slice(0, 10);
        a.download = `partner-tranzakciok-${today}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
      toast({ title: "CSV letöltve", description: `${total} tranzakció exportálva` });
    } catch (e: any) {
      toast({
        title: "CSV export sikertelen",
        description: e?.message || "Ismeretlen hiba a letöltés során.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handlePayoutRequest = async () => {
    if (!partner || !stats) return;
    if (stats.available_commission < 1000) {
      toast({ title: "Túl alacsony egyenleg", description: "Minimum 1 000 Ft kifizethető jutalék szükséges.", variant: "destructive" });
      return;
    }
    setRequesting(true);
    const { data, error } = await supabase.rpc("request_partner_payout", { _partner_id: partner.id, _notes: null });
    setRequesting(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Kifizetés igényelve", description: `Azonosító: ${String(data).slice(0,8)}` });
    void loadData(partner.id);
  };

  const handleProfileSave = async () => {
    if (!partner) return;
    setProfileSaving(true);
    const { error } = await supabase.from("partners").update(profileForm).eq("id", partner.id);
    setProfileSaving(false);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Mentve" });
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  if (loading || claiming) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><RefreshCw className="h-6 w-6 animate-spin" /></div>;
  }
  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="rounded-none border-foreground/20 p-8 max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold uppercase tracking-wider">Nincs partner hozzáférés</h1>
          <p className="text-sm text-muted-foreground">Ez a fiók nincs partnerként regisztrálva. Lépj kapcsolatba az adminnal meghívóért.</p>
          <Button onClick={() => navigate("/")} className="rounded-none">Vissza a webshopba</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/20">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-[0.2em]">
              Partner <span className="text-accent">központ</span>
            </h1>
            <p className="text-xs text-muted-foreground">{partner.full_name} {partner.company_name && `· ${partner.company_name}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="rounded-none uppercase">{partner.status}</Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-none">
              <LogOut className="h-4 w-4 mr-2" /> Kilépés
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="rounded-none w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview" className="rounded-none"><BarChart3 className="h-4 w-4 mr-2" />Áttekintés</TabsTrigger>
            <TabsTrigger value="referrals" className="rounded-none"><ListChecks className="h-4 w-4 mr-2" />Rendelések</TabsTrigger>
            <TabsTrigger value="payouts" className="rounded-none"><Banknote className="h-4 w-4 mr-2" />Kifizetések</TabsTrigger>
            <TabsTrigger value="marketing" className="rounded-none"><Megaphone className="h-4 w-4 mr-2" />Marketing</TabsTrigger>
            <TabsTrigger value="profile" className="rounded-none"><UserIcon className="h-4 w-4 mr-2" />Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card className="rounded-none border-foreground/20 p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">A te kuponkódod</p>
              <div className="flex items-center gap-3 flex-wrap">
                <code className="text-3xl font-bold tracking-widest text-accent">{partner.coupon_code || "—"}</code>
                {partner.coupon_code && (
                  <Button size="sm" variant="outline" onClick={handleCopy} className="rounded-none">
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    Kód
                  </Button>
                )}
                {referralLink && (
                  <Button size="sm" variant="outline" onClick={handleCopyReferral} className="rounded-none">
                    <Link2 className="h-4 w-4 mr-1" /> Referral link
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Minden teljesített rendelés után <strong>{fmt(partner.commission_per_order_amount)}</strong> jutalék.</p>
              {referralLink && (
                <p className="text-[10px] text-muted-foreground mt-1 font-mono break-all">{referralLink}</p>
              )}
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="rounded-none border-foreground/20 p-4">
                <p className="text-xs uppercase text-muted-foreground">Rendelések</p>
                <p className="text-2xl font-bold">{stats?.total_orders ?? 0}</p>
              </Card>
              <Card className="rounded-none border-foreground/20 p-4">
                <p className="text-xs uppercase text-muted-foreground">Függő jutalék</p>
                <p className="text-2xl font-bold">{fmt(stats?.pending_commission ?? 0)}</p>
              </Card>
              <Card className="rounded-none border-accent p-4">
                <p className="text-xs uppercase text-muted-foreground">Kifizethető</p>
                <p className="text-2xl font-bold text-accent">{fmt(stats?.available_commission ?? 0)}</p>
              </Card>
              <Card className="rounded-none border-foreground/20 p-4">
                <p className="text-xs uppercase text-muted-foreground">Kifizetve</p>
                <p className="text-2xl font-bold">{fmt(stats?.paid_total ?? 0)}</p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="referrals" className="mt-6 space-y-4">
            <Card className="rounded-none border-foreground/20 p-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider">Időszak ettől</Label>
                <Input type="date" className="rounded-none h-9" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider">Időszak eddig</Label>
                <Input type="date" className="rounded-none h-9" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider">Státusz</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="rounded-none h-9 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Összes</SelectItem>
                    <SelectItem value="pending">Függő</SelectItem>
                    <SelectItem value="confirmed">Megerősítve</SelectItem>
                    <SelectItem value="cancelled">Lemondva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={exportCsv} className="rounded-none uppercase tracking-wider ml-auto" disabled={exporting || filteredReferrals.length === 0}>
                {exporting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                {exporting ? "Exportálás…" : `CSV export (${filteredReferrals.length})`}
              </Button>
            </Card>

            <Card className="rounded-none border-foreground/20">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Dátum</TableHead><TableHead>Rendelés</TableHead><TableHead>Kupon</TableHead><TableHead>Összeg</TableHead><TableHead>Jutalék</TableHead><TableHead>Állapot</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nincs a szűrésnek megfelelő rendelés.</TableCell></TableRow>)}
                  {filteredReferrals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.created_at).toLocaleDateString("hu-HU")}</TableCell>
                      <TableCell className="font-mono text-xs">…{r.order_id.slice(-6)}</TableCell>
                      <TableCell><code className="text-xs">{r.coupon_code}</code></TableCell>
                      <TableCell>{fmt(r.order_total)}</TableCell>
                      <TableCell className="font-bold">{fmt(r.commission_amount)}</TableCell>
                      <TableCell><Badge variant={r.status === "confirmed" ? "default" : r.status === "cancelled" ? "destructive" : "secondary"} className="rounded-none uppercase text-[10px]">{r.status === "confirmed" ? "Megerősítve" : r.status === "cancelled" ? "Lemondva" : "Függő"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="mt-6 space-y-4">
            <Card className="rounded-none border-foreground/20 p-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Most kifizethető</p>
                <p className="text-2xl font-bold text-accent">{fmt(stats?.available_commission ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Minimum 1 000 Ft</p>
              </div>
              <Button onClick={handlePayoutRequest} disabled={requesting || (stats?.available_commission ?? 0) < 1000} className="rounded-none uppercase tracking-wider">
                {requesting ? "Feldolgozás…" : "Kifizetés kérése"}
              </Button>
            </Card>
            <Card className="rounded-none border-foreground/20">
              <Table>
                <TableHeader><TableRow><TableHead>Kérve</TableHead><TableHead>Összeg</TableHead><TableHead>Állapot</TableHead><TableHead>Kifizetve</TableHead><TableHead>Referencia</TableHead></TableRow></TableHeader>
                <TableBody>
                  {payouts.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Még nincs kifizetési kérés.</TableCell></TableRow>)}
                  {payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.requested_at).toLocaleDateString("hu-HU")}</TableCell>
                      <TableCell className="font-bold">{fmt(p.amount)}</TableCell>
                      <TableCell><Badge className="rounded-none uppercase text-[10px]" variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>{p.status}</Badge></TableCell>
                      <TableCell>{p.paid_at ? new Date(p.paid_at).toLocaleDateString("hu-HU") : "—"}</TableCell>
                      <TableCell className="text-xs">{p.payment_reference || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="marketing" className="mt-6">
            {assets.length === 0 ? (
              <Card className="rounded-none border-foreground/20 p-8 text-center text-muted-foreground">Még nincs feltöltött marketing anyag.</Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {assets.map((a) => (
                  <Card key={a.id} className="rounded-none border-foreground/20 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold uppercase text-sm tracking-wider">{a.title}</h3>
                      <Badge className="rounded-none uppercase text-[10px]">{a.asset_type}</Badge>
                    </div>
                    {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                    {a.text_content && (
                      <div className="p-3 bg-muted text-xs whitespace-pre-wrap font-mono">{a.text_content}
                        <Button size="sm" variant="ghost" className="rounded-none mt-2 w-full" onClick={() => { navigator.clipboard.writeText(a.text_content!); toast({ title: "Szöveg másolva" }); }}>
                          <Copy className="h-3 w-3 mr-2" /> Másolás
                        </Button>
                      </div>
                    )}
                    {a.asset_url && (
                      <Button asChild size="sm" variant="outline" className="rounded-none w-full">
                        <a href={a.asset_url} target="_blank" rel="noopener noreferrer" download><Download className="h-3 w-3 mr-2" /> Letöltés / Megnyitás</a>
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <Card className="rounded-none border-foreground/20 p-6 space-y-4 max-w-xl">
              <div><Label>Cégnév</Label><Input className="rounded-none" value={profileForm.company_name} onChange={(e) => setProfileForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              <div><Label>Adószám</Label><Input className="rounded-none" value={profileForm.tax_number} onChange={(e) => setProfileForm(f => ({ ...f, tax_number: e.target.value }))} /></div>
              <div><Label>Telefon</Label><Input className="rounded-none" value={profileForm.phone} onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>Cím</Label><Textarea className="rounded-none" value={profileForm.address} onChange={(e) => setProfileForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div><Label>IBAN bankszámla</Label><Input className="rounded-none font-mono" value={profileForm.iban} onChange={(e) => setProfileForm(f => ({ ...f, iban: e.target.value }))} /></div>
              <Button onClick={handleProfileSave} disabled={profileSaving} className="rounded-none uppercase tracking-wider">
                {profileSaving ? "Mentés…" : "Mentés"}
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PartnerPortal;

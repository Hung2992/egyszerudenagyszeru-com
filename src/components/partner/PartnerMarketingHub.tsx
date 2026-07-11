import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Share2, QrCode, Mail, FlaskConical, Globe, Radio, FileText, TrendingUp, Copy, Download, Loader2, Trash2, Plus, BarChart3 } from "lucide-react";

interface Props { partner: { id: string; company_name: string | null; coupon_code: string | null }; }

const PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

const BRAND_PRODUCT_VALUE = "__brand__";
const CUSTOM_URL_VALUE = "__custom_url__";
const NO_PRODUCT_VALUE = "__no_product__";

const getFunctionsBaseUrl = () => {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return base ? `${base}/functions/v1` : "";
};

const PartnerMarketingHub = ({ partner }: Props) => {
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("partner_products").select("id, title, price_huf, images").eq("partner_id", partner.id).eq("status", "approved");
      setProducts(data || []);
    })();
  }, [partner.id]);

  return (
    <Tabs defaultValue="ai" className="w-full">
      <TabsList className="rounded-none flex-wrap h-auto">
        <TabsTrigger value="ai" className="rounded-none"><Sparkles className="w-3 h-3 mr-1" />AI poszt</TabsTrigger>
        <TabsTrigger value="share" className="rounded-none"><Share2 className="w-3 h-3 mr-1" />Megosztás</TabsTrigger>
        <TabsTrigger value="qr" className="rounded-none"><QrCode className="w-3 h-3 mr-1" />QR/Flyer</TabsTrigger>
        <TabsTrigger value="email" className="rounded-none"><Mail className="w-3 h-3 mr-1" />Email</TabsTrigger>
        <TabsTrigger value="ab" className="rounded-none"><FlaskConical className="w-3 h-3 mr-1" />A/B teszt</TabsTrigger>
        <TabsTrigger value="landing" className="rounded-none"><Globe className="w-3 h-3 mr-1" />Landing</TabsTrigger>
        <TabsTrigger value="live" className="rounded-none"><Radio className="w-3 h-3 mr-1" />Live shop</TabsTrigger>
        <TabsTrigger value="kit" className="rounded-none"><FileText className="w-3 h-3 mr-1" />Media Kit</TabsTrigger>
        <TabsTrigger value="analytics" className="rounded-none"><BarChart3 className="w-3 h-3 mr-1" />Analitika</TabsTrigger>
      </TabsList>

      <TabsContent value="ai" className="mt-4"><AiCampaignPanel partner={partner} products={products} /></TabsContent>
      <TabsContent value="share" className="mt-4"><ShareLinksPanel partner={partner} products={products} /></TabsContent>
      <TabsContent value="qr" className="mt-4"><QrFlyerPanel partner={partner} /></TabsContent>
      <TabsContent value="email" className="mt-4"><EmailPanel partner={partner} /></TabsContent>
      <TabsContent value="ab" className="mt-4"><AbTestPanel partner={partner} products={products} /></TabsContent>
      <TabsContent value="landing" className="mt-4"><LandingPanel partner={partner} products={products} /></TabsContent>
      <TabsContent value="live" className="mt-4"><LivePanel partner={partner} products={products} /></TabsContent>
      <TabsContent value="kit" className="mt-4"><MediaKitPanel partner={partner} /></TabsContent>
      <TabsContent value="analytics" className="mt-4"><AnalyticsPanel partner={partner} /></TabsContent>
    </Tabs>
  );
};

// ============ AI CAMPAIGN ============
const AiCampaignPanel = ({ partner, products }: any) => {
  const [productId, setProductId] = useState<string>(BRAND_PRODUCT_VALUE);
  const [platform, setPlatform] = useState("instagram");
  const [tone, setTone] = useState("energikus, fiatalos");
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const loadCampaigns = async () => {
    const { data } = await supabase.from("partner_marketing_campaigns").select("*").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(20);
    setCampaigns(data || []);
  };
  useEffect(() => { loadCampaigns(); }, [partner.id]);

  const generate = async () => {
    setLoading(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("partner-ai-marketing", {
        body: { action: "generate_post", partner_id: partner.id, product_id: productId === BRAND_PRODUCT_VALUE ? null : productId, platform, tone, custom_brief: brief },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      toast({ title: "AI hiba", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const save = async () => {
    if (!result) return;
    const { error } = await supabase.from("partner_marketing_campaigns").insert({
      partner_id: partner.id, product_id: productId === BRAND_PRODUCT_VALUE ? null : productId, platform,
      title: result.title, body: result.body, hashtags: result.hashtags || [],
      cta_text: result.cta_text, status: "ready", ai_prompt: brief,
    });
    if (error) toast({ title: "Mentési hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Mentve" }); setResult(null); loadCampaigns(); }
  };

  return (
    <Card className="p-4 rounded-none border-foreground/20 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-accent" />
        <h3 className="font-bold uppercase tracking-widest text-sm">AI Kampánygenerátor</h3>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs uppercase">Termék</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="rounded-none mt-1"><SelectValue placeholder="Általános / brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={BRAND_PRODUCT_VALUE}>Általános (brand)</SelectItem>
              {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="rounded-none mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">Tónus</Label>
          <Input className="rounded-none mt-1" value={tone} onChange={(e) => setTone(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs uppercase">Extra brief (opcionális)</Label>
        <Textarea className="rounded-none mt-1" rows={2} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="pl. nyári akció, ingyenes szállítás kiemelése..." />
      </div>
      <Button onClick={generate} disabled={loading} className="rounded-none uppercase">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generálás...</> : <><Sparkles className="w-4 h-4 mr-2" />Generálj posztot</>}
      </Button>

      {result && (
        <div className="border-l-4 border-accent bg-muted/30 p-4 space-y-2">
          {result.title && <h4 className="font-bold">{result.title}</h4>}
          <pre className="text-sm whitespace-pre-wrap font-sans">{result.body}</pre>
          {result.hashtags?.length > 0 && <p className="text-xs text-accent">{result.hashtags.join(" ")}</p>}
          {result.cta_text && <p className="text-xs font-bold">CTA: {result.cta_text}</p>}
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="rounded-none" onClick={() => { navigator.clipboard.writeText(`${result.body}\n\n${(result.hashtags || []).join(" ")}`); toast({ title: "Másolva" }); }}>
              <Copy className="w-3 h-3 mr-1" />Másol
            </Button>
            <Button size="sm" className="rounded-none" onClick={save}>Mentés</Button>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs uppercase font-bold mt-4 mb-2">Korábbi kampányok</h4>
        <div className="space-y-2 max-h-60 overflow-auto">
          {campaigns.map((c) => (
            <div key={c.id} className="border p-3 text-xs">
              <div className="flex justify-between"><Badge className="rounded-none text-[10px]">{c.platform}</Badge><span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString("hu-HU")}</span></div>
              <p className="mt-1 line-clamp-2">{c.body}</p>
            </div>
          ))}
          {campaigns.length === 0 && <p className="text-xs text-muted-foreground">Még nincs mentett kampány.</p>}
        </div>
      </div>
    </Card>
  );
};

// ============ SHARE LINKS ============
const ShareLinksPanel = ({ partner, products }: any) => {
  const [links, setLinks] = useState<any[]>([]);
  const [productId, setProductId] = useState(CUSTOM_URL_VALUE);
  const [source, setSource] = useState("facebook");
  const [label, setLabel] = useState("");
  const [targetUrl, setTargetUrl] = useState("");

  const load = async () => {
    const { data } = await supabase.from("partner_share_links").select("*").eq("partner_id", partner.id).order("created_at", { ascending: false });
    setLinks(data || []);
  };
  useEffect(() => { load(); }, [partner.id]);

  useEffect(() => {
    if (productId !== CUSTOM_URL_VALUE) {
      const p = products.find((x: any) => x.id === productId);
      if (p) setTargetUrl(`${window.location.origin}/b/${partner.coupon_code || ""}?p=${p.id}&ref=${partner.coupon_code || ""}`);
    }
  }, [productId, products]);

  const create = async () => {
    if (!targetUrl) { toast({ title: "Cél URL kötelező", variant: "destructive" }); return; }
    const { data: code } = await supabase.rpc("generate_share_code");
    const { error } = await supabase.from("partner_share_links").insert({
      partner_id: partner.id, code, target_url: targetUrl, product_id: productId === CUSTOM_URL_VALUE ? null : productId,
      utm_source: source, utm_medium: "social", utm_campaign: partner.coupon_code || "partner", label: label || source,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Link készen" }); setLabel(""); load(); }
  };

  const shortUrl = (code: string) => `${window.location.origin}/s/${code}`;

  const shareTo = (platform: string, url: string, text: string) => {
    const enc = encodeURIComponent;
    const map: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${enc(text + " " + url)}`,
      whatsapp: `https://wa.me/?text=${enc(text + " " + url)}`,
      telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
    };
    window.open(map[platform], "_blank");
  };

  return (
    <Card className="p-4 rounded-none border-foreground/20 space-y-4">
      <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2"><Share2 className="w-4 h-4" />Megosztó linkek (UTM tracking)</h3>
      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs uppercase">Termék</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="rounded-none mt-1"><SelectValue placeholder="Választás..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value={CUSTOM_URL_VALUE}>Egyedi URL</SelectItem>
              {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">Forrás (UTM)</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="rounded-none mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{["facebook", "instagram", "tiktok", "whatsapp", "email", "qrcode", "story", "bio"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">Címke</Label>
          <Input className="rounded-none mt-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="pl. IG story aug 15" />
        </div>
        <div className="md:col-span-1">
          <Label className="text-xs uppercase">Cél URL</Label>
          <Input className="rounded-none mt-1" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://..." />
        </div>
      </div>
      <Button onClick={create} className="rounded-none uppercase"><Plus className="w-4 h-4 mr-2" />Link készítés</Button>

      <div className="space-y-2 max-h-96 overflow-auto">
        {links.map((l) => {
          const url = shortUrl(l.code);
          return (
            <div key={l.id} className="border p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="rounded-none text-[10px]">{l.utm_source}</Badge>
                    <span className="text-xs font-bold">{l.label}</span>
                  </div>
                  <code className="text-xs text-accent break-all">{url}</code>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-lg">{l.click_count}</div>
                  <div className="text-muted-foreground">kattintás</div>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" className="rounded-none h-7 text-xs" onClick={() => { navigator.clipboard.writeText(url); toast({ title: "Másolva" }); }}><Copy className="w-3 h-3 mr-1" />Másol</Button>
                <Button size="sm" variant="outline" className="rounded-none h-7 text-xs" onClick={() => shareTo("facebook", url, "Nézd meg!")}>FB</Button>
                <Button size="sm" variant="outline" className="rounded-none h-7 text-xs" onClick={() => shareTo("whatsapp", url, "Nézd meg!")}>WA</Button>
                <Button size="sm" variant="outline" className="rounded-none h-7 text-xs" onClick={() => shareTo("telegram", url, "Nézd meg!")}>TG</Button>
                <Button size="sm" variant="outline" className="rounded-none h-7 text-xs" onClick={() => shareTo("twitter", url, "Nézd meg!")}>X</Button>
                <Button size="sm" variant="ghost" className="rounded-none h-7 text-xs" onClick={async () => { await supabase.from("partner_share_links").update({ active: false }).eq("id", l.id); load(); }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          );
        })}
        {links.length === 0 && <p className="text-xs text-muted-foreground">Még nincs link.</p>}
      </div>
    </Card>
  );
};

// ============ QR & FLYER ============
const QrFlyerPanel = ({ partner }: any) => {
  const [url, setUrl] = useState(`${window.location.origin}/b/${partner.coupon_code || ""}`);
  const [qr, setQr] = useState<string>("");
  const flyerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { QRCode.toDataURL(url, { width: 400, margin: 1 }).then(setQr); }, [url]);

  const downloadQR = () => {
    const a = document.createElement("a"); a.href = qr; a.download = `qr-${partner.coupon_code}.png`; a.click();
  };

  const downloadFlyerPdf = () => {
    if (!qr) return;
    const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
    const W = 148, H = 210;
    // header band
    doc.setFillColor(0, 0, 0); doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("EGYSZERŰ DE NAGYSZERŰ · HIVATALOS PARTNER", W / 2, 13, { align: "center" });

    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    const name = (partner.company_name || "PARTNER").toUpperCase();
    doc.text(name, W / 2, 40, { align: "center", maxWidth: W - 20 });

    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text("Használd a kuponkódot pénztárnál:", W / 2, 52, { align: "center" });

    // coupon block
    doc.setFillColor(212, 175, 55); doc.rect(24, 58, W - 48, 22, "F");
    doc.setFont("courier", "bold"); doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text(partner.coupon_code || "—", W / 2, 73, { align: "center" });

    // QR
    doc.addImage(qr, "PNG", (W - 70) / 2, 90, 70, 70);

    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("Olvasd be a QR kódot vagy látogass el:", W / 2, 168, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(url.replace(/^https?:\/\//, ""), W / 2, 175, { align: "center", maxWidth: W - 20 });

    doc.setFont("helvetica", "italic"); doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("Egyedi hivatalos partnermegosztás · minden vásárlásod számít", W / 2, H - 8, { align: "center" });

    doc.save(`szorolap-${partner.coupon_code || "partner"}.pdf`);
  };

  const printFlyer = () => { window.print(); };

  return (
    <Card className="p-4 rounded-none border-foreground/20 space-y-4">
      <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2"><QrCode className="w-4 h-4" />QR kód & Nyomtatható szórólap</h3>
      <div>
        <Label className="text-xs uppercase">URL</Label>
        <Input className="rounded-none mt-1" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div className="flex gap-6 items-start">
        {qr && <img src={qr} alt="QR" className="w-48 h-48 border" />}
        <div className="space-y-2">
          <Button onClick={downloadQR} className="rounded-none uppercase w-full"><Download className="w-4 h-4 mr-2" />QR letöltése PNG</Button>
          <Button onClick={downloadFlyerPdf} className="rounded-none uppercase w-full"><Download className="w-4 h-4 mr-2" />Szórólap PDF letöltés</Button>
          <Button onClick={printFlyer} variant="outline" className="rounded-none uppercase w-full"><FileText className="w-4 h-4 mr-2" />Szórólap nyomtatás</Button>
        </div>
      </div>

      {/* Printable flyer */}
      <div ref={flyerRef} className="hidden print:block fixed inset-0 bg-white text-black p-12">
        <h1 className="text-5xl font-black uppercase mb-4">{partner.company_name}</h1>
        <p className="text-2xl mb-8">Használd a kuponkódot:</p>
        <div className="text-7xl font-mono font-black bg-black text-white inline-block px-6 py-4 mb-8">{partner.coupon_code}</div>
        <p className="text-xl mb-8">Olvasd be a QR kódot vagy látogass el:</p>
        {qr && <img src={qr} alt="" className="w-64 h-64" />}
        <p className="text-sm mt-4 break-all">{url}</p>
      </div>
    </Card>
  );
};

// ============ EMAIL ============
const EmailPanel = ({ partner }: any) => {
  const [subs, setSubs] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState(""); const [newName, setNewName] = useState("");
  const [subject, setSubject] = useState(""); const [body, setBody] = useState("");
  const [blasts, setBlasts] = useState<any[]>([]);

  const load = async () => {
    const [s, b] = await Promise.all([
      supabase.from("partner_email_subscribers").select("*").eq("partner_id", partner.id).is("unsubscribed_at", null),
      supabase.from("partner_email_blasts").select("*").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setSubs(s.data || []); setBlasts(b.data || []);
  };
  useEffect(() => { load(); }, [partner.id]);

  const addSub = async () => {
    if (!newEmail) return;
    const { error } = await supabase.from("partner_email_subscribers").insert({ partner_id: partner.id, email: newEmail, name: newName, source: "manual" });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { setNewEmail(""); setNewName(""); load(); }
  };

  const send = async () => {
    if (!subject || !body) return toast({ title: "Tárgy és szöveg kötelező", variant: "destructive" });
    const { error } = await supabase.from("partner_email_blasts").insert({
      partner_id: partner.id, subject, body_html: body, recipient_count: subs.length, status: "draft",
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Piszkozat mentve (kiküldést a rendszer 24h-n belül feldolgozza)" }); setSubject(""); setBody(""); load(); }
  };

  return (
    <Card className="p-4 rounded-none border-foreground/20 space-y-4">
      <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2"><Mail className="w-4 h-4" />Email kampány</h3>
      <div className="border p-3 bg-muted/20">
        <div className="text-xs uppercase font-bold mb-2">Feliratkozók ({subs.length})</div>
        <div className="flex gap-2">
          <Input className="rounded-none" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@..." />
          <Input className="rounded-none" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="név" />
          <Button onClick={addSub} className="rounded-none"><Plus className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="space-y-2">
        <Input className="rounded-none" placeholder="Tárgy" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea className="rounded-none" rows={6} placeholder="HTML tartalom" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button onClick={send} className="rounded-none uppercase"><Mail className="w-4 h-4 mr-2" />Kiküldés ütemezése</Button>
      </div>
      <div className="space-y-1 text-xs">
        <div className="font-bold uppercase">Korábbi kampányok</div>
        {blasts.map((b) => (
          <div key={b.id} className="border p-2 flex justify-between">
            <span>{b.subject}</span>
            <span className="text-muted-foreground">{b.recipient_count} címzett · {b.status}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ============ A/B TEST ============
const AbTestPanel = ({ partner, products }: any) => {
  const [productId, setProductId] = useState(NO_PRODUCT_VALUE);
  const [platform, setPlatform] = useState("instagram");
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("partner_ab_tests").select("*").eq("partner_id", partner.id).order("created_at", { ascending: false });
    setTests(data || []);
  };
  useEffect(() => { load(); }, [partner.id]);

  const create = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-ai-marketing", { body: { action: "generate_ab_variants", partner_id: partner.id, product_id: productId === NO_PRODUCT_VALUE ? null : productId, platform } });
      if (error) throw error;
      const p = products.find((x: any) => x.id === productId);
      await supabase.from("partner_ab_tests").insert({
        partner_id: partner.id, name: `${platform} – ${p?.title || "brand"} – ${new Date().toLocaleDateString("hu-HU")}`,
        variant_a: data.a, variant_b: data.b,
      });
      toast({ title: "✅ A/B teszt létrehozva" }); load();
    } catch (e: any) { toast({ title: "Hiba", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <Card className="p-4 rounded-none border-foreground/20 space-y-4">
      <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2"><FlaskConical className="w-4 h-4" />Auto A/B teszt</h3>
      <div className="flex gap-2">
        <Select value={productId} onValueChange={setProductId}><SelectTrigger className="rounded-none"><SelectValue placeholder="Termék" /></SelectTrigger><SelectContent><SelectItem value={NO_PRODUCT_VALUE}>Általános (brand)</SelectItem>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select>
        <Select value={platform} onValueChange={setPlatform}><SelectTrigger className="rounded-none w-40"><SelectValue /></SelectTrigger><SelectContent>{PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select>
        <Button onClick={create} disabled={loading} className="rounded-none uppercase">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generálj 2 variánst"}</Button>
      </div>
      <div className="space-y-3">
        {tests.map((t) => {
          const total = t.variant_a_clicks + t.variant_b_clicks;
          const aPct = total ? Math.round(t.variant_a_clicks / total * 100) : 50;
          return (
            <div key={t.id} className="border p-3 space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase"><span>{t.name}</span><Badge className="rounded-none text-[10px]">{t.status}</Badge></div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="border p-2"><div className="text-[10px] font-bold uppercase mb-1">A · {t.variant_a_clicks} klikk ({aPct}%)</div><p className="text-xs whitespace-pre-wrap line-clamp-4">{t.variant_a?.body}</p></div>
                <div className="border p-2"><div className="text-[10px] font-bold uppercase mb-1">B · {t.variant_b_clicks} klikk ({100 - aPct}%)</div><p className="text-xs whitespace-pre-wrap line-clamp-4">{t.variant_b?.body}</p></div>
              </div>
              {t.winner && <div className="text-xs font-bold text-accent">🏆 Nyertes: {t.winner.toUpperCase()}</div>}
            </div>
          );
        })}
        {tests.length === 0 && <p className="text-xs text-muted-foreground">Még nincs teszt.</p>}
      </div>
    </Card>
  );
};

// ============ CO-BRANDED LANDING ============
const LandingPanel = ({ partner, products }: any) => {
  const [pages, setPages] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ slug: "", headline: "", subheadline: "", product_id: NO_PRODUCT_VALUE, partner_quote: "", cta_text: "Megnézem", theme_color: "#d4af37" });

  const load = async () => {
    const { data } = await supabase.from("partner_landing_pages").select("*").eq("partner_id", partner.id).order("created_at", { ascending: false });
    setPages(data || []);
  };
  useEffect(() => { load(); }, [partner.id]);

  const create = async () => {
    if (!form.slug || !form.headline) return toast({ title: "Slug és cím kötelező", variant: "destructive" });
    const product = products.find((p: any) => p.id === form.product_id);
    const payload = { ...form, product_id: form.product_id === NO_PRODUCT_VALUE ? null : form.product_id };
    const { error } = await supabase.from("partner_landing_pages").insert({
      partner_id: partner.id, ...payload,
      active: false, // draft-ban indul
      hero_image_url: product?.images?.[0] || null,
      cta_url: product ? `${window.location.origin}/b/${partner.coupon_code}?p=${product.id}` : null,
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Piszkozat mentve — nyisd meg előnézetben, majd publikáld." }); setForm({ slug: "", headline: "", subheadline: "", product_id: NO_PRODUCT_VALUE, partner_quote: "", cta_text: "Megnézem", theme_color: "#d4af37" }); load(); }
  };

  const setActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("partner_landing_pages").update({ active }).eq("id", id);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: active ? "✅ Publikálva" : "Visszavonva (piszkozat)" }); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Biztosan törlöd?")) return;
    await supabase.from("partner_landing_pages").delete().eq("id", id);
    load();
  };

  return (
    <Card className="p-4 rounded-none border-foreground/20 space-y-4">
      <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2"><Globe className="w-4 h-4" />Co-branded landing oldalak</h3>
      <div className="grid md:grid-cols-2 gap-2">
        <Input className="rounded-none" placeholder="slug (URL-be)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} />
        <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}><SelectTrigger className="rounded-none"><SelectValue placeholder="Termék (opcionális)" /></SelectTrigger><SelectContent><SelectItem value={NO_PRODUCT_VALUE}>Termék nélkül</SelectItem>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select>
        <Input className="rounded-none md:col-span-2" placeholder="Főcím" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        <Input className="rounded-none md:col-span-2" placeholder="Alcím" value={form.subheadline} onChange={(e) => setForm({ ...form, subheadline: e.target.value })} />
        <Textarea className="rounded-none md:col-span-2" placeholder="Idézet tőled..." value={form.partner_quote} onChange={(e) => setForm({ ...form, partner_quote: e.target.value })} />
        <Input className="rounded-none" placeholder="CTA szöveg" value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
        <Input className="rounded-none" type="color" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} />
      </div>
      <Button onClick={create} className="rounded-none uppercase"><Plus className="w-4 h-4 mr-2" />Piszkozat létrehozás</Button>

      <div className="space-y-2">
        {pages.map((p) => {
          const publicUrl = `${window.location.origin}/p/${partner.coupon_code}/${p.slug}`;
          const previewUrl = `${publicUrl}?preview=1`;
          return (
            <div key={p.id} className="border p-3 flex flex-wrap justify-between items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{p.headline}</span>
                  <Badge className={`rounded-none text-[10px] ${p.active ? "bg-green-600" : "bg-yellow-600"}`}>{p.active ? "PUBLIKÁLT" : "PISZKOZAT"}</Badge>
                </div>
                <code className="text-xs text-accent break-all">{publicUrl}</code>
                <div className="text-xs text-muted-foreground">{p.view_count} megtekintés · {p.conversion_count || 0} konverzió</div>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" className="rounded-none h-7 text-xs" onClick={() => window.open(previewUrl, "_blank")}>Előnézet</Button>
                {p.active ? (
                  <Button size="sm" variant="outline" className="rounded-none h-7 text-xs" onClick={() => setActive(p.id, false)}>Visszavon</Button>
                ) : (
                  <Button size="sm" className="rounded-none h-7 text-xs" onClick={() => setActive(p.id, true)}>Publikál</Button>
                )}
                <Button size="sm" variant="outline" className="rounded-none h-7 text-xs" onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Másolva" }); }}><Copy className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="rounded-none h-7 text-xs" onClick={() => remove(p.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          );
        })}
        {pages.length === 0 && <p className="text-xs text-muted-foreground">Még nincs landing oldal.</p>}
      </div>
    </Card>
  );
};

// ============ LIVE SHOPPING ============
const LivePanel = ({ partner, products }: any) => {
  const [productId, setProductId] = useState(NO_PRODUCT_VALUE);
  const [duration, setDuration] = useState(60);
  const [active, setActive] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("partner_landing_pages").select("*").eq("partner_id", partner.id).eq("is_live_shopping", true).order("created_at", { ascending: false });
    setActive(data || []);
  };
  useEffect(() => { load(); }, [partner.id]);

  const goLive = async () => {
    const product = products.find((p: any) => p.id === productId);
    if (!product) return toast({ title: "Válassz terméket", variant: "destructive" });
    const slug = `live-${Date.now().toString(36)}`;
    const live_until = new Date(Date.now() + duration * 60 * 1000).toISOString();
    const { error } = await supabase.from("partner_landing_pages").insert({
      partner_id: partner.id, slug, product_id: product.id,
      headline: `🔴 ÉLŐ: ${product.title}`, subheadline: `Csak most! ${duration} percig elérhető.`,
      is_live_shopping: true, live_until, cta_text: "Megveszem most!",
      cta_url: `${window.location.origin}/b/${partner.coupon_code}?p=${product.id}`,
      hero_image_url: product.images?.[0] || null, theme_color: "#dc2626",
    });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "🔴 ÉLŐ indítva!" }); load(); }
  };

  return (
    <Card className="p-4 rounded-none border-foreground/20 space-y-4">
      <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2"><Radio className="w-4 h-4 text-red-500" />Live shopping link</h3>
      <p className="text-xs text-muted-foreground">Indíts élő közvetítést — generálunk egy ideiglenes oldalt automatikus visszaszámlálóval. Tedd ki Insta storyba/IG livera.</p>
      <div className="flex gap-2">
        <Select value={productId} onValueChange={setProductId}><SelectTrigger className="rounded-none"><SelectValue placeholder="Termék" /></SelectTrigger><SelectContent><SelectItem value={NO_PRODUCT_VALUE}>Válassz terméket</SelectItem>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select>
        <Input className="rounded-none w-24" type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 60)} />
        <span className="text-xs self-center">perc</span>
        <Button onClick={goLive} className="rounded-none uppercase bg-red-600 hover:bg-red-700"><Radio className="w-4 h-4 mr-2" />🔴 ÉLŐ INDÍTÁS</Button>
      </div>
      <div className="space-y-1">
        {active.map((p) => {
          const url = `${window.location.origin}/p/${partner.coupon_code}/${p.slug}`;
          const expired = p.live_until && new Date(p.live_until) < new Date();
          return (
            <div key={p.id} className="border p-2 flex justify-between text-xs">
              <div><span className="font-bold">{p.headline}</span><br /><code className="text-accent">{url}</code></div>
              <Badge className={`rounded-none ${expired ? "" : "bg-red-600 animate-pulse"}`}>{expired ? "VÉGE" : "ÉLŐ"}</Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ============ MEDIA KIT ============
const MediaKitPanel = ({ partner }: any) => {
  const print = () => window.print();
  return (
    <Card className="p-4 rounded-none border-foreground/20 space-y-4">
      <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Influencer Media Kit</h3>
      <p className="text-xs text-muted-foreground">Hivatalos PDF press-kit a partneri státuszodról — küldd márkáknak.</p>
      <div className="border-2 p-8 bg-white text-black space-y-4">
        <h2 className="text-3xl font-black uppercase">{partner.company_name || "Partner"}</h2>
        <p className="text-sm">Hivatalos Egyszerű de Nagyszerű partner</p>
        <hr />
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><div className="text-3xl font-black">{partner.coupon_code}</div><div className="text-xs uppercase">Kuponkód</div></div>
          <div><div className="text-3xl font-black">10%</div><div className="text-xs uppercase">Kedvezmény</div></div>
          <div><div className="text-3xl font-black">∞</div><div className="text-xs uppercase">Termékek</div></div>
        </div>
        <hr />
        <p className="text-xs">Hivatalos partner — exkluzív kedvezmény vásárlóknak.</p>
      </div>
      <Button onClick={print} className="rounded-none uppercase"><Download className="w-4 h-4 mr-2" />PDF nyomtatás</Button>
    </Card>
  );
};

// ============ ANALYTICS ============
const RANGE_OPTIONS = [
  { value: "7", label: "Utolsó 7 nap" },
  { value: "30", label: "Utolsó 30 nap" },
  { value: "90", label: "Utolsó 90 nap" },
  { value: "all", label: "Összes idő" },
];

const AnalyticsPanel = ({ partner }: any) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [topLinks, setTopLinks] = useState<any[]>([]);
  const [rank, setRank] = useState<{ pos: number; total: number } | null>(null);
  const [range, setRange] = useState("30");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [clickAgg, setClickAgg] = useState<{ total: number; conv: number; bySource: Record<string, number>; byDevice: Record<string, number> }>({ total: 0, conv: 0, bySource: {}, byDevice: {} });

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase.functions.invoke("partner-ai-marketing", { body: { action: "insights", partner_id: partner.id } });
      setData(res);

      // Fetch raw clicks with date + source filter for KPI numbers
      let q = supabase.from("partner_share_clicks").select("source, device_type, clicked_at").eq("partner_id", partner.id);
      if (range !== "all") {
        const since = new Date(Date.now() - parseInt(range) * 86400_000).toISOString();
        q = q.gte("clicked_at", since);
      }
      if (sourceFilter !== "all") q = q.eq("source", sourceFilter);
      const { data: clicks } = await q.limit(5000);
      const bySource: Record<string, number> = {}, byDevice: Record<string, number> = {};
      let conv = 0;
      (clicks || []).forEach((c: any) => {
        bySource[c.source || "unknown"] = (bySource[c.source || "unknown"] || 0) + 1;
        byDevice[c.device_type || "unknown"] = (byDevice[c.device_type || "unknown"] || 0) + 1;
        if (c.source === "conversion" || c.source === "landing_cta") conv++;
      });
      setClickAgg({ total: clicks?.length || 0, conv, bySource, byDevice });

      const { data: links } = await supabase.from("partner_share_links").select("label, utm_source, click_count").eq("partner_id", partner.id).order("click_count", { ascending: false }).limit(10);
      setTopLinks(links || []);
      const { data: all } = await supabase.from("partners").select("id, total_clicks:partner_share_links(click_count)").limit(1000);
      if (all) {
        const scored = all.map((p: any) => ({ id: p.id, total: (p.total_clicks || []).reduce((s: number, x: any) => s + (x.click_count || 0), 0) }));
        scored.sort((a, b) => b.total - a.total);
        const pos = scored.findIndex((s) => s.id === partner.id) + 1;
        setRank({ pos, total: scored.length });
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [partner.id, range, sourceFilter]);

  const availableSources = Object.keys(clickAgg.bySource);
  const convRate = clickAgg.total > 0 ? ((clickAgg.conv / clickAgg.total) * 100).toFixed(1) : "0.0";

  return (
    <Card className="p-4 rounded-none border-foreground/20 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" />AI Insights analitika</h3>
        <div className="flex gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="rounded-none h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{RANGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="rounded-none h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Minden forrás</SelectItem>
              {availableSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="border p-3"><div className="text-3xl font-black">{clickAgg.total}</div><div className="text-xs uppercase text-muted-foreground">Kattintás (időszak)</div></div>
        <div className="border p-3"><div className="text-3xl font-black text-accent">{clickAgg.conv}</div><div className="text-xs uppercase text-muted-foreground">Konverzió</div></div>
        <div className="border p-3"><div className="text-3xl font-black">{convRate}%</div><div className="text-xs uppercase text-muted-foreground">Conv. arány</div></div>
        <div className="border p-3"><div className="text-3xl font-black">{data?.best_hour ?? "—"}{data?.best_hour != null ? ":00" : ""}</div><div className="text-xs uppercase text-muted-foreground">Legjobb óra</div></div>
        <div className="border p-3"><div className="text-3xl font-black">{rank ? `#${rank.pos}` : "—"}</div><div className="text-xs uppercase text-muted-foreground">Rangsor / {rank?.total || 0}</div></div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="border p-3">
          <div className="text-xs uppercase font-bold mb-2">Forrás bontás</div>
          {Object.entries(clickAgg.bySource).sort((a: any, b: any) => b[1] - a[1]).map(([k, v]: any) => (
            <div key={k} className="flex justify-between text-xs py-1"><span>{k}</span><span className="font-bold">{v}</span></div>
          ))}
          {availableSources.length === 0 && <p className="text-xs text-muted-foreground">Nincs adat.</p>}
        </div>
        <div className="border p-3">
          <div className="text-xs uppercase font-bold mb-2">Eszköz</div>
          {Object.entries(clickAgg.byDevice).sort((a: any, b: any) => b[1] - a[1]).map(([k, v]: any) => (
            <div key={k} className="flex justify-between text-xs py-1"><span>{k}</span><span className="font-bold">{v}</span></div>
          ))}
          {Object.keys(clickAgg.byDevice).length === 0 && <p className="text-xs text-muted-foreground">Nincs adat.</p>}
        </div>
        <div className="border p-3">
          <div className="text-xs uppercase font-bold mb-2">Top 10 link (heatmap)</div>
          {topLinks.map((l) => (
            <div key={l.label} className="flex items-center gap-2 text-xs py-1">
              <span className="flex-1 truncate">{l.label} <Badge className="rounded-none text-[9px]">{l.utm_source}</Badge></span>
              <div className="w-16 h-2 bg-muted relative"><div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${Math.min(100, (l.click_count / (topLinks[0]?.click_count || 1)) * 100)}%` }} /></div>
              <span className="font-bold w-8 text-right">{l.click_count}</span>
            </div>
          ))}
          {topLinks.length === 0 && <p className="text-xs text-muted-foreground">Még nincs link.</p>}
        </div>
      </div>

      {loading && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Frissítés…</div>}

      {data?.ai?.tips && (
        <div className="border-l-4 border-accent bg-muted/20 p-4">
          <div className="text-xs uppercase font-bold mb-2 flex items-center gap-2"><Sparkles className="w-3 h-3" />AI Javaslatok</div>
          <p className="text-xs italic mb-3">{data.ai.summary}</p>
          <div className="space-y-2">
            {data.ai.tips.map((t: any, i: number) => (
              <div key={i} className="text-xs">
                <Badge className="rounded-none text-[10px] mr-2">{t.priority}</Badge>
                <span className="font-bold">{t.title}</span> — {t.detail}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default PartnerMarketingHub;

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Sparkles, Loader2, Copy, Trash2, Wand2, Target, Clock, MapPin,
  Facebook, Instagram, Youtube, Music2, Globe, Search as SearchIcon,
  Image as ImageIcon, Video, FileText, Megaphone, Users, ShoppingBag,
  Flame, Rocket, Brain, Zap, RefreshCw, Save, Eye, Send,
} from "lucide-react";

// ============================================================
// PLATFORM DEFINITIONS – mindegyikhez külön gomb és optimalizálás
// ============================================================
type PlatformKey =
  | "facebook" | "instagram" | "tiktok" | "youtube"
  | "youtube_shorts" | "google_ads" | "pinterest" | "twitter"
  | "linkedin" | "snapchat" | "threads" | "reddit";

type ContentType = "video_script" | "image_post" | "carousel" | "story" | "reel" | "ad_copy" | "email";

interface Platform {
  key: PlatformKey;
  label: string;
  icon: any;
  color: string; // tailwind text color class
  bestTime: string; // legjobb posztolási idő MAGYAR közönségnek
  bestDays: string;
  audienceAge: string;
  contentTypes: ContentType[];
  maxChars: number;
  hashtagCount: string;
  videoLength: string;
  tone: string;
}

const PLATFORMS: Platform[] = [
  {
    key: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-500",
    bestTime: "13:00–16:00 és 19:00–21:00", bestDays: "Kedd–Csütörtök, Vasárnap",
    audienceAge: "25–55 év (fő: 35–45)", contentTypes: ["video_script", "image_post", "carousel", "ad_copy"],
    maxChars: 500, hashtagCount: "1–3 db", videoLength: "60–90 mp", tone: "Barátságos, közösségi, történet-vezérelt",
  },
  {
    key: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500",
    bestTime: "11:00–13:00 és 19:00–21:00", bestDays: "Hétfő, Szerda, Péntek",
    audienceAge: "18–34 év (fő: 25–34)", contentTypes: ["reel", "image_post", "carousel", "story"],
    maxChars: 2200, hashtagCount: "8–15 db", videoLength: "15–30 mp Reel", tone: "Esztétikus, vizuális, inspiráló",
  },
  {
    key: "tiktok", label: "TikTok", icon: Music2, color: "text-fuchsia-500",
    bestTime: "06:00–10:00, 19:00–23:00", bestDays: "Kedd, Csütörtök, Péntek",
    audienceAge: "16–28 év (fő: 18–24)", contentTypes: ["video_script", "reel"],
    maxChars: 300, hashtagCount: "3–5 db (#fyp #foryou)", videoLength: "15–60 mp", tone: "Pörgős, hook az első 2 mp-ben, trendi, humoros",
  },
  {
    key: "youtube", label: "YouTube", icon: Youtube, color: "text-red-500",
    bestTime: "15:00–17:00 hétköznap, 09:00–11:00 hétvégén", bestDays: "Csütörtök, Péntek, Szombat",
    audienceAge: "18–49 év", contentTypes: ["video_script"],
    maxChars: 5000, hashtagCount: "3–5 db", videoLength: "8–15 perc (long form)", tone: "Részletes, oktató, érték-fókuszú",
  },
  {
    key: "youtube_shorts", label: "YouTube Shorts", icon: Youtube, color: "text-red-400",
    bestTime: "12:00–15:00 és 20:00–22:00", bestDays: "Hétfő–Péntek",
    audienceAge: "16–35 év", contentTypes: ["video_script", "reel"],
    maxChars: 100, hashtagCount: "#Shorts kötelező + 2-3", videoLength: "15–60 mp vertikális", tone: "Hook 1 mp-ben, gyors vágás, nagy szöveg",
  },
  {
    key: "google_ads", label: "Google Ads", icon: SearchIcon, color: "text-emerald-500",
    bestTime: "Folyamatos (auto-bid)", bestDays: "Hétköznapi munkaidő erősebb",
    audienceAge: "Vásárlási szándék-alapú (minden kor)", contentTypes: ["ad_copy"],
    maxChars: 90, hashtagCount: "Nincs", videoLength: "—", tone: "Tömör, USP-fókuszú, CTA erős",
  },
  {
    key: "pinterest", label: "Pinterest", icon: ImageIcon, color: "text-rose-500",
    bestTime: "20:00–23:00", bestDays: "Szombat, Vasárnap",
    audienceAge: "25–45 év, főleg nők (70%)", contentTypes: ["image_post", "video_script"],
    maxChars: 500, hashtagCount: "5–8 db", videoLength: "15–30 mp", tone: "Inspiráló, lifestyle, DIY, vásárolható",
  },
  {
    key: "twitter", label: "X / Twitter", icon: Globe, color: "text-sky-500",
    bestTime: "08:00–10:00 és 18:00–20:00", bestDays: "Kedd–Csütörtök",
    audienceAge: "25–49 év", contentTypes: ["ad_copy", "image_post"],
    maxChars: 280, hashtagCount: "1–2 db", videoLength: "30–45 mp", tone: "Tömör, ütős, véleményformáló",
  },
  {
    key: "linkedin", label: "LinkedIn", icon: Users, color: "text-blue-600",
    bestTime: "07:30–09:00 és 17:00–18:00", bestDays: "Kedd, Szerda, Csütörtök",
    audienceAge: "28–55 év (B2B)", contentTypes: ["ad_copy", "image_post", "carousel"],
    maxChars: 1300, hashtagCount: "3–5 db", videoLength: "60–90 mp", tone: "Szakmai, érték-fókuszú, story + insight",
  },
  {
    key: "snapchat", label: "Snapchat", icon: Megaphone, color: "text-yellow-400",
    bestTime: "22:00–01:00", bestDays: "Péntek, Szombat",
    audienceAge: "13–24 év", contentTypes: ["story", "ad_copy"],
    maxChars: 80, hashtagCount: "Nincs", videoLength: "5–15 mp", tone: "Spontán, fiatalos, AR/szűrő",
  },
  {
    key: "threads", label: "Threads", icon: Globe, color: "text-foreground",
    bestTime: "10:00–12:00 és 21:00–23:00", bestDays: "Hétfő–Csütörtök",
    audienceAge: "22–40 év", contentTypes: ["ad_copy", "image_post"],
    maxChars: 500, hashtagCount: "1–3 db", videoLength: "—", tone: "Beszélgetős, autentikus, IG-közönség",
  },
  {
    key: "reddit", label: "Reddit", icon: Globe, color: "text-orange-500",
    bestTime: "09:00–11:00 EST (15:00–17:00 HU)", bestDays: "Hétfő, Kedd",
    audienceAge: "20–40 év, tech-affin", contentTypes: ["ad_copy"],
    maxChars: 300, hashtagCount: "Nincs (subreddit)", videoLength: "30–60 mp", tone: "Hiteles, anti-reklám, érték-adó, NEM eladós",
  },
];

const CONTENT_TYPE_LABELS: Record<ContentType, { label: string; icon: any }> = {
  video_script: { label: "Videó script", icon: Video },
  image_post: { label: "Kép poszt", icon: ImageIcon },
  carousel: { label: "Karusszel", icon: ImageIcon },
  story: { label: "Story", icon: Zap },
  reel: { label: "Reel / Short", icon: Video },
  ad_copy: { label: "Reklám szöveg", icon: Megaphone },
  email: { label: "Email", icon: Send },
};

interface ShopProduct {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  category?: string | null;
}

interface GeneratedContent {
  platform: PlatformKey;
  contentType: ContentType;
  productId?: string;
  productName?: string;
  text: string;
  audience: string;
  bestTime: string;
  generatedAt: number;
}

const STORAGE_KEY = "admin_ai_marketing_studio_history_v1";

const AdminAiMarketingStudioTab = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [audienceAge, setAudienceAge] = useState<string>("18-35");
  const [audienceGender, setAudienceGender] = useState<string>("vegyes");
  const [audienceLocation, setAudienceLocation] = useState<string>("Magyarország (Budapest + nagyvárosok)");
  const [audienceInterests, setAudienceInterests] = useState<string>("divat, lifestyle, ár-érték");
  const [campaignGoal, setCampaignGoal] = useState<string>("eladás");
  const [tone, setTone] = useState<string>("energikus");
  const [contentType, setContentType] = useState<ContentType>("video_script");
  const [loadingPlatform, setLoadingPlatform] = useState<PlatformKey | null>(null);
  const [generatedAll, setGeneratedAll] = useState<boolean>(false);
  const [history, setHistory] = useState<GeneratedContent[]>([]);
  const [activePlatform, setActivePlatform] = useState<PlatformKey | "all">("all");

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50))); } catch {}
  }, [history]);

  // Load products
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("shop_products")
        .select("id, name, price, description, category")
        .order("created_at", { ascending: false })
        .limit(200);
      if (data) setProducts(data as ShopProduct[]);
    })();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const buildSystemPrompt = (platform: Platform): string => {
    return `Te a világ legkomolyabb, legkeményebb és legerősebb magyar nyelvű marketing copywriter és kreatív direktor vagy.
10000%-kal erősebb, mint bármelyik mostani AI-marketing eszköz.
Egy magyar webshop (egyszerudenagyszeru.com) számára gyártasz tartalmat.

═══════════════════════════════════════════
PLATFORM: ${platform.label.toUpperCase()}
═══════════════════════════════════════════
• Optimális posztolási idő (magyar közönség): ${platform.bestTime}
• Legjobb napok: ${platform.bestDays}
• Tipikus közönség: ${platform.audienceAge}
• Maximális karakter: ${platform.maxChars}
• Hashtag mennyiség: ${platform.hashtagCount}
• Videó hossz: ${platform.videoLength}
• Hangnem (kötelező követni): ${platform.tone}

═══════════════════════════════════════════
KAMPÁNY CÉLKÖZÖNSÉG (te állítottad be)
═══════════════════════════════════════════
• Korosztály: ${audienceAge} év
• Nem: ${audienceGender}
• Lokáció: ${audienceLocation}
• Érdeklődés: ${audienceInterests}
• Kampány cél: ${campaignGoal}
• Kívánt hangnem: ${tone}

═══════════════════════════════════════════
KÖTELEZŐ KIMENET FORMÁTUM (mindig pontosan így)
═══════════════════════════════════════════
🎯 **CÉLKÖZÖNSÉG**: kor, érdeklődés, fájdalompont (1 mondat)

⏰ **MIKOR POSZTOLD**: pontos óra + nap a magyar közönségnek

📍 **HOL & HOGYAN**: ${platform.label} specifikus tipp (pl. Reels vs Story vs Feed)

${contentType === "video_script" || contentType === "reel" ? `🎬 **VIDEÓ SCRIPT** (${platform.videoLength}):
- 0–2 mp HOOK (mit lát/hall először)
- 3–10 mp PROBLÉMA / VÁGY
- 11–25 mp TERMÉK MEGOLDÁS
- 26–vég CTA (call to action)
- B-ROLL javaslat (mit mutass közben)
- Felirat-szöveg (capcut style, NAGY betűk)
` : ""}

📝 **POSZT SZÖVEG** (${platform.maxChars} karakteren belül, ${platform.tone}):
[itt a tényleges poszt szöveg, emoji-kkal, bekezdésekkel]

#️⃣ **HASHTAGEK** (${platform.hashtagCount}):
[hashtagek listája]

🔥 **CTA**: [erős, konkrét felhívás cselekvésre]

💡 **A/B VARIÁNS**: [1 alternatív hook / nyitó mondat tesztelésre]

📊 **KPI MIT MÉRJ**: [pl. CTR, mentés, megosztás, konverzió]

═══════════════════════════════════════════
SZABÁLYOK
═══════════════════════════════════════════
• Magyarul írj, magyar kulturális kódokkal (NE angolból fordíts)
• Konkrét, NEM általános ("vedd meg most" helyett "kattints a profilon, 1290 Ft-tól")
• Ne legyen sablonos AI-stílus ("a mai rohanó világban..." TILOS)
• Hook az első mondatban (kérdés, sokk, szám, ellentmondás)
• Magyarázat helyett MUTASD (storytelling > szlogen)
• ÁFA-s végárral számolj, soha ne nettóval
• Ha terméknév szerepel: pontosan írd, NE találj ki paramétert`;
  };

  const buildUserPrompt = (platform: Platform): string => {
    const productInfo = selectedProduct
      ? `TERMÉK:
- Név: ${selectedProduct.name}
- Ár (bruttó): ${selectedProduct.price.toLocaleString("hu-HU")} Ft
- Kategória: ${selectedProduct.category || "általános"}
- Leírás: ${selectedProduct.description || "(nincs leírás, te írj egy meggyőzőt)"}`
      : `TÉMA: ${customTopic || "általános webshop promóció"}`;

    return `${productInfo}

TARTALOM TÍPUS: ${CONTENT_TYPE_LABELS[contentType].label}

Generálj egy ${platform.label}-ra optimalizált, ütős tartalmat a fenti formátumban.
LEGYEN A LEGERŐSEBB, AMI VALAHA KÉSZÜLT EBBEN A SZEGMENSBEN.`;
  };

  const generateForPlatform = async (platform: Platform) => {
    if (!selectedProductId && !customTopic.trim()) {
      toast({ title: "Hiányzó adat", description: "Válassz terméket vagy adj meg témát!", variant: "destructive" });
      return;
    }
    setLoadingPlatform(platform.key);

    let accumulated = "";
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Nincs bejelentkezve – jelentkezz be admin fiókkal.");

      const payload = {
        messages: [
          { role: "system", content: buildSystemPrompt(platform) },
          { role: "user", content: buildUserPrompt(platform) },
        ],
      };

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) throw new Error("Túl sok kérés, várj kicsit.");
        if (resp.status === 402) throw new Error("AI kredit elfogyott.");
        const errData = await resp.json().catch(() => ({ error: `Hiba: ${resp.status}` }));
        throw new Error(errData.error || `Hiba: ${resp.status}`);
      }
      if (!resp.body) throw new Error("Nincs válasz stream.");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nlIdx: number;
        while ((nlIdx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nlIdx);
          textBuffer = textBuffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) accumulated += delta;
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (!accumulated) throw new Error("Nincs válasz az AI-tól.");

      const newItem: GeneratedContent = {
        platform: platform.key,
        contentType,
        productId: selectedProductId || undefined,
        productName: selectedProduct?.name || customTopic,
        text: accumulated,
        audience: `${audienceAge} év, ${audienceGender}, ${audienceLocation}`,
        bestTime: `${platform.bestTime} • ${platform.bestDays}`,
        generatedAt: Date.now(),
      };
      setHistory((h) => [newItem, ...h]);
      setActivePlatform(platform.key);
      toast({ title: `${platform.label} kész!`, description: "Görgess le a tartalomért." });
    } catch (err: any) {
      toast({ title: "AI hiba", description: err?.message || "Hiba történt.", variant: "destructive" });
    } finally {
      setLoadingPlatform(null);
    }
  };

  const generateAll = async () => {
    setGeneratedAll(true);
    for (const platform of PLATFORMS) {
      if (!platform.contentTypes.includes(contentType)) continue;
      await generateForPlatform(platform);
    }
    setGeneratedAll(false);
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Vágólapra másolva!" });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: "Előzmények törölve" });
  };

  const filteredHistory = activePlatform === "all"
    ? history
    : history.filter((h) => h.platform === activePlatform);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="border-2 border-primary bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary text-primary-foreground rounded-none">
            <Brain className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black uppercase tracking-wider">AI Marketing Stúdió</h2>
              <Badge className="rounded-none uppercase tracking-widest text-[9px] bg-primary text-primary-foreground">
                10 000% ERŐSEBB
              </Badge>
              <Badge variant="outline" className="rounded-none uppercase tracking-widest text-[9px]">
                12 platform
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Generálj <strong>termék-specifikus reklámokat, videó scripteket, posztokat</strong> a világ minden nagy közösségi platformjára –
              célközönség, optimális időpont és lokáció szerint, magyar piacra szabva.
            </p>
          </div>
        </div>
      </div>

      {/* TARGETING PANEL */}
      <div className="border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider">1. Célközönség beállítása</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Termék (vagy hagyd ki és írj témát)</Label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Egyedi téma —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.price.toLocaleString("hu-HU")} Ft)
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Egyedi téma (ha nincs termék)</Label>
            <Input
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="pl. Black Friday akció, új kollekció..."
              className="mt-1 rounded-none"
              disabled={!!selectedProductId}
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Korosztály</Label>
            <select
              value={audienceAge}
              onChange={(e) => setAudienceAge(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="13-17">13–17 (Gen Z fiatal)</option>
              <option value="18-24">18–24 (Gen Z)</option>
              <option value="18-35">18–35 (széles fiatal)</option>
              <option value="25-34">25–34 (millennial fiatal)</option>
              <option value="25-44">25–44 (millennial széles)</option>
              <option value="35-54">35–54 (X+millennial)</option>
              <option value="45-65">45–65 (X+boomer)</option>
              <option value="18-65">18–65 (mindenki)</option>
            </select>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nem</Label>
            <select
              value={audienceGender}
              onChange={(e) => setAudienceGender(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="vegyes">Vegyes (mindenki)</option>
              <option value="női">Női fókusz</option>
              <option value="férfi">Férfi fókusz</option>
              <option value="non-binary inclusive">Inkluzív / nem-bináris</option>
            </select>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Lokáció</Label>
            <Input
              value={audienceLocation}
              onChange={(e) => setAudienceLocation(e.target.value)}
              placeholder="pl. Budapest, vidéki nagyvárosok"
              className="mt-1 rounded-none"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Érdeklődés / fájdalompont</Label>
            <Input
              value={audienceInterests}
              onChange={(e) => setAudienceInterests(e.target.value)}
              placeholder="pl. divat, ár-érték, ajándék"
              className="mt-1 rounded-none"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kampány cél</Label>
            <select
              value={campaignGoal}
              onChange={(e) => setCampaignGoal(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="eladás">Eladás (konverzió)</option>
              <option value="ismertség">Márkaismertség</option>
              <option value="forgalom">Weboldal forgalom</option>
              <option value="követők">Követő szerzés</option>
              <option value="engagement">Engagement (like/komment)</option>
              <option value="lead">Lead gyűjtés (email)</option>
              <option value="visszahívás">Visszacsalogatás (retargeting)</option>
            </select>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Hangnem</Label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="energikus">Energikus / pörgős</option>
              <option value="luxus">Luxus / prémium</option>
              <option value="barátságos">Barátságos / közvetlen</option>
              <option value="humoros">Humoros / vicces</option>
              <option value="urgent">Sürgető (FOMO)</option>
              <option value="szakmai">Szakmai / hiteles</option>
              <option value="érzelmes">Érzelmes / story-vezérelt</option>
              <option value="provokatív">Provokatív / merész</option>
            </select>
          </div>
        </div>

        {/* CONTENT TYPE */}
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Tartalom típus</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((ct) => {
              const def = CONTENT_TYPE_LABELS[ct];
              const Icon = def.icon;
              return (
                <button
                  key={ct}
                  onClick={() => setContentType(ct)}
                  className={`px-3 py-2 border text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                    contentType === ct ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {def.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PLATFORM BUTTONS – minden platformhoz külön gomb */}
      <div className="border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider">2. Generálj platformokra (külön gombok)</h3>
          </div>
          <Button
            size="sm"
            onClick={generateAll}
            disabled={generatedAll || !!loadingPlatform}
            className="rounded-none uppercase tracking-wider text-xs"
          >
            {generatedAll ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Flame className="h-3.5 w-3.5 mr-1" />}
            Mindegyikre
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {PLATFORMS.map((platform) => {
            const Icon = platform.icon;
            const isLoading = loadingPlatform === platform.key;
            const supports = platform.contentTypes.includes(contentType);
            return (
              <button
                key={platform.key}
                onClick={() => generateForPlatform(platform)}
                disabled={isLoading || !!loadingPlatform || !supports}
                className={`group relative border p-3 text-left transition-all ${
                  supports
                    ? "bg-card hover:bg-muted hover:border-primary cursor-pointer"
                    : "bg-muted/30 opacity-50 cursor-not-allowed"
                } ${isLoading ? "border-primary" : ""}`}
                title={supports ? `Generálj ${platform.label}-ra` : `${platform.label} nem támogatja: ${CONTENT_TYPE_LABELS[contentType].label}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isLoading ? (
                    <Loader2 className={`h-4 w-4 animate-spin ${platform.color}`} />
                  ) : (
                    <Icon className={`h-4 w-4 ${platform.color}`} />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider truncate">{platform.label}</span>
                </div>
                <div className="space-y-0.5 text-[10px] text-muted-foreground leading-tight">
                  <div className="flex items-start gap-1">
                    <Clock className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" />
                    <span className="truncate">{platform.bestTime.split(" és ")[0]}</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <Users className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" />
                    <span className="truncate">{platform.audienceAge}</span>
                  </div>
                </div>
                {!supports && (
                  <div className="absolute top-1 right-1 text-[8px] text-muted-foreground uppercase">N/A</div>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          💡 Tipp: minden platform <strong>külön optimalizált</strong> – más szöveg, más hosszúság, más hashtag, más posztolási idő.
        </p>
      </div>

      {/* RESULTS */}
      <div className="border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider">3. Generált tartalmak ({history.length})</h3>
          </div>
          {history.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearHistory} className="rounded-none text-xs uppercase">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Törlés
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        {history.length > 0 && (
          <div className="flex flex-wrap gap-1 border-b pb-2">
            <button
              onClick={() => setActivePlatform("all")}
              className={`px-2 py-1 text-[10px] uppercase tracking-wider border ${
                activePlatform === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              Összes ({history.length})
            </button>
            {PLATFORMS.filter((p) => history.some((h) => h.platform === p.key)).map((p) => {
              const count = history.filter((h) => h.platform === p.key).length;
              const Icon = p.icon;
              return (
                <button
                  key={p.key}
                  onClick={() => setActivePlatform(p.key)}
                  className={`px-2 py-1 text-[10px] uppercase tracking-wider border flex items-center gap-1 ${
                    activePlatform === p.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3 w-3" /> {p.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Még nincs generált tartalom. Állítsd be a célközönséget és kattints egy platform gombra!
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item, idx) => {
              const platform = PLATFORMS.find((p) => p.key === item.platform);
              const Icon = platform?.icon || Megaphone;
              return (
                <div key={`${item.generatedAt}-${idx}`} className="border bg-background p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2 pb-2 border-b">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className={`h-4 w-4 ${platform?.color || ""}`} />
                      <span className="text-sm font-bold uppercase tracking-wider">{platform?.label}</span>
                      <Badge variant="outline" className="rounded-none text-[9px] uppercase">
                        {CONTENT_TYPE_LABELS[item.contentType].label}
                      </Badge>
                      {item.productName && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                          • {item.productName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => copyContent(item.text)}
                        title="Másolás"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => platform && generateForPlatform(platform)}
                        title="Újragenerálás"
                        disabled={!!loadingPlatform}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                    <div className="flex items-start gap-1">
                      <Users className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{item.audience}</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{item.bestTime}</span>
                    </div>
                  </div>

                  <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-muted/40 p-3 border max-h-[500px] overflow-y-auto font-sans">
                    {item.text}
                  </pre>

                  <div className="text-[9px] text-muted-foreground text-right">
                    {new Date(item.generatedAt).toLocaleString("hu-HU")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAiMarketingStudioTab;

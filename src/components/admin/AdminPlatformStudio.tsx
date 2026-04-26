import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Sparkles, Loader2, Copy, Wand2, Target, Clock, MapPin,
  Image as ImageIcon, Video, FileText, Megaphone, Download,
  Send, RefreshCw, Save, Flame, Users, Trash2, Hash, Mail,
  Calendar, Eye, Layers, Zap, Upload, Scissors, TrendingUp,
  DollarSign, Search, UserCheck, AlertTriangle, FlaskConical, LayoutTemplate,
  GitBranch, User, Flame as TrendIcon, Languages, MessageCircle,
  Newspaper, BarChart3, Palette,
  Camera, Recycle, Mic, MessagesSquare, Tag, BookOpen, Radio, ShieldCheck,
  Film,
  Vault, ClipboardList, Crosshair, Repeat, Activity, Wallet, ScanLine, Telescope,
} from "lucide-react";
import AdminVideoEditor from "./AdminVideoEditor";

// ============================================================
// PLATFORM CONFIG (egy platformra szabva)
// ============================================================
export type PlatformKey =
  | "facebook" | "instagram" | "tiktok" | "youtube"
  | "youtube_shorts" | "google_ads" | "pinterest" | "linkedin"
  | "twitter" | "snapchat" | "threads" | "reddit";

export interface PlatformConfig {
  key: PlatformKey;
  label: string;
  icon: any;
  accentClass: string; // pl. "text-blue-500"
  bestTime: string;
  bestDays: string;
  audienceAge: string;
  maxChars: number;
  hashtagCount: string;
  videoLength: string;
  tone: string;
  imageAspect: string; // pl. "1:1, 4:5"
  formats: string[]; // pl. ["Feed", "Story", "Reel"]
}

interface ShopProduct {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  category?: string | null;
}

const HISTORY_PREFIX = "platform_studio_history_";

interface HistoryItem {
  kind: "post" | "image" | "video";
  text: string;
  imageBase64?: string;
  createdAt: number;
}

interface Props {
  platform: PlatformConfig;
}

const AdminPlatformStudio = ({ platform }: Props) => {
  const PlatformIcon = platform.icon;
  const storageKey = HISTORY_PREFIX + platform.key;

  // Targeting
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [audienceAge, setAudienceAge] = useState<string>("18-35");
  const [audienceGender, setAudienceGender] = useState<string>("vegyes");
  const [audienceLocation, setAudienceLocation] = useState<string>("Magyarország (Budapest + nagyvárosok)");
  const [audienceInterests, setAudienceInterests] = useState<string>("divat, lifestyle, ár-érték");
  const [campaignGoal, setCampaignGoal] = useState<string>("eladás");
  const [tone, setTone] = useState<string>("energikus");
  const [postFormat, setPostFormat] = useState<string>(platform.formats[0] || "Feed");
  const [bestTimeOverride, setBestTimeOverride] = useState<string>("");

  // Outputs
  const [postOutput, setPostOutput] = useState<string>("");
  const [videoOutput, setVideoOutput] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [hashtagOutput, setHashtagOutput] = useState<string>("");
  const [carouselOutput, setCarouselOutput] = useState<string>("");
  const [emailOutput, setEmailOutput] = useState<string>("");
  const [hookOutput, setHookOutput] = useState<string>("");
  const [calendarOutput, setCalendarOutput] = useState<string>("");
  const [competitorUrl, setCompetitorUrl] = useState<string>("");
  const [competitorOutput, setCompetitorOutput] = useState<string>("");
  const [editPrompt, setEditPrompt] = useState<string>("");
  const [editSourceB64, setEditSourceB64] = useState<string>("");
  const [editedB64, setEditedB64] = useState<string>("");
  const [adsOutput, setAdsOutput] = useState<string>("");
  const [seoOutput, setSeoOutput] = useState<string>("");
  const [influencerOutput, setInfluencerOutput] = useState<string>("");
  const [crisisInput, setCrisisInput] = useState<string>("");
  const [crisisOutput, setCrisisOutput] = useState<string>("");
  const [abTestOutput, setAbTestOutput] = useState<string>("");
  const [landingOutput, setLandingOutput] = useState<string>("");
  const [funnelOutput, setFunnelOutput] = useState<string>("");
  const [bioOutput, setBioOutput] = useState<string>("");
  const [trendOutput, setTrendOutput] = useState<string>("");
  const [translateInput, setTranslateInput] = useState<string>("");
  const [translateLang, setTranslateLang] = useState<string>("angol");
  const [translateOutput, setTranslateOutput] = useState<string>("");
  const [chatbotOutput, setChatbotOutput] = useState<string>("");
  const [pressOutput, setPressOutput] = useState<string>("");
  const [analyticsInput, setAnalyticsInput] = useState<string>("");
  const [analyticsOutput, setAnalyticsOutput] = useState<string>("");
  const [moodboardOutput, setMoodboardOutput] = useState<string>("");
  const [ugcOutput, setUgcOutput] = useState<string>("");
  const [repurposeInput, setRepurposeInput] = useState<string>("");
  const [repurposeOutput, setRepurposeOutput] = useState<string>("");
  const [voiceOutput, setVoiceOutput] = useState<string>("");
  const [communityInput, setCommunityInput] = useState<string>("");
  const [communityOutput, setCommunityOutput] = useState<string>("");
  const [offerOutput, setOfferOutput] = useState<string>("");
  const [storyOutput, setStoryOutput] = useState<string>("");
  const [liveOutput, setLiveOutput] = useState<string>("");
  const [complianceInput, setComplianceInput] = useState<string>("");
  const [complianceOutput, setComplianceOutput] = useState<string>("");
  // ===== AD-FOCUSED OUTPUTS =====
  const [adVaultOutput, setAdVaultOutput] = useState<string>("");
  const [creativeBriefOutput, setCreativeBriefOutput] = useState<string>("");
  const [audienceOutput, setAudienceOutput] = useState<string>("");
  const [retargetOutput, setRetargetOutput] = useState<string>("");
  const [pixelOutput, setPixelOutput] = useState<string>("");
  const [budgetInput, setBudgetInput] = useState<string>("");
  const [budgetOutput, setBudgetOutput] = useState<string>("");
  const [adComplianceInput, setAdComplianceInput] = useState<string>("");
  const [adComplianceOutput, setAdComplianceOutput] = useState<string>("");
  const [adSpyInput, setAdSpyInput] = useState<string>("");
  const [adSpyOutput, setAdSpyOutput] = useState<string>("");

  // States
  const [loadingPost, setLoadingPost] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingHashtag, setLoadingHashtag] = useState(false);
  const [loadingCarousel, setLoadingCarousel] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingHook, setLoadingHook] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingCompetitor, setLoadingCompetitor] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingAds, setLoadingAds] = useState(false);
  const [loadingSeo, setLoadingSeo] = useState(false);
  const [loadingInfluencer, setLoadingInfluencer] = useState(false);
  const [loadingCrisis, setLoadingCrisis] = useState(false);
  const [loadingAbTest, setLoadingAbTest] = useState(false);
  const [loadingLanding, setLoadingLanding] = useState(false);
  const [loadingFunnel, setLoadingFunnel] = useState(false);
  const [loadingBio, setLoadingBio] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingTranslate, setLoadingTranslate] = useState(false);
  const [loadingChatbot, setLoadingChatbot] = useState(false);
  const [loadingPress, setLoadingPress] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingMoodboard, setLoadingMoodboard] = useState(false);
  const [loadingUgc, setLoadingUgc] = useState(false);
  const [loadingRepurpose, setLoadingRepurpose] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [loadingStory, setLoadingStory] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [loadingAdVault, setLoadingAdVault] = useState(false);
  const [loadingCreativeBrief, setLoadingCreativeBrief] = useState(false);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [loadingRetarget, setLoadingRetarget] = useState(false);
  const [loadingPixel, setLoadingPixel] = useState(false);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [loadingAdCompliance, setLoadingAdCompliance] = useState(false);
  const [loadingAdSpy, setLoadingAdSpy] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, [storageKey]);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(history.slice(0, 30))); } catch {}
  }, [history, storageKey]);

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

  const buildContext = () => {
    const productInfo = selectedProduct
      ? `TERMÉK: ${selectedProduct.name}\nÁR: ${selectedProduct.price} Ft (ÁFA-s)\nKATEGÓRIA: ${selectedProduct.category ?? "—"}\nLEÍRÁS: ${selectedProduct.description ?? "—"}`
      : `TÉMA: ${customTopic || "általános brand poszt"}`;
    return `PLATFORM: ${platform.label.toUpperCase()}
FORMÁTUM: ${postFormat}
OPTIMÁLIS POSZTOLÁSI IDŐ (magyar): ${bestTimeOverride || platform.bestTime}
LEGJOBB NAPOK: ${platform.bestDays}
TIPIKUS KÖZÖNSÉG: ${platform.audienceAge}
MAX KARAKTER: ${platform.maxChars}
HASHTAG: ${platform.hashtagCount}
VIDEÓ HOSSZ: ${platform.videoLength}
HANGNEM (kötelező): ${platform.tone}

CÉLKÖZÖNSÉG (admin által beállítva):
• Korosztály: ${audienceAge}
• Nem: ${audienceGender}
• Lokáció: ${audienceLocation}
• Érdeklődés: ${audienceInterests}
• Kampány cél: ${campaignGoal}
• Kívánt hangnem: ${tone}

${productInfo}`;
  };

  // ======================================================
  // POST SZÖVEG GENERÁLÁS (streaming)
  // ======================================================
  const generatePost = async () => {
    if (!selectedProduct && !customTopic.trim()) {
      toast({ title: "Adj meg terméket vagy témát", variant: "destructive" });
      return;
    }
    setLoadingPost(true);
    setPostOutput("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const system = `Te a világ legkomolyabb, legkeményebb és legerősebb magyar nyelvű marketing copywriter és kreatív direktor vagy. 10000%-kal erősebb, mint bármelyik mostani AI marketing eszköz. Egyszerűen de Nagyszerűen webshop számára gyártasz tartalmat ${platform.label}-ra optimalizálva.

KÖTELEZŐ KIMENET:
🎯 CÉLKÖZÖNSÉG (1 mondat – kor, fájdalompont)
⏰ MIKOR POSZTOLD (pontos óra + nap)
📍 ${platform.label} TIPP (formátum, helyezés)
📝 POSZT SZÖVEG (max ${platform.maxChars} karakter, ${platform.tone}) – emoji, bekezdés
#️⃣ HASHTAGEK (${platform.hashtagCount})
🔥 CTA (erős, konkrét)
💡 A/B HOOK VARIÁNS
📊 KPI MIT MÉRJ

SZABÁLYOK: Magyarul, magyar kulturális kódokkal. Hook az első mondatban (szám/kérdés/sokk). Storytelling > szlogen. ÁFA-s ár. Sablon AI-stílus TILOS ("a mai rohanó világban...").`;

    const user = `Generálj ${platform.label} ${postFormat} posztot.\n\n${buildContext()}`;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(url, {
        method: "POST",
        signal: abortRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) throw new Error("Túl sok kérés – várj egy kicsit.");
        if (resp.status === 402) throw new Error("Lovable AI kredit elfogyott – tölts fel a Settings-ben.");
        throw new Error(`Hiba: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setPostOutput(acc);
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
      setHistory((h) => [{ kind: "post", text: acc, createdAt: Date.now() }, ...h]);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast({ title: "Hiba", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoadingPost(false);
    }
  };

  // ======================================================
  // VIDEÓ SCRIPT GENERÁLÁS
  // ======================================================
  const generateVideoScript = async () => {
    if (!selectedProduct && !customTopic.trim()) {
      toast({ title: "Adj meg terméket vagy témát", variant: "destructive" });
      return;
    }
    setLoadingVideo(true);
    setVideoOutput("");

    const system = `Te a világ legjobb ${platform.label} videós kreatív rendezője. Magyar piacra dolgozol.
Készíts profi videó forgatókönyvet ${platform.videoLength} hosszra.

KÖTELEZŐ KIMENET:
🎬 SHOT-BY-SHOT FORGATÓKÖNYV (másodperc-pontosan):
- 0–2 mp HOOK (mit lát/hall – pontos vizuál)
- 3–10 mp PROBLÉMA / VÁGY (storytelling)
- 11–25 mp TERMÉK MEGOLDÁS (USP-k mutatva)
- 26–vég CTA + ismétlés
🎥 KAMERAÁLLÁSOK (közeli, totál, top-down stb.)
🎵 ZENE / HANG javaslat (műfaj, BPM, viral track ha van)
📝 FELIRAT-SZÖVEG (capcut style, NAGY betűk, mp pontosan)
🎨 B-ROLL ötletek (mit mutass beszéd közben)
✂️ VÁGÁS RITMUS (hány vágás, milyen tempóban)
🔥 ELSŐ 1 MP SCROLL-STOPPER (konkrétan)`;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: system },
            { role: "user", content: `Készíts ${platform.label} videó scriptet.\n\n${buildContext()}` },
          ],
        }),
      });

      if (!resp.ok || !resp.body) throw new Error(`Hiba: ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) { acc += c; setVideoOutput(acc); }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      setHistory((h) => [{ kind: "video", text: acc, createdAt: Date.now() }, ...h]);
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    } finally {
      setLoadingVideo(false);
    }
  };

  // ======================================================
  // KÉP GENERÁLÁS (Lovable AI – gemini image)
  // ======================================================
  const generateImage = async () => {
    const prompt = imagePrompt.trim() || (selectedProduct
      ? `${platform.label} ${postFormat} marketing visual for product: ${selectedProduct.name}. Tone: ${tone}. Audience: ${audienceAge}. Aspect: ${platform.imageAspect}. Photorealistic, premium, scroll-stopping, magyar piacra, no text overlay.`
      : customTopic
        ? `${platform.label} ${postFormat} marketing visual: ${customTopic}. Tone: ${tone}. Aspect: ${platform.imageAspect}. Premium, scroll-stopping.`
        : "");

    if (!prompt) {
      toast({ title: "Adj meg termék/téma vagy kép promptot", variant: "destructive" });
      return;
    }

    setLoadingImage(true);
    setImageBase64("");

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          modalities: ["image", "text"],
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) throw new Error("Túl sok kérés.");
        if (resp.status === 402) throw new Error("Kredit elfogyott.");
        const t = await resp.text();
        throw new Error(`Kép hiba: ${resp.status} ${t.slice(0, 200)}`);
      }

      // image generation usually non-streaming JSON
      const ct = resp.headers.get("content-type") || "";
      let b64 = "";
      if (ct.includes("application/json")) {
        const j = await resp.json();
        b64 = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url
           || j?.choices?.[0]?.message?.images?.[0]?.url
           || "";
      } else {
        // streaming fallback – collect text
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const p = JSON.parse(json);
              const img = p.choices?.[0]?.delta?.images?.[0]?.image_url?.url
                       || p.choices?.[0]?.message?.images?.[0]?.image_url?.url;
              if (img) b64 = img;
            } catch {}
          }
        }
      }

      if (!b64) throw new Error("Nem érkezett kép a modeltől.");
      setImageBase64(b64);
      setHistory((h) => [{ kind: "image", text: prompt, imageBase64: b64, createdAt: Date.now() }, ...h]);
    } catch (e: any) {
      toast({ title: "Kép hiba", description: e.message, variant: "destructive" });
    } finally {
      setLoadingImage(false);
    }
  };

  const downloadImage = (b64?: string, suffix = "") => {
    const src = b64 || imageBase64;
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `${platform.key}${suffix}-${Date.now()}.png`;
    a.click();
  };

  // ======================================================
  // GENERIC STREAMING AI HELPER
  // ======================================================
  const streamAi = async (
    system: string,
    user: string,
    onDelta: (acc: string) => void,
    historyKind: HistoryItem["kind"] = "post",
  ) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!resp.ok || !resp.body) {
      if (resp.status === 429) throw new Error("Túl sok kérés – várj egy kicsit.");
      if (resp.status === 402) throw new Error("Lovable AI kredit elfogyott.");
      throw new Error(`Hiba: ${resp.status}`);
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") continue;
        try {
          const p = JSON.parse(json);
          const c = p.choices?.[0]?.delta?.content;
          if (c) { acc += c; onDelta(acc); }
        } catch { buf = line + "\n" + buf; break; }
      }
    }
    setHistory((h) => [{ kind: historyKind, text: acc, createdAt: Date.now() }, ...h]);
    return acc;
  };

  const runTool = async (
    setLoading: (b: boolean) => void,
    setOutput: (s: string) => void,
    system: string,
    user: string,
  ) => {
    if (!selectedProduct && !customTopic.trim()) {
      toast({ title: "Adj meg terméket vagy témát", variant: "destructive" });
      return;
    }
    setLoading(true); setOutput("");
    try { await streamAi(system, user, setOutput); }
    catch (e: any) { toast({ title: "Hiba", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  // ============== HASHTAG STRATÉGIA ==============
  const generateHashtags = () => runTool(setLoadingHashtag, setHashtagOutput,
    `Te a világ legjobb ${platform.label} hashtag stratégia szakértője vagy. Magyar piacra dolgozol.
KÖTELEZŐ KIMENET:
🔥 TIER 1 – NAGY (1M+ poszt) – 5 db, brand awareness
⚡ TIER 2 – KÖZÉP (100k–1M) – 10 db, edzett konverzió
🎯 TIER 3 – NICHE (10k–100k) – 10 db, célzott közönség
🇭🇺 MAGYAR HASHTAGEK – 5 db (pl. #magyardivat #budapest)
🚫 TILTOTT/SHADOWBAN-VESZÉLYES listája
📊 HASHTAG MIX javaslat (hány-hány tier-ből egy poszthoz)
💡 TREND HASHTAGEK most aktuálisan ${platform.label}-on`,
    `Generálj hashtag stratégiát.\n\n${buildContext()}`);

  // ============== CAROUSEL / THREAD ==============
  const generateCarousel = () => runTool(setLoadingCarousel, setCarouselOutput,
    `Te a világ legjobb ${platform.label} carousel/thread copywriter vagy. Magyarul írsz, hook-driven.
KÖTELEZŐ KIMENET (8–10 slide / tweet):
SLIDE 1: 🎯 HOOK (cliffhanger, NAGY szöveg javaslat)
SLIDE 2-3: 😱 PROBLÉMA / FÁJDALOMPONT (storytelling)
SLIDE 4-6: 💡 MEGOLDÁS LÉPÉSEK (értékadó, számozott)
SLIDE 7-8: 🔥 TERMÉK BEMUTATÁS (USP-k)
SLIDE 9: 📈 SOCIAL PROOF (számok, vélemény)
SLIDE 10: 🚀 CTA (mit csináljon MOST)

Minden slide-hoz: cím, body szöveg, vizuál ötlet, ${platform.label}-specifikus tipp.`,
    `Generálj carousel/thread tartalmat ${platform.label}-ra.\n\n${buildContext()}`);

  // ============== EMAIL / DM ==============
  const generateEmail = () => runTool(setLoadingEmail, setEmailOutput,
    `Te a világ legjobb magyar direct response copywriter vagy (Gary Halbert + Dan Kennedy szint).
KÖTELEZŐ KIMENET 3 verzióban:

📧 EMAIL VERZIÓ:
- TÁRGY (3 A/B variáns, max 50 kar)
- PREVIEW TEXT
- ÜDVÖZLÉS (személyes)
- HOOK (1. mondat – kíváncsiság/sokk/szám)
- TÖRZS (PAS: Problem-Agitate-Solution)
- CTA gomb szöveg + link helye
- P.S. (urgency/scarcity)

💬 DM VERZIÓ (Instagram/Messenger):
- 3 mondatos cold opener
- Follow-up 24h múlva
- Follow-up 3 nap múlva

📱 SMS VERZIÓ:
- Max 160 karakter, link rövidítve
- A/B 2 verzió`,
    `Generálj email + DM + SMS sequence-t.\n\n${buildContext()}`);

  // ============== HOOK GENERÁTOR ==============
  const generateHooks = () => runTool(setLoadingHook, setHookOutput,
    `Te a világ legjobb scroll-stopper hook copywriter vagy ${platform.label}-ra. Magyarul.
Generálj 10 PRO HOOK-OT, mindegyik más kategóriából:
1. SZÁM/STATISZTIKA hook ("87% nem tudja, hogy...")
2. KÉRDÉS hook ("Te is unod, hogy...?")
3. SOKK/CONTROVERSY hook
4. PERSZONÁLIS STORY hook ("Tegnap egy vásárlóm...")
5. BEFORE/AFTER hook
6. TILTOTT/TITKOS hook ("Amit a SHEIN nem mond el...")
7. HIBA/FIGYELEM hook ("3 hiba amit MINDENKI elkövet...")
8. LISTÁS hook ("5 dolog amit ma...")
9. URGENCY hook ("Csak ma...")
10. CONTRARIAN hook ("Mindenki azt mondja X, de...")

Mindegyikhez: a hook + miért működik (1 mondat) + ${platform.label}-specifikus megjelenítés tipp.`,
    `Generálj 10 hook variánst.\n\n${buildContext()}`);

  // ============== 30 NAPOS NAPTÁR ==============
  const generateCalendar = () => runTool(setLoadingCalendar, setCalendarOutput,
    `Te a világ legjobb ${platform.label} content calendar stratégája vagy. Magyar webshop számára dolgozol.
KÉSZÍTS 30 NAPOS POSZT NAPTÁRT táblázat formában:

| Nap | Dátum | Típus | Téma | Hook | CTA | Időpont | Hashtag |

Szabályok:
- 4-6 poszt/hét (nem mindennap, hogy fenntartható legyen)
- 60% érték / 30% termék / 10% community/UGC szabály
- ${platform.bestDays} legyen erős nap
- ${platform.bestTime} legyenek az időpontok
- Magyar ünnepek/szezon figyelembevétele
- Tematikus hetek (pl. Hét 1: launch, Hét 2: social proof...)

Végén: 📊 KPI célkitűzés a hónapra + heti review checklist.`,
    `Készíts 30 napos naptárt.\n\n${buildContext()}`);

  // ============== VERSENYTÁRS ANALÍZIS ==============
  const generateCompetitorAnalysis = async () => {
    if (!competitorUrl.trim() && !customTopic.trim()) {
      toast({ title: "Adj meg versenytárs URL-t vagy nevet", variant: "destructive" });
      return;
    }
    setLoadingCompetitor(true); setCompetitorOutput("");
    try {
      await streamAi(
        `Te egy keményvonalas marketing intelligence elemző vagy. ${platform.label}-ra fókuszálsz.
KÖTELEZŐ KIMENET:
🎯 VERSENYTÁRS POZÍCIONÁLÁS (1 mondat összegzés)
💪 ERŐSSÉGEIK (5 pont – mit csinálnak jól)
🔻 GYENGESÉGEIK (5 pont – hol lehet támadni)
📊 BECSÜLT KÖZÖNSÉG & KPI (kor, nem, engagement rate)
🔥 TOP 3 POSZT TÍPUS amit használnak
🎨 VIZUÁLIS STÍLUS (szín, font, hangulat)
💬 HANGNEM elemzés
🚀 STRATÉGIAI JAVASLAT NEKED – hogy megverjük őket (5 konkrét lépés)
⚔️ DIFFERENCIÁLÁSI PONTOK (hol vagy te jobb)`,
        `Versenytárs: ${competitorUrl || customTopic}\nMi a mi termékünk/cégünk: ${selectedProduct?.name || customTopic}\nPlatform: ${platform.label}`,
        setCompetitorOutput,
        "post",
      );
    } catch (e: any) { toast({ title: "Hiba", description: e.message, variant: "destructive" }); }
    finally { setLoadingCompetitor(false); }
  };

  // ============== KÉPSZERKESZTŐ (AI image edit) ==============
  const handleEditUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setEditSourceB64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const generateEditedImage = async () => {
    if (!editSourceB64) { toast({ title: "Tölts fel egy képet", variant: "destructive" }); return; }
    if (!editPrompt.trim()) { toast({ title: "Add meg, mit változtassunk", variant: "destructive" }); return; }
    setLoadingEdit(true); setEditedB64("");
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`;
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          modalities: ["image", "text"],
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `${editPrompt}. ${platform.label} ${postFormat} optimized, aspect ${platform.imageAspect}, premium, no text overlay.` },
              { type: "image_url", image_url: { url: editSourceB64 } },
            ],
          }],
        }),
      });
      if (!resp.ok) {
        if (resp.status === 429) throw new Error("Túl sok kérés.");
        if (resp.status === 402) throw new Error("Kredit elfogyott.");
        throw new Error(`Hiba: ${resp.status}`);
      }
      const j = await resp.json();
      const b64 = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";
      if (!b64) throw new Error("Nem érkezett szerkesztett kép.");
      setEditedB64(b64);
      setHistory((h) => [{ kind: "image", text: `EDIT: ${editPrompt}`, imageBase64: b64, createdAt: Date.now() }, ...h]);
    } catch (e: any) { toast({ title: "Kép hiba", description: e.message, variant: "destructive" }); }
    finally { setLoadingEdit(false); }
  };

  // ============== ADS – TELJES HIRDETÉSI KAMPÁNY ==============
  const generateAds = () => runTool(setLoadingAds, setAdsOutput,
    `Te a világ legjobb ${platform.label} performance marketing szakértője vagy. Magyar piacra dolgozol, ROAS-ra optimalizálsz.
KÖTELEZŐ KIMENET – TELJES HIRDETÉSI KAMPÁNY:

🎯 KAMPÁNY STRUKTÚRA (3 ad set):
- COLD audience (nincs interakció) – targeting + budget %
- WARM audience (engagement, video view) – retargeting
- HOT audience (cart abandoner, vásárló) – LTV növelés

💰 BUDGET JAVASLAT (napi/havi, magyar piac CPM-mel)
📊 BIDDING STRATÉGIA (manual/auto, cap ajánlás)
🎨 5 DB AD CREATIVE VARIÁNS (headline + primary text + description + CTA gomb)
🖼️ KÉPI/VIDEO BRIEF mindegyikhez (mit mutasson)
🎯 INTEREST + LOOKALIKE TARGETING (konkrét magyar érdeklődések)
📈 ELVÁRT KPI-k (CTR, CPC, CPA, ROAS magyar benchmark)
🚦 KILL CRITERIA (mikor állítsd le – konkrét számokkal)
🔄 SKÁLÁZÁS LÉPÉSEI (mikor és mennyivel emeld a budget-et)
⚠️ POLICY VESZÉLYEK (mit ne írj, hogy ne tiltsák le)`,
    `Generálj teljes ${platform.label} hirdetési kampánytervet.\n\n${buildContext()}`);

  // ============== SEO / KULCSSZÓ ==============
  const generateSeo = () => runTool(setLoadingSeo, setSeoOutput,
    `Te a világ legjobb magyar SEO + ${platform.label} discovery optimalizációs szakértője vagy.
KÖTELEZŐ KIMENET:

🔍 KULCSSZÓ KUTATÁS (magyar piac):
- 10 db PRIMARY kulcsszó (high volume, magas szándék)
- 15 db LONG-TAIL kulcsszó (alacsonyabb verseny, konkrét szándék)
- 10 db KÉRDÉS-alapú kulcsszó ("hogyan", "mi a", "melyik")
- 5 db LOKÁLIS kulcsszó ("budapest", "magyar")

📊 SEARCH VOLUME BECSLÉS magyar piacra (havi keresések)
🎯 NEHÉZSÉG (KD 1-100)

📝 SEO-OPTIMALIZÁLT META:
- Title (max 60 kar) – 3 variáns
- Description (max 160 kar) – 3 variáns
- URL slug javaslat
- H1, H2-k (struktúra)

🏷️ ${platform.label} DISCOVERY OPTIMALIZÁCIÓ:
- Bio/about kulcsszavak
- Caption SEO trükkök
- Alt text javaslat képhez
- Schema markup ha releváns

🔗 BELSŐ LINK + BACKLINK stratégia ötletek`,
    `Generálj SEO + discovery stratégiát.\n\n${buildContext()}`);

  // ============== INFLUENCER STRATÉGIA ==============
  const generateInfluencer = () => runTool(setLoadingInfluencer, setInfluencerOutput,
    `Te a világ legjobb magyar influencer marketing stratégája vagy. ${platform.label}-ra fókuszálsz.
KÖTELEZŐ KIMENET:

👥 IDEÁLIS INFLUENCER PROFIL:
- Méret kategória (nano 1-10k / micro 10-100k / mid 100k-500k / makro 500k+)
- Niche / témakör (3-5 javaslat)
- Demográfia egyezés a célközönséggel
- Engagement rate elvárás (% magyar piacon)

🎯 5 KONKRÉT MAGYAR INFLUENCER TÍPUS akit keress (név javaslatok ha tudsz)
💰 ÁRAZÁS BENCHMARK (HUF, post / story / reel / hosszú videó)

📧 OUTREACH EMAIL TEMPLATE (3 verzió: cold, warm, barter)
📋 BRIEF DOKUMENTUM mit küldj az influencernek:
- Cél, üzenet, do's & don'ts
- Hashtag, mention követelmények
- Kötelező disclosure (#hirdetés #pr)
- Deliverable lista
- Engedélyek (whitelist, repost jog)

📊 KPI MÉRÉS (UTM, kód, link, attribúció)
⚖️ SZERZŐDÉS KULCSPONTOK (magyar jog szerint)
🚀 SKÁLÁZÁS – hogyan építs influencer hadsereget`,
    `Generálj influencer marketing stratégiát.\n\n${buildContext()}`);

  // ============== A/B TESZT GENERÁTOR ==============
  const generateAbTest = () => runTool(setLoadingAbTest, setAbTestOutput,
    `Te a világ legjobb conversion rate optimization (CRO) szakértője vagy. ${platform.label}-ra A/B teszt terveket gyártasz.
KÖTELEZŐ KIMENET:

🧪 5 KONKRÉT A/B TESZT JAVASLAT (priorizálva ICE score-ral: Impact, Confidence, Ease 1-10):

Mindegyikhez:
- 🎯 Hipotézis ("Ha [X], akkor [Y], mert [Z]")
- 🅰️ A variáns (kontroll – mai)
- 🅱️ B variáns (új – mit változtatunk PONTOSAN)
- 📊 Mit mérünk (primary metric + guard rail)
- 📐 Minta méret (kb. hány konverzió kell hogy szignifikáns legyen)
- ⏱️ Tesztelési idő (nap)
- 🎲 Várt lift (%)

🔝 PRIORITÁS SORREND (ICE score alapján)
📋 IMPLEMENTÁCIÓ check-lista
⚠️ STATISZTIKAI HIBÁK amiket kerülj (peeking, p-hacking)
🏆 NYERTES VARIÁNS publikálási checklist`,
    `Generálj A/B teszt terveket.\n\n${buildContext()}`);

  // ============== LANDING PAGE COPY ==============
  const generateLanding = () => runTool(setLoadingLanding, setLandingOutput,
    `Te a világ legjobb magyar landing page / sales page copywriter vagy (Eugene Schwartz + Joanna Wiebe szint).
KÖTELEZŐ KIMENET – TELJES LANDING PAGE COPY:

1️⃣ HERO SECTION
- Headline (BIG promise, max 10 szó)
- Sub-headline (mit, kinek, miért)
- CTA gomb szöveg (3 variáns)
- Hero kép/video brief

2️⃣ PROBLEM / AGITATION (3-4 bullet, fájdalompontok)

3️⃣ SOLUTION REVEAL (a termék mint hős)

4️⃣ FEATURES → BENEFITS táblázat
- Feature | Benefit | Érzelmi haszon

5️⃣ SOCIAL PROOF
- 3 db testimonial sablon (név, kép leírás, idézet)
- Számok ("1247 boldog vásárló")
- Logók/médiumok

6️⃣ HOW IT WORKS (3 lépés)

7️⃣ PRICING & GARANCIA
- Ár anchor (áthúzott eredeti ár)
- Csomagok (3 tier ha van)
- Pénzvisszafizetési garancia szöveg

8️⃣ FAQ (8 kérdés-válasz, valós kifogásokra)

9️⃣ FINAL CTA + URGENCY (limitált / fogyóban)

🔟 P.S. (mint az emailben – emlékeztetés)

➕ MOBIL OPTIMALIZÁLÁSI TIPPEK
➕ KONVERZIÓS ELEMEK (sticky CTA, exit intent popup szöveg)`,
    `Generálj teljes landing page copy-t.\n\n${buildContext()}`);

  // ============== KRÍZIS / NEGATÍV KOMMENT KEZELÉS ==============
  const generateCrisisResponse = async () => {
    if (!crisisInput.trim()) {
      toast({ title: "Add meg a problémát/negatív kommentet", variant: "destructive" });
      return;
    }
    setLoadingCrisis(true); setCrisisOutput("");
    try {
      await streamAi(
        `Te egy keményvonalas magyar PR és crisis management szakértő vagy. ${platform.label}-ra optimalizálsz.
KÖTELEZŐ KIMENET:

🚨 KOMMENT/HELYZET ELEMZÉS (1 mondat – mi történt valójában)
🌡️ SÚLYOSSÁG (1-10) + indoklás
⏰ REAKCIÓIDŐ (mikor kell válaszolni – óra)

💬 3 VÁLASZ VARIÁNS:
- 😌 EMPATIKUS verzió (érzelmek elismerése)
- 💼 PROFESSZIONÁLIS verzió (tényszerű, megoldás-fókuszú)
- 🤝 AKCIÓ verzió (konkrét lépés + privát üzenet)

🚫 MIT NE CSINÁLJ (3 hiba amit mindenki elkövet)
🔒 PRIVÁT/PUBLIKUS döntés (publikus válasz vs DM)
📞 ESZKALÁCIÓ – mikor küldd tovább (jogász, ügyfélszolgálat)
📊 UTÓKÖVETÉS – mit mérj 24/72 órán belül
🛡️ MEGELŐZÉS – hogyan kerüld el legközelebb`,
        `Negatív komment / krízis: ${crisisInput}\n\nKontextus:\n${buildContext()}`,
        setCrisisOutput,
        "post",
      );
    } catch (e: any) { toast({ title: "Hiba", description: e.message, variant: "destructive" }); }
    finally { setLoadingCrisis(false); }
  };

  // ============== FUNNEL TÉRKÉP (TOFU/MOFU/BOFU) ==============
  const generateFunnel = () => runTool(setLoadingFunnel, setFunnelOutput,
    `Te a világ legjobb magyar marketing funnel architektúra szakértője vagy. ${platform.label}-ra dolgozol.
KÖTELEZŐ KIMENET – TELJES FUNNEL TÉRKÉP:

🔝 TOFU – AWARENESS (top of funnel)
- 5 konkrét tartalom ötlet (hook, formátum, cél)
- Targeting: cold audience
- KPI: reach, video view, CTR
- Budget %: 60-70%

🟡 MOFU – CONSIDERATION (middle)
- 5 konkrét tartalom (ár, garanciák, USP, FAQ, demo)
- Targeting: 25%+ video view, profile visit, link click
- KPI: lead, add to cart, save
- Budget %: 20-25%

🔴 BOFU – CONVERSION (bottom)
- 5 konkrét tartalom (testimonial, urgency, kedvezmény, abandoned cart)
- Targeting: cart abandoner, last 30 day visitor
- KPI: purchase, ROAS
- Budget %: 10-15%

🔁 RETENTION & LTV növelés (5 ötlet)
🎯 TELJES USER JOURNEY (1. érintés → vásárlás → ismétlés)
📊 ATTRIBUCIÓS MODELL javaslat
🚦 BUDGET ELOSZTÁS pontos % + HUF példával 100k/200k/500k havi költésre`,
    `Generálj teljes marketing funnel térképet ${platform.label}-ra.\n\n${buildContext()}`);

  // ============== BIO / PROFIL OPTIMALIZÁLÁS ==============
  const generateBio = () => runTool(setLoadingBio, setBioOutput,
    `Te a világ legjobb ${platform.label} profil/bio optimalizációs szakértője vagy.
KÖTELEZŐ KIMENET:

📛 NÉV / DISPLAY NAME (3 variáns – kulcsszóval)
🆔 USERNAME / HANDLE (3 ötlet ha még nincs)
📝 BIO SZÖVEG (3 verzió, ${platform.label} max karakterszámon belül):
   - V1: Érzelmi (story alapú)
   - V2: Funkcionális (mit csinálok, kinek)
   - V3: USP-fókuszú (számok, eredmények)

🔗 LINK STRATÉGIA (link in bio – Linktree alternatíva, prioritás)
📍 LOKÁCIÓ + KATEGÓRIA javaslat
🎨 PROFIL KÉP brief (mit ábrázoljon, milyen stílus)
🖼️ COVER / BANNER brief
📌 KIEMELT POSZTOK (3-5 highlight cover + cím)
☁️ STORY HIGHLIGHT struktúra (ha van: IG/FB)
🎯 CTA gomb szöveg (Üzenet / Hívás / Foglalás)
✅ VERIFIKÁCIÓS CHECKLIST (mit kell még a verified-hez)`,
    `Optimalizáld a ${platform.label} profilt/bio-t.\n\n${buildContext()}`);

  // ============== TREND RADAR / VIRÁLIS ÖTLETEK ==============
  const generateTrend = () => runTool(setLoadingTrend, setTrendOutput,
    `Te a világ legjobb ${platform.label} trend forecaster + virális content strategist vagy. Magyar piacra dolgozol.
KÖTELEZŐ KIMENET:

🔥 10 AKTUÁLIS / FELFUTÓBAN LÉVŐ TREND ${platform.label}-on most:
Mindegyikhez:
- 📈 Trend neve / leírás (1 mondat)
- 🌡️ Hot score (1-10)
- ⏰ Becsült életciklus (még meddig viral – nap/hét)
- 🇭🇺 Magyar adaptáció (hogyan ültesd át magyar piacra)
- 🎯 Hogyan csatold a TERMÉKEDHEZ konkrétan
- 🎵 Ha hang/zene: track javaslat
- 📝 Konkrét poszt ötlet (script vázlat)
- ⚠️ Kockázat (cringe / cancel veszély)

🚀 3 EVERGREEN VIRAL FORMÁTUM (mindig működik)
📊 TREND BENCHMARK (mit jelent magyar piacon a "viral" – nézettség/engagement)
🎯 EXECUTION SPEED – hány órán belül kell kiraknod, hogy ne késsél le róla`,
    `Generálj trend radart + virális ötleteket.\n\n${buildContext()}`);

  // ============== FORDÍTÓ / LOKALIZÁCIÓ ==============
  const generateTranslate = async () => {
    if (!translateInput.trim()) {
      toast({ title: "Adj meg fordítandó szöveget", variant: "destructive" });
      return;
    }
    setLoadingTranslate(true); setTranslateOutput("");
    try {
      await streamAi(
        `Te egy profi marketing fordító + lokalizációs szakértő vagy. Nem szóról-szóra fordítasz, hanem KULTURÁLISAN ADAPTÁLSZ.
KÖTELEZŐ KIMENET:

🌍 NYERS FORDÍTÁS (${translateLang}) – pontos, de szó szerint
🎯 KULTURÁLISAN ADAPTÁLT VERZIÓ – ahogy egy anyanyelvi marketinges írná
💡 LOKALIZÁCIÓS MEGJEGYZÉSEK (mit változtattam, miért)
🚫 KULTURÁLIS BUKTATÓK (mit kerüljünk az adott piacon)
#️⃣ HASHTAG ADAPTÁCIÓ (lokális hashtagek)
💰 PÉNZNEM / MÉRTÉKEGYSÉG átváltás
⏰ IDŐPONT ADAPTÁCIÓ (másik időzóna posztolási csúcsa)
🎨 VIZUÁLIS ADAPTÁCIÓ JAVASLAT (szín, modell, helyszín)`,
        `Eredeti magyar szöveg:\n${translateInput}\n\nCélnyelv/piac: ${translateLang}\nPlatform: ${platform.label}`,
        setTranslateOutput,
        "post",
      );
    } catch (e: any) { toast({ title: "Hiba", description: e.message, variant: "destructive" }); }
    finally { setLoadingTranslate(false); }
  };

  // ============== CHATBOT / DM AUTOMATA SCRIPT ==============
  const generateChatbot = () => runTool(setLoadingChatbot, setChatbotOutput,
    `Te a világ legjobb conversational commerce + DM automation szakértője vagy. ${platform.label}-ra építesz chatbotot/DM flow-t.
KÖTELEZŐ KIMENET – TELJES CHATBOT FORGATÓKÖNYV:

🤖 ÜDVÖZLŐ ÜZENET (welcome message – 3 verzió)
🧩 MAIN MENU (4-6 gomb / quick reply opcióval):
- Termékek
- Méret tanácsadás
- Rendelés státusz
- Visszáru / csere
- Élő ügyfélszolgálat
- Kedvezmény / kupon

🌳 PÁRBESZÉD-FA mindegyik gombhoz:
- Bot kérdés
- Várt user válaszok (3-4 opció)
- Bot következő reakció

🎯 FALLBACK ("nem értem" – 3 fokozat, mielőtt élő agent)
👤 ÉLŐ AGENT ÁTADÁS – mikor és hogyan
💬 KICSI BESZÉLGETÉS (small talk válaszok – brand hang)
🛒 KOSÁR-MENTÉS automatizmus (24h, 48h, 72h)
🎁 LEAD MAGNET (mit ajánljunk az opt-in-ért)
📊 KPI – mit mérj (válaszidő, escalation rate, conversion)
⚖️ GDPR + adatvédelem disclaimer szövegek`,
    `Generálj DM/chatbot teljes flow-t.\n\n${buildContext()}`);

  // ============== SAJTÓKÖZLEMÉNY / PR ==============
  const generatePress = () => runTool(setLoadingPress, setPressOutput,
    `Te a világ legjobb magyar PR / sajtó kapcsolattartó vagy. Profi sajtóközleményeket írsz, amit a HVG, 24.hu, Index átvesz.
KÖTELEZŐ KIMENET – TELJES SAJTÓCSOMAG:

📰 SAJTÓKÖZLEMÉNY (klasszikus szerkezet):
- TÁRGY (max 80 kar – újságíró-mágnes)
- DÁTUM + HELYSZÍN (Budapest, 2025...)
- LEAD bekezdés (5W: ki, mit, mikor, hol, miért – 1 mondatban)
- TÖRZS (3-4 bekezdés, idézőjelben CEO/founder mondat)
- BACKGROUND (cégadatok, számok, mission)
- KAPCSOLAT (név, email, telefon)
- KÉPEK / VIDEO link sablon

📧 PITCH EMAIL újságíróknak (rövid, 5 mondat)
📋 MÉDIA LISTA javaslat (10 magyar releváns kiadvány)
🎯 NEWS HOOK – miért hír ez most (timing, szezon, tárgy)
📸 KÉPI ANYAG brief (mit küldj sajtóhoz)
🎙️ INTERJÚ-KÉSZSÉGI BULLET POINTS (válasz template-ek várt kérdésekre)
🚫 EMBARGO szöveg ha kell
📊 MÉRÉS – PR ROI hogyan számold`,
    `Generálj teljes sajtócsomagot.\n\n${buildContext()}`);

  // ============== ANALYTICS ÉRTELMEZŐ ==============
  const generateAnalytics = async () => {
    if (!analyticsInput.trim()) {
      toast({ title: "Illeszd be az analytics adatokat", variant: "destructive" });
      return;
    }
    setLoadingAnalytics(true); setAnalyticsOutput("");
    try {
      await streamAi(
        `Te a világ legjobb magyar marketing analytics elemző vagy. ${platform.label}-ra fókuszálsz.
KÖTELEZŐ KIMENET:

📊 ADATOK ÖSSZEGZÉSE (1 mondat – mit látunk)
🌡️ EGÉSZSÉG STÁTUSZ (zöld/sárga/piros + indoklás)

🟢 MI MEGY JÓL (3 pont – konkrét számokkal)
🔴 MI NEM MEGY (3 pont – konkrét számokkal)
⚠️ ANOMÁLIÁK (gyanús ugrások / esések)

🎯 ROOT CAUSE elemzés (miért történt – 3 hipotézis)
🔬 MELYIKET TESZTELD ELŐSZÖR (priorizálva)

🚀 KONKRÉT AKCIÓK (5 lépés holnap reggelre):
1. ...
2. ...

📈 HOSSZÚ TÁVÚ AJÁNLÁSOK (3 stratégiai)
📊 KÖVETKEZŐ MÉRÉSI PERIÓDUS (mit nézz, mikor)
💰 BUDGET ÚJRAOSZTÁS javaslat (% szerint)
🎯 ${platform.label} BENCHMARK – hogy állsz a magyar átlaghoz képest`,
        `Analytics adatok:\n${analyticsInput}\n\nKontextus:\n${buildContext()}`,
        setAnalyticsOutput,
        "post",
      );
    } catch (e: any) { toast({ title: "Hiba", description: e.message, variant: "destructive" }); }
    finally { setLoadingAnalytics(false); }
  };

  // ============== BRAND MOODBOARD / VIZUÁLIS GUIDE ==============
  const generateMoodboard = () => runTool(setLoadingMoodboard, setMoodboardOutput,
    `Te a világ legjobb brand identity + art director vagy. ${platform.label}-ra szabsz vizuális stílust magyar piacra.
KÖTELEZŐ KIMENET – TELJES VIZUÁLIS GUIDE:

🎨 SZÍNPALETTA (5 szín):
- Primary (HEX + HSL + amikor használd)
- Secondary
- Accent
- Neutral
- Dark/Light variánsok

🔤 TIPOGRÁFIA:
- Headline font (Google Font javaslat)
- Body font
- Hangsúly font (CTA-hoz)
- Hierarchia (H1/H2/H3 méret arány)

📸 FOTÓ STÍLUS:
- Kompozíció (rule of thirds, központosított, asymmetric)
- Megvilágítás (természetes, stúdió, drámai)
- Színhőmérséklet (meleg/hideg)
- Modell típus (kor, etnikum, stílus)
- Helyszín (urban, otthonos, természet)

✨ GRAFIKAI ELEMEK:
- Ikonok stílusa (line/filled, sarok)
- Textúrák
- Mintázatok
- Sticker / emoji használat

🎬 VIDEÓ STÍLUS:
- Vágás ritmus (lassú/gyors)
- Átmenetek
- Color grading (LUT javaslat)
- Felirat stílus (font, animáció)

📐 LAYOUT SZABÁLYOK:
- Margók, padding ${platform.label}-ra
- Safe zone (vágási területek)
- Branding helye (logo, watermark)

🚫 TILTOTT ELEMEK (mit NE használj sose – brand védelem)
✅ DO's lista
📋 EXPORT BEÁLLÍTÁSOK ${platform.label}-ra (DPI, format, méret)`,
    `Generálj teljes brand vizuális guide-ot.\n\n${buildContext()}`);

  // ============== UGC CREATOR BRIEF ==============
  const generateUgc = () => runTool(setLoadingUgc, setUgcOutput,
    `Te a világ legjobb UGC (User Generated Content) creator director vagy ${platform.label}-ra, magyar piacra.
KÖTELEZŐ KIMENET:
🎬 CREATOR BRIEF (1 oldalas, küldhető):
- Kampány cél + KPI
- 3 hook variáns (első 2 mp)
- Shot list (jelenetek időkóddal mp-ben)
- Beszéd-script natúr magyar nyelven (NEM reklámos)
- Kötelező mondatok (USP, CTA)
- Tiltott szavak / claim-ek (jogi)
- Ruházat / helyszín ajánlás
- B-roll lista
- Hang/zene típus
💰 DÍJAZÁSI JAVASLAT (HUF, magyar piaci benchmark)
📦 TERMÉKKÜLDÉS folyamat
✅ ELFOGADÁSI checklist (mit kell visszanéznem mielőtt fizetek)
📄 SZERZŐDÉS sarokpontok (usage rights, exkluzivitás, időtartam)`,
    `Készíts teljes UGC creator briefet ${platform.label}-ra.\n\n${buildContext()}`);

  // ============== TARTALOM ÚJRAHASZNOSÍTÓ (REPURPOSE) ==============
  const generateRepurpose = () => {
    if (!repurposeInput.trim()) {
      toast({ title: "Illeszd be az eredeti tartalmat", variant: "destructive" });
      return;
    }
    runTool(setLoadingRepurpose, setRepurposeOutput,
      `Te a világ legjobb content repurposing stratégája vagy. 1 darab forrás-tartalmat 12 különböző formátumra fordítasz át, mindet ${platform.label} stílusban + más platformokra is.
KÖTELEZŐ KIMENET (mind 12 db, készre megírva):
1. ${platform.label} Feed poszt
2. ${platform.label} Story (3 frame szöveg)
3. ${platform.label} Reel/Short script (15 mp, hook+body+CTA)
4. Twitter/X thread (5-7 tweet)
5. LinkedIn carousel (5 slide cím + body)
6. Email newsletter (subject + preview + body)
7. Blog cikk vázlat (H1, H2-k, kulcsszavak)
8. YouTube videó cím + leírás + 5 chapter
9. TikTok hook variáns (3 db)
10. Pinterest pin szöveg + alt text
11. WhatsApp/SMS rövidített üzenet
12. Push notification (40 karakter)`,
      `Eredeti tartalom:\n${repurposeInput}\n\nKontextus:\n${buildContext()}`);
  };

  // ============== BRAND VOICE / PERSONA ==============
  const generateVoice = () => runTool(setLoadingVoice, setVoiceOutput,
    `Te a világ legjobb brand voice + tone of voice szakértője vagy. ${platform.label}-ra szabott brand persona-t építesz magyar piacra.
KÖTELEZŐ KIMENET:
👤 BRAND PERSONA:
- Archetípus (Hero/Outlaw/Sage/Lover/Jester... + miért)
- Életkor / nem ha ember lenne
- Hangmagasság skála (1-10): formal↔casual, vicces↔komoly, tekintély↔barát
- Kedvenc szavak (10 db, magyarul)
- Tiltott szavak (10 db, sose használd)
- Írásjel preferencia (… ! ? — emoji)
- Mondat hossz (rövid/hosszú)
📝 30 PÉLDA MONDAT a hangnem demonstrálására
🎭 3 SCENARIO (örömhír / panasz / launch) – mindhez 2-3 mondat
✅ DO / 🚫 DON'T táblázat (15-15 sor)
📋 ONBOARDING DOC új copywriternek`,
    `Definiálj teljes brand voice guide-ot.\n\n${buildContext()}`);

  // ============== KÖZÖSSÉGI VÁLASZ GENERÁTOR (commentek/DM) ==============
  const generateCommunity = () => {
    if (!communityInput.trim()) {
      toast({ title: "Illeszd be a kommenteket / DM-eket", variant: "destructive" });
      return;
    }
    runTool(setLoadingCommunity, setCommunityOutput,
      `Te a világ legjobb community manager vagy ${platform.label}-ra, magyar piacra. Minden kapott komment/DM-re 3 választ adsz: rövid, közepes, hosszú.
KÖTELEZŐ KIMENET kommentenként:
[KOMMENT #X] eredeti szöveg
🏷️ KATEGÓRIA: kérdés / panasz / dícséret / spam / lead / vásárlási szándék
😊 SENTIMENT: pozitív / semleges / negatív (emoji)
🚦 PRIORITÁS: 🔴 azonnal / 🟡 24 órán belül / 🟢 nem sürgős
✍️ VÁLASZ A) rövid (1-2 mondat, casual)
✍️ VÁLASZ B) közepes (empátia + megoldás + CTA)
✍️ VÁLASZ C) hosszú (storytelling + edukáció + soft sell)
🎯 FOLLOW-UP javaslat (DM, email, retargeting pixel)
─── köztük üres sor ───`,
      `Kommentek / DM-ek:\n${communityInput}\n\nKontextus:\n${buildContext()}`);
  };

  // ============== ÁRAZÁS / AJÁNLAT LAB ==============
  const generateOffer = () => runTool(setLoadingOffer, setOfferOutput,
    `Te a világ legjobb offer engineering + pricing pszichológus vagy. ${platform.label}-ra optimalizált, ellenállhatatlan ajánlatokat építesz magyar piacra (HUF).
KÖTELEZŐ KIMENET – 5 KÜLÖNBÖZŐ AJÁNLAT VARIÁNS:
1. 🎁 ALAP ajánlat (termék + 1 bónusz)
2. 💎 PRÉMIUM bundle (3-5 elem, percieved value 3x ár)
3. 🔥 FLASH (24-48 óra, scarcity, drop ár)
4. 🎯 TRIPWIRE (alacsony ár, listára húzás)
5. 👑 VIP / upsell (high-ticket)

MINDEGYIKHEZ:
- Mit tartalmaz (sorlista értékben HUF)
- Eredeti ár vs akciós ár vs "value stack"
- Garancia (pénzvisszafizetés / cserés / 100%)
- Scarcity elem (db, idő, csoport méret)
- Bonus stacking (mit kap MÉG)
- Risk reversal mondatok
- 3 db headline javaslat
- CTA gomb felirat (3 variáns)
- FAQ (5 leggyakoribb ellenérv + válasz)

📊 ÖSSZEHASONLÍTÓ TÁBLA (a 3 fő ajánlat egymás mellett)
🧠 PSZICHOLÓGIAI TRIGGERS (anchoring, decoy, charm pricing 990 vs 1000)`,
    `Generálj 5 variáns ajánlatot ${platform.label}-ra.\n\n${buildContext()}`);

  // ============== STORYTELLING / NARRATIVE ARC ==============
  const generateStory = () => runTool(setLoadingStory, setStoryOutput,
    `Te a világ legjobb storyteller + brand narrative architect vagy. ${platform.label}-ra szabott történeteket írsz magyar piacra, érzelmi kötődést építve.
KÖTELEZŐ KIMENET – 5 KÜLÖNBÖZŐ STORY VARIÁNS:
1. 🦸 HERO'S JOURNEY (vásárló mint hős, termék mint mentor)
2. 😱 BEFORE / AFTER (transzformáció, fájdalom→eredmény)
3. 🏗️ FOUNDER STORY (miért indítottad, mission, "ezért hiszünk")
4. 💔 RELATABILITY (hibák, esések, "én is voltam ott")
5. 🔮 FUTURE PACING (képzeld el 6 hónap múlva...)

MINDEGYIKHEZ:
- Cím / hook
- Teljes szöveg ${platform.label} formátumra (max ${platform.maxChars} kar)
- Érzelmi ív (mp/sor szinten: kíváncsi→feszült→megoldás→öröm)
- Konkrét részletek (név, hely, érzet, szám) – NE legyen geneirikus
- Beépített USP (rejtve, nem reklámosan)
- Soft CTA végén
- Hashtag csomag

🎬 VIDEÓ STORYBOARD a legjobb story-hoz (jelenet/idő/dialógus/B-roll)`,
    `Generálj 5 storytelling variánst.\n\n${buildContext()}`);

  // ============== LIVE / WEBINAR / PODCAST SCRIPT ==============
  const generateLive = () => runTool(setLoadingLive, setLiveOutput,
    `Te a világ legjobb live event + webinar + podcast forgatókönyv-író vagy. ${platform.label}-ra szabott élő tartalom scriptet készítesz magyar piacra.
KÖTELEZŐ KIMENET – 60 PERCES LIVE FORGATÓKÖNYV percre lebontva:
00:00-02:00 – Cold open hook (miért maradjon)
02:00-05:00 – Bemutatkozás + agenda + ígéret
05:00-15:00 – Storytelling / probléma feltárás
15:00-35:00 – Fő tartalom 3 pillérben (mindhez konkrét tipp)
35:00-40:00 – Q&A 1. kör (előre megírt 5 kérdés stand-by)
40:00-50:00 – Pitch / ajánlat bevezetése (Soap Opera technika)
50:00-55:00 – Objection handling (5 leggyakoribb + válasz)
55:00-60:00 – Hard close + szűkített idejű bonus + URL

🎯 MELLÉKLETEK:
- Pre-live promó poszt (3 db, T-7, T-3, T-0)
- Reminder email/DM szöveg (T-1 nap, T-1 óra, T-5 perc)
- Live közben pinned komment (CTA)
- Replay email (4 részes drip: D+0, D+1, D+3, D+7)
- Highlight clip lista (5 db, mindegyikhez idő + cím)
- Repurposing terv (Reel, Short, Carousel a felvételből)`,
    `Készíts teljes 60 perces live forgatókönyvet.\n\n${buildContext()}`);

  // ============== JOGI / COMPLIANCE / CLAIM CHECK ==============
  const generateCompliance = () => {
    if (!complianceInput.trim()) {
      toast({ title: "Illeszd be a copy-t / hirdetést ellenőrzésre", variant: "destructive" });
      return;
    }
    runTool(setLoadingCompliance, setComplianceOutput,
      `Te a világ legjobb magyar reklámjogi + GVH + Meta/Google policy + GDPR + fogyasztóvédelmi szakértő vagy. ${platform.label} hirdetéseket és organikus posztokat ellenőrzöl.
KÖTELEZŐ KIMENET:
🚨 KOCKÁZAT SZINT: 🟢 OK / 🟡 figyelmeztetés / 🔴 magas / ⛔ tiltott

📋 RÉSZLETES VIZSGÁLAT:
1. Megtévesztő reklám (Fttv) – konkrét mondat idézve, miért gond
2. Egészség / fogyás / orvosi claim-ek (tiltott szavak)
3. "Legjobb / első / #1" típusú felsőfok – bizonyíték kell
4. Ár / kedvezmény tisztesség (eredeti ár 30 napos szabály)
5. Tartós ajánlat / scarcity hamis-e
6. Influencer #ad / #együttműködés jelölés
7. Gyermek célzás (16 alatti tilalom)
8. GDPR (szemlészelyes adat, cookie, opt-in)
9. ${platform.label} platform policy (alkohol, fogyókúra, before/after, dohány stb.)
10. Szellemi tulajdon (zene, kép, brand említés)

✏️ JAVÍTOTT VERZIÓ (átírva, jogszerűen, ugyanolyan erősen)
📚 HIVATKOZÁSOK: melyik törvényhely / policy paragrafus
⚖️ MAX BÍRSÁG ha leszerepel
✅ CHECKLIST (10 pont) jövőre`,
      `Ellenőrizendő tartalom:\n${complianceInput}\n\nKontextus:\n${buildContext()}`);
  };

  // ===================== AD-FOCUSED TOOLS =====================

  // 50 hirdetés szöveg vault
  const generateAdVault = () => runTool(setLoadingAdVault, setAdVaultOutput,
    `Te a világ legjobb direct-response copywritere vagy (David Ogilvy + Gary Halbert + Eugene Schwartz szintjén). ${platform.label} fizetett hirdetésekre specializálódva, magyar piacra.
KÖTELEZŐ KIMENET – 50 KÉSZ HIRDETÉSSZÖVEG, 10 keretrendszerben (5-5):
1. PAS (Problem-Agitate-Solve)
2. AIDA (Attention-Interest-Desire-Action)
3. BAB (Before-After-Bridge)
4. 4U (Useful-Urgent-Unique-Ultra-specific)
5. FAB (Features-Advantages-Benefits)
6. QUEST (Qualify-Understand-Educate-Stimulate-Transition)
7. STAR-STORY-SOLUTION
8. Listicle ("7 ok amiért...")
9. Kérdés-hook ("Tudtad hogy...?")
10. Social proof / vélemény-stílus

MINDEGYIK HIRDETÉSHEZ KÖTELEZŐ:
• Headline (max ${platform.maxChars > 90 ? "90" : platform.maxChars} karakter, hook a 3 első szóban)
• Primary text (3 verzió: rövid 50, közepes 125, hosszú 300 szó)
• CTA gomb szöveg (4 variáns)
• Hirdetés cél matching (Awareness/Traffic/Conversion/Retargeting)
• Várható CTR sáv (% szerint, magyar benchmark)
• Tiltott szavak ellenőrizve (GVH/Meta policy safe)`,
    `Generálj 50 kész ${platform.label} hirdetésszöveget azonnal indítható minőségben.\n\n${buildContext()}`);

  // Creative brief produkcióhoz
  const generateCreativeBrief = () => runTool(setLoadingCreativeBrief, setCreativeBriefOutput,
    `Te a világ legjobb performance creative direktora vagy. ${platform.label} hirdetésekhez teljes produkciós briefet írsz forgatás/grafikus csapatnak.
KÖTELEZŐ KIMENET:
🎯 KAMPÁNY ÖSSZEFOGLALÓ (1 mondat – mit, kinek, miért)
🎬 5 KREATÍV KONCEPCIÓ (mindegyikhez):
   - Concept név + 1 mondatos pitch
   - Hook (első 1.5 mp – vizuális + szöveg)
   - Storyboard 6 jelenetre (időbélyeggel)
   - Prop/díszlet/ruha/helyszín lista
   - Talent leírás (kor, vibe, casting note)
   - Music style + tempó (BPM)
   - Color grading (LUT javaslat)
   - Felirat overlay terv (font, animáció)
   - CTA end-card design
   - Várható gyártási költség (HUF)
📐 SPEC LISTA: aspect ratio, hossz, codec, fájlformátum (${platform.imageAspect}, ${platform.videoLength})
📋 SHOT LIST CSV (jelenet, kamera, lens, mozgás, hossz)
✅ APPROVAL CHECKLIST gyártás előtt`,
    `Készíts 5 darab teljes performance creative briefet ${platform.label} hirdetésekhez.\n\n${buildContext()}`);

  // Audience builder (Meta/TikTok/Google targeting)
  const generateAudience = () => runTool(setLoadingAudience, setAudienceOutput,
    `Te a világ legjobb paid media targeting specialistája vagy. ${platform.label} Ads Manager szintjén pontos audience-eket építesz magyar piacra.
KÖTELEZŐ KIMENET – 10 KÉSZ AUDIENCE (mindegyikhez):
1. Cold – broad interest stack
2. Cold – lookalike (1-3%, 3-5%, 5-10%)
3. Cold – job titles / behavior
4. Cold – competitor érdeklődés
5. Warm – website látogatók (7/30/90 nap)
6. Warm – Instagram/Facebook engager (365 nap)
7. Warm – videó néző (25/50/75/95%)
8. Warm – email lista upload
9. Hot – kosárelhagyók (1/3/7 nap)
10. Hot – vásárlók (cross-sell + LTV emelés)

MINDEGYIK AUDIENCE-HEZ:
• Pontos érdeklődési kategóriák (${platform.label} hivatalos taxonómia szerint)
• Demográfia (kor, nem, lokáció, nyelv, jövedelem)
• Behavior + device + OS
• Becsült méret (Magyarország, ezer fő)
• Exclude-ok (ki ne lássa)
• Várható CPM + CPC + CTR sáv (HUF, magyar benchmark)
• Ad set struktúra (CBO/ABO ajánlás)
• Daily budget javaslat (HUF) tesztelésre
• Skálázási tipp ha ROAS > 3`,
    `Építs 10 készre konfigurált ${platform.label} audience-t magyar e-commerce célra.\n\n${buildContext()}`);

  // Retargeting sequence (full funnel)
  const generateRetarget = () => runTool(setLoadingRetarget, setRetargetOutput,
    `Te a világ legjobb retargeting / remarketing stratégája vagy. ${platform.label} platformon teljes 7-touch retargeting szekvenciát építesz magyar piacra.
KÖTELEZŐ KIMENET – 7 LÉPCSŐS RETARGETING SOROZAT:
T+1 nap: Reminder (terméket nézte, nem vett) – soft hook
T+2 nap: Social proof (vásárlói vélemény / UGC)
T+3 nap: Objection killer (legnagyobb félelem feloldása)
T+5 nap: Bonus / extra érték hozzáadása
T+7 nap: Scarcity (limit / készlet / idő)
T+10 nap: Discount (csak ha más nem ment) – kód
T+14 nap: Goodbye / utolsó esély + win-back

MINDEGYIK LÉPÉSHEZ:
• Audience definíció (pontos szabály – pl. ViewContent NOT Purchase 2 nap)
• Hirdetés formátum (carousel/video/single image/collection)
• Headline + primary text + CTA (kész copy)
• Vizuális koncepció (1 mondat)
• Daily budget javaslat (HUF)
• Frequency cap
• Várható ROAS
• Mikor STOP-ozzunk (frequency > X vagy CTR <)
+ TELJES ADS MANAGER SETUP CHECKLIST`,
    `Építs teljes 7-touch retargeting funnelt ${platform.label} platformon.\n\n${buildContext()}`);

  // Pixel/tracking setup
  const generatePixel = () => runTool(setLoadingPixel, setPixelOutput,
    `Te a világ legjobb tracking / mérés implementáció szakértője vagy (Meta Pixel + CAPI + GA4 + GTM). ${platform.label} hirdetésekhez kompletten beállítod a mérést.
KÖTELEZŐ KIMENET:
📊 STANDARD ESEMÉNYEK (mindegyikhez kód snippet + GTM tag terv):
- PageView, ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, Purchase, Lead, CompleteRegistration, Search, AddToWishlist
🎯 CUSTOM EVENTS (e-commerce HU webshop specifikus):
- Méret kiválasztás, kupon beváltás, ingyen szállítás elérve, gyors-vásárlás, retúr indítás
🔗 CONVERSIONS API (server-side):
- Node/Edge function példa kód (deduplication event_id-vel)
- Required user data hash (em, ph, fn, ln, ct, zp) PII safe módon
🍪 CONSENT MODE v2 (GDPR):
- ad_storage / analytics_storage / ad_user_data / ad_personalization
- Cookie banner integráció kód
🧪 TESZTELÉS:
- Pixel Helper/Test Events lépésről lépésre
- GA4 DebugView checklist
- 10 leggyakoribb hiba + fix
📈 ATTRIBÚCIÓ:
- 7-day click + 1-day view ajánlás
- View-through és last-click összehasonlítás`,
    `Készíts teljes ${platform.label} pixel + Conversions API + GA4 setup tervet magyar webshopra.\n\n${buildContext()}`);

  // Budget / ROAS optimizer
  const generateBudget = () => {
    runTool(setLoadingBudget, setBudgetOutput,
      `Te a világ legjobb performance media buyer vagy. ${platform.label} hirdetési költségvetést optimalizálsz maximális ROAS-ra magyar piacra.
KÖTELEZŐ KIMENET:
💰 BUDGET ALLOKÁCIÓ (megadott havi keretből):
• TOFU (cold): X% – Y HUF/nap
• MOFU (warm): X% – Y HUF/nap
• BOFU (hot/retargeting): X% – Y HUF/nap
• Test budget (új kreatívok): 10-15%

📊 KAMPÁNY STRUKTÚRA:
- Hány kampány / ad set / ad indítson
- CBO vs ABO döntési mátrix
- Bid strategy (Lowest Cost / Cost Cap / Bid Cap / ROAS) számokkal

📈 KPI CÉLOK & BENCHMARK (magyar e-commerce):
- CPM, CPC, CTR, CVR, CPA, ROAS, AOV célok platformra
- Mikor "winning" egy ad (3-5-7-szabály)
- Mikor scale-elj 20%-kal vs duplázz

🚀 SCALING ROADMAP:
- Vertikális scale (budget +20% / 3 nap)
- Horizontális (új audience / új kreatív)
- Lookalike laddering 1→3→5→10%
- International expansion checklist

⚠️ KILL CRITERIA:
- Ad set szint, ad szint, kreatív szint stop szabályok
- Mikor pause vs duplicate vs reset learning

📅 30 NAPOS NAPI AKCIÓTERV táblázatban`,
      `Optimalizáld a budget-et: ${budgetInput || "havi 500.000 HUF + cél ROAS 3"}.\n\n${buildContext()}`);
  };

  // Ad-specific compliance (Meta / Google / TikTok policy)
  const generateAdCompliance = () => {
    if (!adComplianceInput.trim()) {
      toast({ title: "Illeszd be a hirdetést scan-eléshez", variant: "destructive" });
      return;
    }
    runTool(setLoadingAdCompliance, setAdComplianceOutput,
      `Te a világ legjobb ${platform.label} Ads policy + magyar reklámjog szakértője vagy. Hirdetés-disapproval / account ban kockázatot szkennelsz percekre lebontva.
KÖTELEZŐ KIMENET:
🚨 GLOBÁLIS RIZIKÓ SCORE: 0-100 (szín-kód: 🟢 0-30 / 🟡 31-60 / 🔴 61-100)
📛 KIMUTATOTT POLICY VIOLATIONS (idézett mondat + policy URL/paragrafus):
1. Personal attributes (egészség, kor, etnikum, vallás...)
2. Before/After képek (fogyás, bőr, izom)
3. "You/Te" 2. személyű túl direkt megszólítás
4. Sensational / shocking content
5. Misleading claims / unrealistic results
6. Tilted text / clickbait button mock-up
7. Low quality (excessive caps, special chars, emojik túl)
8. Prohibited products (alcohol, dating, supplements, finance)
9. Trademark / copyrighted content
10. Landing page mismatch / disclosure hiány

✏️ JAVÍTOTT HIRDETÉS (azonos hatékonyság, 100% policy-safe)
🔄 3 ALTERNATÍV HOOK ami biztosan átmegy
⚠️ ACCOUNT-LEVEL RIZIKÓ: van-e ban veszély (1-strike vs strike-system)
🛡️ APPEAL TEMPLATE ha mégis disapproval jönne (kész szöveg ${platform.label} support-hoz)
📋 PRE-LAUNCH CHECKLIST (15 pont)`,
      `Hirdetés szövege:\n${adComplianceInput}\n\nKontextus:\n${buildContext()}`);
  };

  // Competitor ads spy / swipe file
  const generateAdSpy = () => {
    runTool(setLoadingAdSpy, setAdSpyOutput,
      `Te a világ legjobb competitive intelligence elemzője vagy paid media-ban. ${platform.label} (Meta Ad Library / TikTok Creative Center / Google Transparency) szintű mélységben elemzed a versenytárs hirdetéseit.
KÖTELEZŐ KIMENET:
🔍 VERSENYTÁRS HIRDETÉS DEKÓDOLÁS (3-5 versenytárs × 5 hirdetés):
Mindegyik hirdetéshez:
- Hook (első 3 mp / 1. sor) + miért működik
- Copy framework (PAS/AIDA/...)
- Vizuális stílus (UGC / studio / motion graphic)
- Becsült futási idő + spend (HUF)
- Becsült célzás (audience reverse-engineering)
- Landing page taktika
- Offer / ár / kedvezmény / garancia
- Hiányosság (mit csinálnak ROSSZUL)

📊 PIACI MINTÁZATOK:
- Top 5 közös hook-pattern
- Top 5 közös vizuális trend
- Mit használ MINDENKI (telített) vs mit NEM használ senki (rés)

⚔️ TÁMADÁSI TERV ("Differentiation playbook"):
- 5 ANGLE amit ők NEM használnak
- 5 KONKRÉT hirdetés ötlet a réseikbe (kész copy + vizuális brief)
- Ár / pozicionálási előny kihasználás

🎯 SWIPE FILE (10 legjobb idézhető headline + CTA versenytársaktól, magyarra adaptálva)`,
      `Versenytárs nevek/URL-ek: ${adSpyInput || "magyar e-commerce versenytársak az adott kategóriában"}.\n\n${buildContext()}`);
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: "Vágólapra másolva" });
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="border-2 border-foreground p-4 md:p-6 bg-background">
        <div className="flex items-center gap-3 mb-2">
          <PlatformIcon className={`h-7 w-7 ${platform.accentClass}`} />
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider">
              {platform.label} Stúdió
            </h2>
            <p className="text-xs text-muted-foreground">
              Dedikált AI eszköztár – posztok, képek, videó scriptek célközönségre szabva
            </p>
          </div>
          <Badge className="ml-auto rounded-none bg-foreground text-background uppercase text-[10px]">
            <Flame className="h-3 w-3 mr-1" /> 10000% ERŐ
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-[11px]">
          <div className="border p-2"><Clock className="h-3 w-3 inline mr-1" /><b>Idő:</b> {platform.bestTime}</div>
          <div className="border p-2"><Users className="h-3 w-3 inline mr-1" /><b>Közönség:</b> {platform.audienceAge}</div>
          <div className="border p-2"><Target className="h-3 w-3 inline mr-1" /><b>Max:</b> {platform.maxChars} kar</div>
          <div className="border p-2"><MapPin className="h-3 w-3 inline mr-1" /><b>Hashtag:</b> {platform.hashtagCount}</div>
        </div>
      </div>

      {/* TARGETING */}
      <div className="border p-4 space-y-4">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
          <Target className="h-4 w-4 text-accent" /> Célközönség & Termék
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase">Termék (opcionális)</Label>
            <select
              className="w-full border rounded-none p-2 text-sm bg-background mt-1"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              <option value="">— válassz vagy adj meg témát —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.price} Ft)</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs uppercase">Vagy egyedi téma</Label>
            <Input
              className="rounded-none mt-1"
              placeholder="pl. tavaszi kollekció launch"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs uppercase">Korosztály</Label>
            <select className="w-full border rounded-none p-2 text-sm bg-background mt-1"
              value={audienceAge} onChange={(e) => setAudienceAge(e.target.value)}>
              {["13-17","16-22","18-25","18-35","25-34","25-44","30-50","35-55","45+","50+"].map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs uppercase">Nem</Label>
            <select className="w-full border rounded-none p-2 text-sm bg-background mt-1"
              value={audienceGender} onChange={(e) => setAudienceGender(e.target.value)}>
              {["vegyes","női","férfi","non-binary"].map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs uppercase">Lokáció</Label>
            <Input className="rounded-none mt-1"
              value={audienceLocation} onChange={(e) => setAudienceLocation(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs uppercase">Érdeklődés</Label>
            <Input className="rounded-none mt-1"
              value={audienceInterests} onChange={(e) => setAudienceInterests(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs uppercase">Kampány cél</Label>
            <select className="w-full border rounded-none p-2 text-sm bg-background mt-1"
              value={campaignGoal} onChange={(e) => setCampaignGoal(e.target.value)}>
              {["eladás","branding","engagement","feliratkozó","forgalom","retargeting","UGC","influencer"].map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs uppercase">Hangnem</Label>
            <select className="w-full border rounded-none p-2 text-sm bg-background mt-1"
              value={tone} onChange={(e) => setTone(e.target.value)}>
              {["energikus","luxus","FOMO","humoros","oktató","barátságos","provokatív","minimalista","sürgető"].map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs uppercase">Formátum ({platform.label})</Label>
            <select className="w-full border rounded-none p-2 text-sm bg-background mt-1"
              value={postFormat} onChange={(e) => setPostFormat(e.target.value)}>
              {platform.formats.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs uppercase">Posztolási idő (felülír)</Label>
            <Input className="rounded-none mt-1"
              placeholder={platform.bestTime}
              value={bestTimeOverride} onChange={(e) => setBestTimeOverride(e.target.value)} />
          </div>
        </div>
      </div>

      {/* TOOLS */}
      <Tabs defaultValue="post" className="space-y-4">
        <TabsList className="rounded-none w-full grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 h-auto">
          <TabsTrigger value="post" className="rounded-none uppercase text-[10px] py-2"><FileText className="h-3 w-3 mr-1" />Poszt</TabsTrigger>
          <TabsTrigger value="image" className="rounded-none uppercase text-[10px] py-2"><ImageIcon className="h-3 w-3 mr-1" />AI kép</TabsTrigger>
          <TabsTrigger value="edit" className="rounded-none uppercase text-[10px] py-2"><Scissors className="h-3 w-3 mr-1" />Kép-szerk.</TabsTrigger>
          <TabsTrigger value="video" className="rounded-none uppercase text-[10px] py-2"><Video className="h-3 w-3 mr-1" />Videó</TabsTrigger>
          <TabsTrigger value="hooks" className="rounded-none uppercase text-[10px] py-2"><Zap className="h-3 w-3 mr-1" />Hook×10</TabsTrigger>
          <TabsTrigger value="carousel" className="rounded-none uppercase text-[10px] py-2"><Layers className="h-3 w-3 mr-1" />Carousel</TabsTrigger>
          <TabsTrigger value="hashtags" className="rounded-none uppercase text-[10px] py-2"><Hash className="h-3 w-3 mr-1" />Hashtag</TabsTrigger>
          <TabsTrigger value="email" className="rounded-none uppercase text-[10px] py-2"><Mail className="h-3 w-3 mr-1" />Email/DM</TabsTrigger>
          <TabsTrigger value="calendar" className="rounded-none uppercase text-[10px] py-2"><Calendar className="h-3 w-3 mr-1" />30 nap</TabsTrigger>
          <TabsTrigger value="competitor" className="rounded-none uppercase text-[10px] py-2"><Eye className="h-3 w-3 mr-1" />Spy</TabsTrigger>
          <TabsTrigger value="ads" className="rounded-none uppercase text-[10px] py-2"><DollarSign className="h-3 w-3 mr-1" />Ads</TabsTrigger>
          <TabsTrigger value="seo" className="rounded-none uppercase text-[10px] py-2"><Search className="h-3 w-3 mr-1" />SEO</TabsTrigger>
          <TabsTrigger value="influencer" className="rounded-none uppercase text-[10px] py-2"><UserCheck className="h-3 w-3 mr-1" />Influencer</TabsTrigger>
          <TabsTrigger value="abtest" className="rounded-none uppercase text-[10px] py-2"><FlaskConical className="h-3 w-3 mr-1" />A/B</TabsTrigger>
          <TabsTrigger value="landing" className="rounded-none uppercase text-[10px] py-2"><LayoutTemplate className="h-3 w-3 mr-1" />Landing</TabsTrigger>
          <TabsTrigger value="crisis" className="rounded-none uppercase text-[10px] py-2"><AlertTriangle className="h-3 w-3 mr-1" />Krízis</TabsTrigger>
          <TabsTrigger value="funnel" className="rounded-none uppercase text-[10px] py-2"><GitBranch className="h-3 w-3 mr-1" />Funnel</TabsTrigger>
          <TabsTrigger value="bio" className="rounded-none uppercase text-[10px] py-2"><User className="h-3 w-3 mr-1" />Bio</TabsTrigger>
          <TabsTrigger value="trend" className="rounded-none uppercase text-[10px] py-2"><TrendIcon className="h-3 w-3 mr-1" />Trend</TabsTrigger>
          <TabsTrigger value="translate" className="rounded-none uppercase text-[10px] py-2"><Languages className="h-3 w-3 mr-1" />Fordító</TabsTrigger>
          <TabsTrigger value="chatbot" className="rounded-none uppercase text-[10px] py-2"><MessageCircle className="h-3 w-3 mr-1" />Chatbot</TabsTrigger>
          <TabsTrigger value="press" className="rounded-none uppercase text-[10px] py-2"><Newspaper className="h-3 w-3 mr-1" />PR</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-none uppercase text-[10px] py-2"><BarChart3 className="h-3 w-3 mr-1" />Analytics</TabsTrigger>
          <TabsTrigger value="moodboard" className="rounded-none uppercase text-[10px] py-2"><Palette className="h-3 w-3 mr-1" />Moodboard</TabsTrigger>
          <TabsTrigger value="ugc" className="rounded-none uppercase text-[10px] py-2"><Camera className="h-3 w-3 mr-1" />UGC brief</TabsTrigger>
          <TabsTrigger value="repurpose" className="rounded-none uppercase text-[10px] py-2"><Recycle className="h-3 w-3 mr-1" />Repurpose</TabsTrigger>
          <TabsTrigger value="voice" className="rounded-none uppercase text-[10px] py-2"><Mic className="h-3 w-3 mr-1" />Brand voice</TabsTrigger>
          <TabsTrigger value="community" className="rounded-none uppercase text-[10px] py-2"><MessagesSquare className="h-3 w-3 mr-1" />Reply</TabsTrigger>
          <TabsTrigger value="offer" className="rounded-none uppercase text-[10px] py-2"><Tag className="h-3 w-3 mr-1" />Offer lab</TabsTrigger>
          <TabsTrigger value="story" className="rounded-none uppercase text-[10px] py-2"><BookOpen className="h-3 w-3 mr-1" />Story</TabsTrigger>
          <TabsTrigger value="live" className="rounded-none uppercase text-[10px] py-2"><Radio className="h-3 w-3 mr-1" />Live</TabsTrigger>
          <TabsTrigger value="compliance" className="rounded-none uppercase text-[10px] py-2"><ShieldCheck className="h-3 w-3 mr-1" />Jogi</TabsTrigger>
          <TabsTrigger value="adVault" className="rounded-none uppercase text-[10px] py-2 bg-accent/20"><Vault className="h-3 w-3 mr-1" />Ad Vault×50</TabsTrigger>
          <TabsTrigger value="creativeBrief" className="rounded-none uppercase text-[10px] py-2 bg-accent/20"><ClipboardList className="h-3 w-3 mr-1" />Creative Brief</TabsTrigger>
          <TabsTrigger value="audience" className="rounded-none uppercase text-[10px] py-2 bg-accent/20"><Crosshair className="h-3 w-3 mr-1" />Audience×10</TabsTrigger>
          <TabsTrigger value="retarget" className="rounded-none uppercase text-[10px] py-2 bg-accent/20"><Repeat className="h-3 w-3 mr-1" />Retarget 7×</TabsTrigger>
          <TabsTrigger value="pixel" className="rounded-none uppercase text-[10px] py-2 bg-accent/20"><Activity className="h-3 w-3 mr-1" />Pixel/CAPI</TabsTrigger>
          <TabsTrigger value="budget" className="rounded-none uppercase text-[10px] py-2 bg-accent/20"><Wallet className="h-3 w-3 mr-1" />Budget/ROAS</TabsTrigger>
          <TabsTrigger value="adCompliance" className="rounded-none uppercase text-[10px] py-2 bg-accent/20"><ScanLine className="h-3 w-3 mr-1" />Ad Policy</TabsTrigger>
          <TabsTrigger value="adSpy" className="rounded-none uppercase text-[10px] py-2 bg-accent/20"><Telescope className="h-3 w-3 mr-1" />Ad Spy</TabsTrigger>
          <TabsTrigger value="videoeditor" className="rounded-none uppercase text-[10px] py-2 col-span-2 md:col-span-1 bg-foreground text-background data-[state=active]:bg-accent"><Film className="h-3 w-3 mr-1" />Videó editor</TabsTrigger>
        </TabsList>

        {/* POST */}
        <TabsContent value="post" className="space-y-3">
          <Button onClick={generatePost} disabled={loadingPost}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingPost ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {loadingPost ? "Generálás..." : `${platform.label} poszt generálása`}
          </Button>
          <Textarea
            className="rounded-none min-h-[400px] font-mono text-xs"
            value={postOutput}
            onChange={(e) => setPostOutput(e.target.value)}
            placeholder="Itt jelenik meg a generált poszt – streamelve..."
          />
          {postOutput && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(postOutput)}>
                <Copy className="h-3 w-3 mr-1" /> Másolás
              </Button>
              <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={generatePost}>
                <RefreshCw className="h-3 w-3 mr-1" /> Új variáns
              </Button>
            </div>
          )}
        </TabsContent>

        {/* IMAGE */}
        <TabsContent value="image" className="space-y-3">
          <Label className="text-xs uppercase">Kép prompt (opcionális – ha üres, a termékből generál)</Label>
          <Textarea
            className="rounded-none min-h-[80px]"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder={`pl. ${platform.label} ${postFormat} – egy fiatal magyar nő használja a terméket egy budapesti kávézóban, természetes fény, premium look`}
          />
          <Button onClick={generateImage} disabled={loadingImage}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            {loadingImage ? "Kép generálás..." : `AI kép generálása (${platform.imageAspect})`}
          </Button>
          {imageBase64 && (
            <div className="border p-3 space-y-2">
              <img src={imageBase64} alt="Generated" className="w-full max-h-[600px] object-contain border" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => downloadImage()}>
                  <Download className="h-3 w-3 mr-1" /> Letöltés
                </Button>
                <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={generateImage}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Új variáns
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* VIDEO */}
        <TabsContent value="video" className="space-y-3">
          <Button onClick={generateVideoScript} disabled={loadingVideo}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingVideo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
            {loadingVideo ? "Script generálás..." : `${platform.label} videó script (${platform.videoLength})`}
          </Button>
          <Textarea
            className="rounded-none min-h-[500px] font-mono text-xs"
            value={videoOutput}
            onChange={(e) => setVideoOutput(e.target.value)}
            placeholder="Itt jelenik meg a shot-by-shot videó forgatókönyv..."
          />
          {videoOutput && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(videoOutput)}>
                <Copy className="h-3 w-3 mr-1" /> Másolás
              </Button>
              <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={generateVideoScript}>
                <RefreshCw className="h-3 w-3 mr-1" /> Új variáns
              </Button>
            </div>
          )}
        </TabsContent>

        {/* IMAGE EDIT */}
        <TabsContent value="edit" className="space-y-3">
          <Label className="text-xs uppercase">Tölts fel egy képet (saját termékfotó, screenshot stb.)</Label>
          <Input type="file" accept="image/*" className="rounded-none"
            onChange={(e) => e.target.files?.[0] && handleEditUpload(e.target.files[0])} />
          {editSourceB64 && <img src={editSourceB64} alt="source" className="w-full max-h-[300px] object-contain border" />}
          <Label className="text-xs uppercase">Mit változtassunk rajta?</Label>
          <Textarea className="rounded-none min-h-[80px]"
            value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="pl. tedd a hátteret budapesti utcára, adj hozzá természetes fényt, ${platform.label} reels stílus" />
          <Button onClick={generateEditedImage} disabled={loadingEdit}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingEdit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Scissors className="h-4 w-4 mr-2" />}
            {loadingEdit ? "Szerkesztés..." : "AI képszerkesztés indítása"}
          </Button>
          {editedB64 && (
            <div className="border p-3 space-y-2">
              <img src={editedB64} alt="Edited" className="w-full max-h-[600px] object-contain border" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => downloadImage(editedB64, "-edit")}>
                  <Download className="h-3 w-3 mr-1" /> Letöltés
                </Button>
                <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={generateEditedImage}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Új variáns
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* HOOKS */}
        <TabsContent value="hooks" className="space-y-3">
          <Button onClick={generateHooks} disabled={loadingHook}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingHook ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            {loadingHook ? "10 hook generálása..." : "10 PRO HOOK variáns"}
          </Button>
          <Textarea className="rounded-none min-h-[400px] font-mono text-xs"
            value={hookOutput} onChange={(e) => setHookOutput(e.target.value)}
            placeholder="10 különböző stílusú scroll-stopper hook..." />
          {hookOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(hookOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* CAROUSEL */}
        <TabsContent value="carousel" className="space-y-3">
          <Button onClick={generateCarousel} disabled={loadingCarousel}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingCarousel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Layers className="h-4 w-4 mr-2" />}
            {loadingCarousel ? "Carousel..." : `${platform.label} Carousel/Thread (8-10 slide)`}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs"
            value={carouselOutput} onChange={(e) => setCarouselOutput(e.target.value)}
            placeholder="Slide-by-slide carousel/thread tartalom..." />
          {carouselOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(carouselOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* HASHTAGS */}
        <TabsContent value="hashtags" className="space-y-3">
          <Button onClick={generateHashtags} disabled={loadingHashtag}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingHashtag ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Hash className="h-4 w-4 mr-2" />}
            {loadingHashtag ? "Hashtag stratégia..." : "PRO Hashtag Stratégia (Tier 1/2/3 + magyar)"}
          </Button>
          <Textarea className="rounded-none min-h-[400px] font-mono text-xs"
            value={hashtagOutput} onChange={(e) => setHashtagOutput(e.target.value)}
            placeholder="3-tier hashtag stratégia + shadowban check + magyar tagek..." />
          {hashtagOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(hashtagOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* EMAIL/DM/SMS */}
        <TabsContent value="email" className="space-y-3">
          <Button onClick={generateEmail} disabled={loadingEmail}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            {loadingEmail ? "Sequence..." : "Email + DM + SMS sequence (PAS framework)"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs"
            value={emailOutput} onChange={(e) => setEmailOutput(e.target.value)}
            placeholder="Email tárgy A/B + body + DM cold opener + SMS..." />
          {emailOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(emailOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* CALENDAR 30 DAYS */}
        <TabsContent value="calendar" className="space-y-3">
          <Button onClick={generateCalendar} disabled={loadingCalendar}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingCalendar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
            {loadingCalendar ? "30 napos naptár..." : "30 napos content calendar"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs"
            value={calendarOutput} onChange={(e) => setCalendarOutput(e.target.value)}
            placeholder="Nap | Dátum | Típus | Téma | Hook | CTA | Időpont | Hashtag..." />
          {calendarOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(calendarOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* COMPETITOR */}
        <TabsContent value="competitor" className="space-y-3">
          <Label className="text-xs uppercase">Versenytárs URL vagy név</Label>
          <Input className="rounded-none"
            value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)}
            placeholder="pl. shein.com / @aboutyou_hu / zalando.hu" />
          <Button onClick={generateCompetitorAnalysis} disabled={loadingCompetitor}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingCompetitor ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            {loadingCompetitor ? "Spy mode..." : "Versenytárs analízis + támadási terv"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs"
            value={competitorOutput} onChange={(e) => setCompetitorOutput(e.target.value)}
            placeholder="Pozícionálás, erősségek, gyengeségek, támadási vektorok..." />
          {competitorOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(competitorOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* ADS */}
        <TabsContent value="ads" className="space-y-3">
          <Button onClick={generateAds} disabled={loadingAds}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingAds ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
            {loadingAds ? "Kampány..." : `Teljes ${platform.label} hirdetési kampányterv`}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs"
            value={adsOutput} onChange={(e) => setAdsOutput(e.target.value)}
            placeholder="Cold/Warm/Hot ad set, budget, bidding, 5 creative, KPI, kill criteria..." />
          {adsOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(adsOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="space-y-3">
          <Button onClick={generateSeo} disabled={loadingSeo}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingSeo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {loadingSeo ? "SEO kutatás..." : "SEO + kulcsszó + meta + discovery"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs"
            value={seoOutput} onChange={(e) => setSeoOutput(e.target.value)}
            placeholder="Primary/long-tail/kérdés/lokális kulcsszavak, meta title/description, slug..." />
          {seoOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(seoOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* INFLUENCER */}
        <TabsContent value="influencer" className="space-y-3">
          <Button onClick={generateInfluencer} disabled={loadingInfluencer}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingInfluencer ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
            {loadingInfluencer ? "Influencer terv..." : "Influencer stratégia + outreach"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs"
            value={influencerOutput} onChange={(e) => setInfluencerOutput(e.target.value)}
            placeholder="Influencer profil, árazás, outreach email, brief, KPI..." />
          {influencerOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(influencerOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* A/B TEST */}
        <TabsContent value="abtest" className="space-y-3">
          <Button onClick={generateAbTest} disabled={loadingAbTest}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingAbTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
            {loadingAbTest ? "A/B tervek..." : "5 A/B teszt javaslat ICE score-ral"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs"
            value={abTestOutput} onChange={(e) => setAbTestOutput(e.target.value)}
            placeholder="Hipotézis, A/B variánsok, minta méret, várt lift..." />
          {abTestOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(abTestOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* LANDING PAGE */}
        <TabsContent value="landing" className="space-y-3">
          <Button onClick={generateLanding} disabled={loadingLanding}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingLanding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LayoutTemplate className="h-4 w-4 mr-2" />}
            {loadingLanding ? "Landing copy..." : "Teljes landing page sales copy"}
          </Button>
          <Textarea className="rounded-none min-h-[600px] font-mono text-xs"
            value={landingOutput} onChange={(e) => setLandingOutput(e.target.value)}
            placeholder="Hero, problem, solution, features→benefits, social proof, FAQ, CTA..." />
          {landingOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(landingOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* CRISIS */}
        <TabsContent value="crisis" className="space-y-3">
          <Label className="text-xs uppercase">Negatív komment / krízis helyzet leírása</Label>
          <Textarea className="rounded-none min-h-[100px]"
            value={crisisInput} onChange={(e) => setCrisisInput(e.target.value)}
            placeholder="pl. 'Egy vásárló a komment szekcióban azt írja, hogy 3 hete vár a csomagra és átverésnek érzi...'" />
          <Button onClick={generateCrisisResponse} disabled={loadingCrisis}
            className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingCrisis ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
            {loadingCrisis ? "Krízis válasz..." : "PR krízis kezelés – 3 válasz variáns"}
          </Button>
          <Textarea className="rounded-none min-h-[400px] font-mono text-xs"
            value={crisisOutput} onChange={(e) => setCrisisOutput(e.target.value)}
            placeholder="Súlyosság, reakcióidő, 3 válasz variáns, eszkaláció..." />
          {crisisOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(crisisOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* FUNNEL */}
        <TabsContent value="funnel" className="space-y-3">
          <Button onClick={generateFunnel} disabled={loadingFunnel} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingFunnel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GitBranch className="h-4 w-4 mr-2" />}
            {loadingFunnel ? "Funnel..." : "TOFU/MOFU/BOFU funnel térkép + budget"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={funnelOutput} onChange={(e) => setFunnelOutput(e.target.value)} placeholder="Awareness → Consideration → Conversion → Retention..." />
          {funnelOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(funnelOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* BIO */}
        <TabsContent value="bio" className="space-y-3">
          <Button onClick={generateBio} disabled={loadingBio} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingBio ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <User className="h-4 w-4 mr-2" />}
            {loadingBio ? "Bio..." : `${platform.label} profil/bio optimalizálás (3 variáns)`}
          </Button>
          <Textarea className="rounded-none min-h-[400px] font-mono text-xs" value={bioOutput} onChange={(e) => setBioOutput(e.target.value)} placeholder="Display name, bio 3 verzió, link stratégia, profil kép brief, highlights..." />
          {bioOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(bioOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* TREND */}
        <TabsContent value="trend" className="space-y-3">
          <Button onClick={generateTrend} disabled={loadingTrend} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingTrend ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendIcon className="h-4 w-4 mr-2" />}
            {loadingTrend ? "Trend radar..." : "10 aktuális trend + magyar adaptáció"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={trendOutput} onChange={(e) => setTrendOutput(e.target.value)} placeholder="Hot trendek, hot score, életciklus, adaptáció a termékre..." />
          {trendOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(trendOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* TRANSLATE */}
        <TabsContent value="translate" className="space-y-3">
          <Label className="text-xs uppercase">Magyar szöveg fordításra</Label>
          <Textarea className="rounded-none min-h-[100px]" value={translateInput} onChange={(e) => setTranslateInput(e.target.value)} placeholder="Másold be a magyar marketing szöveget..." />
          <Label className="text-xs uppercase">Célnyelv / piac</Label>
          <select className="w-full border rounded-none p-2 text-sm bg-background" value={translateLang} onChange={(e) => setTranslateLang(e.target.value)}>
            {["angol","német","román","szlovák","cseh","lengyel","olasz","francia","spanyol","portugál","holland","török","arab","kínai","japán"].map(l => <option key={l}>{l}</option>)}
          </select>
          <Button onClick={generateTranslate} disabled={loadingTranslate} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingTranslate ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Languages className="h-4 w-4 mr-2" />}
            {loadingTranslate ? "Fordítás..." : "Kulturális adaptáció + lokalizáció"}
          </Button>
          <Textarea className="rounded-none min-h-[400px] font-mono text-xs" value={translateOutput} onChange={(e) => setTranslateOutput(e.target.value)} placeholder="Nyers fordítás + kulturálisan adaptált verzió + buktatók..." />
          {translateOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(translateOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* CHATBOT */}
        <TabsContent value="chatbot" className="space-y-3">
          <Button onClick={generateChatbot} disabled={loadingChatbot} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingChatbot ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
            {loadingChatbot ? "Chatbot flow..." : "Teljes DM/chatbot forgatókönyv"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={chatbotOutput} onChange={(e) => setChatbotOutput(e.target.value)} placeholder="Welcome, menu, párbeszéd-fa, fallback, agent átadás, kosár-mentés..." />
          {chatbotOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(chatbotOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* PRESS / PR */}
        <TabsContent value="press" className="space-y-3">
          <Button onClick={generatePress} disabled={loadingPress} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingPress ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Newspaper className="h-4 w-4 mr-2" />}
            {loadingPress ? "PR csomag..." : "Sajtóközlemény + pitch email + médialista"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={pressOutput} onChange={(e) => setPressOutput(e.target.value)} placeholder="Sajtóközlemény, pitch email, médialista, news hook..." />
          {pressOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(pressOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="space-y-3">
          <Label className="text-xs uppercase">Illeszd be az analytics adatokat (insights, GA4 export, ad manager screenshot szöveg)</Label>
          <Textarea className="rounded-none min-h-[150px]" value={analyticsInput} onChange={(e) => setAnalyticsInput(e.target.value)} placeholder="pl. Reach: 12500, CTR: 1.2%, CPC: 65 Ft, ROAS: 1.8, Conversion rate: 0.8%..." />
          <Button onClick={generateAnalytics} disabled={loadingAnalytics} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingAnalytics ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
            {loadingAnalytics ? "Elemzés..." : "Analytics értelmezés + akcióterv"}
          </Button>
          <Textarea className="rounded-none min-h-[400px] font-mono text-xs" value={analyticsOutput} onChange={(e) => setAnalyticsOutput(e.target.value)} placeholder="Mi megy jól / rosszul, root cause, 5 akció holnapra, magyar benchmark..." />
          {analyticsOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(analyticsOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* MOODBOARD */}
        <TabsContent value="moodboard" className="space-y-3">
          <Button onClick={generateMoodboard} disabled={loadingMoodboard} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingMoodboard ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Palette className="h-4 w-4 mr-2" />}
            {loadingMoodboard ? "Moodboard..." : "Brand vizuális guide + színpaletta + tipográfia"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={moodboardOutput} onChange={(e) => setMoodboardOutput(e.target.value)} placeholder="Színek HEX-ben, fontok, fotó stílus, videó style, layout szabályok..." />
          {moodboardOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(moodboardOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* UGC */}
        <TabsContent value="ugc" className="space-y-3">
          <Button onClick={generateUgc} disabled={loadingUgc} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingUgc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
            {loadingUgc ? "UGC brief..." : "UGC creator brief + shot list + díjazás"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={ugcOutput} onChange={(e) => setUgcOutput(e.target.value)} placeholder="Hook variánsok, shot list, script, díjazás HUF, szerződés sarokpontok..." />
          {ugcOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(ugcOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* REPURPOSE */}
        <TabsContent value="repurpose" className="space-y-3">
          <Label className="text-xs uppercase">Eredeti tartalom (cikk, videó leirat, poszt, ötlet)</Label>
          <Textarea className="rounded-none min-h-[150px]" value={repurposeInput} onChange={(e) => setRepurposeInput(e.target.value)} placeholder="Másold ide a forrás tartalmat..." />
          <Button onClick={generateRepurpose} disabled={loadingRepurpose} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingRepurpose ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Recycle className="h-4 w-4 mr-2" />}
            {loadingRepurpose ? "Átalakítás..." : "1 tartalom → 12 formátum (minden platformra)"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={repurposeOutput} onChange={(e) => setRepurposeOutput(e.target.value)} placeholder="Feed, Story, Reel, Thread, LinkedIn, Email, Blog, YouTube, TikTok, Pinterest, SMS, Push..." />
          {repurposeOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(repurposeOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* BRAND VOICE */}
        <TabsContent value="voice" className="space-y-3">
          <Button onClick={generateVoice} disabled={loadingVoice} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingVoice ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mic className="h-4 w-4 mr-2" />}
            {loadingVoice ? "Voice..." : "Brand voice + persona + 30 példa mondat"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={voiceOutput} onChange={(e) => setVoiceOutput(e.target.value)} placeholder="Archetípus, hangmagasság, kedvenc/tiltott szavak, példa mondatok, DO/DON'T..." />
          {voiceOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(voiceOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* COMMUNITY REPLY */}
        <TabsContent value="community" className="space-y-3">
          <Label className="text-xs uppercase">Másold ide a kommenteket / DM-eket (egy/sor vagy szabadon)</Label>
          <Textarea className="rounded-none min-h-[150px]" value={communityInput} onChange={(e) => setCommunityInput(e.target.value)} placeholder="Pl. 1) Mennyibe kerül? 2) Nem jött meg a csomag... 3) Imádom a terméket!" />
          <Button onClick={generateCommunity} disabled={loadingCommunity} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingCommunity ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessagesSquare className="h-4 w-4 mr-2" />}
            {loadingCommunity ? "Válaszok..." : "3 válasz / komment + sentiment + prioritás"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={communityOutput} onChange={(e) => setCommunityOutput(e.target.value)} placeholder="Kategória, sentiment, prioritás, 3 válasz variáns, follow-up..." />
          {communityOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(communityOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* OFFER LAB */}
        <TabsContent value="offer" className="space-y-3">
          <Button onClick={generateOffer} disabled={loadingOffer} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingOffer ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tag className="h-4 w-4 mr-2" />}
            {loadingOffer ? "Offers..." : "5 ajánlat variáns (Alap/Prémium/Flash/Tripwire/VIP)"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={offerOutput} onChange={(e) => setOfferOutput(e.target.value)} placeholder="Bundle-ök, garancia, scarcity, headline, CTA, FAQ, pszichológiai triggers..." />
          {offerOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(offerOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* STORYTELLING */}
        <TabsContent value="story" className="space-y-3">
          <Button onClick={generateStory} disabled={loadingStory} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingStory ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookOpen className="h-4 w-4 mr-2" />}
            {loadingStory ? "Story..." : "5 storytelling variáns + storyboard"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={storyOutput} onChange={(e) => setStoryOutput(e.target.value)} placeholder="Hero's Journey, Before/After, Founder, Relatability, Future pacing..." />
          {storyOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(storyOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* LIVE / WEBINAR */}
        <TabsContent value="live" className="space-y-3">
          <Button onClick={generateLive} disabled={loadingLive} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingLive ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Radio className="h-4 w-4 mr-2" />}
            {loadingLive ? "Forgatókönyv..." : "60 perces live/webinar script + replay drip"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={liveOutput} onChange={(e) => setLiveOutput(e.target.value)} placeholder="Percre lebontott forgatókönyv, pre/in/post promó, replay email sorozat, highlight clipek..." />
          {liveOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(liveOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* COMPLIANCE */}
        <TabsContent value="compliance" className="space-y-3">
          <Label className="text-xs uppercase">Ellenőrizendő copy / hirdetés / poszt szövege</Label>
          <Textarea className="rounded-none min-h-[150px]" value={complianceInput} onChange={(e) => setComplianceInput(e.target.value)} placeholder="Másold ide a szöveget jogi átvilágításra (Fttv, GVH, GDPR, platform policy)..." />
          <Button onClick={generateCompliance} disabled={loadingCompliance} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingCompliance ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            {loadingCompliance ? "Ellenőrzés..." : "Jogi/compliance check + javított verzió"}
          </Button>
          <Textarea className="rounded-none min-h-[500px] font-mono text-xs" value={complianceOutput} onChange={(e) => setComplianceOutput(e.target.value)} placeholder="Kockázat szint, részletes vizsgálat, javított copy, hivatkozások, max bírság, checklist..." />
          {complianceOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(complianceOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* AD VAULT */}
        <TabsContent value="adVault" className="space-y-3">
          <Button onClick={generateAdVault} disabled={loadingAdVault} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingAdVault ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Vault className="h-4 w-4 mr-2" />}
            {loadingAdVault ? "Generálás..." : `50 kész ${platform.label} hirdetésszöveg (10 framework × 5)`}
          </Button>
          <Textarea className="rounded-none min-h-[600px] font-mono text-xs" value={adVaultOutput} onChange={(e) => setAdVaultOutput(e.target.value)} placeholder="50 hirdetés: PAS, AIDA, BAB, 4U, FAB, QUEST, STAR, listicle, kérdés, social proof — mindegyik 3 hosszban + CTA + várható CTR..." />
          {adVaultOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(adVaultOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* CREATIVE BRIEF */}
        <TabsContent value="creativeBrief" className="space-y-3">
          <Button onClick={generateCreativeBrief} disabled={loadingCreativeBrief} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingCreativeBrief ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-2" />}
            {loadingCreativeBrief ? "Brief..." : "5 kreatív koncepció + storyboard + shot list"}
          </Button>
          <Textarea className="rounded-none min-h-[600px] font-mono text-xs" value={creativeBriefOutput} onChange={(e) => setCreativeBriefOutput(e.target.value)} placeholder="5 koncepció, storyboard 6 jelenetre, prop/talent/zene/grade/CTA + spec + shot list CSV..." />
          {creativeBriefOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(creativeBriefOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* AUDIENCE */}
        <TabsContent value="audience" className="space-y-3">
          <Button onClick={generateAudience} disabled={loadingAudience} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingAudience ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crosshair className="h-4 w-4 mr-2" />}
            {loadingAudience ? "Audience..." : "10 kész célközönség (cold/warm/hot) – Ads Manager szintig"}
          </Button>
          <Textarea className="rounded-none min-h-[600px] font-mono text-xs" value={audienceOutput} onChange={(e) => setAudienceOutput(e.target.value)} placeholder="10 audience pontos érdeklődéssel, mérettel, CPM/CPC/CTR sávval, exclude-okkal, daily budget-tel..." />
          {audienceOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(audienceOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* RETARGETING */}
        <TabsContent value="retarget" className="space-y-3">
          <Button onClick={generateRetarget} disabled={loadingRetarget} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingRetarget ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Repeat className="h-4 w-4 mr-2" />}
            {loadingRetarget ? "Funnel..." : "7-touch retargeting szekvencia (T+1 → T+14)"}
          </Button>
          <Textarea className="rounded-none min-h-[600px] font-mono text-xs" value={retargetOutput} onChange={(e) => setRetargetOutput(e.target.value)} placeholder="7 lépcsős sorozat: reminder → social proof → objection → bonus → scarcity → discount → win-back, mindegyikhez kész copy + budget..." />
          {retargetOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(retargetOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* PIXEL */}
        <TabsContent value="pixel" className="space-y-3">
          <Button onClick={generatePixel} disabled={loadingPixel} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingPixel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
            {loadingPixel ? "Setup..." : "Teljes Pixel + Conversions API + GA4 + GDPR setup"}
          </Button>
          <Textarea className="rounded-none min-h-[600px] font-mono text-xs" value={pixelOutput} onChange={(e) => setPixelOutput(e.target.value)} placeholder="Standard + custom események, CAPI server-side kód, Consent Mode v2, tesztelés, attribúció..." />
          {pixelOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(pixelOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* BUDGET / ROAS */}
        <TabsContent value="budget" className="space-y-3">
          <Label className="text-xs uppercase">Havi keret + cél ROAS (opcionális)</Label>
          <Input className="rounded-none" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} placeholder="pl. 500.000 HUF/hó, cél ROAS 3.5, AOV 18.000 Ft" />
          <Button onClick={generateBudget} disabled={loadingBudget} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingBudget ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
            {loadingBudget ? "Optimalizálás..." : "Budget allokáció + KPI célok + 30 napos scaling roadmap"}
          </Button>
          <Textarea className="rounded-none min-h-[600px] font-mono text-xs" value={budgetOutput} onChange={(e) => setBudgetOutput(e.target.value)} placeholder="TOFU/MOFU/BOFU split, CBO vs ABO, KPI benchmark, scaling roadmap, kill criteria, 30 napos terv..." />
          {budgetOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(budgetOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* AD POLICY SCAN */}
        <TabsContent value="adCompliance" className="space-y-3">
          <Label className="text-xs uppercase">Hirdetés szövege (scan-elésre)</Label>
          <Textarea className="rounded-none min-h-[150px]" value={adComplianceInput} onChange={(e) => setAdComplianceInput(e.target.value)} placeholder="Másold ide a teljes hirdetést (headline + primary text + CTA)..." />
          <Button onClick={generateAdCompliance} disabled={loadingAdCompliance} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingAdCompliance ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanLine className="h-4 w-4 mr-2" />}
            {loadingAdCompliance ? "Scan..." : `${platform.label} Ads policy scan + javított verzió + appeal`}
          </Button>
          <Textarea className="rounded-none min-h-[600px] font-mono text-xs" value={adComplianceOutput} onChange={(e) => setAdComplianceOutput(e.target.value)} placeholder="Risk score, policy violations, javított hirdetés, alternatív hookok, account rizikó, appeal template, checklist..." />
          {adComplianceOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(adComplianceOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* AD SPY */}
        <TabsContent value="adSpy" className="space-y-3">
          <Label className="text-xs uppercase">Versenytárs nevek / Ad Library URL-ek (opcionális)</Label>
          <Input className="rounded-none" value={adSpyInput} onChange={(e) => setAdSpyInput(e.target.value)} placeholder="pl. Answear, About You, Aboutyou.hu, Mango..." />
          <Button onClick={generateAdSpy} disabled={loadingAdSpy} className="w-full rounded-none uppercase tracking-wider font-bold">
            {loadingAdSpy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Telescope className="h-4 w-4 mr-2" />}
            {loadingAdSpy ? "Spy..." : "Versenytárs hirdetés dekódolás + támadási terv + swipe file"}
          </Button>
          <Textarea className="rounded-none min-h-[600px] font-mono text-xs" value={adSpyOutput} onChange={(e) => setAdSpyOutput(e.target.value)} placeholder="3-5 versenytárs × 5 hirdetés elemzés, közös minták, 5 angle a réseikbe, swipe file..." />
          {adSpyOutput && <Button size="sm" variant="outline" className="rounded-none uppercase text-xs" onClick={() => copy(adSpyOutput)}><Copy className="h-3 w-3 mr-1" /> Másolás</Button>}
        </TabsContent>

        {/* VIDEO EDITOR */}
        <TabsContent value="videoeditor" className="space-y-3">
          <AdminVideoEditor platformLabel={platform.label} defaultAspect={platform.imageAspect} />
        </TabsContent>
      </Tabs>

      {/* HISTORY */}
      {history.length > 0 && (
        <div className="border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
              <Save className="h-4 w-4" /> Korábbi generálások ({history.length})
            </div>
            <Button size="sm" variant="ghost" className="rounded-none uppercase text-xs"
              onClick={() => setHistory([])}>
              <Trash2 className="h-3 w-3 mr-1" /> Törlés
            </Button>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {history.slice(0, 15).map((h, i) => (
              <div key={i} className="border p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <Badge className="rounded-none text-[10px] uppercase">{h.kind}</Badge>
                  <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleString("hu-HU")}</span>
                </div>
                {h.imageBase64 && <img src={h.imageBase64} alt="" className="max-h-32 border my-1" />}
                <pre className="whitespace-pre-wrap font-mono text-[10px] line-clamp-4">{h.text}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlatformStudio;

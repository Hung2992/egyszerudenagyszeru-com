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
} from "lucide-react";

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
        <TabsList className="rounded-none w-full grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 h-auto">
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

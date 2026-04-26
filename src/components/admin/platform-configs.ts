import AdminPlatformStudio, { type PlatformConfig } from "./AdminPlatformStudio";
import {
  Facebook, Instagram, Youtube, Music2,
  Search as SearchIcon, Image as ImageIcon, Linkedin, Twitter,
} from "lucide-react";

export const FACEBOOK_PLATFORM: PlatformConfig = {
  key: "facebook", label: "Facebook", icon: Facebook, accentClass: "text-blue-500",
  bestTime: "13:00–16:00 és 19:00–21:00", bestDays: "Kedd–Csütörtök, Vasárnap",
  audienceAge: "25–55 év (fő: 35–45)",
  maxChars: 500, hashtagCount: "1–3 db", videoLength: "60–90 mp",
  tone: "Barátságos, közösségi, történet-vezérelt", imageAspect: "1:1, 1.91:1",
  formats: ["Feed", "Story", "Reel", "Reklám (Ads)", "Group post", "Marketplace"],
};

export const INSTAGRAM_PLATFORM: PlatformConfig = {
  key: "instagram", label: "Instagram", icon: Instagram, accentClass: "text-pink-500",
  bestTime: "11:00–13:00 és 19:00–21:00", bestDays: "Hétfő, Szerda, Péntek",
  audienceAge: "18–34 év (fő: 25–34)",
  maxChars: 2200, hashtagCount: "8–15 db", videoLength: "15–30 mp Reel",
  tone: "Esztétikus, vizuális, inspiráló", imageAspect: "1:1, 4:5, 9:16",
  formats: ["Feed", "Reel", "Story", "Carousel", "IGTV", "Reklám (Ads)"],
};

export const TIKTOK_PLATFORM: PlatformConfig = {
  key: "tiktok", label: "TikTok", icon: Music2, accentClass: "text-fuchsia-500",
  bestTime: "06:00–10:00, 19:00–23:00", bestDays: "Kedd, Csütörtök, Péntek",
  audienceAge: "16–28 év (fő: 18–24)",
  maxChars: 300, hashtagCount: "3–5 db (#fyp #foryou)", videoLength: "15–60 mp",
  tone: "Pörgős, hook az első 2 mp-ben, trendi, humoros", imageAspect: "9:16",
  formats: ["FYP videó", "Spark Ad", "TopView", "Brand Takeover", "Hashtag Challenge"],
};

export const YOUTUBE_PLATFORM: PlatformConfig = {
  key: "youtube", label: "YouTube", icon: Youtube, accentClass: "text-red-500",
  bestTime: "15:00–17:00 hétköznap, 09:00–11:00 hétvégén", bestDays: "Csütörtök–Szombat",
  audienceAge: "18–49 év",
  maxChars: 5000, hashtagCount: "3–5 db", videoLength: "8–15 perc",
  tone: "Részletes, oktató, érték-fókuszú", imageAspect: "16:9 (thumbnail)",
  formats: ["Long-form videó", "Shorts", "Pre-roll Ad", "Bumper Ad", "Live"],
};

export const YOUTUBE_SHORTS_PLATFORM: PlatformConfig = {
  key: "youtube_shorts", label: "YouTube Shorts", icon: Youtube, accentClass: "text-red-400",
  bestTime: "12:00–15:00 és 20:00–22:00", bestDays: "Hétfő–Péntek",
  audienceAge: "16–35 év",
  maxChars: 100, hashtagCount: "#Shorts kötelező + 2-3", videoLength: "15–60 mp vertikális",
  tone: "Hook 1 mp-ben, gyors vágás, NAGY szöveg", imageAspect: "9:16",
  formats: ["Shorts", "Shorts Ad"],
};

export const GOOGLE_ADS_PLATFORM: PlatformConfig = {
  key: "google_ads", label: "Google Ads", icon: SearchIcon, accentClass: "text-emerald-500",
  bestTime: "Folyamatos (auto-bid)", bestDays: "Hétköznap erősebb",
  audienceAge: "Vásárlási szándék-alapú",
  maxChars: 90, hashtagCount: "Nincs", videoLength: "—",
  tone: "Tömör, USP-fókuszú, erős CTA", imageAspect: "1:1, 1.91:1, 4:5",
  formats: ["Search Ad", "Display Ad", "Performance Max", "Shopping Ad", "YouTube Ad", "Discovery Ad"],
};

export const PINTEREST_PLATFORM: PlatformConfig = {
  key: "pinterest", label: "Pinterest", icon: ImageIcon, accentClass: "text-rose-500",
  bestTime: "20:00–23:00", bestDays: "Szombat, Vasárnap",
  audienceAge: "25–44 év (fő: nők)",
  maxChars: 500, hashtagCount: "5–10 db (kulcsszó)", videoLength: "6–15 mp Idea Pin",
  tone: "Inspiráló, vizuális, DIY/lifestyle", imageAspect: "2:3 (1000x1500)",
  formats: ["Standard Pin", "Idea Pin", "Video Pin", "Shopping Pin", "Promoted Pin"],
};

export const LINKEDIN_PLATFORM: PlatformConfig = {
  key: "linkedin", label: "LinkedIn", icon: Linkedin, accentClass: "text-blue-700",
  bestTime: "07:00–09:00 és 17:00–18:00", bestDays: "Kedd–Csütörtök",
  audienceAge: "25–55 év (B2B)",
  maxChars: 3000, hashtagCount: "3–5 db", videoLength: "30–90 mp",
  tone: "Szakmai, érték-vezérelt, thought leadership", imageAspect: "1.91:1, 1:1",
  formats: ["Feed post", "Article", "Video", "Sponsored Content", "InMail"],
};

export const TWITTER_PLATFORM: PlatformConfig = {
  key: "twitter", label: "X (Twitter)", icon: Twitter, accentClass: "text-foreground",
  bestTime: "09:00–11:00 és 19:00–22:00", bestDays: "Hétfő–Csütörtök",
  audienceAge: "25–45 év",
  maxChars: 280, hashtagCount: "1–2 db", videoLength: "15–45 mp",
  tone: "Tömör, szellemes, aktuális", imageAspect: "16:9, 1:1",
  formats: ["Tweet", "Thread", "Promoted Post", "Video Tweet"],
};

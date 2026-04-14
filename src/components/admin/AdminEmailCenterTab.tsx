import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Mail, Plus, Trash2, Save, Send, Eye, Clock, BarChart3,
  Zap, FileText, Users, TrendingUp, ArrowUpRight, Pencil,
  Copy, ToggleLeft, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  ChevronDown, ChevronRight, Timer, GitBranch, Workflow, Target,
  Calendar, ArrowDown, Play, Pause, Settings, Sparkles, Filter,
  MousePointerClick, MailOpen, Split, Repeat, Heart, Star, Gift,
  ShoppingBag, Crown, Flame
} from "lucide-react";

// ============== BRAND EMAIL WRAPPER ==============
const brandWrap = (content: string, opts?: { headerImg?: boolean; personalGreeting?: string }) => {
  const greeting = opts?.personalGreeting || "";
  return `<!DOCTYPE html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:#050505;font-family:'Space Grotesk',Arial,sans-serif;">
<!-- Outer wrapper with brand texture -->
<div style="background:#050505;background-image:url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 20h40M20 0v40" stroke="#e6a817" stroke-width="0.15" opacity="0.08"/></pattern></defs><rect fill="url(%23g)" width="400" height="400"/></svg>`)}');min-height:100%;padding:0;">
<!-- Preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Egyszerű de Nagyszerű – Streetwear, ami beszél.</div>
<!-- Top gold accent bar -->
<div style="background:linear-gradient(90deg,#e6a817,#f5d56b,#e6a817);height:3px;width:100%;"></div>
<!-- Brand header -->
<div style="max-width:600px;margin:0 auto;padding:32px 30px 0;">
<table width="100%" cellpadding="0" cellspacing="0" style="border:0;"><tr>
<td><div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:3px;text-transform:uppercase;">EGYSZERŰ<span style="color:#e6a817;"> DE </span>NAGYSZERŰ</div><div style="font-size:9px;color:#666;letter-spacing:4px;text-transform:uppercase;margin-top:2px;">STREETWEAR COLLECTIVE • EST. 2024</div></td>
<td align="right"><div style="width:36px;height:36px;border:2px solid #e6a817;display:inline-flex;align-items:center;justify-content:center;"><span style="color:#e6a817;font-weight:700;font-size:16px;">E</span></div></td>
</tr></table>
</div>
${greeting ? `<div style="max-width:600px;margin:0 auto;padding:24px 30px 0;"><p style="font-size:14px;color:#888;margin:0;">Szia <strong style="color:#e6a817;">${greeting}</strong> 👋</p></div>` : ""}
<!-- Content -->
<div style="max-width:600px;margin:0 auto;padding:24px 30px 40px;">
${content}
</div>
<!-- Footer -->
<div style="max-width:600px;margin:0 auto;padding:0 30px 40px;">
<div style="border-top:1px solid #1a1a1a;padding-top:24px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-size:11px;color:#444;">© 2024 Egyszerű de Nagyszerű<br><span style="color:#333;">Budapest, Hungary</span></td>
<td align="right" style="font-size:11px;">
<a href="#" style="color:#666;text-decoration:none;margin-left:16px;">Instagram</a>
<a href="#" style="color:#666;text-decoration:none;margin-left:16px;">TikTok</a>
</td>
</tr></table>
<p style="font-size:10px;color:#333;margin-top:16px;text-align:center;">Ha nem szeretnél több üzenetet kapni, <a href="#" style="color:#555;text-decoration:underline;">kattints ide</a>.</p>
</div>
</div>
<!-- Bottom gold accent -->
<div style="background:linear-gradient(90deg,transparent,#e6a817,transparent);height:1px;width:100%;margin-top:0;"></div>
</div></body></html>`;
};

// ============== TYPES ==============
interface EmailAutomation {
  id: string;
  name: string;
  trigger_type: string;
  delay_minutes: number;
  subject: string;
  body_html: string;
  is_active: boolean;
  sent_count: number;
  created_at: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  content_html: string | null;
  from_name: string | null;
  from_email: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  open_rate: number;
  click_rate: number;
  tags: string[] | null;
  created_at: string;
}

interface DashboardStats {
  totalAutomations: number;
  activeAutomations: number;
  totalSent: number;
  totalCampaigns: number;
  avgOpenRate: number;
  avgClickRate: number;
}

interface SequenceStep {
  id: string;
  type: "email" | "wait" | "condition" | "ab_test";
  subject?: string;
  body_html?: string;
  wait_type?: "delay" | "specific_time" | "day_of_week";
  delay_minutes?: number;
  specific_hour?: number;
  specific_day?: number;
  condition_type?: "opened" | "clicked" | "not_opened" | "purchased" | "visited";
  condition_ref_step?: string;
  variant_a_subject?: string;
  variant_b_subject?: string;
  variant_a_html?: string;
  variant_b_html?: string;
  split_pct?: number;
}

interface EmailSequence {
  id: string;
  name: string;
  trigger_type: string;
  is_active: boolean;
  steps: SequenceStep[];
  stats: { sent: number; opened: number; clicked: number; converted: number };
}

// ============== TRIGGER DEFINITIONS ==============
const TRIGGERS = [
  { value: "welcome", label: "Üdvözlő e-mail", description: "Regisztráció után automatikusan", icon: "👋", category: "lifecycle" },
  { value: "order_completed", label: "Rendelés visszaigazolás", description: "Sikeres rendelés után", icon: "✅", category: "transaction" },
  { value: "order_shipped", label: "Szállítási értesítés", description: "Csomag feladásakor", icon: "📦", category: "transaction" },
  { value: "cart_abandoned", label: "Kosárelhagyás", description: "Ha a vásárló elhagyja a kosarat", icon: "🛒", category: "recovery" },
  { value: "review_request", label: "Vélemény kérés", description: "Kézbesítés után X nappal", icon: "⭐", category: "engagement" },
  { value: "reengagement", label: "Visszatérő vásárló", description: "30+ nap inaktivitás után", icon: "🔄", category: "recovery" },
  { value: "birthday", label: "Születésnapi kedvezmény", description: "A vásárló születésnapján", icon: "🎂", category: "lifecycle" },
  { value: "price_drop", label: "Árcsökkenés értesítő", description: "Kívánságlista termék ára csökken", icon: "📉", category: "engagement" },
  { value: "back_in_stock", label: "Újra készleten", description: "Várt termék újra elérhető", icon: "🔔", category: "engagement" },
  { value: "loyalty_reward", label: "Hűségpont jutalom", description: "Hűségszint elérésekor", icon: "🏆", category: "lifecycle" },
  { value: "first_purchase", label: "Első vásárlás", description: "Az első sikeres rendelés után", icon: "🎉", category: "lifecycle" },
  { value: "repeat_purchase", label: "Visszatérő vásárlás", description: "2+ rendelés után", icon: "🔁", category: "lifecycle" },
  { value: "wishlist_reminder", label: "Kívánságlista emlékeztető", description: "7 napja hozzáadott termék", icon: "💫", category: "engagement" },
  { value: "post_purchase_upsell", label: "Utánvásárlás ajánlat", description: "Vásárlás után 3 nappal", icon: "🎁", category: "engagement" },
  { value: "vip_exclusive", label: "VIP exkluzív", description: "Csak hűséges vásárlóknak", icon: "👑", category: "lifecycle" },
  { value: "new_collection", label: "Új kollekció", description: "Új kollekció megjelenésekor", icon: "🔥", category: "engagement" },
];

const TRIGGER_CATEGORIES = [
  { value: "lifecycle", label: "Életciklus", icon: Users },
  { value: "transaction", label: "Tranzakció", icon: CheckCircle },
  { value: "recovery", label: "Visszaszerzés", icon: Repeat },
  { value: "engagement", label: "Elköteleződés", icon: Target },
];

// ============== PREMIUM BRANDED TEMPLATES ==============
const emailContent = {
  welcome: `<div style="text-align:center;margin-bottom:32px;">
<div style="font-size:48px;margin-bottom:8px;">🖤</div>
<h1 style="font-size:32px;font-weight:700;color:#ffffff;margin:0 0 4px;letter-spacing:2px;text-transform:uppercase;">ÜDVÖZLÜNK A<br><span style="color:#e6a817;">CSALÁDBAN</span></h1>
<div style="width:60px;height:3px;background:#e6a817;margin:16px auto;"></div>
</div>
<p style="font-size:15px;line-height:1.7;color:#aaa;text-align:center;margin:0 0 8px;">Nem csak egy webshophoz csatlakoztál.</p>
<p style="font-size:15px;line-height:1.7;color:#aaa;text-align:center;margin:0 0 24px;">Egy <strong style="color:#fff;">közösséghez</strong>, ahol a stílus beszél.</p>
<div style="background:#0d0d0d;border:1px solid #1a1a1a;padding:24px;margin:24px 0;text-align:center;">
<p style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:3px;margin:0 0 8px;">AMIT KAPSZ</p>
<table width="100%" cellpadding="8" cellspacing="0" style="border:0;">
<tr><td style="text-align:center;border-right:1px solid #1a1a1a;"><div style="font-size:20px;">🔥</div><p style="font-size:11px;color:#999;margin:4px 0 0;">Korai hozzáférés<br>új kollekciókhoz</p></td>
<td style="text-align:center;border-right:1px solid #1a1a1a;"><div style="font-size:20px;">🎁</div><p style="font-size:11px;color:#999;margin:4px 0 0;">Exkluzív<br>kedvezmények</p></td>
<td style="text-align:center;"><div style="font-size:20px;">👑</div><p style="font-size:11px;color:#999;margin:4px 0 0;">VIP státusz<br>automatikusan</p></td></tr>
</table>
</div>
<div style="text-align:center;margin-top:32px;">
<a href="#" style="display:inline-block;padding:16px 48px;background:#e6a817;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:2px;">FEDEZD FEL A KOLLEKCIÓT →</a>
</div>`,

  order_completed: `<div style="text-align:center;margin-bottom:24px;">
<div style="width:64px;height:64px;border:2px solid #e6a817;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;"><span style="font-size:28px;">✓</span></div>
<h1 style="font-size:28px;font-weight:700;color:#ffffff;margin:0 0 4px;letter-spacing:1px;">RENDELÉS <span style="color:#e6a817;">MEGERŐSÍTVE</span></h1>
<div style="width:60px;height:3px;background:#e6a817;margin:12px auto;"></div>
<p style="font-size:13px;color:#666;margin:0;">Rendelésszám: <strong style="color:#e6a817;">#{orderId}</strong></p>
</div>
<div style="background:#0d0d0d;border:1px solid #1a1a1a;padding:24px;margin:24px 0;">
<table width="100%" cellpadding="0" cellspacing="0" style="border:0;">
<tr><td style="padding:8px 0;border-bottom:1px solid #111;"><span style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Összeg</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #111;"><span style="color:#e6a817;font-size:20px;font-weight:700;">{total} Ft</span></td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #111;"><span style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Szállítás</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #111;"><span style="color:#aaa;font-size:14px;">Ingyenes</span></td></tr>
<tr><td style="padding:8px 0;"><span style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Státusz</span></td><td align="right" style="padding:8px 0;"><span style="color:#4ade80;font-size:14px;font-weight:600;">● Feldolgozás alatt</span></td></tr>
</table>
</div>
<p style="font-size:14px;color:#888;line-height:1.6;text-align:center;">Amint feladjuk a csomagod, küldünk egy nyomkövetési számot. Addig is – <strong style="color:#fff;">köszönjük a bizalmat</strong>.</p>
<div style="text-align:center;margin-top:28px;">
<a href="#" style="display:inline-block;padding:14px 40px;background:#ffffff;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:2px;">RENDELÉS KÖVETÉSE →</a>
</div>`,

  order_shipped: `<div style="text-align:center;margin-bottom:24px;">
<div style="font-size:48px;margin-bottom:8px;">📦</div>
<h1 style="font-size:28px;font-weight:700;color:#ffffff;margin:0;letter-spacing:1px;">ÚTON VAN <span style="color:#e6a817;">HOZZÁD</span></h1>
<div style="width:60px;height:3px;background:#e6a817;margin:12px auto;"></div>
</div>
<!-- Progress bar -->
<div style="background:#0d0d0d;border:1px solid #1a1a1a;padding:24px;margin:20px 0;">
<div style="display:flex;justify-content:space-between;margin-bottom:12px;">
<div style="text-align:center;flex:1;"><div style="width:24px;height:24px;background:#e6a817;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;color:#000;font-weight:700;">✓</div><p style="font-size:10px;color:#e6a817;margin:4px 0 0;">Megrendelve</p></div>
<div style="text-align:center;flex:1;"><div style="width:24px;height:24px;background:#e6a817;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;color:#000;font-weight:700;">✓</div><p style="font-size:10px;color:#e6a817;margin:4px 0 0;">Feladva</p></div>
<div style="text-align:center;flex:1;"><div style="width:24px;height:24px;background:#333;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;color:#666;">3</div><p style="font-size:10px;color:#666;margin:4px 0 0;">Kézbesítve</p></div>
</div>
<div style="background:#1a1a1a;height:4px;border-radius:2px;"><div style="background:linear-gradient(90deg,#e6a817,#f5d56b);height:4px;border-radius:2px;width:66%;"></div></div>
</div>
<div style="background:#0d0d0d;border:1px solid #1a1a1a;padding:20px;margin:16px 0;">
<table width="100%" cellpadding="0" cellspacing="0" style="border:0;">
<tr><td style="padding:6px 0;"><span style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Nyomkövetés</span></td><td align="right" style="padding:6px 0;"><strong style="color:#e6a817;font-size:14px;letter-spacing:1px;">{trackingNumber}</strong></td></tr>
<tr><td style="padding:6px 0;"><span style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Várható kézbesítés</span></td><td align="right" style="padding:6px 0;"><strong style="color:#fff;font-size:14px;">{deliveryDate}</strong></td></tr>
</table>
</div>
<div style="text-align:center;margin-top:28px;">
<a href="#" style="display:inline-block;padding:14px 40px;background:#ffffff;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:2px;">CSOMAG KÖVETÉSE →</a>
</div>`,

  cart_abandoned_1: `<div style="text-align:center;margin-bottom:24px;">
<div style="font-size:48px;margin-bottom:8px;">👀</div>
<h1 style="font-size:28px;font-weight:700;color:#ffffff;margin:0;letter-spacing:1px;">VALAMIT <span style="color:#e6a817;">OTTFELEJTETTÉL</span></h1>
<div style="width:60px;height:3px;background:#e6a817;margin:12px auto;"></div>
</div>
<p style="font-size:15px;color:#aaa;text-align:center;line-height:1.6;margin:0 0 24px;">A kosaradban várakoznak a kiválasztott darabok. Mások is figyelik őket – ne maradj le!</p>
<div style="background:#0d0d0d;border:1px solid #e6a817;border-left:3px solid #e6a817;padding:20px;margin:20px 0;">
<p style="font-size:13px;color:#e6a817;font-weight:600;margin:0;">⚡ A kosár tartalma 24 óráig van fenntartva</p>
</div>
<div style="text-align:center;margin-top:32px;">
<a href="#" style="display:inline-block;padding:16px 48px;background:#e6a817;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:2px;">VISSZA A KOSÁRHOZ →</a>
<p style="font-size:11px;color:#555;margin-top:12px;">Egy kattintás, és a tiéd.</p>
</div>`,

  cart_abandoned_2: `<div style="text-align:center;margin-bottom:24px;">
<div style="font-size:48px;margin-bottom:8px;">⏳</div>
<h1 style="font-size:28px;font-weight:700;color:#ffffff;margin:0;letter-spacing:1px;">UTOLSÓ <span style="color:#e6a817;">ESÉLY</span></h1>
<div style="width:60px;height:3px;background:#e6a817;margin:12px auto;"></div>
</div>
<p style="font-size:15px;color:#aaa;text-align:center;line-height:1.6;">A kosarad hamarosan lejár. De hoztunk valamit, ami segít dönteni:</p>
<div style="background:#0d0d0d;border:2px solid #e6a817;padding:28px;margin:24px 0;text-align:center;">
<p style="font-size:10px;color:#e6a817;text-transform:uppercase;letter-spacing:4px;margin:0 0 8px;">EXKLUZÍV KUPONKÓD</p>
<p style="font-size:42px;font-weight:700;color:#e6a817;margin:0;letter-spacing:4px;text-shadow:0 0 20px rgba(230,168,23,0.3);">VISSZAVAROK10</p>
<p style="font-size:13px;color:#999;margin:8px 0 0;">10% kedvezmény a kosár tartalmára</p>
<p style="font-size:11px;color:#555;margin:4px 0 0;">Érvényes: 48 óráig</p>
</div>
<div style="text-align:center;margin-top:28px;">
<a href="#" style="display:inline-block;padding:16px 48px;background:#e6a817;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:2px;">MEGRENDELEM MOST →</a>
</div>`,

  birthday: `<div style="text-align:center;margin-bottom:24px;">
<div style="font-size:56px;margin-bottom:8px;">🎂</div>
<h1 style="font-size:32px;font-weight:700;color:#ffffff;margin:0;letter-spacing:1px;">BOLDOG<br><span style="color:#e6a817;font-size:40px;">SZÜLETÉSNAPOT!</span></h1>
<div style="width:80px;height:3px;background:linear-gradient(90deg,#e6a817,#f5d56b);margin:16px auto;"></div>
</div>
<p style="font-size:16px;color:#ccc;text-align:center;line-height:1.7;margin:0 0 24px;">Ma a <strong style="color:#fff;">Te napod</strong>. Mi is hoztunk egy kis meglepetést! 🎁</p>
<div style="background:linear-gradient(135deg,#0d0d0d,#1a1508);border:2px solid #e6a817;padding:32px;margin:24px 0;text-align:center;position:relative;">
<div style="position:absolute;top:-1px;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#e6a817,transparent);"></div>
<p style="font-size:10px;color:#e6a817;text-transform:uppercase;letter-spacing:4px;margin:0 0 12px;">🎁 SZÜLETÉSNAPI AJÁNDÉK</p>
<p style="font-size:56px;font-weight:700;color:#e6a817;margin:0;letter-spacing:2px;text-shadow:0 0 30px rgba(230,168,23,0.4);">-25%</p>
<p style="font-size:14px;color:#fff;font-weight:600;margin:8px 0 4px;">MINDENRE – 7 NAPIG</p>
<div style="margin:16px auto 0;display:inline-block;background:#0a0a0a;border:1px solid #333;padding:8px 24px;">
<p style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">KUPONKÓD</p>
<p style="font-size:28px;font-weight:700;color:#e6a817;margin:0;letter-spacing:4px;">BDAY25</p>
</div>
</div>
<div style="text-align:center;margin-top:28px;">
<a href="#" style="display:inline-block;padding:16px 48px;background:#e6a817;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:2px;">AJÁNDÉKOM BEVÁLTÁSA →</a>
</div>`,

  review_request: `<div style="text-align:center;margin-bottom:24px;">
<div style="font-size:48px;margin-bottom:8px;">⭐</div>
<h1 style="font-size:28px;font-weight:700;color:#ffffff;margin:0;letter-spacing:1px;">MIT <span style="color:#e6a817;">GONDOLSZ?</span></h1>
<div style="width:60px;height:3px;background:#e6a817;margin:12px auto;"></div>
</div>
<p style="font-size:15px;color:#aaa;text-align:center;line-height:1.7;margin:0 0 24px;">Reméljük, elégedett vagy a rendeléssel! A <strong style="color:#fff;">véleményed</strong> segít nekünk jobbnak lenni, és másoknak választani.</p>
<div style="display:flex;justify-content:center;gap:8px;margin:24px 0;">
<span style="font-size:32px;cursor:pointer;">⭐</span>
<span style="font-size:32px;cursor:pointer;">⭐</span>
<span style="font-size:32px;cursor:pointer;">⭐</span>
<span style="font-size:32px;cursor:pointer;">⭐</span>
<span style="font-size:32px;cursor:pointer;">⭐</span>
</div>
<div style="background:#0d0d0d;border:1px solid #1a1a1a;padding:20px;margin:20px 0;text-align:center;">
<p style="font-size:13px;color:#e6a817;font-weight:600;margin:0;">🏆 Minden véleményért <strong>50 hűségpontot</strong> kapsz!</p>
</div>
<div style="text-align:center;margin-top:28px;">
<a href="#" style="display:inline-block;padding:14px 40px;background:#ffffff;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:2px;">VÉLEMÉNY ÍRÁSA →</a>
</div>`,

  reengagement: `<div style="text-align:center;margin-bottom:24px;">
<div style="font-size:48px;margin-bottom:8px;">🖤</div>
<h1 style="font-size:28px;font-weight:700;color:#ffffff;margin:0;letter-spacing:1px;">RÉG <span style="color:#e6a817;">LÁTTUNK</span></h1>
<div style="width:60px;height:3px;background:#e6a817;margin:12px auto;"></div>
</div>
<p style="font-size:15px;color:#aaa;text-align:center;line-height:1.7;margin:0 0 24px;">Hiányzol nekünk! Közben sokat változtunk – <strong style="color:#fff;">új kollekciók, új stílusok</strong>, és egy ajánlat, ami csak neked szól.</p>
<div style="background:#0d0d0d;border:2px solid #e6a817;padding:28px;margin:24px 0;text-align:center;">
<p style="font-size:10px;color:#e6a817;text-transform:uppercase;letter-spacing:4px;margin:0 0 8px;">VISSZATÉRŐ KUPON</p>
<p style="font-size:42px;font-weight:700;color:#e6a817;margin:0;letter-spacing:4px;text-shadow:0 0 20px rgba(230,168,23,0.3);">COMEBACK20</p>
<p style="font-size:13px;color:#999;margin:8px 0 0;">20% kedvezmény az egész boltban</p>
<p style="font-size:11px;color:#555;margin:4px 0 0;">48 óráig érvényes – ne hagyd ki!</p>
</div>
<div style="text-align:center;margin-top:28px;">
<a href="#" style="display:inline-block;padding:16px 48px;background:#e6a817;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:2px;">MEGNÉZEM AZ ÚJDONSÁGOKAT →</a>
</div>`,

  price_drop: `<div style="text-align:center;margin-bottom:24px;">
<div style="font-size:48px;margin-bottom:8px;">📉</div>
<h1 style="font-size:28px;font-weight:700;color:#ffffff;margin:0;letter-spacing:1px;">LEESETT <span style="color:#e6a817;">AZ ÁRA!</span></h1>
<div style="width:60px;height:3px;background:#e6a817;margin:12px auto;"></div>
</div>
<p style="font-size:15px;color:#aaa;text-align:center;line-height:1.6;margin:0 0 24px;">A kívánságlistádon lévő <strong style="color:#fff;">{productName}</strong> most kedvezőbb áron elérhető!</p>
<div style="background:#0d0d0d;border:1px solid #1a1a1a;padding:24px;margin:20px 0;text-align:center;">
<p style="font-size:16px;text-decoration:line-through;color:#555;margin:0;">{oldPrice} Ft</p>
<p style="font-size:36px;font-weight:700;color:#e6a817;margin:4px 0;letter-spacing:1px;">{newPrice} Ft</p>
<div style="background:linear-gradient(90deg,transparent,#e6a817,transparent);height:1px;margin:16px 0;"></div>
<p style="font-size:12px;color:#888;margin:0;">⚡ Az ár bármikor változhat – ne hagyd ki!</p>
</div>
<div style="text-align:center;margin-top:28px;">
<a href="#" style="display:inline-block;padding:14px 40px;background:#e6a817;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:2px;">MOST MEGVESZEM →</a>
</div>`,

  welcome_style: `<div style="text-align:center;margin-bottom:24px;">
<div style="font-size:48px;margin-bottom:8px;">🔥</div>
<h1 style="font-size:28px;font-weight:700;color:#ffffff;margin:0;letter-spacing:1px;">STÍLUS<br><span style="color:#e6a817;">INSPIRÁCIÓ</span></h1>
<div style="width:60px;height:3px;background:#e6a817;margin:12px auto;"></div>
</div>
<p style="font-size:15px;color:#aaa;text-align:center;line-height:1.7;margin:0 0 24px;">Nézd meg, hogyan hordják <strong style="color:#fff;">mások</strong> a legújabb darabjainkat! Találd meg a saját stílusod.</p>
<div style="background:#0d0d0d;border:1px solid #1a1a1a;padding:20px;margin:20px 0;">
<table width="100%" cellpadding="0" cellspacing="0" style="border:0;">
<tr>
<td style="width:33%;text-align:center;padding:8px;"><div style="background:#111;height:120px;display:flex;align-items:center;justify-content:center;"><span style="font-size:32px;">🧥</span></div><p style="font-size:11px;color:#999;margin:8px 0 0;">Oversized Hoodie</p></td>
<td style="width:33%;text-align:center;padding:8px;"><div style="background:#111;height:120px;display:flex;align-items:center;justify-content:center;"><span style="font-size:32px;">👖</span></div><p style="font-size:11px;color:#999;margin:8px 0 0;">Cargo Pants</p></td>
<td style="width:33%;text-align:center;padding:8px;"><div style="background:#111;height:120px;display:flex;align-items:center;justify-content:center;"><span style="font-size:32px;">🧢</span></div><p style="font-size:11px;color:#999;margin:8px 0 0;">Snapback Cap</p></td>
</tr>
</table>
</div>
<div style="text-align:center;margin-top:28px;">
<a href="#" style="display:inline-block;padding:14px 40px;background:#ffffff;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:2px;">LOOKBOOK MEGTEKINTÉSE →</a>
</div>`,

  first_purchase_coupon: `<div style="text-align:center;margin-bottom:24px;">
<div style="font-size:48px;margin-bottom:8px;">🎁</div>
<h1 style="font-size:28px;font-weight:700;color:#ffffff;margin:0;letter-spacing:1px;">ELSŐ RENDELÉSEDRE<br><span style="color:#e6a817;font-size:36px;">-15%</span></h1>
<div style="width:60px;height:3px;background:#e6a817;margin:12px auto;"></div>
</div>
<p style="font-size:15px;color:#aaa;text-align:center;line-height:1.7;margin:0 0 24px;">Még nem rendeltél nálunk? Ez az ajánlat <strong style="color:#fff;">csak neked</strong> szól!</p>
<div style="background:linear-gradient(135deg,#0d0d0d,#1a1508);border:2px solid #e6a817;padding:28px;margin:24px 0;text-align:center;">
<p style="font-size:10px;color:#e6a817;text-transform:uppercase;letter-spacing:4px;margin:0 0 12px;">KUPONKÓD</p>
<p style="font-size:42px;font-weight:700;color:#e6a817;margin:0;letter-spacing:4px;text-shadow:0 0 20px rgba(230,168,23,0.3);">WELCOME15</p>
<p style="font-size:13px;color:#999;margin:8px 0 0;">Érvényes az első rendelésre</p>
</div>
<div style="text-align:center;margin-top:28px;">
<a href="#" style="display:inline-block;padding:16px 48px;background:#e6a817;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:2px;">VÁSÁRLÁS MOST →</a>
</div>`,
};

// ============== PREDEFINED SEQUENCES ==============
const PREDEFINED_SEQUENCES: Omit<EmailSequence, "id">[] = [
  {
    name: "🛒 Kosárelhagyás – 3 lépéses visszaszerzés",
    trigger_type: "cart_abandoned",
    is_active: false,
    steps: [
      { id: "s1", type: "wait", wait_type: "delay", delay_minutes: 60 },
      { id: "s2", type: "email", subject: "Valamit ottfelejtettél 👀", body_html: brandWrap(emailContent.cart_abandoned_1, { personalGreeting: "{name}" }) },
      { id: "s3", type: "condition", condition_type: "not_opened", condition_ref_step: "s2" },
      { id: "s4", type: "wait", wait_type: "delay", delay_minutes: 1440 },
      { id: "s5", type: "email", subject: "⏳ Utolsó esély + 10% kupon!", body_html: brandWrap(emailContent.cart_abandoned_2, { personalGreeting: "{name}" }) },
    ],
    stats: { sent: 0, opened: 0, clicked: 0, converted: 0 },
  },
  {
    name: "👋 Üdvözlő sorozat – 4 lépés",
    trigger_type: "welcome",
    is_active: false,
    steps: [
      { id: "w1", type: "email", subject: "Üdvözlünk a családban! 🖤", body_html: brandWrap(emailContent.welcome, { personalGreeting: "{name}" }) },
      { id: "w2", type: "wait", wait_type: "delay", delay_minutes: 2880 },
      { id: "w3", type: "email", subject: "🔥 Stílus inspiráció neked", body_html: brandWrap(emailContent.welcome_style, { personalGreeting: "{name}" }) },
      { id: "w4", type: "wait", wait_type: "delay", delay_minutes: 4320 },
      {
        id: "w5", type: "ab_test", split_pct: 50,
        variant_a_subject: "🎁 Első rendelésedre -15%!",
        variant_b_subject: "⚡ Exkluzív ajánlat csak neked – 15% OFF",
        variant_a_html: brandWrap(emailContent.first_purchase_coupon, { personalGreeting: "{name}" }),
        variant_b_html: brandWrap(emailContent.first_purchase_coupon, { personalGreeting: "{name}" }),
      },
    ],
    stats: { sent: 0, opened: 0, clicked: 0, converted: 0 },
  },
  {
    name: "⭐ Vélemény kérés – időzített",
    trigger_type: "review_request",
    is_active: false,
    steps: [
      { id: "r1", type: "wait", wait_type: "delay", delay_minutes: 7200 },
      { id: "r2", type: "email", subject: "Hogy tetszik a rendelésed? ⭐", body_html: brandWrap(emailContent.review_request, { personalGreeting: "{name}" }) },
      { id: "r3", type: "condition", condition_type: "not_opened", condition_ref_step: "r2" },
      { id: "r4", type: "wait", wait_type: "delay", delay_minutes: 4320 },
      { id: "r5", type: "email", subject: "🙏 Egy perc elég – véleményed számít!", body_html: brandWrap(emailContent.review_request, { personalGreeting: "{name}" }) },
    ],
    stats: { sent: 0, opened: 0, clicked: 0, converted: 0 },
  },
  {
    name: "🔄 Visszaszerzés – 30 napos inaktivitás",
    trigger_type: "reengagement",
    is_active: false,
    steps: [
      { id: "re1", type: "email", subject: "Hiányzol nekünk! 🖤", body_html: brandWrap(emailContent.reengagement, { personalGreeting: "{name}" }) },
      { id: "re2", type: "condition", condition_type: "not_opened", condition_ref_step: "re1" },
      { id: "re3", type: "wait", wait_type: "delay", delay_minutes: 10080 },
      {
        id: "re4", type: "ab_test", split_pct: 50,
        variant_a_subject: "🎁 -20% kedvezmény – csak neked!",
        variant_b_subject: "⏰ Utolsó esély: exkluzív 20%!",
        variant_a_html: brandWrap(emailContent.reengagement, { personalGreeting: "{name}" }),
        variant_b_html: brandWrap(emailContent.reengagement, { personalGreeting: "{name}" }),
      },
    ],
    stats: { sent: 0, opened: 0, clicked: 0, converted: 0 },
  },
  {
    name: "🎂 Születésnapi flow",
    trigger_type: "birthday",
    is_active: false,
    steps: [
      { id: "b1", type: "wait", wait_type: "specific_time", specific_hour: 9 },
      { id: "b2", type: "email", subject: "🎂 Boldog születésnapot! Ajándékunk neked!", body_html: brandWrap(emailContent.birthday, { personalGreeting: "{name}" }) },
    ],
    stats: { sent: 0, opened: 0, clicked: 0, converted: 0 },
  },
];

// ============== PREDEFINED SIMPLE TEMPLATES ==============
const PREDEFINED_TEMPLATES = [
  {
    name: "Rendelés visszaigazolás",
    trigger_type: "order_completed",
    subject: "Rendelésed megkaptuk! ✓ #{orderId}",
    body_html: brandWrap(emailContent.order_completed, { personalGreeting: "{name}" }),
    delay_minutes: 0,
  },
  {
    name: "Szállítási értesítés",
    trigger_type: "order_shipped",
    subject: "Csomagod útnak indult! 📦 #{orderId}",
    body_html: brandWrap(emailContent.order_shipped, { personalGreeting: "{name}" }),
    delay_minutes: 0,
  },
  {
    name: "Árcsökkenés értesítő",
    trigger_type: "price_drop",
    subject: "📉 Lecsökkent az ára! {productName}",
    body_html: brandWrap(emailContent.price_drop, { personalGreeting: "{name}" }),
    delay_minutes: 0,
  },
  {
    name: "Visszaszerzés",
    trigger_type: "reengagement",
    subject: "Hiányzol nekünk! 🖤 -20% kupon",
    body_html: brandWrap(emailContent.reengagement, { personalGreeting: "{name}" }),
    delay_minutes: 0,
  },
  {
    name: "Vélemény kérés",
    trigger_type: "review_request",
    subject: "Mit gondolsz a rendelésedről? ⭐",
    body_html: brandWrap(emailContent.review_request, { personalGreeting: "{name}" }),
    delay_minutes: 7200,
  },
];

// ============== STAT CARD ==============
const StatCard = ({ icon: Icon, label, value, subtitle, accent }: { icon: any; label: string; value: string | number; subtitle?: string; accent?: boolean }) => (
  <div className="border border-border bg-card p-4 space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <Icon className={`w-4 h-4 ${accent ? "text-accent" : "text-muted-foreground"}`} />
    </div>
    <p className={`text-2xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
    {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
  </div>
);

// ============== EMAIL PREVIEW ==============
const EmailPreview = ({ html, onClose }: { html: string; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-card border border-border max-w-[660px] w-full max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold uppercase tracking-wider">E-mail előnézet</span>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
      </div>
      <div className="p-1">
        <iframe srcDoc={html} className="w-full min-h-[500px] border-0" title="Email preview" sandbox="allow-same-origin" />
      </div>
    </div>
  </div>
);

// ============== FLOW STEP COMPONENT ==============
const FlowStepCard = ({ step, index, onPreview }: { step: SequenceStep; index: number; onPreview: (html: string) => void }) => {
  const getStepIcon = () => {
    switch (step.type) {
      case "email": return <Mail className="w-4 h-4 text-accent" />;
      case "wait": return <Timer className="w-4 h-4 text-muted-foreground" />;
      case "condition": return <GitBranch className="w-4 h-4 text-yellow-500" />;
      case "ab_test": return <Split className="w-4 h-4 text-blue-400" />;
    }
  };

  const getStepLabel = () => {
    switch (step.type) {
      case "email": return "E-mail küldés";
      case "wait": {
        if (step.wait_type === "specific_time") return `Várakozás ${step.specific_hour}:00-ig`;
        if (step.wait_type === "day_of_week") {
          const days = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
          return `Várakozás: ${days[step.specific_day || 0]}`;
        }
        return `Várakozás: ${getDelayLabel(step.delay_minutes || 0)}`;
      }
      case "condition": {
        const labels: Record<string, string> = {
          opened: "HA megnyitotta", clicked: "HA rákattintott",
          not_opened: "HA NEM nyitotta meg", purchased: "HA vásárolt",
          visited: "HA meglátogatta az oldalt",
        };
        return labels[step.condition_type || ""] || "Feltétel";
      }
      case "ab_test": return `A/B teszt (${step.split_pct || 50}/${100 - (step.split_pct || 50)})`;
    }
  };

  const bgClass = step.type === "email" ? "border-accent/30 bg-accent/5" :
    step.type === "condition" ? "border-yellow-500/30 bg-yellow-500/5" :
    step.type === "ab_test" ? "border-blue-400/30 bg-blue-400/5" :
    "border-border bg-card";

  return (
    <div className="flex flex-col items-center">
      {index > 0 && <div className="flex flex-col items-center my-1"><ArrowDown className="w-4 h-4 text-muted-foreground" /></div>}
      <div className={`border ${bgClass} p-3 w-full max-w-md`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 border border-border bg-background text-xs font-bold">{index + 1}</div>
          {getStepIcon()}
          <span className="text-sm font-medium flex-1">{getStepLabel()}</span>
          {step.type === "email" && step.body_html && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(step.body_html!)}><Eye className="w-3.5 h-3.5" /></Button>
          )}
          {step.type === "ab_test" && step.variant_a_html && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(step.variant_a_html!)}><span className="text-xs font-bold">A</span></Button>
              {step.variant_b_html && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(step.variant_b_html!)}><span className="text-xs font-bold">B</span></Button>}
            </div>
          )}
        </div>
        {step.type === "email" && step.subject && <p className="text-xs text-muted-foreground mt-1.5 ml-8 truncate">Tárgy: {step.subject}</p>}
        {step.type === "ab_test" && (
          <div className="ml-8 mt-1.5 space-y-0.5">
            <p className="text-xs text-muted-foreground truncate">A: {step.variant_a_subject}</p>
            <p className="text-xs text-muted-foreground truncate">B: {step.variant_b_subject}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============== HELPERS ==============
const getDelayLabel = (mins: number) => {
  if (mins === 0) return "Azonnal";
  if (mins < 60) return `${mins} perc`;
  if (mins < 1440) return `${Math.round(mins / 60)} óra`;
  return `${Math.round(mins / 1440)} nap`;
};

// ============== MAIN COMPONENT ==============
const AdminEmailCenterTab = () => {
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalAutomations: 0, activeAutomations: 0, totalSent: 0,
    totalCampaigns: 0, avgOpenRate: 0, avgClickRate: 0,
  });
  const [form, setForm] = useState({
    name: "", trigger_type: "welcome", delay_minutes: 0, subject: "", body_html: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const [autoRes, campRes] = await Promise.all([
      supabase.from("email_automations").select("*").order("created_at", { ascending: false }),
      supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }),
    ]);

    const autos = (autoRes.data || []) as EmailAutomation[];
    const camps = (campRes.data || []) as EmailCampaign[];
    setAutomations(autos);
    setCampaigns(camps);
    setSequences(prev => prev.length > 0 ? prev : []);

    const totalSent = autos.reduce((s, a) => s + (a.sent_count || 0), 0) + camps.reduce((s, c) => s + (c.sent_count || 0), 0);
    const avgOpen = camps.length > 0 ? camps.reduce((s, c) => s + (Number(c.open_rate) || 0), 0) / camps.length : 0;
    const avgClick = camps.length > 0 ? camps.reduce((s, c) => s + (Number(c.click_rate) || 0), 0) / camps.length : 0;

    setStats({
      totalAutomations: autos.length, activeAutomations: autos.filter(a => a.is_active).length,
      totalSent, totalCampaigns: camps.length,
      avgOpenRate: Math.round(avgOpen * 100) / 100, avgClickRate: Math.round(avgClick * 100) / 100,
    });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const saveAutomation = async () => {
    if (!form.name.trim() || !form.subject.trim()) {
      toast({ title: "Hiba", description: "Név és tárgy megadása kötelező!", variant: "destructive" });
      return;
    }
    if (editingId) {
      const { error } = await supabase.from("email_automations").update(form).eq("id", editingId);
      if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
      else toast({ title: "Automatizáció frissítve ✓" });
    } else {
      const { error } = await supabase.from("email_automations").insert(form);
      if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
      else toast({ title: "Automatizáció létrehozva ✓" });
    }
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setForm({ name: "", trigger_type: "welcome", delay_minutes: 0, subject: "", body_html: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const editAutomation = (a: EmailAutomation) => {
    setForm({ name: a.name, trigger_type: a.trigger_type, delay_minutes: a.delay_minutes, subject: a.subject, body_html: a.body_html || "" });
    setEditingId(a.id);
    setShowForm(true);
  };

  const toggleAutomation = async (id: string, active: boolean) => {
    await supabase.from("email_automations").update({ is_active: active }).eq("id", id);
    fetchData();
  };

  const removeAutomation = async (id: string) => {
    await supabase.from("email_automations").delete().eq("id", id);
    toast({ title: "Törölve ✓" });
    fetchData();
  };

  const duplicateAutomation = async (a: EmailAutomation) => {
    const { error } = await supabase.from("email_automations").insert({
      name: a.name + " (másolat)", trigger_type: a.trigger_type,
      delay_minutes: a.delay_minutes, subject: a.subject, body_html: a.body_html,
    });
    if (!error) { toast({ title: "Duplikálva ✓" }); fetchData(); }
  };

  const loadPredefined = (tpl: typeof PREDEFINED_TEMPLATES[0]) => {
    setForm({ name: tpl.name, trigger_type: tpl.trigger_type, subject: tpl.subject, body_html: tpl.body_html, delay_minutes: tpl.delay_minutes });
    setEditingId(null);
    setShowForm(true);
    toast({ title: "Sablon betöltve", description: "Testreszabhatod mentés előtt!" });
  };

  const installSequence = (seq: Omit<EmailSequence, "id">) => {
    const newSeq: EmailSequence = { ...seq, id: crypto.randomUUID() };
    setSequences(prev => [...prev, newSeq]);
    toast({ title: "Szekvencia telepítve ✓", description: `${seq.name} – aktiváld a bekapcsoláshoz!` });
  };

  const toggleSequence = (id: string) => {
    setSequences(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s));
  };

  const removeSequence = (id: string) => {
    setSequences(prev => prev.filter(s => s.id !== id));
    toast({ title: "Szekvencia törölve ✓" });
  };

  const filteredTriggers = activeCategory ? TRIGGERS.filter(t => t.category === activeCategory) : TRIGGERS;

  if (loading) return <p className="text-muted-foreground p-6">Betöltés...</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-5 h-5 text-accent" /> E-mail Marketing Központ
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Automatizációk, szekvenciák, A/B tesztek és prémium sablonok</p>
        </div>
        <Button size="sm" onClick={fetchData} variant="outline" className="gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Frissítés
        </Button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Zap} label="Automatizációk" value={stats.totalAutomations + sequences.length} subtitle={`${stats.activeAutomations + sequences.filter(s => s.is_active).length} aktív`} />
        <StatCard icon={Workflow} label="Szekvenciák" value={sequences.length} accent subtitle={`${sequences.filter(s => s.is_active).length} aktív flow`} />
        <StatCard icon={Send} label="Küldve összesen" value={stats.totalSent.toLocaleString()} />
        <StatCard icon={MailOpen} label="Megnyitási ráta" value={`${stats.avgOpenRate}%`} />
        <StatCard icon={MousePointerClick} label="Kattintási ráta" value={`${stats.avgClickRate}%`} accent />
        <StatCard icon={TrendingUp} label="Konverzió" value={`${sequences.reduce((s, sq) => s + sq.stats.converted, 0)}`} subtitle="szekvenciákból" />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="sequences" className="w-full">
        <TabsList className="w-full justify-start bg-card border border-border overflow-x-auto">
          <TabsTrigger value="sequences" className="gap-1 text-xs uppercase tracking-wider"><Workflow className="w-3.5 h-3.5" /> Szekvenciák</TabsTrigger>
          <TabsTrigger value="automations" className="gap-1 text-xs uppercase tracking-wider"><Zap className="w-3.5 h-3.5" /> Egyszerű autom.</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1 text-xs uppercase tracking-wider"><FileText className="w-3.5 h-3.5" /> Sablonok</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1 text-xs uppercase tracking-wider"><BarChart3 className="w-3.5 h-3.5" /> Analitika</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1 text-xs uppercase tracking-wider"><Settings className="w-3.5 h-3.5" /> Beállítások</TabsTrigger>
        </TabsList>

        {/* ============== SEQUENCES TAB ============== */}
        <TabsContent value="sequences" className="space-y-5 mt-4">
          <div>
            <h3 className="font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" /> Aktív e-mail szekvenciák
            </h3>

            {sequences.length > 0 ? (
              <div className="space-y-3">
                {sequences.map(seq => {
                  const trigger = TRIGGERS.find(t => t.value === seq.trigger_type);
                  const emailSteps = seq.steps.filter(s => s.type === "email" || s.type === "ab_test");
                  const isExpanded = expandedSeq === seq.id;
                  return (
                    <div key={seq.id} className="border border-border bg-card">
                      <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => setExpandedSeq(isExpanded ? null : seq.id)}>
                        <div className="flex items-center justify-center w-8 h-8 border border-border">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm truncate">{seq.name}</h4>
                            <Badge variant="outline" className="text-xs shrink-0">{trigger?.icon} {trigger?.label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">{seq.steps.length} lépés</span>
                            <span className="text-xs text-muted-foreground">{emailSteps.length} e-mail</span>
                            <span className="text-xs text-accent font-medium">{seq.stats.sent} küldve</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Switch checked={seq.is_active} onCheckedChange={() => toggleSequence(seq.id)} />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSequence(seq.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border p-4 bg-background/50">
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            {[
                              { label: "Küldve", value: seq.stats.sent, icon: Send },
                              { label: "Megnyitva", value: seq.stats.opened, icon: MailOpen },
                              { label: "Kattintva", value: seq.stats.clicked, icon: MousePointerClick },
                              { label: "Konverzió", value: seq.stats.converted, icon: Target },
                            ].map((s, i) => (
                              <div key={i} className="border border-border p-2 text-center">
                                <s.icon className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                                <p className="text-lg font-bold text-foreground">{s.value}</p>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-0">
                            <div className="flex justify-center mb-2">
                              <Badge className="bg-accent/20 text-accent border-accent/30"><Zap className="w-3 h-3 mr-1" /> Trigger: {trigger?.label}</Badge>
                            </div>
                            {seq.steps.map((step, i) => (
                              <FlowStepCard key={step.id} step={step} index={i} onPreview={setPreviewHtml} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-border p-8 text-center space-y-3">
                <Workflow className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground text-sm">Nincsenek telepített szekvenciák.</p>
                <p className="text-xs text-muted-foreground">Használd az alábbi előre elkészített flow-kat!</p>
              </div>
            )}
          </div>

          {/* Predefined sequence library */}
          <div>
            <h3 className="font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Előre elkészített szekvenciák
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {PREDEFINED_SEQUENCES.map((seq, i) => {
                const trigger = TRIGGERS.find(t => t.value === seq.trigger_type);
                const emailCount = seq.steps.filter(s => s.type === "email" || s.type === "ab_test").length;
                const hasAB = seq.steps.some(s => s.type === "ab_test");
                const hasCondition = seq.steps.some(s => s.type === "condition");
                const installed = sequences.some(s => s.name === seq.name);
                return (
                  <div key={i} className={`border p-4 space-y-3 transition-colors ${installed ? "border-accent/30 bg-accent/5" : "border-border bg-card hover:border-accent/20"}`}>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{trigger?.icon} {trigger?.label}</Badge>
                      <div className="flex gap-1">
                        {hasAB && <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30 text-xs">A/B</Badge>}
                        {hasCondition && <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-xs">IF</Badge>}
                      </div>
                    </div>
                    <h4 className="font-bold text-sm">{seq.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{seq.steps.length} lépés</span>
                      <span>{emailCount} e-mail</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {seq.steps.map((step, si) => (
                        <div key={si} className="flex items-center gap-1">
                          {si > 0 && <ArrowDown className="w-2.5 h-2.5 text-muted-foreground rotate-[-90deg]" />}
                          <div className={`w-6 h-6 flex items-center justify-center border text-xs ${step.type === "email" ? "border-accent/40 text-accent" : step.type === "wait" ? "border-border text-muted-foreground" : step.type === "condition" ? "border-yellow-500/40 text-yellow-500" : "border-blue-400/40 text-blue-400"}`}>
                            {step.type === "email" ? "✉" : step.type === "wait" ? "⏱" : step.type === "condition" ? "?" : "AB"}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" className="w-full text-xs" variant={installed ? "outline" : "default"} onClick={() => !installed && installSequence(seq)} disabled={installed}>
                      {installed ? <><CheckCircle className="w-3 h-3 mr-1" /> Telepítve</> : <><Plus className="w-3 h-3 mr-1" /> Telepítés</>}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timing guide */}
          <div className="border border-border p-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Optimális időzítés útmutató
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { trigger: "Kosárelhagyás #1", timing: "1 óra", conversion: "~15%", color: "text-accent" },
                { trigger: "Kosárelhagyás #2", timing: "24 óra", conversion: "~8%", color: "text-accent" },
                { trigger: "Kosárelhagyás #3 (kupon)", timing: "48 óra", conversion: "~5%", color: "text-accent" },
                { trigger: "Üdvözlő e-mail", timing: "Azonnal", conversion: "~65% open", color: "text-foreground" },
                { trigger: "Stílus inspiráció", timing: "+2 nap", conversion: "~40% open", color: "text-foreground" },
                { trigger: "Első vásárlás kupon", timing: "+5 nap", conversion: "~12%", color: "text-foreground" },
                { trigger: "Vélemény kérés #1", timing: "+5 nap (kézbesítés)", conversion: "~20%", color: "text-foreground" },
                { trigger: "Vélemény kérés #2", timing: "+8 nap", conversion: "~10%", color: "text-foreground" },
                { trigger: "Születésnap", timing: "09:00 reggel", conversion: "~30%", color: "text-foreground" },
                { trigger: "Visszaszerzés #1", timing: "+30 nap", conversion: "~8%", color: "text-muted-foreground" },
                { trigger: "Visszaszerzés #2 (kupon)", timing: "+37 nap", conversion: "~5%", color: "text-muted-foreground" },
                { trigger: "Árcsökkenés", timing: "Azonnal", conversion: "~25%", color: "text-accent" },
              ].map((t, i) => (
                <div key={i} className="p-2 border border-border bg-background flex items-center justify-between gap-2">
                  <div><p className="text-xs font-medium">{t.trigger}</p><p className="text-xs text-muted-foreground">{t.timing}</p></div>
                  <span className={`text-xs font-bold ${t.color}`}>{t.conversion}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ============== SIMPLE AUTOMATIONS TAB ============== */}
        <TabsContent value="automations" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold uppercase tracking-wider text-sm">Egyszerű automatizációk</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" /> Új automatizáció</Button>
          </div>

          {showForm && (
            <div className="border border-border bg-card p-5 space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider">{editingId ? "Szerkesztés" : "Új automatizáció"}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs uppercase tracking-wider">Név</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="pl. Üdvözlő e-mail" className="mt-1" /></div>
                <div><Label className="text-xs uppercase tracking-wider">Trigger esemény</Label>
                  <select className="flex h-10 w-full border border-input bg-background px-3 py-2 text-sm mt-1" value={form.trigger_type} onChange={e => setForm({ ...form, trigger_type: e.target.value })}>
                    {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs uppercase tracking-wider">E-mail tárgya</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="pl. Üdvözlünk!" className="mt-1" /></div>
                <div><Label className="text-xs uppercase tracking-wider">Késleltetés (perc)</Label><Input type="number" value={form.delay_minutes} onChange={e => setForm({ ...form, delay_minutes: Number(e.target.value) })} className="mt-1" /><p className="text-xs text-muted-foreground mt-1">0 = azonnal | 60 = 1 óra | 1440 = 1 nap</p></div>
              </div>
              <div><Label className="text-xs uppercase tracking-wider">E-mail tartalom (HTML)</Label><Textarea value={form.body_html} onChange={e => setForm({ ...form, body_html: e.target.value })} rows={10} className="mt-1 font-mono text-xs" /></div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" onClick={saveAutomation}><Save className="w-4 h-4 mr-1" /> {editingId ? "Frissítés" : "Mentés"}</Button>
                {form.body_html && <Button size="sm" variant="outline" onClick={() => setPreviewHtml(form.body_html)}><Eye className="w-4 h-4 mr-1" /> Előnézet</Button>}
                <Button size="sm" variant="ghost" onClick={resetForm}>Mégse</Button>
              </div>
            </div>
          )}

          <div className="border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wider">Név</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Trigger</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Tárgy</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Késl.</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Küldve</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Aktív</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map(a => {
                  const trigger = TRIGGERS.find(t => t.value === a.trigger_type);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-sm">{a.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{trigger?.icon} {trigger?.label || a.trigger_type}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{a.subject}</TableCell>
                      <TableCell className="text-sm"><span className="flex items-center gap-1"><Clock className="w-3 h-3 text-muted-foreground" />{getDelayLabel(a.delay_minutes)}</span></TableCell>
                      <TableCell><span className="text-sm font-medium text-accent">{a.sent_count}</span></TableCell>
                      <TableCell><Switch checked={a.is_active} onCheckedChange={v => toggleAutomation(a.id, v)} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {a.body_html && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewHtml(a.body_html)}><Eye className="w-3.5 h-3.5" /></Button>}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editAutomation(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateAutomation(a)}><Copy className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeAutomation(a.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {automations.length === 0 && (
            <div className="border border-dashed border-border p-8 text-center space-y-3">
              <Zap className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Nincsenek egyszerű automatizációk.</p>
            </div>
          )}
        </TabsContent>

        {/* ============== TEMPLATES TAB ============== */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div>
            <h3 className="font-bold uppercase tracking-wider text-sm">Prémium sablonkönyvtár</h3>
            <p className="text-xs text-muted-foreground mt-1">Minden sablon a márka identitásával – személyes megszólítás, arany akcentusok, sötét háttér</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PREDEFINED_TEMPLATES.map((tpl, i) => {
              const trigger = TRIGGERS.find(t => t.value === tpl.trigger_type);
              const existing = automations.find(a => a.trigger_type === tpl.trigger_type);
              return (
                <div key={i} className="border border-border bg-card p-4 space-y-3 hover:border-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{trigger?.icon}</span>
                    {existing ? (
                      <Badge className="bg-accent/20 text-accent border-accent/30 text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Aktív</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Nincs beállítva</Badge>
                    )}
                  </div>
                  <h4 className="font-bold text-sm">{tpl.name}</h4>
                  <p className="text-xs text-muted-foreground">{trigger?.description}</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => loadPredefined(tpl)}><Plus className="w-3 h-3 mr-1" /> Használat</Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setPreviewHtml(tpl.body_html)}><Eye className="w-3 h-3" /></Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trigger categories */}
          <div className="border border-border p-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider">Trigger típusok</h4>
            <div className="flex gap-2 flex-wrap mb-2">
              <Badge variant={activeCategory === null ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setActiveCategory(null)}>Mind ({TRIGGERS.length})</Badge>
              {TRIGGER_CATEGORIES.map(cat => {
                const count = TRIGGERS.filter(t => t.category === cat.value).length;
                return (
                  <Badge key={cat.value} variant={activeCategory === cat.value ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setActiveCategory(cat.value)}>
                    <cat.icon className="w-3 h-3 mr-1" /> {cat.label} ({count})
                  </Badge>
                );
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredTriggers.map(t => (
                <div key={t.value} className="flex items-center gap-3 p-2 border border-border bg-background text-sm">
                  <span className="text-lg">{t.icon}</span>
                  <div><p className="font-medium text-xs">{t.label}</p><p className="text-xs text-muted-foreground">{t.description}</p></div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ============== ANALYTICS TAB ============== */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <h3 className="font-bold uppercase tracking-wider text-sm">Kampányok & Analitika</h3>

          {sequences.length > 0 && (
            <div className="border border-border p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider">Szekvencia teljesítmény</h4>
              {sequences.map(seq => {
                const maxVal = Math.max(seq.stats.sent, 1);
                return (
                  <div key={seq.id} className="space-y-2 p-3 border border-border bg-background">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{seq.name}</span>
                      <Badge variant={seq.is_active ? "default" : "outline"} className="text-xs">{seq.is_active ? "Aktív" : "Inaktív"}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div><p className="font-bold text-foreground">{seq.stats.sent}</p><p className="text-muted-foreground">Küldve</p></div>
                      <div><p className="font-bold text-foreground">{seq.stats.opened}</p><p className="text-muted-foreground">Megnyitva</p></div>
                      <div><p className="font-bold text-foreground">{seq.stats.clicked}</p><p className="text-muted-foreground">Kattintva</p></div>
                      <div><p className="font-bold text-accent">{seq.stats.converted}</p><p className="text-muted-foreground">Konverzió</p></div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground w-16">Open</span><Progress value={maxVal > 0 ? (seq.stats.opened / maxVal) * 100 : 0} className="h-1.5" /></div>
                      <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground w-16">Click</span><Progress value={maxVal > 0 ? (seq.stats.clicked / maxVal) * 100 : 0} className="h-1.5" /></div>
                      <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground w-16">Conv.</span><Progress value={maxVal > 0 ? (seq.stats.converted / maxVal) * 100 : 0} className="h-1.5" /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {campaigns.length > 0 ? (
            <div className="border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wider">Név</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Státusz</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Küldve</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Kézbesítve</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Megnyitva</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Kattintva</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Visszapattant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(c => (
                    <TableRow key={c.id}>
                      <TableCell><div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.subject}</p></div></TableCell>
                      <TableCell><Badge variant="outline" className={c.status === "sent" ? "border-accent/50 text-accent" : ""}>{c.status === "sent" ? "Elküldve" : c.status === "draft" ? "Piszkozat" : c.status === "scheduled" ? "Ütemezett" : c.status}</Badge></TableCell>
                      <TableCell className="text-sm font-medium">{c.sent_count}</TableCell>
                      <TableCell className="text-sm">{c.delivered_count}</TableCell>
                      <TableCell><span className="text-sm text-accent font-medium">{c.opened_count}</span> <span className="text-xs text-muted-foreground">({c.open_rate}%)</span></TableCell>
                      <TableCell><span className="text-sm font-medium">{c.clicked_count}</span> <span className="text-xs text-muted-foreground">({c.click_rate}%)</span></TableCell>
                      <TableCell>{c.bounced_count > 0 ? <span className="text-destructive text-sm font-medium">{c.bounced_count}</span> : <span className="text-muted-foreground text-sm">0</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border border-dashed border-border p-8 text-center space-y-3">
              <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Még nincsenek kampány adatok.</p>
              <p className="text-xs text-muted-foreground">A domain beállítása után az analitika automatikusan elindul.</p>
            </div>
          )}
        </TabsContent>

        {/* ============== SETTINGS TAB ============== */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <h3 className="font-bold uppercase tracking-wider text-sm">E-mail rendszer beállítások</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent" />
                <h4 className="font-bold text-sm uppercase tracking-wider">Feladó domain</h4>
              </div>
              <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20">
                <Clock className="w-4 h-4 text-accent" />
                <p className="text-sm text-accent">Nincs domain beállítva</p>
              </div>
              <p className="text-xs text-muted-foreground">A tényleges küldéshez domain szükséges. Addig is minden sablon szerkeszthető és előnézhető.</p>
            </div>

            <div className="border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-accent" />
                <h4 className="font-bold text-sm uppercase tracking-wider">Márka identitás</h4>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Sötét háttér (#050505)", icon: "🖤" },
                  { label: "Arany akcentus (#e6a817)", icon: "✨" },
                  { label: "Space Grotesk betűtípus", icon: "🔤" },
                  { label: "Személyes megszólítás", icon: "👋" },
                  { label: "Márka logó fejléc", icon: "🏷️" },
                  { label: "SVG rács textúra háttér", icon: "🎨" },
                  { label: "Lekerekítés nélkül (0px)", icon: "◼️" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="text-sm">{f.icon}</span>
                    <span className="text-xs">{f.label}</span>
                    <CheckCircle className="w-3.5 h-3.5 text-accent ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent" />
              <h4 className="font-bold text-sm uppercase tracking-wider">Funkciók</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: "E-mail automatizációk", ready: true },
                { label: "Többlépéses szekvenciák", ready: true },
                { label: "A/B tesztelés", ready: true },
                { label: "Feltételes elágazás (IF/THEN)", ready: true },
                { label: "Időzítés (perc/óra/nap)", ready: true },
                { label: "Meghatározott idő (09:00)", ready: true },
                { label: "HTML előnézet (iframe)", ready: true },
                { label: "Trigger rendszer (16 trigger)", ready: true },
                { label: "Személyes megszólítás ({name})", ready: true },
                { label: "Prémium márka sablonok", ready: true },
                { label: "Auth e-mailek", ready: true, note: "Automatikus" },
                { label: "Tényleges küldés", ready: false, note: "Domain szükséges" },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 border border-border bg-background">
                  <div className="flex items-center gap-2">
                    {f.ready ? <CheckCircle className="w-3.5 h-3.5 text-accent" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-xs">{f.label}</span>
                  </div>
                  {f.note && <span className="text-xs text-muted-foreground">{f.note}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border p-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider">Elérhető változók</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { var: "{name}", desc: "Vásárló neve" },
                { var: "{email}", desc: "Vásárló e-mail" },
                { var: "#{orderId}", desc: "Rendelés azonosító" },
                { var: "{total}", desc: "Rendelés összeg" },
                { var: "{trackingNumber}", desc: "Nyomkövetési szám" },
                { var: "{deliveryDate}", desc: "Kézbesítési dátum" },
                { var: "{storeName}", desc: "Bolt neve" },
                { var: "{couponCode}", desc: "Kuponkód" },
                { var: "{productName}", desc: "Termék neve" },
                { var: "{oldPrice}", desc: "Régi ár" },
                { var: "{newPrice}", desc: "Új ár" },
                { var: "{loyaltyPoints}", desc: "Hűségpontok" },
              ].map((v, i) => (
                <div key={i} className="p-2 border border-border bg-background">
                  <code className="text-xs font-mono text-accent">{v.var}</code>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {previewHtml && <EmailPreview html={previewHtml} onClose={() => setPreviewHtml(null)} />}
    </div>
  );
};

export default AdminEmailCenterTab;

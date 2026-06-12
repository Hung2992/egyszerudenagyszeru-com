import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import {
  Save, Tag, Ticket, Copy, Check, User, MapPin, Bell, Plus, Trash2, Star, Lock, Eye, EyeOff, Share2, Gift, Navigation, Ruler, Package, RefreshCw, Palette, FileText, Wallet, Clock, ListChecks, ArrowLeftRight, Undo2, TrendingDown, ShieldAlert, Cake, ClipboardList, Globe, Scaling, CalendarClock, Award, Cpu,
} from "lucide-react";
import FavoritePickupPoints from "@/components/FavoritePickupPoints";
import PersonalizedOffers from "@/components/PersonalizedOffers";
import UserSizeProfile from "@/components/UserSizeProfile";
import PackagingPreferences from "@/components/PackagingPreferences";
import AutoReorder from "@/components/AutoReorder";
import StylePreferences from "@/components/StylePreferences";
import ReceiptPreferences from "@/components/ReceiptPreferences";
import BudgetSettings from "@/components/BudgetSettings";
import DeliveryTimePreferences from "@/components/DeliveryTimePreferences";
import ShoppingLists from "@/components/ShoppingLists";
import ProductComparison from "@/components/ProductComparison";
import ReturnPreferences from "@/components/ReturnPreferences";
import PriceAlerts from "@/components/PriceAlerts";
import MaterialPreferences from "@/components/MaterialPreferences";
import BirthdayDiscount from "@/components/BirthdayDiscount";
import GiftWrapping from "@/components/GiftWrapping";
import OrderTemplates from "@/components/OrderTemplates";
import LocalePreferences from "@/components/LocalePreferences";
import SocialLinks from "@/components/SocialLinks";
import BrandSizeComparison from "@/components/BrandSizeComparison";
import ReviewIncentives from "@/components/ReviewIncentives";
import ProductPreorders from "@/components/ProductPreorders";
import LoyaltyRedemption from "@/components/LoyaltyRedemption";
import AiSizeRecommender from "@/components/AiSizeRecommender";
import type { User as SupaUser } from "@supabase/supabase-js";
import { sendAppEmail } from "@/lib/app-email";
import { useAccountantCheck } from "@/hooks/useAccountantCheck";

interface ProfileData {
  display_name: string;
  email: string;
  phone: string;
  address_line: string;
  city: string;
  zip_code: string;
  country: string;
  preferred_payment: string;
  card_holder_name: string;
  card_last4: string;
}

interface ShippingAddress {
  id?: string;
  label: string;
  name: string;
  phone: string;
  address_line: string;
  city: string;
  zip_code: string;
  country: string;
  is_default: boolean;
}

interface NotificationPrefs {
  order_updates: boolean;
  promotions: boolean;
  new_products: boolean;
  price_drops: boolean;
}

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  valid_until: string | null;
}

const TABS = [
  { key: "profile", label: "Profil", icon: User },
  { key: "addresses", label: "Címek", icon: MapPin },
  { key: "pickup", label: "Átvétel", icon: Navigation },
  { key: "delivery", label: "Szállítás", icon: Clock },
  { key: "sizes", label: "Méretek", icon: Ruler },
  { key: "brandsizes", label: "Márka méretek", icon: Scaling },
  { key: "style", label: "Stílus", icon: Palette },
  { key: "materials", label: "Anyagok", icon: ShieldAlert },
  { key: "packaging", label: "Csomag", icon: Package },
  { key: "giftwrap", label: "Ajándék", icon: Gift },
  { key: "reorders", label: "Újrarendelés", icon: RefreshCw },
  { key: "templates", label: "Sablonok", icon: ClipboardList },
  { key: "returns", label: "Visszaküldés", icon: Undo2 },
  { key: "receipts", label: "Nyugták", icon: FileText },
  { key: "budget", label: "Keret", icon: Wallet },
  { key: "pricealerts", label: "Árfigyelő", icon: TrendingDown },
  { key: "birthday", label: "Szülinap", icon: Cake },
  { key: "locale", label: "Nyelv", icon: Globe },
  { key: "social", label: "Social", icon: Share2 },
  { key: "comparisons", label: "Összehasonlító", icon: ArrowLeftRight },
  { key: "shoplists", label: "Listák", icon: ListChecks },
  { key: "offers", label: "Ajánlatok", icon: Gift },
  { key: "referrals", label: "Ajánlás", icon: Share2 },
  { key: "notifications", label: "Értesítések", icon: Bell },
  { key: "coupons", label: "Kuponok", icon: Ticket },
  { key: "reviews", label: "Vélemények", icon: Star },
  { key: "preorders", label: "Előjegyzés", icon: CalendarClock },
  { key: "loyalty", label: "Hűségpont", icon: Award },
  { key: "aisize", label: "AI méret", icon: Cpu },
  { key: "security", label: "Jelszó", icon: Lock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Készpénz" },
  { value: "card", label: "Bankkártya" },
  { value: "cod", label: "Utánvét" },
];

const PasswordChangeSection = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changing, setChanging] = useState(false);

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: "A jelszónak legalább 6 karakter hosszúnak kell lennie", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "A jelszavak nem egyeznek", variant: "destructive" });
      return;
    }
    setChanging(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChanging(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Jelszó megváltoztatva! ✓" });
      setNewPassword("");
      setConfirmPassword("");
      // Send password changed notification email
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        try {
          await sendAppEmail({
            templateName: "password-changed",
            recipientEmail: user.email,
            idempotencyKey: `password-changed-${user.id}-${Date.now()}`,
          });
        } catch (e) {
          console.error("Password change email error:", e);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
        Jelszó módosítás
      </h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider">Új jelszó</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Legalább 6 karakter"
              className="rounded-none h-11 text-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider">Jelszó megerősítés</Label>
          <Input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Jelszó újra"
            className="rounded-none h-11 text-sm"
          />
        </div>
        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <p className="text-xs text-destructive">A jelszavak nem egyeznek</p>
        )}
      </div>
      <Button
        onClick={handlePasswordChange}
        disabled={changing || !newPassword || !confirmPassword}
        className="w-full rounded-none h-12 uppercase tracking-wider text-xs"
      >
        <Lock className="mr-2 h-4 w-4" />
        {changing ? "Módosítás..." : "Jelszó módosítása"}
      </Button>
    </div>
  );
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { allowed: isAccountant, role: accountantRole } = useAccountantCheck();
  const [user, setUser] = useState<SupaUser | null>(null);
  const [tab, setTab] = useState<TabKey>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile
  const [profile, setProfile] = useState<ProfileData>({
    display_name: "", email: "", phone: "", address_line: "", city: "",
    zip_code: "", country: "Magyarország", preferred_payment: "cash",
    card_holder_name: "", card_last4: "",
  });

  // Addresses
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [editAddress, setEditAddress] = useState<ShippingAddress | null>(null);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    order_updates: true, promotions: true, new_products: false, price_drops: true,
  });

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Referrals
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralLoading, setReferralLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { navigate("/auth"); return; }
      setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { navigate("/auth"); return; }
      setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [profileRes, addressRes, notifRes, couponRes, referralRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("shipping_addresses" as any).select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
        supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("coupons").select("*").eq("is_active", true),
        (supabase.from("referrals" as any) as any).select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (profileRes.data) {
        const d = profileRes.data as any;
        setProfile({
          display_name: d.display_name || "", email: d.email || user.email || "",
          phone: d.phone || "", address_line: d.address_line || "", city: d.city || "",
          zip_code: d.zip_code || "", country: d.country || "Magyarország",
          preferred_payment: d.preferred_payment || "cash",
          card_holder_name: d.card_holder_name || "", card_last4: d.card_last4 || "",
        });
      } else {
        setProfile((p) => ({ ...p, email: user.email || "" }));
      }

      if (addressRes.data) setAddresses(addressRes.data as any);
      if (notifRes.data) {
        const n = notifRes.data as any;
        setNotifPrefs({
          order_updates: n.order_updates ?? true,
          promotions: n.promotions ?? true,
          new_products: n.new_products ?? false,
          price_drops: n.price_drops ?? true,
        });
      }
      if (couponRes.data) setCoupons(couponRes.data as Coupon[]);
      if (referralRes.data) {
        setReferrals(referralRes.data);
        if (referralRes.data.length > 0) {
          setReferralCode(referralRes.data[0].referral_code);
        }
      }
      // Generate referral code if none exists
      if (!referralRes.data || referralRes.data.length === 0) {
        const code = `EDN-${user.id.slice(0, 6).toUpperCase()}`;
        setReferralCode(code);
      }
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  // -- Profile save --
  const handleProfileSave = async () => {
    if (!user) return;
    setSaving(true);
    const updateData = {
      display_name: profile.display_name,
      email: profile.email,
      phone: profile.phone,
      city: profile.city,
      preferred_payment: profile.preferred_payment,
    };
    const { data: existing } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    let error;
    if (existing) {
      ({ error } = await supabase.from("profiles").update(updateData).eq("user_id", user.id));
    } else {
      ({ error } = await supabase.from("profiles").insert({ ...updateData, user_id: user.id }));
    }
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Profil mentve!" });
      // Send profile update confirmation email
      try {
        await sendAppEmail({
          templateName: "profile-update",
          recipientEmail: user.email,
          idempotencyKey: `profile-update-${user.id}-${Date.now()}`,
          templateData: { name: profile.display_name },
        });
      } catch (e) {
        console.error("Profile update email error:", e);
      }
    }
  };

  // -- Address CRUD --
  const saveAddress = async (addr: ShippingAddress) => {
    if (!user) return;
    setSaving(true);
    const payload = { ...addr, user_id: user.id };
    delete (payload as any).id;
    let error;
    if (addr.id) {
      ({ error } = await (supabase.from("shipping_addresses" as any) as any).update(payload).eq("id", addr.id));
    } else {
      ({ error } = await (supabase.from("shipping_addresses" as any) as any).insert(payload));
    }
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Cím mentve!" });
      const { data } = await (supabase.from("shipping_addresses" as any) as any).select("*").eq("user_id", user.id).order("is_default", { ascending: false });
      if (data) setAddresses(data);
    }
    setEditAddress(null);
    setSaving(false);
  };

  const deleteAddress = async (id: string) => {
    await (supabase.from("shipping_addresses" as any) as any).delete().eq("id", id);
    setAddresses((a) => a.filter((x) => x.id !== id));
    toast({ title: "Cím törölve" });
  };

  // -- Notification save --
  const handleNotifSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { ...notifPrefs, user_id: user.id, updated_at: new Date().toISOString() };
    const { data: existing } = await supabase.from("notification_preferences").select("id").eq("user_id", user.id).maybeSingle();
    let error;
    if (existing) {
      ({ error } = await (supabase.from("notification_preferences") as any).update(payload).eq("user_id", user.id));
    } else {
      ({ error } = await (supabase.from("notification_preferences") as any).insert(payload));
    }
    setSaving(false);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else toast({ title: "Értesítések mentve!" });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-xl font-bold text-foreground uppercase">
            {profile.display_name?.charAt(0) || user?.email?.charAt(0) || "?"}
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold uppercase tracking-wider text-foreground">Fiókom</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Accountant portal access */}
        {isAccountant && (
          <button
            onClick={() => navigate("/konyvelo")}
            className="w-full mb-6 flex items-center justify-between gap-3 border border-accent bg-accent/10 px-4 py-3 hover:bg-accent/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-accent" />
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-widest text-foreground">
                  Könyvelői felület
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {accountantRole === "admin" ? "Admin hozzáférés" : "Belépés a könyvelői panelre"}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent">Belépés →</span>
          </button>
        )}

        {/* Partner portal access */}
        <PartnerPortalButton />



        {/* Tabs */}
        <div className="flex border-b border-border mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "profile" && (
          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Személyes adatok
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">Név</Label>
                  <Input value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} className="rounded-none h-11 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">Telefon</Label>
                  <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+36 30 123 4567" className="rounded-none h-11 text-sm" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Alapértelmezett cím
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">Utca, házszám</Label>
                  <Input value={profile.address_line} onChange={(e) => setProfile({ ...profile, address_line: e.target.value })} className="rounded-none h-11 text-sm" />
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider">Irányítószám</Label>
                    <Input value={profile.zip_code} onChange={(e) => setProfile({ ...profile, zip_code: e.target.value })} className="rounded-none h-11 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider">Város</Label>
                    <Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} className="rounded-none h-11 text-sm" />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs uppercase tracking-wider">Ország</Label>
                    <Input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} className="rounded-none h-11 text-sm" />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Fizetési mód
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setProfile({ ...profile, preferred_payment: opt.value })}
                    className={`border p-3 text-center transition-all ${
                      profile.preferred_payment === opt.value
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-xs font-medium uppercase tracking-wider">{opt.label}</span>
                  </button>
                ))}
              </div>
              {profile.preferred_payment === "card" && (
                <div className="space-y-3 border border-accent/20 bg-accent/5 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider">Kártyatulajdonos</Label>
                      <Input value={profile.card_holder_name} onChange={(e) => setProfile({ ...profile, card_holder_name: e.target.value })} className="rounded-none h-11 text-sm uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider">Utolsó 4 szám</Label>
                      <Input
                        value={profile.card_last4}
                        onChange={(e) => setProfile({ ...profile, card_last4: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        maxLength={4}
                        className="rounded-none h-11 text-sm tracking-[0.3em]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <Button onClick={handleProfileSave} disabled={saving} className="w-full rounded-none h-12 uppercase tracking-wider text-xs">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Mentés..." : "Profil mentése"}
            </Button>
          </div>
        )}

        {tab === "addresses" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Szállítási címek</h2>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none text-xs uppercase tracking-wider"
                onClick={() => setEditAddress({ label: "Otthon", name: "", phone: "", address_line: "", city: "", zip_code: "", country: "Magyarország", is_default: false })}
              >
                <Plus className="h-3 w-3 mr-1" /> Új cím
              </Button>
            </div>

            {editAddress && (
              <div className="border border-accent/30 bg-card p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-accent">{editAddress.id ? "Cím szerkesztése" : "Új cím"}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider">Címke</Label>
                    <Input value={editAddress.label} onChange={(e) => setEditAddress({ ...editAddress, label: e.target.value })} placeholder="Pl. Otthon, Munkahely" className="rounded-none h-10 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider">Név</Label>
                    <Input value={editAddress.name} onChange={(e) => setEditAddress({ ...editAddress, name: e.target.value })} className="rounded-none h-10 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider">Telefon</Label>
                    <Input value={editAddress.phone} onChange={(e) => setEditAddress({ ...editAddress, phone: e.target.value })} className="rounded-none h-10 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider">Irányítószám</Label>
                    <Input value={editAddress.zip_code} onChange={(e) => setEditAddress({ ...editAddress, zip_code: e.target.value })} className="rounded-none h-10 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider">Város</Label>
                    <Input value={editAddress.city} onChange={(e) => setEditAddress({ ...editAddress, city: e.target.value })} className="rounded-none h-10 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider">Ország</Label>
                    <Input value={editAddress.country} onChange={(e) => setEditAddress({ ...editAddress, country: e.target.value })} className="rounded-none h-10 text-sm" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-wider">Utca, házszám</Label>
                    <Input value={editAddress.address_line} onChange={(e) => setEditAddress({ ...editAddress, address_line: e.target.value })} className="rounded-none h-10 text-sm" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editAddress.is_default} onCheckedChange={(v) => setEditAddress({ ...editAddress, is_default: v })} />
                  <span className="text-xs text-muted-foreground">Alapértelmezett cím</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => saveAddress(editAddress)} disabled={saving} className="rounded-none text-xs uppercase tracking-wider flex-1">
                    {saving ? "Mentés..." : "Mentés"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditAddress(null)} className="rounded-none text-xs uppercase tracking-wider">
                    Mégse
                  </Button>
                </div>
              </div>
            )}

            {addresses.length === 0 && !editAddress && (
              <div className="text-center py-12 border border-border bg-card">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Még nincs mentett címed</p>
              </div>
            )}

            {addresses.map((addr) => (
              <div key={addr.id} className="flex items-start justify-between border border-border bg-card p-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">{addr.label}</span>
                    {addr.is_default && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-accent text-accent-foreground px-1.5 py-0.5">
                        Alapértelmezett
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{addr.name}</p>
                  <p className="text-xs text-muted-foreground">{addr.address_line}</p>
                  <p className="text-xs text-muted-foreground">{addr.zip_code} {addr.city}, {addr.country}</p>
                  {addr.phone && <p className="text-xs text-muted-foreground mt-1">{addr.phone}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditAddress(addr)}>
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => addr.id && deleteAddress(addr.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "pickup" && user && (
          <FavoritePickupPoints userId={user.id} />
        )}

        {tab === "offers" && user && (
          <div className="space-y-4">
            <PersonalizedOffers userId={user.id} />
            <p className="text-[10px] text-muted-foreground text-center">
              Az ajánlatok a vásárlási előzményeid alapján generálódnak.
            </p>
          </div>
        )}

        {tab === "referrals" && (
          <div className="space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Barát ajánló program
            </h2>
            <div className="border border-accent/20 bg-accent/5 p-5 space-y-3">
              <p className="text-sm font-bold text-foreground">Hívd meg barátaidat!</p>
              <p className="text-xs text-muted-foreground">Oszd meg az ajánló kódodat, és ha barátod vásárol, mindketten kedvezményt kaptok!</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-background border border-border px-4 py-2.5 font-mono font-bold text-accent text-sm tracking-wider">
                  {referralCode}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(referralCode); setCopiedCode(referralCode); setTimeout(() => setCopiedCode(null), 2000); }}
                  className="px-4 py-2.5 border border-border text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedCode === referralCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '?ref=' + referralCode)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-[10px] uppercase tracking-wider py-2 border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Facebook
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Használd az ajánló kódomat: ' + referralCode)}&url=${encodeURIComponent(window.location.origin)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-[10px] uppercase tracking-wider py-2 border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  X / Twitter
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent('Kedvezmény az EDN webshopon!')}&body=${encodeURIComponent('Szia! Használd az ajánló kódomat: ' + referralCode + ' és kapj kedvezményt! ' + window.location.origin)}`}
                  className="flex-1 text-center text-[10px] uppercase tracking-wider py-2 border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  E-mail
                </a>
              </div>
            </div>

            {referrals.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ajánlásaid ({referrals.length})</p>
                {referrals.map((ref: any) => (
                  <div key={ref.id} className="flex items-center justify-between border border-border bg-card p-3 text-xs">
                    <div>
                      <span className="text-foreground">{ref.referred_email || "Meghívó elküldve"}</span>
                      <span className={`ml-2 font-bold ${ref.status === "completed" ? "text-green-500" : "text-yellow-500"}`}>
                        {ref.status === "completed" ? "Teljesítve ✓" : "Függőben"}
                      </span>
                    </div>
                    {ref.reward_amount > 0 && (
                      <span className="font-bold text-accent">{ref.reward_amount.toLocaleString()} Ft</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="border border-border bg-card p-4 space-y-2 text-xs">
              <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">Hogyan működik?</p>
              <div className="space-y-1 text-muted-foreground">
                <p>1. Oszd meg az ajánló kódodat barátaiddal</p>
                <p>2. Barátod regisztrál és megadja a kódot</p>
                <p>3. Az első vásárlás után mindketten kedvezményt kaptok</p>
              </div>
            </div>
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              Értesítési beállítások
            </h2>
            {[
              { key: "order_updates" as const, label: "Rendelés állapot", desc: "Értesítés, ha a rendelésed állapota változik" },
              { key: "promotions" as const, label: "Akciók, ajánlatok", desc: "Kedvezményes ajánlatok és kampányok" },
              { key: "new_products" as const, label: "Új termékek", desc: "Értesítés új kollekció megjelenésekor" },
              { key: "price_drops" as const, label: "Árcsökkenések", desc: "Értesítés, ha egy kedvenc terméked ára csökken" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between border border-border bg-card p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <Switch
                  checked={notifPrefs[item.key]}
                  onCheckedChange={(v) => setNotifPrefs({ ...notifPrefs, [item.key]: v })}
                />
              </div>
            ))}
            <Button onClick={handleNotifSave} disabled={saving} className="w-full rounded-none h-12 uppercase tracking-wider text-xs">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Mentés..." : "Értesítések mentése"}
            </Button>
          </div>
        )}

        {tab === "coupons" && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Elérhető kuponok
            </h2>
            {coupons.length === 0 ? (
              <div className="text-center py-12 border border-border bg-card">
                <Ticket className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Jelenleg nincs elérhető kupon</p>
              </div>
            ) : (
              <div className="space-y-2">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="flex items-center justify-between border border-dashed border-accent/40 bg-accent/5 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Tag className="h-3 w-3 text-accent" />
                        <span className="text-sm font-bold text-foreground tracking-wider">{coupon.code}</span>
                        {coupon.discount_percent && <span className="text-xs font-bold text-accent">-{coupon.discount_percent}%</span>}
                        {coupon.discount_amount && <span className="text-xs font-bold text-accent">-{coupon.discount_amount.toLocaleString()} Ft</span>}
                      </div>
                      {coupon.description && <p className="mt-1 text-xs text-muted-foreground">{coupon.description}</p>}
                      {coupon.valid_until && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                          Érvényes: {new Date(coupon.valid_until).toLocaleDateString("hu-HU")}
                        </p>
                      )}
                    </div>
                    <button onClick={() => copyCode(coupon.code)} className="flex items-center gap-1 text-xs text-accent hover:text-foreground transition-colors">
                      {copiedCode === coupon.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">
              A kuponkódot a pénztárnál tudod beváltani
            </p>
          </div>
        )}

        {tab === "sizes" && user && (
          <UserSizeProfile userId={user.id} />
        )}

        {tab === "packaging" && user && (
          <PackagingPreferences userId={user.id} />
        )}

        {tab === "reorders" && user && (
          <AutoReorder userId={user.id} />
        )}

        {tab === "style" && user && (
          <StylePreferences userId={user.id} />
        )}

        {tab === "receipts" && user && (
          <ReceiptPreferences userId={user.id} />
        )}

        {tab === "budget" && user && (
          <BudgetSettings userId={user.id} />
        )}

        {tab === "delivery" && user && (
          <DeliveryTimePreferences userId={user.id} />
        )}

        {tab === "returns" && user && (
          <ReturnPreferences userId={user.id} />
        )}

        {tab === "comparisons" && user && (
          <ProductComparison userId={user.id} />
        )}

        {tab === "shoplists" && user && (
          <ShoppingLists userId={user.id} />
        )}

        {tab === "pricealerts" && user && (
          <PriceAlerts userId={user.id} />
        )}

        {tab === "materials" && user && (
          <MaterialPreferences userId={user.id} />
        )}

        {tab === "birthday" && user && (
          <BirthdayDiscount userId={user.id} />
        )}

        {tab === "giftwrap" && user && (
          <GiftWrapping userId={user.id} />
        )}

        {tab === "templates" && user && (
          <OrderTemplates userId={user.id} />
        )}

        {tab === "locale" && user && (
          <LocalePreferences userId={user.id} />
        )}

        {tab === "social" && user && (
          <SocialLinks userId={user.id} />
        )}

        {tab === "brandsizes" && user && (
          <BrandSizeComparison userId={user.id} />
        )}

        {tab === "reviews" && user && (
          <ReviewIncentives userId={user.id} />
        )}

        {tab === "preorders" && user && (
          <ProductPreorders userId={user.id} />
        )}

        {tab === "loyalty" && (
          <LoyaltyRedemption />
        )}

        {tab === "aisize" && user && (
          <AiSizeRecommender userId={user.id} />
        )}

        {tab === "security" && (
          <PasswordChangeSection />
        )}
      </div>
    </Layout>
  );
};

export default ProfilePage;

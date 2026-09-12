// Partner OS – navigációs modell: a meglévő 25+ lap 10 üzleti területbe rendezve.
// Egyetlen meglévő funkció sem tűnik el, csak logikus csoportba kerül.
import {
  Home, ShoppingCart, Users, Package, Globe, Megaphone, Wallet, Truck, Sparkles, Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  tab: string;
  label: string;
  description?: string;
}

export interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "home", label: "Áttekintés", icon: Home,
    items: [
      { tab: "cockpit", label: "Vezérlőközpont", description: "Üzleti állapot, prioritások, napi jelentés" },
      { tab: "dashboard", label: "Irányítópult", description: "Részletes kimutatások" },
    ],
  },
  {
    key: "sales", label: "Értékesítés", icon: ShoppingCart,
    items: [
      { tab: "orders", label: "Rendelések", description: "Rendelések és ügyfelek kezelése" },
      { tab: "calendar", label: "Naptár & foglalás" },
      { tab: "sales_sheet", label: "Értékesítési oldal" },
    ],
  },
  {
    key: "customers", label: "Vásárlók", icon: Users,
    items: [
      { tab: "referrals", label: "Ajánlások" },
      { tab: "communication", label: "Kommunikáció" },
    ],
  },
  {
    key: "products", label: "Termékek", icon: Package,
    items: [
      { tab: "products", label: "Termékek" },
      { tab: "inventory", label: "Készlet & árazás" },
      { tab: "digital", label: "Digitális kiszolgálás" },
    ],
  },
  {
    key: "webshop", label: "Webshop", icon: Globe,
    items: [
      { tab: "storefront", label: "Saját webshop" },
      { tab: "abtests", label: "A/B teszt" },
      { tab: "plugins", label: "Pluginok" },
    ],
  },
  {
    key: "marketing", label: "Marketing", icon: Megaphone,
    items: [
      { tab: "marketing", label: "Marketing" },
      { tab: "campaigns", label: "Hírlevelek" },
    ],
  },
  {
    key: "finance", label: "Pénzügy", icon: Wallet,
    items: [
      { tab: "finance", label: "Pénzügy" },
      { tab: "overview", label: "Jutalék" },
      { tab: "payouts", label: "Kifizetések" },
    ],
  },
  {
    key: "operations", label: "Operáció", icon: Truck,
    items: [
      { tab: "shipping", label: "Szállítás" },
      { tab: "workflows", label: "Automatizálás" },
    ],
  },
  {
    key: "ai", label: "AI", icon: Sparkles,
    items: [
      { tab: "advisor", label: "AI asszisztens" },
      { tab: "ai_team", label: "AI csapatom" },
      { tab: "action_plans", label: "AI intézkedések" },
      { tab: "ai_marketplace", label: "AI Marketplace" },
    ],
  },
  {
    key: "system", label: "Rendszer", icon: Settings,
    items: [
      { tab: "profile", label: "Profil" },
      { tab: "cooperation", label: "Együttműködés" },
    ],
  },
];

export const ALL_NAV_ITEMS: (NavItem & { group: string; groupLabel: string })[] = NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ ...i, group: g.key, groupLabel: g.label })),
);

/** Melyik csoportba tartozik egy (akár régi deep-linkkel érkező) tab. */
export function groupForTab(tab: string): string {
  return NAV_GROUPS.find((g) => g.items.some((i) => i.tab === tab))?.key ?? "home";
}

export function labelForTab(tab: string): string {
  return ALL_NAV_ITEMS.find((i) => i.tab === tab)?.label ?? tab;
}

export function isKnownTab(tab: string): boolean {
  return ALL_NAV_ITEMS.some((i) => i.tab === tab);
}

/** Mobil alsó sáv – a maradék a "Több" alatt. */
export const MOBILE_PRIMARY: { tab: string; label: string }[] = [
  { tab: "cockpit", label: "Főoldal" },
  { tab: "orders", label: "Rendelések" },
  { tab: "advisor", label: "AI" },
  { tab: "storefront", label: "Webshop" },
];

export const QUICK_ACTIONS: { tab: string; label: string }[] = [
  { tab: "products", label: "Új termék" },
  { tab: "orders", label: "Rendelések" },
  { tab: "marketing", label: "Kampány" },
  { tab: "storefront", label: "Webshop szerkesztése" },
  { tab: "advisor", label: "AI asszisztens" },
];

// Dinamikus termék séma: a teljesítési típus (fulfillment) határozza meg,
// milyen mezők, checkout-logika és rendelési státuszok tartoznak egy termékhez.

export type Fulfillment = "physical" | "digital" | "course" | "service";

export const FULFILLMENTS: Fulfillment[] = ["physical", "digital", "course", "service"];

export const fulfillmentLabel: Record<Fulfillment, string> = {
  physical: "Fizikai termék",
  digital: "Digitális termék",
  course: "Oktatás / kurzus",
  service: "Szolgáltatás",
};

export const fulfillmentIcon: Record<Fulfillment, string> = {
  physical: "📦",
  digital: "💾",
  course: "🎓",
  service: "🛠️",
};

export const fulfillmentHint: Record<Fulfillment, string> = {
  physical: "ruha, cipő, telefon, tok – raktárkészlettel és szállítással",
  digital: "letöltés, licenckulcs, sablon – azonnali kézbesítés",
  course: "online kurzus, képzés, workshop – leckék és hozzáférési idő",
  service: "tanácsadás, javítás, egyedi munka – időtartam és időpont",
};

/** Mely mezőcsoportok jelenjenek meg az adott típusnál. */
export interface Capabilities {
  weight: boolean;
  material: boolean;
  variants: boolean;
  stock: boolean;
  shipping: boolean;
  sizes: boolean;
  devices: boolean;
  digitalDelivery: boolean;
  courseContent: boolean;
  booking: boolean;
}

const CAPS: Record<Fulfillment, Capabilities> = {
  physical: { weight: true, material: true, variants: true, stock: true, shipping: true, sizes: true, devices: true, digitalDelivery: false, courseContent: false, booking: false },
  digital: { weight: false, material: false, variants: false, stock: false, shipping: false, sizes: false, devices: false, digitalDelivery: true, courseContent: false, booking: false },
  course: { weight: false, material: false, variants: false, stock: true, shipping: false, sizes: false, devices: false, digitalDelivery: false, courseContent: true, booking: false },
  service: { weight: false, material: false, variants: false, stock: true, shipping: false, sizes: false, devices: false, digitalDelivery: false, courseContent: false, booking: true },
};

export const capabilitiesOf = (f: Fulfillment): Capabilities => CAPS[f] || CAPS.physical;

/** Terméktípus prefix → teljesítési típus. */
export const fulfillmentOfType = (pt?: string | null): Fulfillment => {
  if (!pt) return "physical";
  if (pt.startsWith("digital_course")) return "course";
  if (pt.startsWith("course_")) return "course";
  if (pt.startsWith("digital_")) return "digital";
  if (pt.startsWith("service_")) return "service";
  return "physical";
};

export const defaultTypeOf = (f: Fulfillment): string =>
  f === "digital" ? "digital_download" : f === "course" ? "course_online" : f === "service" ? "service_consulting" : "clothing";

/** Készlet mező felirata típusonként. */
export const stockLabel: Record<Fulfillment, string> = {
  physical: "Készlet",
  digital: "Elérhető darab",
  course: "Létszámkorlát",
  service: "Foglalható helyek",
};

/** Checkout logika: mi történik fizetés után. */
export type CheckoutMode = "shipping" | "instant_delivery" | "enrollment" | "booking";

export const checkoutModeOf = (f: Fulfillment): CheckoutMode =>
  f === "physical" ? "shipping" : f === "digital" ? "instant_delivery" : f === "course" ? "enrollment" : "booking";

export const checkoutModeLabel: Record<CheckoutMode, string> = {
  shipping: "Szállítási cím + fuvarozó választás",
  instant_delivery: "Azonnali kézbesítés e-mailben / letöltési linkkel",
  enrollment: "Beiratkozás – hozzáférés a tananyaghoz",
  booking: "Időpontfoglalás és visszaigazolás",
};

/** Rendelési státusz-folyam típusonként. */
export const orderFlow: Record<Fulfillment, { key: string; label: string }[]> = {
  physical: [
    { key: "paid", label: "Fizetve" },
    { key: "packing", label: "Csomagolás" },
    { key: "shipped", label: "Feladva" },
    { key: "delivered", label: "Kézbesítve" },
  ],
  digital: [
    { key: "paid", label: "Fizetve" },
    { key: "delivered", label: "Kézbesítve" },
    { key: "downloaded", label: "Letöltve" },
  ],
  course: [
    { key: "paid", label: "Fizetve" },
    { key: "enrolled", label: "Beiratkozva" },
    { key: "in_progress", label: "Folyamatban" },
    { key: "completed", label: "Elvégezve" },
  ],
  service: [
    { key: "paid", label: "Fizetve" },
    { key: "booked", label: "Időpont egyeztetve" },
    { key: "in_progress", label: "Teljesítés alatt" },
    { key: "completed", label: "Teljesítve" },
  ],
};

/** Rövid összefoglaló egy termékkártyához. */
export const summaryOf = (f: Fulfillment, attributes: Record<string, any> = {}, stock?: number | null): string => {
  if (f === "physical") return `Készlet: ${stock ?? 0}`;
  if (f === "digital") return `Digitális${attributes.digital_format ? ` · ${attributes.digital_format}` : ""}`;
  if (f === "course") return `Kurzus${attributes.lesson_count ? ` · ${attributes.lesson_count} lecke` : ""}`;
  return `Szolgáltatás${attributes.duration_min ? ` · ${attributes.duration_min} perc` : ""}`;
};

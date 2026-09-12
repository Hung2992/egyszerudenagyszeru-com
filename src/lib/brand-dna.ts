// Brand DNA & Design Token Engine — a partner webshop teljes vizuális "DNS"-e.
// Minden vizuális érték itt van központilag definiálva; a storefront CSS változókon
// keresztül használja. Semmilyen tartalmi adatot nem talál ki, csak stílust ír le.

export type SpacingScale = "compact" | "comfortable" | "spacious";
export type ShadowDepth = "none" | "soft" | "elevated";
export type ButtonShape = "square" | "rounded" | "pill";
export type ButtonStyle = "solid" | "outline";
export type CardStyle = "bordered" | "elevated" | "flat";
export type ImageStyle = "square" | "rounded" | "soft";
export type Tracking = "tight" | "normal" | "wide";
export type PersonalityId = "minimal" | "premium" | "bold" | "editorial" | "friendly";

export interface BrandDna {
  personality: PersonalityId;
  /** Alap sarokkerekítés px-ben (0 = teljesen szögletes). */
  radius: number;
  spacing: SpacingScale;
  shadow: ShadowDepth;
  buttonShape: ButtonShape;
  buttonStyle: ButtonStyle;
  cardStyle: CardStyle;
  imageStyle: ImageStyle;
  /** Keretvastagság px-ben. */
  borderWidth: number;
  headingWeight: number;
  headingTracking: Tracking;
  /** Alap betűméret skálázó (0.9–1.15). */
  typeScale: number;
}

export const PERSONALITIES: Record<PersonalityId, { label: string; description: string; dna: Omit<BrandDna, "personality"> }> = {
  minimal: {
    label: "Minimal",
    description: "Szögletes, levegős, dísztelen — a termék a főszereplő.",
    dna: { radius: 0, spacing: "spacious", shadow: "none", buttonShape: "square", buttonStyle: "solid", cardStyle: "bordered", imageStyle: "square", borderWidth: 1, headingWeight: 700, headingTracking: "wide", typeScale: 1 },
  },
  premium: {
    label: "Prémium",
    description: "Finom árnyékok, nagy whitespace, visszafogott kerekítés.",
    dna: { radius: 2, spacing: "spacious", shadow: "soft", buttonShape: "square", buttonStyle: "solid", cardStyle: "elevated", imageStyle: "square", borderWidth: 1, headingWeight: 700, headingTracking: "wide", typeScale: 1.05 },
  },
  bold: {
    label: "Bold",
    description: "Erős kontraszt, vastag keretek, hangsúlyos CTA-k.",
    dna: { radius: 0, spacing: "comfortable", shadow: "elevated", buttonShape: "square", buttonStyle: "solid", cardStyle: "bordered", imageStyle: "square", borderWidth: 2, headingWeight: 900, headingTracking: "tight", typeScale: 1.1 },
  },
  editorial: {
    label: "Editorial",
    description: "Magazinos ritmus, világos tipográfia, sok levegő.",
    dna: { radius: 0, spacing: "spacious", shadow: "none", buttonShape: "square", buttonStyle: "outline", cardStyle: "flat", imageStyle: "square", borderWidth: 1, headingWeight: 600, headingTracking: "normal", typeScale: 1.05 },
  },
  friendly: {
    label: "Barátságos",
    description: "Lekerekített formák, lágy árnyékok, közvetlen hangulat.",
    dna: { radius: 14, spacing: "comfortable", shadow: "soft", buttonShape: "pill", buttonStyle: "solid", cardStyle: "elevated", imageStyle: "rounded", borderWidth: 1, headingWeight: 700, headingTracking: "normal", typeScale: 1 },
  },
};

export const DEFAULT_BRAND_DNA: BrandDna = { personality: "minimal", ...PERSONALITIES.minimal.dna };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(value)) ? (String(value) as T) : fallback;

/** Bármilyen tárolt értékből érvényes, teljes Brand DNA-t készít. */
export function normalizeBrandDna(raw: unknown): BrandDna {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const personality = pick<PersonalityId>(src.personality, Object.keys(PERSONALITIES) as PersonalityId[], "minimal");
  const base = PERSONALITIES[personality].dna;
  const num = (key: keyof BrandDna, min: number, max: number, fallback: number) => {
    const v = Number(src[key as string]);
    return Number.isFinite(v) ? clamp(v, min, max) : fallback;
  };
  return {
    personality,
    radius: num("radius", 0, 32, base.radius),
    spacing: pick(src.spacing, ["compact", "comfortable", "spacious"] as const, base.spacing),
    shadow: pick(src.shadow, ["none", "soft", "elevated"] as const, base.shadow),
    buttonShape: pick(src.buttonShape, ["square", "rounded", "pill"] as const, base.buttonShape),
    buttonStyle: pick(src.buttonStyle, ["solid", "outline"] as const, base.buttonStyle),
    cardStyle: pick(src.cardStyle, ["bordered", "elevated", "flat"] as const, base.cardStyle),
    imageStyle: pick(src.imageStyle, ["square", "rounded", "soft"] as const, base.imageStyle),
    borderWidth: num("borderWidth", 1, 4, base.borderWidth),
    headingWeight: num("headingWeight", 400, 900, base.headingWeight),
    headingTracking: pick(src.headingTracking, ["tight", "normal", "wide"] as const, base.headingTracking),
    typeScale: num("typeScale", 0.9, 1.2, base.typeScale),
  };
}

/** Preset alkalmazása: minden token a személyiség alapértékére áll vissza. */
export function applyPersonality(id: PersonalityId): BrandDna {
  return { personality: id, ...PERSONALITIES[id].dna };
}

const SECTION_Y: Record<SpacingScale, string> = { compact: "2.5rem", comfortable: "3.5rem", spacious: "5rem" };
const GAP: Record<SpacingScale, string> = { compact: "0.75rem", comfortable: "1.25rem", spacious: "2rem" };
const TRACKING: Record<Tracking, string> = { tight: "-0.02em", normal: "0em", wide: "0.08em" };

function shadowValue(depth: ShadowDepth, textColor: string): string {
  if (depth === "none") return "none";
  const soft = depth === "soft";
  const a = soft ? "14" : "2e";
  return soft
    ? `0 8px 24px -12px ${textColor}${a}`
    : `0 18px 40px -18px ${textColor}${a}`;
}

/** A Brand DNA-ból CSS custom property-ket készít a storefront gyökerére. */
export function brandDnaCssVars(dna: BrandDna, textColor = "#000000"): Record<string, string> {
  const safeText = /^#[0-9a-fA-F]{6}$/.test(String(textColor)) ? String(textColor) : "#000000";
  const btnRadius =
    dna.buttonShape === "pill" ? "999px" : dna.buttonShape === "rounded" ? `${Math.max(6, dna.radius)}px` : `${dna.radius}px`;
  const imgRadius =
    dna.imageStyle === "square" ? "0px" : dna.imageStyle === "rounded" ? `${Math.max(8, dna.radius)}px` : `${Math.max(16, dna.radius + 8)}px`;
  return {
    "--sf-radius": `${dna.radius}px`,
    "--sf-radius-btn": btnRadius,
    "--sf-radius-img": imgRadius,
    "--sf-border-w": `${dna.borderWidth}px`,
    "--sf-shadow": shadowValue(dna.shadow, safeText),
    "--sf-card-shadow": dna.cardStyle === "elevated" ? shadowValue(dna.shadow === "none" ? "soft" : dna.shadow, safeText) : "none",
    "--sf-card-border-w": dna.cardStyle === "flat" ? "0px" : `${dna.borderWidth}px`,
    "--sf-section-y": SECTION_Y[dna.spacing],
    "--sf-gap": GAP[dna.spacing],
    "--sf-heading-weight": String(dna.headingWeight),
    "--sf-heading-tracking": TRACKING[dna.headingTracking],
    "--sf-type-scale": String(dna.typeScale),
  };
}

export const SPACING_LABELS: Record<SpacingScale, string> = { compact: "Kompakt", comfortable: "Kiegyensúlyozott", spacious: "Levegős" };
export const SHADOW_LABELS: Record<ShadowDepth, string> = { none: "Nincs", soft: "Lágy", elevated: "Kiemelt" };
export const BUTTON_SHAPE_LABELS: Record<ButtonShape, string> = { square: "Szögletes", rounded: "Enyhén kerekített", pill: "Pill" };
export const CARD_STYLE_LABELS: Record<CardStyle, string> = { bordered: "Keretes", elevated: "Árnyékolt", flat: "Sima" };
export const IMAGE_STYLE_LABELS: Record<ImageStyle, string> = { square: "Szögletes", rounded: "Kerekített", soft: "Lágy" };
export const TRACKING_LABELS: Record<Tracking, string> = { tight: "Szoros", normal: "Normál", wide: "Tágas" };

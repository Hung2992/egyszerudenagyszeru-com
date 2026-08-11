// Order Fulfillment Engine
// ------------------------------------------------------------------
// A rendelési motor NEM tudja, hogy egy tétel "kurzus" vagy "digitális".
// Csak azt kérdezi: milyen capability-k vannak bekapcsolva a terméknél?
// Egy rendelésen belül tetszőlegesen keveredhetnek a típusok
// (📦 telefon + 💾 licenc + 🎓 kurzus + 🛠️ beüzemelés).

import {
  Fulfillment,
  CapabilityKey,
  capabilitiesOf,
  checkoutModeOf,
  fulfillmentIcon,
  fulfillmentLabel,
  orderFlow,
} from "./product-schema";

export interface OrderLineInput {
  id: string;
  product_id?: string | null;
  name: string;
  quantity: number;
  fulfillment: Fulfillment;
  attributes?: Record<string, any>;
  variant?: { size?: string | null; color?: string | null } | null;
}

export type FulfillmentTaskKind =
  | "reserve_inventory"
  | "create_shipment"
  | "create_download_access"
  | "issue_license"
  | "activate_course_access"
  | "issue_certificate"
  | "grant_access"
  | "create_appointment"
  | "reserve_capacity"
  | "schedule_custom_work";

export interface FulfillmentTask {
  kind: FulfillmentTaskKind;
  lineId: string;
  productId?: string | null;
  label: string;
  /** Melyik capability váltotta ki a feladatot. */
  capability: CapabilityKey;
  payload: Record<string, any>;
}

/** capability → az általa kiváltott feladatok. Új típus bevezetésekor itt nem kell hozzányúlni semmihez. */
const CAPABILITY_TASKS: Partial<
  Record<CapabilityKey, (line: OrderLineInput) => FulfillmentTask[]>
> = {
  inventory: (l) => [
    {
      kind: "reserve_inventory",
      lineId: l.id,
      productId: l.product_id,
      label: `Készletfoglalás – ${l.quantity} db`,
      capability: "inventory",
      payload: { quantity: l.quantity, variant: l.variant ?? null },
    },
  ],
  shipping: (l) => [
    {
      kind: "create_shipment",
      lineId: l.id,
      productId: l.product_id,
      label: "Csomag létrehozása és feladása",
      capability: "shipping",
      payload: { weight_g: l.attributes?.weight_g ?? null, quantity: l.quantity },
    },
  ],
  download: (l) => [
    {
      kind: "create_download_access",
      lineId: l.id,
      productId: l.product_id,
      label: "Letöltési hozzáférés létrehozása",
      capability: "download",
      payload: {
        file_url: l.attributes?.digital_file_url ?? null,
        download_limit: l.attributes?.download_limit ?? null,
        format: l.attributes?.digital_format ?? null,
      },
    },
  ],
  license: (l) => [
    {
      kind: "issue_license",
      lineId: l.id,
      productId: l.product_id,
      label: "Licenckulcs kiadása",
      capability: "license",
      payload: { seats: l.quantity, license_type: l.attributes?.license_type ?? "single" },
    },
  ],
  lessons: (l) => [
    {
      kind: "activate_course_access",
      lineId: l.id,
      productId: l.product_id,
      label: "Kurzus-hozzáférés aktiválása",
      capability: "lessons",
      payload: {
        modules: l.attributes?.course_modules ?? [],
        access_days: l.attributes?.access_days ?? null,
      },
    },
  ],
  certificate: (l) => [
    {
      kind: "issue_certificate",
      lineId: l.id,
      productId: l.product_id,
      label: "Oklevél kiállítása teljesítéskor",
      capability: "certificate",
      payload: { requires_completion: true },
    },
  ],
  accessControl: (l) => [
    {
      kind: "grant_access",
      lineId: l.id,
      productId: l.product_id,
      label: "Hozzáférés engedélyezése a vásárlónak",
      capability: "accessControl",
      payload: { access_days: l.attributes?.access_days ?? null },
    },
  ],
  appointment: (l) => [
    {
      kind: "create_appointment",
      lineId: l.id,
      productId: l.product_id,
      label: "Időpont létrehozása és visszaigazolás",
      capability: "appointment",
      payload: {
        duration_min: l.attributes?.duration_min ?? null,
        location: l.attributes?.service_location ?? null,
        booking_url: l.attributes?.booking_url ?? null,
      },
    },
  ],
  capacity: (l) => [
    {
      kind: "reserve_capacity",
      lineId: l.id,
      productId: l.product_id,
      label: `Kapacitás lefoglalása – ${l.quantity} hely`,
      capability: "capacity",
      payload: { seats: l.quantity },
    },
  ],
  customWork: (l) => [
    {
      kind: "schedule_custom_work",
      lineId: l.id,
      productId: l.product_id,
      label: "Egyedi munka ütemezése",
      capability: "customWork",
      payload: { notes: l.attributes?.custom_notes ?? null },
    },
  ],
};

/** Egy tételhez tartozó feladatok – tisztán capability alapján. */
export function tasksForLine(line: OrderLineInput): FulfillmentTask[] {
  const caps = capabilitiesOf(line.fulfillment);
  const out: FulfillmentTask[] = [];
  (Object.keys(CAPABILITY_TASKS) as CapabilityKey[]).forEach((key) => {
    if (caps[key]) out.push(...(CAPABILITY_TASKS[key]!(line)));
  });
  return out;
}

export interface FulfillmentPlan {
  tasks: FulfillmentTask[];
  /** A rendelésben ténylegesen aktív capability-k uniója. */
  capabilities: CapabilityKey[];
  /** Vegyes rendelés-e (többféle teljesítési típus). */
  mixed: boolean;
  fulfillments: Fulfillment[];
  /** Tételenkénti státusz-folyam (mert típusonként eltér). */
  lineFlows: { lineId: string; name: string; icon: string; typeLabel: string; checkout: string; steps: { key: string; label: string }[] }[];
}

/** Teljes rendelési terv – egy motor kezeli a vegyes kosarat is. */
export function buildFulfillmentPlan(lines: OrderLineInput[]): FulfillmentPlan {
  const tasks = lines.flatMap(tasksForLine);
  const capSet = new Set<CapabilityKey>(tasks.map((t) => t.capability));
  const fulfillments = Array.from(new Set(lines.map((l) => l.fulfillment)));

  return {
    tasks,
    capabilities: Array.from(capSet),
    mixed: fulfillments.length > 1,
    fulfillments,
    lineFlows: lines.map((l) => ({
      lineId: l.id,
      name: l.name,
      icon: fulfillmentIcon[l.fulfillment],
      typeLabel: fulfillmentLabel[l.fulfillment],
      checkout: checkoutModeOf(l.fulfillment),
      steps: orderFlow[l.fulfillment],
    })),
  };
}

/** A rendelés akkor van kész, ha minden tétel elérte a saját folyamának utolsó lépését. */
export function isOrderComplete(
  lines: OrderLineInput[],
  statusByLine: Record<string, string>,
): boolean {
  return lines.every((l) => {
    const flow = orderFlow[l.fulfillment];
    return statusByLine[l.id] === flow[flow.length - 1].key;
  });
}

/** Audit-barát esemény-leírás a tervhez (Agent Bus / order_events felé). */
export function planToEvents(orderId: string, plan: FulfillmentPlan) {
  return plan.tasks.map((t) => ({
    order_id: orderId,
    event_type: `fulfillment.${t.kind}`,
    description: t.label,
    metadata: { capability: t.capability, line_id: t.lineId, product_id: t.productId ?? null, ...t.payload },
  }));
}

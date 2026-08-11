import { buildFulfillmentPlan, type OrderLineInput } from "@/lib/order-fulfillment-engine";
import { capabilityLabel, fulfillmentOfType, checkoutModeLabel, type Fulfillment } from "@/lib/product-schema";
import { Badge } from "@/components/ui/badge";

/** Nyers rendelési tételekből (jsonb) capability-alapú teljesítési terv. */
export default function OrderFulfillmentPlan({ items }: { items: any[] }) {
  const lines: OrderLineInput[] = (items || []).map((it, i) => {
    const ff: Fulfillment = (it.fulfillment_type as Fulfillment) || fulfillmentOfType(it.product_type);
    return {
      id: String(it.id ?? i),
      product_id: it.product_id ?? null,
      name: it.title || it.name || "Tétel",
      quantity: Number(it.qty || it.quantity || 1),
      fulfillment: ff,
      attributes: it.attributes || {},
      variant: { size: it.size ?? null, color: it.color ?? null },
    };
  });

  if (!lines.length) return null;
  const plan = buildFulfillmentPlan(lines);

  return (
    <div className="border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Teljesítési terv</span>
        {plan.mixed && <Badge variant="outline" className="rounded-none text-[10px]">Vegyes rendelés</Badge>}
      </div>

      <div className="flex flex-wrap gap-1">
        {plan.capabilities.map((c) => (
          <Badge key={c} variant="secondary" className="rounded-none text-[10px]">{capabilityLabel[c]}</Badge>
        ))}
      </div>

      <div className="space-y-2">
        {plan.lineFlows.map((lf) => (
          <div key={lf.lineId} className="text-xs">
            <div className="font-medium">{lf.icon} {lf.name} <span className="text-muted-foreground">· {lf.typeLabel}</span></div>
            <div className="text-[10px] text-muted-foreground">
              {checkoutModeLabel[lf.checkout as keyof typeof checkoutModeLabel]} — {lf.steps.map((s) => s.label).join(" → ")}
            </div>
            <ul className="mt-1 space-y-0.5">
              {plan.tasks.filter((t) => t.lineId === lf.lineId).map((t, i) => (
                <li key={i} className="text-[11px] text-muted-foreground">• {t.label}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { buildFulfillmentPlan, type OrderLineInput } from "@/lib/order-fulfillment-engine";
import { capabilityLabel, fulfillmentOfType, checkoutModeLabel, type Fulfillment } from "@/lib/product-schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

interface Props { items: any[]; orderId?: string; partnerId?: string }

/** Nyers rendelési tételekből (jsonb) capability-alapú teljesítési terv. */
export default function OrderFulfillmentPlan({ items, orderId, partnerId }: Props) {
  const [running, setRunning] = useState(false);

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
  const autoCaps = ["download", "license", "lessons", "appointment"];
  const canAutoFulfill = plan.capabilities.some((c) => autoCaps.includes(c));

  const runFulfillment = async () => {
    if (!orderId || !partnerId) return;
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("order-fulfillment", {
      body: { order_id: orderId, partner_id: partnerId },
    });
    setRunning(false);
    if (error) { toast.error(`Teljesítés hiba: ${error.message}`); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    toast.success(`Kiszolgálás kész — ${(data as any)?.created_count ?? 0} tétel aktiválva`);
  };

  return (
    <div className="border border-border p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Teljesítési terv</span>
        {plan.mixed && <Badge variant="outline" className="rounded-none text-[10px]">Vegyes rendelés</Badge>}
        {canAutoFulfill && orderId && partnerId && (
          <Button size="sm" variant="outline" className="rounded-none ml-auto h-7 text-[11px]" disabled={running} onClick={runFulfillment}>
            {running ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
            Digitális kiszolgálás indítása
          </Button>
        )}
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

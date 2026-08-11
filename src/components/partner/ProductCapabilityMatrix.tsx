import {
  FULFILLMENTS, Fulfillment, fulfillmentIcon, fulfillmentLabel,
  BUSINESS_CAPABILITIES, capabilityLabel, capabilitiesOf,
  checkoutModeOf, checkoutModeLabel, orderFlow,
} from "@/lib/product-schema";

interface Props {
  active?: Fulfillment;
}

/** Típus → képesség mátrix: egyetlen séma vezérli az UI-t, checkoutot és a rendelési folyamatot. */
export default function ProductCapabilityMatrix({ active }: Props) {
  return (
    <div className="border border-border">
      <div className="px-3 py-2 border-b border-border text-xs font-bold uppercase tracking-wider">
        Terméktípus képesség-mátrix
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 font-medium text-muted-foreground">Képesség</th>
              {FULFILLMENTS.map((f) => (
                <th
                  key={f}
                  className={`p-2 font-bold whitespace-nowrap ${active === f ? "bg-muted" : ""}`}
                >
                  {fulfillmentIcon[f]} {fulfillmentLabel[f]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BUSINESS_CAPABILITIES.map((key) => (
              <tr key={key} className="border-b border-border/50">
                <td className="p-2 text-muted-foreground">{capabilityLabel[key]}</td>
                {FULFILLMENTS.map((f) => (
                  <td
                    key={f}
                    className={`p-2 text-center ${active === f ? "bg-muted" : ""}`}
                  >
                    {capabilitiesOf(f)[key] ? (
                      <span className="text-primary font-bold">✓</span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-b border-border/50">
              <td className="p-2 text-muted-foreground">Checkout</td>
              {FULFILLMENTS.map((f) => (
                <td key={f} className={`p-2 text-center ${active === f ? "bg-muted" : ""}`}>
                  {checkoutModeLabel[checkoutModeOf(f)]}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-2 text-muted-foreground">Rendelési folyam</td>
              {FULFILLMENTS.map((f) => (
                <td key={f} className={`p-2 text-center ${active === f ? "bg-muted" : ""}`}>
                  {orderFlow[f].map((s) => s.label).join(" → ")}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

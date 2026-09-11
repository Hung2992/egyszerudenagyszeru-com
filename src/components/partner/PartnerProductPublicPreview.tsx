import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, CalendarDays, Truck, Clock } from "lucide-react";

interface Props {
  partnerId: string;
  product: any;
}

const fmtHuf = (n: any) =>
  Number(n || 0).toLocaleString("hu-HU", { maximumFractionDigits: 0 }) + " Ft";

const fmtDt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" }) : "–";

/** A partner admin-oldalán mutatja, hogyan néz ki a termék nyilvános oldala:
 *  ár, szállítási idő, napi állapot (naptár) és a foglalási űrlap állapota. */
const PartnerProductPublicPreview = ({ partnerId, product }: Props) => {
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [day, setDay] = useState<{ booked_today: number; next_booking_at: string | null } | null>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  const attrs = (product?.attributes && typeof product.attributes === "object" ? product.attributes : {}) as any;
  const ptype = String(product?.product_type || "");
  const ff = String(product?.fulfillment_type || "physical");
  const isService = ptype.startsWith("service") || ff === "service";
  const isCourse = ptype.startsWith("course") || ff === "course";
  const bookable = attrs.booking_enabled !== false && (isService || (isCourse && !!attrs.live_schedule));
  const isPhysical = ff === "physical";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("partner_storefronts")
        .select("slug, is_published")
        .eq("partner_id", partnerId)
        .maybeSingle();
      if (cancelled) return;
      setStoreSlug(data?.slug || null);
      setPublished(!!data?.is_published);
    })();
    return () => { cancelled = true; };
  }, [partnerId]);

  useEffect(() => {
    let cancelled = false;
    if (!product?.id) return;
    (async () => {
      const { data } = await supabase.rpc("public_product_day_status", { _product_id: product.id });
      if (!cancelled) setDay(Array.isArray(data) ? data[0] ?? null : data ?? null);
      const { data: appts } = await supabase
        .from("partner_appointments")
        .select("id, customer_name, starts_at, status")
        .eq("product_id", product.id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(5);
      if (!cancelled) setUpcoming(appts || []);
    })();
    return () => { cancelled = true; };
  }, [product?.id]);

  if (!product?.id) return null;

  const publicUrl = storeSlug && product.slug ? `/b/${storeSlug}/termek/${product.slug}` : null;

  return (
    <Card className="rounded-none border-foreground/20 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Nyilvános termékoldal előnézet
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-none text-[10px]">
            {product.status === "active" ? "Élő" : "Nem élő"}
          </Badge>
          <Badge variant="outline" className="rounded-none text-[10px]">
            {published ? "Webshop publikálva" : "Webshop nincs publikálva"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="border border-foreground/10 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ár</div>
          <div className="text-sm font-bold">{fmtHuf(product.price_huf)}</div>
          {product.compare_price_huf ? (
            <div className="text-[10px] text-muted-foreground line-through">{fmtHuf(product.compare_price_huf)}</div>
          ) : null}
        </div>

        <div className="border border-foreground/10 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Truck className="h-3 w-3" /> {isPhysical ? "Szállítás" : "Teljesítés"}
          </div>
          <div className="text-xs">
            {isPhysical
              ? attrs.shipping_time || "Nincs megadva szállítási idő"
              : isService
                ? `${Number(attrs.service_duration_min) > 0 ? attrs.service_duration_min : 60} perc`
                : attrs.delivery_note || "Azonnali hozzáférés"}
          </div>
          {isPhysical && (
            <div className="text-[10px] text-muted-foreground">
              {attrs.shipping_fee_huf ? `${fmtHuf(attrs.shipping_fee_huf)} díj` : "Díj nincs megadva"}
              {attrs.free_shipping_over_huf ? ` · ingyenes ${fmtHuf(attrs.free_shipping_over_huf)} felett` : ""}
            </div>
          )}
        </div>

        <div className="border border-foreground/10 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> Mai állapot
          </div>
          <div className="text-sm font-bold">{day?.booked_today ?? 0} mai foglalás</div>
          <div className="text-[10px] text-muted-foreground">
            Következő: {fmtDt(day?.next_booking_at)}
          </div>
        </div>
      </div>

      <div className="border border-foreground/10 p-2 space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> Foglalási űrlap
        </div>
        {bookable ? (
          <>
            <div className="text-xs">Bekapcsolva – az ügyfelek a nyilvános oldalon foglalhatnak.</div>
            {upcoming.length > 0 ? (
              <ul className="space-y-1 pt-1">
                {upcoming.map((a) => (
                  <li key={a.id} className="text-[11px] flex justify-between gap-2 border-b border-foreground/10 pb-1">
                    <span className="truncate">{a.customer_name || "Ügyfél"}</span>
                    <span className="text-muted-foreground whitespace-nowrap">{fmtDt(a.starts_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[10px] text-muted-foreground">Még nincs közelgő foglalás.</div>
            )}
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            {isService || isCourse
              ? "Kikapcsolva – a Szolgáltatás beállításoknál kapcsolhatod be."
              : "Ennél a terméktípusnál nincs foglalás, az ügyfelek kosárba teszik."}
          </div>
        )}
      </div>

      {publicUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-none w-full sm:w-auto"
          onClick={() => window.open(publicUrl, "_blank", "noopener")}
        >
          <ExternalLink className="h-3 w-3 mr-1" /> Nyilvános oldal megnyitása
        </Button>
      )}
    </Card>
  );
};

export default PartnerProductPublicPreview;

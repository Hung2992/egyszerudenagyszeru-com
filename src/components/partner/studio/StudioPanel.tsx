import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp, CheckCircle2, AlertTriangle, XCircle, Pencil, RefreshCw } from "lucide-react";
import {
  SECTION_DEFS,
  normalizeSectionOrder,
  moveSection,
  runShopQa,
  studioStateOf,
  STUDIO_STATE_LABELS,
  QA_AREA_LABELS,
  type SectionId,
  type QaArea,
  type QaReport,
} from "@/lib/storefront-studio";

interface Props {
  partnerId: string;
  sf: Record<string, any>;
  onChange: (key: string, value: unknown) => void;
  onJumpToTab: (tab: string) => void;
  onReport?: (report: QaReport) => void;
}

const scoreTone = (n: number) =>
  n >= 90 ? "text-emerald-500" : n >= 70 ? "text-amber-500" : "text-red-500";

const StudioPanel = ({ partnerId, sf, onChange, onJumpToTab }: Props) => {
  const [products, setProducts] = useState<any[]>([]);
  const [shippingCount, setShippingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [{ data: prods }, { count }] = await Promise.all([
      supabase
        .from("partner_products")
        .select("id, title, price_huf, status, image_url, images")
        .eq("partner_id", partnerId),
      supabase
        .from("partner_shipping_methods")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partnerId)
        .eq("is_active", true),
    ]);
    setProducts(prods || []);
    setShippingCount(count || 0);
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [partnerId]);

  const report: QaReport = useMemo(
    () => runShopQa({ storefront: sf, products: products as any, shippingMethodCount: shippingCount }),
    [sf, products, shippingCount],
  );

  const state = studioStateOf(sf, report);
  const order = useMemo(() => normalizeSectionOrder(sf.section_order), [sf.section_order]);

  // A nem mozgatható keretelemek (hirdetősáv, hero) mindig elöl jelennek meg.
  const fixedTop = SECTION_DEFS.filter((s) => !s.movable);
  const byId = (id: SectionId) => SECTION_DEFS.find((s) => s.id === id)!;

  const setOrder = (next: SectionId[]) => onChange("section_order", next);

  const areaKeys = Object.keys(QA_AREA_LABELS) as QaArea[];
  const errors = report.issues.filter((i) => i.severity === "error");
  const warns = report.issues.filter((i) => i.severity === "warn");

  return (
    <div className="space-y-4">
      {/* Állapot + összpontszám */}
      <Card className="rounded-none border-foreground/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className={`text-4xl font-bold tabular-nums ${scoreTone(report.total)}`}>
                {report.total}
                <span className="text-base text-muted-foreground"> / 100</span>
              </div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Webshop minőség</div>
            </div>
            <Badge
              variant={state === "published" ? "default" : state === "failed" ? "destructive" : "secondary"}
              className="rounded-none uppercase"
            >
              {STUDIO_STATE_LABELS[state]}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" /> {report.issues.length === 0 ? "Minden ellenőrzés rendben" : "Rendben"}
            </span>
            <span className="flex items-center gap-1 text-amber-500"><AlertTriangle className="h-3.5 w-3.5" /> {warns.length} javasolt</span>
            <span className="flex items-center gap-1 text-red-500"><XCircle className="h-3.5 w-3.5" /> {errors.length} kritikus</span>
            <Button size="sm" variant="outline" className="rounded-none" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {areaKeys.map((a) => (
            <div key={a} className="border border-foreground/15 p-3">
              <div className={`text-xl font-bold tabular-nums ${scoreTone(report.areas[a])}`}>{report.areas[a]}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{QA_AREA_LABELS[a]}</div>
            </div>
          ))}
        </div>

        {!report.publishable && (
          <p className="mt-4 border-l-2 border-red-500 pl-3 text-xs text-muted-foreground">
            A bolt jelenleg nem publikálható: előbb javítsd a kritikus hibákat.
          </p>
        )}
      </Card>

      {/* Hibalista, javítási ugrással */}
      {report.issues.length > 0 && (
        <Card className="rounded-none border-foreground/20 p-5 space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest">Ellenőrzési jelentés</div>
          {[...errors, ...warns].map((issue, i) => (
            <div key={i} className="flex flex-wrap items-start justify-between gap-2 border-b border-foreground/10 py-2 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  {issue.severity === "error"
                    ? <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                    : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                  <span className="font-medium">{issue.message}</span>
                </div>
                <p className="mt-0.5 pl-5 text-xs text-muted-foreground">{issue.fix}</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-none" onClick={() => onJumpToTab(issue.editorTab)}>
                Javítás
              </Button>
            </div>
          ))}
        </Card>
      )}

      {/* Szekciófa */}
      <Card className="rounded-none border-foreground/20 p-5 space-y-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest">Webshop szerkezete</div>
          <p className="text-xs text-muted-foreground">A sorrend és a be-/kikapcsolás azonnal látszik az élő előnézetben. Mentés után élesíthető.</p>
        </div>

        {fixedTop.map((s) => (
          <div key={s.id} className="flex items-center justify-between border border-foreground/15 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Fix</span>
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {s.toggleField && (
                <Switch
                  checked={!!sf[s.toggleField]}
                  onCheckedChange={(v) => onChange(s.toggleField!, v)}
                  aria-label={`${s.label} megjelenítése`}
                />
              )}
              <Button size="sm" variant="ghost" className="rounded-none" onClick={() => onJumpToTab(s.editorTab)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {order.map((id, index) => {
          const s = byId(id);
          return (
            <div key={id} className="flex items-center justify-between border border-foreground/15 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-5 text-xs tabular-nums text-muted-foreground">{index + 1}.</span>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm" variant="ghost" className="rounded-none"
                  aria-label={`${s.label} feljebb`}
                  disabled={index === 0}
                  onClick={() => setOrder(moveSection(order, id, -1))}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm" variant="ghost" className="rounded-none"
                  aria-label={`${s.label} lejjebb`}
                  disabled={index === order.length - 1}
                  onClick={() => setOrder(moveSection(order, id, 1))}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                {s.toggleField && (
                  <Switch
                    checked={!!sf[s.toggleField]}
                    onCheckedChange={(v) => onChange(s.toggleField!, v)}
                    aria-label={`${s.label} megjelenítése`}
                  />
                )}
                <Button size="sm" variant="ghost" className="rounded-none" onClick={() => onJumpToTab(s.editorTab)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

export default StudioPanel;

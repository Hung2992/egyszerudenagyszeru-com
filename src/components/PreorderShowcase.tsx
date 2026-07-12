import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CalendarClock, ArrowRight, Package } from "lucide-react";
import { RetryCard } from "@/components/RetryCard";
import { classifySupabaseError } from "@/lib/supabase-errors";

interface PreorderProduct {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  preorder_count: number | null;
  preorder_limit: number | null;
  preorder_deposit_percent: number | null;
  launch_date: string | null;
}

const fetchPreorderProducts = async (): Promise<PreorderProduct[]> => {
  const { data, error } = await supabase
    .from("shop_products")
    .select(
      "id, name, price, original_price, image_url, preorder_count, preorder_limit, preorder_deposit_percent, launch_date",
    )
    .eq("preorder_enabled", true)
    .eq("is_active", true)
    .order("launch_date", { ascending: true, nullsFirst: false })
    .limit(6);
  if (error) throw error;
  return (data as PreorderProduct[]) ?? [];
};

const SectionShell = ({ children }: { children: React.ReactNode }) => (
  <section className="border-t border-border bg-secondary/20">
    <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 px-3 py-1 mb-4">
            <CalendarClock className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
              Előrendelhető
            </span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground leading-tight">
            Előrendelhető termékek
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Biztosítsd a helyed a következő drop előtt — limitált darabszám.
          </p>
        </div>
      </div>
      {children}
    </div>
  </section>
);

const PreorderSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6" aria-hidden>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="border border-border bg-background">
        <div className="aspect-square animate-pulse bg-secondary" />
        <div className="p-3 md:p-4 space-y-2">
          <div className="h-3 w-3/4 animate-pulse bg-secondary" />
          <div className="h-3 w-1/2 animate-pulse bg-secondary" />
        </div>
      </div>
    ))}
  </div>
);

const PreorderShowcase = () => {
  const navigate = useNavigate();
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["preorder-showcase"],
    queryFn: fetchPreorderProducts,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <SectionShell>
        <PreorderSkeleton />
      </SectionShell>
    );
  }

  if (error && !data) {
    const { message } = classifySupabaseError(error);
    return (
      <SectionShell>
        <RetryCard
          title="A termékek nem töltődtek be"
          message={message}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </SectionShell>
    );
  }

  const products = data ?? [];
  if (products.length === 0) return null;

  return (
    <section className="border-t border-border bg-secondary/20">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 px-3 py-1 mb-4">
              <CalendarClock className="h-3.5 w-3.5 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
                Előrendelhető
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground leading-tight">
              Előrendelhető termékek
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Biztosítsd a helyed a következő drop előtt — limitált darabszám.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-none uppercase tracking-[0.2em] text-xs h-11"
            onClick={() => navigate("/launch")}
          >
            Összes
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {products.map((p) => {
            const remaining = p.preorder_limit
              ? Math.max(0, p.preorder_limit - (p.preorder_count || 0))
              : null;
            const soldOut = remaining === 0;
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                className="group text-left border border-border bg-background hover:border-accent transition-colors"
              >
                <div className="aspect-square overflow-hidden bg-secondary relative">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-1">
                    Előrendelés
                  </div>
                  {soldOut && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <span className="text-xs font-bold uppercase tracking-wider">Betelt</span>
                    </div>
                  )}
                </div>
                <div className="p-3 md:p-4 space-y-1.5">
                  <h3 className="text-xs md:text-sm font-bold text-foreground line-clamp-2 uppercase tracking-wide">
                    {p.name}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm md:text-base font-bold text-accent">
                      {Number(p.price).toLocaleString("hu-HU")} Ft
                    </span>
                    {p.original_price && Number(p.original_price) > Number(p.price) && (
                      <span className="text-[10px] text-muted-foreground line-through">
                        {Number(p.original_price).toLocaleString("hu-HU")} Ft
                      </span>
                    )}
                  </div>
                  {(p.preorder_deposit_percent ?? 0) > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Előleg: {p.preorder_deposit_percent}%
                    </p>
                  )}
                  {remaining !== null && !soldOut && (
                    <p className="text-[10px] text-accent font-bold uppercase tracking-wider">
                      Még {remaining} db
                    </p>
                  )}
                  {p.launch_date && (
                    <p className="text-[10px] text-muted-foreground">
                      Indul: {new Date(p.launch_date).toLocaleDateString("hu-HU")}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PreorderShowcase;

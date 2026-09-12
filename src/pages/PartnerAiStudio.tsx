import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { usePartnerCheck } from "@/hooks/usePartnerCheck";
import AiWebCreatorChat from "@/components/partner/AiWebCreatorChat";
import StorefrontLivePreview from "@/components/partner/StorefrontLivePreview";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, MonitorPlay, Loader2, ExternalLink } from "lucide-react";
import { buildPreviewUrl } from "@/lib/partner-storefront-urls";

/**
 * Külön, teljes képernyős AI Studio oldal (Lovable-stílus):
 * bal oldalon a beszélgetés, jobb oldalon az élő webshop előnézet.
 * Mobilon a két nézet között váltani lehet.
 */
const PartnerAiStudio = () => {
  const navigate = useNavigate();
  const { partner, loading } = usePartnerCheck();
  const [sf, setSf] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");

  const load = async (partnerId: string) => {
    const { data } = await supabase
      .from("partner_storefronts")
      .select("*")
      .eq("partner_id", partnerId)
      .maybeSingle();
    setSf(data || null);
  };

  useEffect(() => {
    if (partner?.id) void load(partner.id);
  }, [partner?.id]);

  useEffect(() => {
    if (!loading && !partner) navigate("/partner", { replace: true });
  }, [loading, partner, navigate]);

  if (loading || !partner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const previewUrl = buildPreviewUrl(window.location.origin, sf || {});

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      <Helmet>
        <title>AI Studio — partner webshop építő</title>
        <meta name="description" content="Beszélgess az AI fejlesztőcsapattal, és élőben nézd, ahogy felépül a webshopod." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Fejléc */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button asChild variant="ghost" size="sm" className="rounded-none h-8 px-2">
          <Link to="/partner?tab=storefront" aria-label="Vissza a partnerportálra">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate font-heading text-sm">AI Studio</h1>
          <p className="truncate text-[11px] text-muted-foreground">
            {sf?.display_name || partner.company_name || partner.full_name}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {previewUrl && (
            <Button asChild variant="outline" size="sm" className="hidden rounded-none h-8 text-xs md:inline-flex">
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" /> Megnyitás
              </a>
            </Button>
          )}
          {/* Mobil nézetváltó */}
          <div className="flex border border-border md:hidden">
            <button
              type="button"
              onClick={() => setMobileView("chat")}
              aria-pressed={mobileView === "chat"}
              className={`flex items-center gap-1 px-2 py-1.5 text-[11px] ${mobileView === "chat" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              <MessageSquare className="h-3 w-3" /> Chat
            </button>
            <button
              type="button"
              onClick={() => setMobileView("preview")}
              aria-pressed={mobileView === "preview"}
              className={`flex items-center gap-1 px-2 py-1.5 text-[11px] ${mobileView === "preview" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              <MonitorPlay className="h-3 w-3" /> Előnézet
            </button>
          </div>
        </div>
      </header>

      {/* Split munkaterület */}
      <main className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section
          className={`min-h-0 overflow-auto border-border p-3 md:block md:border-r ${mobileView === "chat" ? "block" : "hidden"}`}
          aria-label="AI beszélgetés"
        >
          <AiWebCreatorChat
            partnerId={partner.id}
            onApplied={(patch) => {
              setSf((cur: any) => ({ ...(cur || {}), ...patch }));
              setRefreshKey((k) => k + 1);
              void load(partner.id);
            }}
          />
        </section>

        <section
          className={`min-h-0 overflow-auto bg-muted/20 p-3 md:block ${mobileView === "preview" ? "block" : "hidden"}`}
          aria-label="Élő előnézet"
        >
          {sf?.slug ? (
            <StorefrontLivePreview
              storefrontId={sf?.id ?? null}
              slug={sf.slug}
              draft={sf}
              refreshKey={refreshKey}
            />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              Még nincs webshopod. Írd le a chatben, milyen boltot szeretnél, és az AI felépíti.
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default PartnerAiStudio;

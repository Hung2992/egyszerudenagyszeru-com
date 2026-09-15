import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { usePartnerCheck } from "@/hooks/usePartnerCheck";
import AiWebCreatorChat from "@/components/partner/AiWebCreatorChat";
import StorefrontLivePreview from "@/components/partner/StorefrontLivePreview";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, MonitorPlay, Columns2, Loader2, ExternalLink } from "lucide-react";
import { buildPreviewUrl } from "@/lib/partner-storefront-urls";

type MobileView = "chat" | "preview" | "split";

/**
 * Külön, teljes képernyős AI Studio oldal (Lovable-stílus):
 * bal oldalon a beszélgetés, jobb oldalon az élő webshop előnézet.
 * Mobilon chat / előnézet / osztott nézet között lehet váltani.
 */
const PartnerAiStudio = () => {
  const navigate = useNavigate();
  const { partner, loading } = usePartnerCheck();
  const [params] = useSearchParams();
  const initialPrompt = params.get("prompt") || "";
  const [sf, setSf] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileView, setMobileView] = useState<MobileView>("chat");

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

  const VIEWS: { key: MobileView; label: string; Icon: typeof MessageSquare }[] = [
    { key: "chat", label: "Chat", Icon: MessageSquare },
    { key: "split", label: "Kettő", Icon: Columns2 },
    { key: "preview", label: "Bolt", Icon: MonitorPlay },
  ];

  const showChat = mobileView === "chat" || mobileView === "split";
  const showPreview = mobileView === "preview" || mobileView === "split";

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      <Helmet>
        <title>AI Studio — partner webshop építő</title>
        <meta name="description" content="Beszélgess az AI fejlesztőcsapattal, és élőben nézd, ahogy felépül a webshopod." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Fejléc */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 md:px-3">
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
            {VIEWS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMobileView(key)}
                aria-pressed={mobileView === key}
                className={`flex items-center gap-1 px-2 py-1.5 text-[11px] ${mobileView === key ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                <Icon className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Split munkaterület */}
      <main className="grid min-h-0 flex-1 grid-rows-[auto] md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:grid-rows-1 overflow-y-auto md:overflow-hidden">
        <section
          className={`min-h-0 overflow-auto border-border p-2 md:block md:p-3 md:border-r ${showChat ? "block" : "hidden"}`}
          aria-label="AI beszélgetés"
        >
          <AiWebCreatorChat
            partnerId={partner.id}
            initialPrompt={initialPrompt}
            onApplied={(patch) => {
              setSf((cur: any) => ({ ...(cur || {}), ...patch }));
              setRefreshKey((k) => k + 1);
              void load(partner.id);
            }}
          />
        </section>

        <section
          className={`min-h-0 overflow-auto bg-muted/20 p-2 md:block md:p-3 ${showPreview ? "block" : "hidden"}`}
          aria-label="Élő előnézet"
        >
          {sf?.slug ? (
            <StorefrontLivePreview
              storefrontId={sf?.id ?? null}
              slug={sf.slug}
              draft={sf}
              refreshKey={refreshKey}
              showAiLauncher={false}
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

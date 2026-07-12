// Sprint B — 3D/AR termékviewer <model-viewer> alapon
// Támogatás: iOS Quick Look (USDZ), Android Scene Viewer (GLB), desktop 3D orbit
import { useEffect, useRef, useState } from "react";
import "@google/model-viewer";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Loader2, RotateCw, Sparkles, View } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "model-viewer": any;
    }
  }
}

type Asset = {
  id: string;
  glb_url: string | null;
  usdz_url: string | null;
  poster_url: string | null;
  alt_text: string | null;
  ar_enabled: boolean;
  auto_rotate: boolean;
  camera_orbit: string | null;
};

type Props = {
  productId: string;
  productSource?: "shop_products" | "partner_products" | "launch_products";
  height?: number;
  onStyleRecommend?: () => void;
};

const SESSION_KEY = "edn-ar-session";
const getSessionId = () => {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = `ar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return `ar_${Date.now()}`;
  }
};

const getDeviceType = (): string => {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
};

const logArEvent = async (
  eventType: string,
  productId: string,
  assetId: string | null,
  metadata: Record<string, unknown> = {}
) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await (supabase.from("ar_events" as any) as any).insert({
      event_type: eventType,
      product_id: productId,
      asset_id: assetId,
      user_id: userData?.user?.id || null,
      session_id: getSessionId(),
      device_type: getDeviceType(),
      metadata,
    });
  } catch {
    /* silent */
  }
};

export default function Product3DViewer({
  productId,
  productSource = "shop_products",
  height = 420,
  onStyleRecommend,
}: Props) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(true);
  const viewerRef = useRef<HTMLElement | null>(null);
  const openLoggedRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase.from("product_3d_assets" as any) as any)
        .select("id, glb_url, usdz_url, poster_url, alt_text, ar_enabled, auto_rotate, camera_orbit")
        .eq("product_id", productId)
        .eq("product_source", productSource)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!active) return;
      setAsset(data as Asset | null);
      setRotating(data?.auto_rotate ?? true);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [productId, productSource]);

  useEffect(() => {
    if (asset && !openLoggedRef.current) {
      openLoggedRef.current = true;
      logArEvent("3d_view_open", productId, asset.id, { source: productSource });
    }
  }, [asset, productId, productSource]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center border border-border bg-muted/20"
        style={{ height }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!asset || !asset.glb_url) {
    return null; // no 3D model — hide silently, product page keeps normal image
  }

  const arModes = asset.ar_enabled ? "webxr scene-viewer quick-look" : undefined;

  return (
    <div className="relative border border-border bg-background" style={{ height }}>
      {/* model-viewer web component */}
      <model-viewer
        ref={viewerRef}
        src={asset.glb_url}
        ios-src={asset.usdz_url || undefined}
        poster={asset.poster_url || undefined}
        alt={asset.alt_text || "3D termék"}
        camera-controls
        touch-action="pan-y"
        {...(rotating ? { "auto-rotate": true } : {})}
        {...(asset.ar_enabled ? { ar: true, "ar-modes": arModes } : {})}
        camera-orbit={asset.camera_orbit || "0deg 75deg 2.5m"}
        exposure="1"
        shadow-intensity="1"
        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
        onLoad={() => logArEvent("3d_loaded", productId, asset.id)}
      />
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          onClick={() => {
            setRotating((r) => !r);
            logArEvent("3d_rotate", productId, asset.id, { rotating: !rotating });
          }}
          title={rotating ? "Forgatás leállítása" : "Automatikus forgatás"}
        >
          <RotateCw className={`h-4 w-4 ${rotating ? "animate-spin-slow" : ""}`} />
        </Button>
        {asset.ar_enabled && (
          <Button
            size="icon"
            variant="secondary"
            title="Megnézem a szobámban (AR)"
            onClick={() => {
              const el = viewerRef.current as unknown as { activateAR?: () => void } | null;
              if (el?.activateAR) el.activateAR();
              logArEvent("ar_launch", productId, asset.id, { device: getDeviceType() });
            }}
          >
            <View className="h-4 w-4" />
          </Button>
        )}
        {onStyleRecommend && (
          <Button
            size="icon"
            variant="secondary"
            title="AI stílus ajánló"
            onClick={() => {
              logArEvent("style_recommend", productId, asset.id);
              onStyleRecommend();
            }}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        )}
      </div>
      {asset.ar_enabled && (
        <div className="pointer-events-none absolute bottom-3 left-3 border border-border bg-background/90 px-3 py-1 text-xs font-medium">
          📱 Érintsd meg az AR ikont — nézd meg a saját teredben
        </div>
      )}
    </div>
  );
}

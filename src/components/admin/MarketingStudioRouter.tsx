import { lazy, Suspense } from "react";
import { lazyRetry } from "@/lib/lazy-retry";

const AdminFacebookStudioTab = lazy(lazyRetry(() => import("@/components/admin/AdminFacebookStudioTab")));
const AdminInstagramStudioTab = lazy(lazyRetry(() => import("@/components/admin/AdminInstagramStudioTab")));
const AdminTiktokStudioTab = lazy(lazyRetry(() => import("@/components/admin/AdminTiktokStudioTab")));
const AdminYoutubeStudioTab = lazy(lazyRetry(() => import("@/components/admin/AdminYoutubeStudioTab")));
const AdminYoutubeShortsStudioTab = lazy(lazyRetry(() => import("@/components/admin/AdminYoutubeShortsStudioTab")));
const AdminGoogleAdsStudioTab = lazy(lazyRetry(() => import("@/components/admin/AdminGoogleAdsStudioTab")));
const AdminPinterestStudioTab = lazy(lazyRetry(() => import("@/components/admin/AdminPinterestStudioTab")));
const AdminLinkedinStudioTab = lazy(lazyRetry(() => import("@/components/admin/AdminLinkedinStudioTab")));
const AdminTwitterStudioTab = lazy(lazyRetry(() => import("@/components/admin/AdminTwitterStudioTab")));
const AdminAiStudioRecorder = lazy(lazyRetry(() => import("@/components/admin/AdminAiStudioRecorder")));

interface Props {
  tab: string;
}

export default function MarketingStudioRouter({ tab }: Props) {
  const render = () => {
    switch (tab) {
      case "ig_studio": return <AdminInstagramStudioTab />;
      case "tt_studio": return <AdminTiktokStudioTab />;
      case "yt_studio": return <AdminYoutubeStudioTab />;
      case "yts_studio": return <AdminYoutubeShortsStudioTab />;
      case "gads_studio": return <AdminGoogleAdsStudioTab />;
      case "pin_studio": return <AdminPinterestStudioTab />;
      case "li_studio": return <AdminLinkedinStudioTab />;
      case "x_studio": return <AdminTwitterStudioTab />;
      case "ai_studio_recorder": return <AdminAiStudioRecorder />;
      case "fb_studio":
      default:
        return <AdminFacebookStudioTab />;
    }
  };

  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground uppercase tracking-wider">Stúdió betöltése…</div>}>
      {render()}
    </Suspense>
  );
}

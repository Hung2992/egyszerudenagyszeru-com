import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazyRetry } from "@/lib/lazy-retry";
import { ErrorBoundary } from "@/components/ErrorBoundary";
const Sonner = lazy(lazyRetry(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster }))));
const Toaster = lazy(lazyRetry(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster }))));
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index.tsx";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner.tsx";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import { usePasswordRecoveryRedirect } from "@/hooks/usePasswordRecoveryRedirect";
import { getPartnerSlugFromHostname } from "@/lib/partner-subdomain";

const PageTracker = () => { usePageTracking(); useReferralCapture(); usePasswordRecoveryRedirect(); return null; };
const partnerSubdomainSlug = getPartnerSlugFromHostname();

// Lazy-loaded components that appear with delay or on interaction
const CartDrawer = lazy(lazyRetry(() => import("@/components/CartDrawer")));
const AbandonedCartReminder = lazy(lazyRetry(() => import("@/components/AbandonedCartReminder")));
const GiveawayPopup = lazy(lazyRetry(() => import("./components/GiveawayPopup.tsx")));
const CookieConsentBanner = lazy(lazyRetry(() => import("./components/CookieConsentBanner.tsx")));
const Auth = lazy(lazyRetry(() => import("./pages/Auth.tsx")));
const ResetPassword = lazy(lazyRetry(() => import("./pages/ResetPassword.tsx")));
const NotFound = lazy(lazyRetry(() => import("./pages/NotFound.tsx")));

// Lazy-loaded pages to reduce initial bundle size
const Profile = lazy(lazyRetry(() => import("./pages/Profile.tsx")));
const Admin = lazy(lazyRetry(() => import("./pages/Admin.tsx")));
const AccountantPortal = lazy(lazyRetry(() => import("./pages/AccountantPortal.tsx")));
const PartnerPortal = lazy(lazyRetry(() => import("./pages/PartnerPortal.tsx")));
const Shop = lazy(lazyRetry(() => import("./pages/Shop.tsx")));
const ProductDetail = lazy(lazyRetry(() => import("./pages/ProductDetail.tsx")));
const Checkout = lazy(lazyRetry(() => import("./pages/Checkout.tsx")));
const Shipping = lazy(lazyRetry(() => import("./pages/Shipping.tsx")));
const SizeGuide = lazy(lazyRetry(() => import("./pages/SizeGuide.tsx")));
const Contact = lazy(lazyRetry(() => import("./pages/Contact.tsx")));
const Orders = lazy(lazyRetry(() => import("./pages/Orders.tsx")));
const Wishlist = lazy(lazyRetry(() => import("./pages/Wishlist.tsx")));
const Loyalty = lazy(lazyRetry(() => import("./pages/Loyalty.tsx")));
const GiftCards = lazy(lazyRetry(() => import("./pages/GiftCards.tsx")));
const Community = lazy(lazyRetry(() => import("./pages/Community.tsx")));
const SharedWishlist = lazy(lazyRetry(() => import("./pages/SharedWishlist.tsx")));
const Unsubscribe = lazy(lazyRetry(() => import("./pages/Unsubscribe.tsx")));
const EmailUnsubscribe = lazy(lazyRetry(() => import("./pages/EmailUnsubscribe.tsx")));
const Giveaway = lazy(lazyRetry(() => import("./pages/Giveaway.tsx")));
const CheckoutReturn = lazy(lazyRetry(() => import("./pages/CheckoutReturn.tsx")));
const Launch = lazy(lazyRetry(() => import("./pages/Launch.tsx")));
const LaunchProductDetail = lazy(lazyRetry(() => import("./pages/LaunchProductDetail.tsx")));
const Help = lazy(lazyRetry(() => import("./pages/Help.tsx")));
const About = lazy(lazyRetry(() => import("./pages/About.tsx")));
const Egyuttmukodes = lazy(lazyRetry(() => import("./pages/Egyuttmukodes.tsx")));
const PartnerOnboarding = lazy(lazyRetry(() => import("./pages/PartnerOnboarding.tsx")));
const PartnerContract = lazy(lazyRetry(() => import("./pages/PartnerContract.tsx")));
const LegalHub = lazy(lazyRetry(() => import("./pages/legal/LegalHub.tsx")));
const Aszf = lazy(lazyRetry(() => import("./pages/legal/Aszf.tsx")));
const Adatvedelem = lazy(lazyRetry(() => import("./pages/legal/Adatvedelem.tsx")));
const CookiePolicy = lazy(lazyRetry(() => import("./pages/legal/Cookie.tsx")));
const Elallas = lazy(lazyRetry(() => import("./pages/legal/Elallas.tsx")));
const Szallitas = lazy(lazyRetry(() => import("./pages/legal/Szallitas.tsx")));
const Garancia = lazy(lazyRetry(() => import("./pages/legal/Garancia.tsx")));
const Impresszum = lazy(lazyRetry(() => import("./pages/legal/Impresszum.tsx")));
const JogiNyilatkozat = lazy(lazyRetry(() => import("./pages/legal/JogiNyilatkozat.tsx")));
const PartnerSzabalyzat = lazy(lazyRetry(() => import("./pages/legal/PartnerSzabalyzat.tsx")));
const KycAdatkezeles = lazy(lazyRetry(() => import("./pages/legal/KycAdatkezeles.tsx")));
const BrandStorefront = lazy(lazyRetry(() => import("./pages/BrandStorefront.tsx")));
const BrandProductDetail = lazy(lazyRetry(() => import("./pages/BrandProductDetail.tsx")));
const PartnerApprovals = lazy(lazyRetry(() => import("./pages/PartnerApprovals.tsx")));
const PartnerLanding = lazy(lazyRetry(() => import("./pages/PartnerLanding.tsx")));
const PartnerShareRedirect = lazy(lazyRetry(() => import("./pages/PartnerShareRedirect.tsx")));
const Jutalmak = lazy(lazyRetry(() => import("./pages/Jutalmak.tsx")));
const AiShoppingAssistant = lazy(lazyRetry(() => import("./components/AiShoppingAssistant")));
const VisualSearch = lazy(lazyRetry(() => import("./components/VisualSearch")));
const VoiceShopping = lazy(lazyRetry(() => import("./components/VoiceShopping")));
const TrackShipment = lazy(lazyRetry(() => import("./pages/TrackShipment.tsx")));
const DropDetail = lazy(lazyRetry(() => import("./pages/DropDetail.tsx")));

const OAuthConsent = lazy(lazyRetry(() => import("./pages/OAuthConsent.tsx")));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Suspense fallback={null}>
          <Toaster />
          <Sonner />
        </Suspense>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PageTracker />
          <PaymentTestModeBanner />
          <Suspense fallback={null}>
            <CartDrawer />
            <AbandonedCartReminder />
            <GiveawayPopup />
            <CookieConsentBanner />
            <AiShoppingAssistant />
            <VisualSearch />
            <VoiceShopping />
          </Suspense>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-foreground"><div className="h-6 w-6 animate-spin rounded-none border-2 border-foreground border-t-transparent" /></div>}>
          <Routes>
            <Route path="/" element={partnerSubdomainSlug ? <BrandStorefront /> : <Index />} />
            <Route path="/termek/:productSlug" element={partnerSubdomainSlug ? <BrandProductDetail /> : <NotFound />} />
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="/index.html" element={<Navigate to="/" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/partner-approvals" element={<PartnerApprovals />} />
            <Route path="/konyvelo" element={<AccountantPortal />} />
            <Route path="/partner" element={<PartnerPortal />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/size-guide" element={<SizeGuide />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/loyalty" element={<Loyalty />} />
            <Route path="/jutalmak" element={<Jutalmak />} />
            <Route path="/gift-cards" element={<GiftCards />} />
            <Route path="/community" element={<Community />} />
            <Route path="/wishlist/shared/:token" element={<SharedWishlist />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/email-unsubscribe" element={<EmailUnsubscribe />} />
            <Route path="/nyeremenyjatek" element={<Giveaway />} />
            <Route path="/checkout/return" element={<CheckoutReturn />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/launch/:id" element={<LaunchProductDetail />} />
            <Route path="/help" element={<Help />} />
            <Route path="/about" element={<About />} />
            <Route path="/egyuttmukodes" element={<Egyuttmukodes />} />
            <Route path="/partner-onboarding" element={<PartnerOnboarding />} />
            <Route path="/partner-contract" element={<PartnerContract />} />
            <Route path="/legal" element={<LegalHub />} />
            <Route path="/legal/aszf" element={<Aszf />} />
            <Route path="/legal/adatvedelem" element={<Adatvedelem />} />
            <Route path="/legal/cookie" element={<CookiePolicy />} />
            <Route path="/legal/elallas" element={<Elallas />} />
            <Route path="/legal/szallitas" element={<Szallitas />} />
            <Route path="/legal/garancia" element={<Garancia />} />
            <Route path="/legal/impresszum" element={<Impresszum />} />
            <Route path="/legal/jogi-nyilatkozat" element={<JogiNyilatkozat />} />
            <Route path="/legal/partner-szabalyzat" element={<PartnerSzabalyzat />} />
            <Route path="/legal/kyc-adatkezeles" element={<KycAdatkezeles />} />
            <Route path="/b/:slug" element={<BrandStorefront />} />
            <Route path="/b/:slug/termek/:productSlug" element={<BrandProductDetail />} />
            <Route path="/s/:code" element={<PartnerShareRedirect />} />
            <Route path="/p/:partnerSlug/:landingSlug" element={<PartnerLanding />} />
            <Route path="/csomagkovetes" element={<TrackShipment />} />
            <Route path="/track" element={<TrackShipment />} />
            <Route path="/drop/:slug" element={<DropDetail />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

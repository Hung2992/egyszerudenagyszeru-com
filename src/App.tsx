import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
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
const CartDrawer = lazy(() => import("@/components/CartDrawer"));
const AbandonedCartReminder = lazy(() => import("@/components/AbandonedCartReminder"));
const GiveawayPopup = lazy(() => import("./components/GiveawayPopup.tsx"));
const CookieConsentBanner = lazy(() => import("./components/CookieConsentBanner.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Lazy-loaded pages to reduce initial bundle size
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AccountantPortal = lazy(() => import("./pages/AccountantPortal.tsx"));
const PartnerPortal = lazy(() => import("./pages/PartnerPortal.tsx"));
const Shop = lazy(() => import("./pages/Shop.tsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const Shipping = lazy(() => import("./pages/Shipping.tsx"));
const SizeGuide = lazy(() => import("./pages/SizeGuide.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const Orders = lazy(() => import("./pages/Orders.tsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.tsx"));
const Loyalty = lazy(() => import("./pages/Loyalty.tsx"));
const GiftCards = lazy(() => import("./pages/GiftCards.tsx"));
const Community = lazy(() => import("./pages/Community.tsx"));
const SharedWishlist = lazy(() => import("./pages/SharedWishlist.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const EmailUnsubscribe = lazy(() => import("./pages/EmailUnsubscribe.tsx"));
const Giveaway = lazy(() => import("./pages/Giveaway.tsx"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn.tsx"));
const Launch = lazy(() => import("./pages/Launch.tsx"));
const LaunchProductDetail = lazy(() => import("./pages/LaunchProductDetail.tsx"));
const Help = lazy(() => import("./pages/Help.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Egyuttmukodes = lazy(() => import("./pages/Egyuttmukodes.tsx"));
const PartnerOnboarding = lazy(() => import("./pages/PartnerOnboarding.tsx"));
const PartnerContract = lazy(() => import("./pages/PartnerContract.tsx"));
const LegalHub = lazy(() => import("./pages/legal/LegalHub.tsx"));
const Aszf = lazy(() => import("./pages/legal/Aszf.tsx"));
const Adatvedelem = lazy(() => import("./pages/legal/Adatvedelem.tsx"));
const CookiePolicy = lazy(() => import("./pages/legal/Cookie.tsx"));
const Elallas = lazy(() => import("./pages/legal/Elallas.tsx"));
const Szallitas = lazy(() => import("./pages/legal/Szallitas.tsx"));
const Garancia = lazy(() => import("./pages/legal/Garancia.tsx"));
const Impresszum = lazy(() => import("./pages/legal/Impresszum.tsx"));
const JogiNyilatkozat = lazy(() => import("./pages/legal/JogiNyilatkozat.tsx"));
const PartnerSzabalyzat = lazy(() => import("./pages/legal/PartnerSzabalyzat.tsx"));
const KycAdatkezeles = lazy(() => import("./pages/legal/KycAdatkezeles.tsx"));
const BrandStorefront = lazy(() => import("./pages/BrandStorefront.tsx"));
const BrandProductDetail = lazy(() => import("./pages/BrandProductDetail.tsx"));
const PartnerApprovals = lazy(() => import("./pages/PartnerApprovals.tsx"));
const PartnerLanding = lazy(() => import("./pages/PartnerLanding.tsx"));
const PartnerShareRedirect = lazy(() => import("./pages/PartnerShareRedirect.tsx"));
const Jutalmak = lazy(() => import("./pages/Jutalmak.tsx"));
const AiShoppingAssistant = lazy(() => import("./components/AiShoppingAssistant"));
const TrackShipment = lazy(() => import("./pages/TrackShipment.tsx"));

const queryClient = new QueryClient();

const App = () => (
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

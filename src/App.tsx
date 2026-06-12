import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index.tsx";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner.tsx";
import { usePageTracking } from "@/hooks/usePageTracking";

const PageTracker = () => { usePageTracking(); return null; };

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
const LegalHub = lazy(() => import("./pages/legal/LegalHub.tsx"));
const Aszf = lazy(() => import("./pages/legal/Aszf.tsx"));
const Adatvedelem = lazy(() => import("./pages/legal/Adatvedelem.tsx"));
const CookiePolicy = lazy(() => import("./pages/legal/Cookie.tsx"));
const Elallas = lazy(() => import("./pages/legal/Elallas.tsx"));
const Szallitas = lazy(() => import("./pages/legal/Szallitas.tsx"));
const Garancia = lazy(() => import("./pages/legal/Garancia.tsx"));
const Impresszum = lazy(() => import("./pages/legal/Impresszum.tsx"));
const JogiNyilatkozat = lazy(() => import("./pages/legal/JogiNyilatkozat.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Suspense fallback={null}>
          <Toaster />
          <Sonner />
        </Suspense>
        <BrowserRouter>
          <PageTracker />
          <PaymentTestModeBanner />
          <Suspense fallback={null}>
            <CartDrawer />
            <AbandonedCartReminder />
            <GiveawayPopup />
            <CookieConsentBanner />
          </Suspense>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-foreground"><div className="h-6 w-6 animate-spin rounded-none border-2 border-foreground border-t-transparent" /></div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
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
            <Route path="/legal" element={<LegalHub />} />
            <Route path="/legal/aszf" element={<Aszf />} />
            <Route path="/legal/adatvedelem" element={<Adatvedelem />} />
            <Route path="/legal/cookie" element={<CookiePolicy />} />
            <Route path="/legal/elallas" element={<Elallas />} />
            <Route path="/legal/szallitas" element={<Szallitas />} />
            <Route path="/legal/garancia" element={<Garancia />} />
            <Route path="/legal/impresszum" element={<Impresszum />} />
            <Route path="/legal/jogi-nyilatkozat" element={<JogiNyilatkozat />} />
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

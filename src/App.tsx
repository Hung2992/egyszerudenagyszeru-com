import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index.tsx";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner.tsx";

// Lazy-loaded components that appear with delay or on interaction
const CartDrawer = lazy(() => import("@/components/CartDrawer"));
const AbandonedCartReminder = lazy(() => import("@/components/AbandonedCartReminder"));
const GiveawayPopup = lazy(() => import("./components/GiveawayPopup.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Lazy-loaded pages to reduce initial bundle size
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
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
          <PaymentTestModeBanner />
          <Suspense fallback={null}>
            <CartDrawer />
            <AbandonedCartReminder />
            <GiveawayPopup />
          </Suspense>
          <Suspense fallback={null}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
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

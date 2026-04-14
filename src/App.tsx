import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import CartDrawer from "@/components/CartDrawer";
import AbandonedCartReminder from "@/components/AbandonedCartReminder";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Profile from "./pages/Profile.tsx";
import Admin from "./pages/Admin.tsx";
import Shop from "./pages/Shop.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Checkout from "./pages/Checkout.tsx";
import Shipping from "./pages/Shipping.tsx";
import SizeGuide from "./pages/SizeGuide.tsx";
import Contact from "./pages/Contact.tsx";
import Orders from "./pages/Orders.tsx";
import Wishlist from "./pages/Wishlist.tsx";
import Loyalty from "./pages/Loyalty.tsx";
import GiftCards from "./pages/GiftCards.tsx";
import Community from "./pages/Community.tsx";
import NotFound from "./pages/NotFound.tsx";
import SharedWishlist from "./pages/SharedWishlist.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import EmailUnsubscribe from "./pages/EmailUnsubscribe.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CartDrawer />
          <AbandonedCartReminder />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

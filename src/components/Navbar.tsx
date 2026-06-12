import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { useCart } from "@/contexts/CartContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { usePartnerCheck } from "@/hooks/usePartnerCheck";
import { Button } from "@/components/ui/button";
import { LogOut, User, ShoppingCart, Menu, X, Shield, Heart, Package, Star, Gift, Users } from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";

const NAV_LINKS = [
  { label: "Kollekció", path: "/shop" },
  { label: "Közösség", path: "/community" },
  { label: "Újdonságok", path: "/shop?filter=new" },
  { label: "Akciók 🔥", path: "/shop?filter=sale", accent: true },
];

const USER_LINKS = [
  { label: "Profilom", path: "/profile", icon: User },
  { label: "Rendeléseim", path: "/orders", icon: Package },
  { label: "Kedvencek", path: "/wishlist", icon: Heart },
  { label: "Ajándékutalvány", path: "/gift-cards", icon: Gift },
  { label: "Hűségprogram", path: "/loyalty", icon: Star },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems, setIsCartOpen } = useCart();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { partner, loading: partnerLoading } = usePartnerCheck();
  const isPartner = !partnerLoading && partner?.status === "active";
  const [user, setUser] = useState<SupaUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserMenuOpen(false);
    navigate("/");
  };

  return (
    <>
      <div className="bg-accent text-accent-foreground text-center py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em]">
          Ingyenes szállítás 15 000 Ft feletti rendelés esetén 🚀
        </p>
      </div>

      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <button className="text-foreground md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <span
            className="text-base font-bold tracking-tight uppercase text-foreground cursor-pointer"
            onClick={() => navigate("/")}
          >
            Egyszerű<span className="text-accent"> de </span>Nagyszerű
          </span>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.path)}
                className={`text-xs font-medium uppercase tracking-[0.2em] transition-colors ${
                  link.accent
                    ? "text-accent hover:text-accent/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            {user && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/wishlist")}>
                <Heart className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                  {totalItems}
                </span>
              )}
            </Button>
            {user ? (
              <div className="relative">
                {!adminLoading && isAdmin && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-accent" onClick={() => navigate("/admin")}>
                    <Shield className="h-4 w-4" />
                  </Button>
                )}
                {isPartner && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-accent" onClick={() => navigate("/partner")} aria-label="Partner felület">
                    <Users className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                  <User className="h-4 w-4" />
                </Button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border z-50 min-w-[200px] shadow-lg">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {USER_LINKS.map((link) => (
                      <button
                        key={link.label}
                        onClick={() => {
                          navigate(link.path);
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted flex items-center gap-3"
                      >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </button>
                    ))}
                    {!adminLoading && isAdmin && (
                      <button
                        onClick={() => {
                          navigate("/admin");
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-accent hover:bg-muted flex items-center gap-3 border-t border-border"
                      >
                        <Shield className="h-4 w-4" />
                        Admin felület
                      </button>
                    )}
                    {isPartner && (
                      <button
                        onClick={() => {
                          navigate("/partner");
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-accent hover:bg-muted flex items-center gap-3 border-t border-border"
                      >
                        <Users className="h-4 w-4" />
                        Partner felület
                      </button>
                    )}
                    <button onClick={handleLogout} className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-muted flex items-center gap-3 border-t border-border">
                      <LogOut className="h-4 w-4" />
                      Kilépés
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/auth")} aria-label="Belépés">
                <User className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-border bg-card md:hidden">
            <nav className="space-y-1 px-4 py-4">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.path)}
                  className={`block w-full text-left py-3 text-sm uppercase tracking-[0.2em] ${
                    link.accent ? "text-accent" : "text-foreground"
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <button onClick={() => navigate("/help")} className="block w-full text-left py-3 text-sm uppercase tracking-[0.2em] text-accent">
                Segítség központ
              </button>
              <button onClick={() => navigate("/shipping")} className="block w-full text-left py-3 text-sm uppercase tracking-[0.2em] text-foreground">
                Szállítás & Visszaküldés
              </button>
              <button onClick={() => navigate("/size-guide")} className="block w-full text-left py-3 text-sm uppercase tracking-[0.2em] text-foreground">
                Mérettáblázat
              </button>
              <button onClick={() => navigate("/contact")} className="block w-full text-left py-3 text-sm uppercase tracking-[0.2em] text-foreground">
                Kapcsolat
              </button>
              {!user && (
                <Button className="mt-4 w-full rounded-none uppercase tracking-wider text-xs" onClick={() => navigate("/auth")}>
                  Regisztráció ingyen
                </Button>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default Navbar;

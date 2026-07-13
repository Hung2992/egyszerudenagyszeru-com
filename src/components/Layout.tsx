import { ReactNode, lazy, Suspense } from "react";
import Navbar from "./Navbar";

const Footer = lazy(() => import("./Footer"));
const FashionStylistLauncher = lazy(() => import("./FashionStylistLauncher"));

interface LayoutProps {
  children: ReactNode;
  hideNavbar?: boolean;
  hideFooter?: boolean;
  hideStylist?: boolean;
}

const Layout = ({ children, hideNavbar = false, hideFooter = false, hideStylist = false }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!hideNavbar && <Navbar />}
      <main className="flex-1">{children}</main>
      {!hideFooter && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}
      {!hideStylist && (
        <Suspense fallback={null}>
          <FashionStylistLauncher />
        </Suspense>
      )}
    </div>
  );
};

export default Layout;

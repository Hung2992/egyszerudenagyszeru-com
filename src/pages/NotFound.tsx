import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <h1 className="text-7xl md:text-9xl font-bold text-foreground leading-none">404</h1>
        <p className="mt-4 text-sm text-muted-foreground uppercase tracking-widest">Az oldal nem található</p>
        <p className="mt-2 text-xs text-muted-foreground max-w-xs">
          A keresett oldal nem létezik vagy áthelyezték.
        </p>
        <Button
          variant="outline"
          className="mt-8 rounded-none uppercase tracking-[0.2em] text-xs h-11 px-8"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza a főoldalra
        </Button>
      </div>
    </Layout>
  );
};

export default NotFound;

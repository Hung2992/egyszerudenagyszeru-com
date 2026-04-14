import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check, XCircle } from "lucide-react";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center gap-6 py-32 px-4">
        {sessionId ? (
          <>
            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">Sikeres fizetés! 🎉</h1>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              A rendelésedet megkaptuk és hamarosan feldolgozzuk. Köszönjük a vásárlást!
            </p>
            <Button
              variant="outline"
              className="rounded-none uppercase tracking-wider text-xs"
              onClick={() => navigate("/orders")}
            >
              Rendeléseim megtekintése
            </Button>
          </>
        ) : (
          <>
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">Fizetés megszakítva</h1>
            <p className="text-muted-foreground text-sm text-center">
              A fizetés nem fejeződött be. Próbáld újra!
            </p>
            <Button
              variant="outline"
              className="rounded-none uppercase tracking-wider text-xs"
              onClick={() => navigate("/checkout")}
            >
              Vissza a pénztárba
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}

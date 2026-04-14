import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MailX, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const SUPABASE_URL = "https://tnjoaoofknmvttqmprxy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuam9hb29ma25tdnR0cW1wcnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MDk3NTYsImV4cCI6MjA1OTQ4NTc1Nn0.RgR-KKBRMZWBIeHVo21VWGpCuuUHGTzSsQAcfObhFtM";

type Status = "loading" | "valid" | "already_unsubscribed" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (res.ok && data.valid) setStatus("valid");
        else if (data.reason === "already_unsubscribed") setStatus("already_unsubscribed");
        else setStatus("invalid");
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already_unsubscribed");
      else setStatus("error");
    } catch {
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center px-4 py-16 md:py-24">
        <Card className="w-full max-w-md rounded-none border bg-card text-center">
          <CardHeader className="pb-4">
            {status === "loading" && <Loader2 className="w-10 h-10 mx-auto animate-spin text-muted-foreground" />}
            {status === "valid" && <MailX className="w-10 h-10 mx-auto text-accent" />}
            {status === "success" && <CheckCircle className="w-10 h-10 mx-auto text-green-500" />}
            {status === "already_unsubscribed" && <CheckCircle className="w-10 h-10 mx-auto text-muted-foreground" />}
            {(status === "invalid" || status === "error") && <AlertCircle className="w-10 h-10 mx-auto text-destructive" />}
            <CardTitle className="text-sm font-bold uppercase tracking-widest mt-4">
              {status === "loading" && "Betöltés..."}
              {status === "valid" && "Leiratkozás"}
              {status === "success" && "Sikeres leiratkozás"}
              {status === "already_unsubscribed" && "Már leiratkoztál"}
              {status === "invalid" && "Érvénytelen link"}
              {status === "error" && "Hiba történt"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "valid" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Biztosan le szeretnél iratkozni az e-mail értesítéseinkről?
                </p>
                <Button
                  onClick={handleUnsubscribe}
                  disabled={processing}
                  className="w-full rounded-none h-11 uppercase tracking-wider text-xs"
                >
                  {processing ? "Feldolgozás..." : "Leiratkozás megerősítése"}
                </Button>
              </>
            )}
            {status === "success" && (
              <p className="text-sm text-muted-foreground">
                Sikeresen leiratkoztál. Nem fogsz több e-mailt kapni tőlünk.
              </p>
            )}
            {status === "already_unsubscribed" && (
              <p className="text-sm text-muted-foreground">
                Már korábban leiratkoztál az e-mail értesítéseinkről.
              </p>
            )}
            {status === "invalid" && (
              <p className="text-sm text-muted-foreground">
                Ez a leiratkozási link érvénytelen vagy lejárt.
              </p>
            )}
            {status === "error" && (
              <p className="text-sm text-muted-foreground">
                Sajnáljuk, hiba történt. Kérjük, próbáld meg később.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Unsubscribe;

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MailX, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const EmailUnsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleUnsubscribe = async () => {
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && <Loader2 className="w-10 h-10 animate-spin mx-auto text-muted-foreground" />}
        {status === "valid" && (
          <>
            <MailX className="w-12 h-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Leiratkozás</h1>
            <p className="text-muted-foreground">Biztosan le szeretnél iratkozni az e-mail értesítéseinkről?</p>
            <Button onClick={handleUnsubscribe} variant="destructive" size="lg">Leiratkozás megerősítése</Button>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
            <h1 className="text-2xl font-bold text-foreground">Sikeresen leiratkoztál</h1>
            <p className="text-muted-foreground">Nem fogsz több e-mailt kapni tőlünk.</p>
          </>
        )}
        {status === "already" && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Már leiratkoztál</h1>
            <p className="text-muted-foreground">Ez az e-mail cím már szerepel a leiratkozott listán.</p>
          </>
        )}
        {status === "invalid" && (
          <>
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Érvénytelen link</h1>
            <p className="text-muted-foreground">Ez a leiratkozási link érvénytelen vagy lejárt.</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Hiba történt</h1>
            <p className="text-muted-foreground">Kérjük, próbáld újra később.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailUnsubscribe;

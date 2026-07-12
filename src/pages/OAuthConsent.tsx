import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Beta namespace — keep a local typed wrapper so TS accepts these calls.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Hiányzó authorization_id.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?redirect=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message ?? "Nem sikerült betölteni a jóváhagyási kérést.");
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Ismeretlen hiba.");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauthApi().approveAuthorization(authorizationId)
        : await oauthApi().denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        setError(error.message ?? "A művelet sikertelen.");
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        setError("A szerver nem adott vissza átirányítási címet.");
        return;
      }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? "Ismeretlen hiba.");
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
        <Card className="max-w-md w-full bg-neutral-900 border-neutral-800 rounded-none">
          <CardHeader>
            <CardTitle>Hiba a jóváhagyás során</CardTitle>
            <CardDescription className="text-neutral-400">{error}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
        <p className="text-neutral-400">Betöltés…</p>
      </main>
    );
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "Egy külső alkalmazás";
  const redirectUri = details?.client?.redirect_uris?.[0] ?? details?.client?.redirect_uri;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
      <Card className="max-w-md w-full bg-neutral-900 border-neutral-800 rounded-none">
        <CardHeader>
          <CardTitle className="font-[Space_Grotesk] text-2xl">
            {clientName} csatlakoztatása
          </CardTitle>
          <CardDescription className="text-neutral-400">
            Ez lehetővé teszi, hogy a(z) <strong className="text-white">{clientName}</strong> a te nevedben
            használja az Egyszerű de Nagyszerű MCP eszközeit (pl. saját rendeléseid lekérdezése).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2 text-neutral-300">
            <p><span className="text-neutral-500">Alkalmazás:</span> {clientName}</p>
            {redirectUri && (
              <p className="break-all"><span className="text-neutral-500">Átirányítás:</span> {redirectUri}</p>
            )}
            <p className="text-xs text-neutral-500 pt-2">
              Ez nem kerüli meg a webshop jogosultsági szabályait — a kliens csak azt láthatja,
              amit te magad is látsz bejelentkezve.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => decide(true)}
              disabled={busy}
              className="flex-1 bg-white text-black hover:bg-neutral-200 rounded-none"
            >
              {busy ? "…" : "Jóváhagyás"}
            </Button>
            <Button
              onClick={() => decide(false)}
              disabled={busy}
              variant="outline"
              className="flex-1 rounded-none border-neutral-700 text-white hover:bg-neutral-800"
            >
              Elutasítás
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

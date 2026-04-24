import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cookie, X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const CONSENT_KEY = "edn_cookie_consent_v1";

export interface CookieConsent {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: 1;
}

export const getStoredConsent = (): CookieConsent | null => {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as CookieConsent) : null;
  } catch {
    return null;
  }
};

const saveConsent = (consent: CookieConsent) => {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: consent }));
  } catch {
    /* ignore */
  }
};

export const openCookieSettings = () => {
  window.dispatchEvent(new CustomEvent("cookie-consent-open"));
};

const CookieConsentBanner = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState({ functional: true, analytics: true, marketing: false });

  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
    setPrefs({
      functional: existing.functional,
      analytics: existing.analytics,
      marketing: existing.marketing,
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      setShowSettings(true);
      setVisible(true);
    };
    window.addEventListener("cookie-consent-open", handler);
    return () => window.removeEventListener("cookie-consent-open", handler);
  }, []);

  if (!visible) return null;

  const persist = (p: { functional: boolean; analytics: boolean; marketing: boolean }) => {
    saveConsent({
      necessary: true,
      functional: p.functional,
      analytics: p.analytics,
      marketing: p.marketing,
      timestamp: new Date().toISOString(),
      version: 1,
    });
    setVisible(false);
    setShowSettings(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie beleegyezés"
      aria-modal="false"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4 pointer-events-none"
    >
      <div className="mx-auto max-w-3xl bg-background border border-accent/40 shadow-2xl pointer-events-auto">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground mb-1">Sütiket használunk</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A működéshez szükséges sütiket mindig használjuk. A statisztikai és funkcionális sütikhez a
                hozzájárulásodat kérjük (GDPR, e-Privacy).{" "}
                <button
                  className="underline text-accent"
                  onClick={() => navigate("/legal/cookie")}
                >
                  Részletek
                </button>
              </p>
            </div>
            {!showSettings && (
              <button
                onClick={() => persist({ functional: false, analytics: false, marketing: false })}
                aria-label="Bezár"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showSettings && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-foreground">Feltétlenül szükséges</p>
                  <p className="text-[11px] text-muted-foreground">A működéshez kötelező — mindig aktív.</p>
                </div>
                <Switch checked disabled />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-foreground">Funkcionális</p>
                  <p className="text-[11px] text-muted-foreground">Preferenciák, kívánságlista.</p>
                </div>
                <Switch
                  checked={prefs.functional}
                  onCheckedChange={(v) => setPrefs({ ...prefs, functional: !!v })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-foreground">Statisztika</p>
                  <p className="text-[11px] text-muted-foreground">Anonim látogatottsági adatok.</p>
                </div>
                <Switch
                  checked={prefs.analytics}
                  onCheckedChange={(v) => setPrefs({ ...prefs, analytics: !!v })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-foreground">Marketing</p>
                  <p className="text-[11px] text-muted-foreground">Jelenleg nem használunk ilyet.</p>
                </div>
                <Switch
                  checked={prefs.marketing}
                  onCheckedChange={(v) => setPrefs({ ...prefs, marketing: !!v })}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none uppercase tracking-wider text-[10px] h-9"
              onClick={() => persist({ functional: false, analytics: false, marketing: false })}
            >
              Csak szükséges
            </Button>
            {!showSettings ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-none uppercase tracking-wider text-[10px] h-9"
                onClick={() => setShowSettings(true)}
              >
                <Settings2 className="h-3 w-3 mr-1.5" />
                Testreszab
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="rounded-none uppercase tracking-wider text-[10px] h-9"
                onClick={() => persist(prefs)}
              >
                Választás mentése
              </Button>
            )}
            <Button
              size="sm"
              className="rounded-none uppercase tracking-wider text-[10px] h-9 bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
              onClick={() => persist({ functional: true, analytics: true, marketing: true })}
            >
              Mindent elfogadok
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;

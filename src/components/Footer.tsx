import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Facebook, Instagram, Youtube, Cookie } from "lucide-react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { openCookieSettings } from "@/components/CookieConsentBanner";

// TikTok ikon (nincs lucide-ben)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.09Z" />
  </svg>
);

interface SocialSettings {
  social_facebook: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
}

const Footer = () => {
  const navigate = useNavigate();
  const [social, setSocial] = useState<SocialSettings | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("social_facebook, social_instagram, social_tiktok, social_youtube")
        .limit(1)
        .maybeSingle();
      if (data) setSocial(data as SocialSettings);
    };
    load();
  }, []);

  const socialLinks = [
    { name: "Facebook", url: social?.social_facebook, Icon: Facebook },
    { name: "Instagram", url: social?.social_instagram, Icon: Instagram },
    { name: "TikTok", url: social?.social_tiktok, Icon: TikTokIcon },
    { name: "YouTube", url: social?.social_youtube, Icon: Youtube },
  ].filter((l) => l.url && l.url.trim() !== "");

  return (
    <footer className="border-t border-border mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-sm font-bold uppercase tracking-wider text-foreground">
              Egyszerű<span className="text-accent"> de </span>Nagyszerű
            </span>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-xs">
              Férfi streetwear, ami nem próbál meg túl sokat. Tiszta vonalak, erős darabok.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Navigáció</p>
            <nav className="flex flex-col gap-2">
              <button onClick={() => navigate("/about")} className="text-xs text-accent hover:text-foreground text-left transition-colors font-bold">Rólunk</button>
              <button onClick={() => navigate("/shop")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Kollekció</button>
              <button onClick={() => navigate("/contact")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Kapcsolat</button>
              <button onClick={() => navigate("/help")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Segítség</button>
              <button onClick={() => navigate("/egyuttmukodes")} className="text-xs text-accent hover:text-foreground text-left transition-colors font-bold">Együttműködés</button>
            </nav>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Vásárlás</p>
            <nav className="flex flex-col gap-2">
              <button onClick={() => navigate("/legal/szallitas")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Szállítás & fizetés</button>
              <button onClick={() => navigate("/legal/elallas")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Elállási jog (14 nap)</button>
              <button onClick={() => navigate("/legal/garancia")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Garancia & panasz</button>
              <button onClick={() => navigate("/size-guide")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Mérettáblázat</button>
            </nav>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Jogi</p>
            <nav className="flex flex-col gap-2">
              <button onClick={() => navigate("/legal")} className="text-xs text-accent hover:text-foreground text-left transition-colors font-bold">Jogi központ</button>
              <button onClick={() => navigate("/legal/aszf")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">ÁSZF</button>
              <button onClick={() => navigate("/legal/adatvedelem")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Adatvédelem</button>
              <button onClick={() => navigate("/legal/cookie")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Cookie szabályzat</button>
              <button onClick={() => navigate("/legal/impresszum")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Impresszum</button>
              <button onClick={openCookieSettings} className="text-xs text-muted-foreground hover:text-accent text-left transition-colors inline-flex items-center gap-1.5">
                <Cookie className="h-3 w-3" />
                Cookie beállítások
              </button>
            </nav>
          </div>
        </div>

        {socialLinks.length > 0 && (
          <div className="border-t border-border pt-6 pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 text-center md:text-left">
              Kövess minket
            </p>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              {socialLinks.map(({ name, url, Icon }) => (
                <a
                  key={name}
                  href={url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  className="h-10 w-10 flex items-center justify-center border border-border text-muted-foreground hover:text-accent hover:border-accent transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-6 flex flex-col items-center gap-2 md:flex-row md:justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            © 2026 Egyszerű de Nagyszerű — Minden jog fenntartva
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

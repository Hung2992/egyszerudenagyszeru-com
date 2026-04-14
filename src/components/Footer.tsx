import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-border mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
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
              <button onClick={() => navigate("/shop")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Kollekció</button>
              <button onClick={() => navigate("/shop")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Újdonságok</button>
              <button onClick={() => navigate("/shop")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Akciók</button>
            </nav>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Segítség</p>
            <nav className="flex flex-col gap-2">
              <button onClick={() => navigate("/shipping")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Szállítás & Visszaküldés</button>
              <button onClick={() => navigate("/size-guide")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Mérettáblázat</button>
              <button onClick={() => navigate("/contact")} className="text-xs text-muted-foreground hover:text-foreground text-left transition-colors">Kapcsolat</button>
            </nav>
          </div>
        </div>
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

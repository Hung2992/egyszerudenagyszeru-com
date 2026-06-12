import { useLegalInfo } from "@/hooks/useLegalInfo";
import { Badge } from "@/components/ui/badge";
import { Eye, ExternalLink, RefreshCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PLACEHOLDER_RE = /\[.*PÓTLANDÓ.*\]/;

const isMissing = (v: string | undefined | null) =>
  !v || !v.trim() || PLACEHOLDER_RE.test(v);

const Row = ({ label, value }: { label: string; value: string }) => {
  const missing = isMissing(value);
  return (
    <div className="flex items-baseline gap-2 py-1 border-b border-border/40 last:border-0">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground min-w-[140px]">
        {label}
      </span>
      {missing ? (
        <span className="text-xs font-bold text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Hiányzik
        </span>
      ) : (
        <span className="text-xs text-foreground break-all">{value}</span>
      )}
    </div>
  );
};

/**
 * Élő preview az admin felületen: a /legal/impresszum oldal pontos tartalmát
 * mutatja az adatbázisból (mentés után azonnal frissül a useLegalInfo
 * realtime / event subscription miatt). Hiányzó mezők pirossal jelölve.
 */
const AdminImpresszumLivePreview = () => {
  const L = useLegalInfo();

  const fields = [
    { label: "Tulajdonos",       value: L.ownerName },
    { label: "Adószám",          value: L.taxId },
    { label: "EV nyilv. szám",   value: L.registryNumber },
    { label: "ÁFA-státusz",      value: L.vatStatus },
    { label: "Székhely",         value: L.registeredOffice },
    { label: "Levelezési cím",   value: L.mailingAddress },
    { label: "Általános e-mail", value: L.email },
    { label: "Jogi e-mail",      value: L.legalEmail },
    { label: "Adatvédelmi e-mail", value: L.privacyEmail },
    { label: "Telefon",          value: L.phone },
    { label: "Ügyfélidő",        value: L.customerHours },
    { label: "Bank",             value: L.bankName },
    { label: "Bankszámla",       value: L.bankAccount },
  ];

  const missingCount = fields.filter(f => isMissing(f.value)).length;
  const allGood = missingCount === 0;

  return (
    <div className="border-2 border-accent/60 p-5 space-y-4 bg-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Eye className="h-4 w-4 text-accent" /> Élő előnézet · /legal/impresszum
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            Mentés után azonnal frissül (cache nélkül). Hiányzó mezők pirossal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={`rounded-none text-[10px] uppercase ${
              allGood ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground"
            }`}
          >
            {allGood ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Teljes</>
            ) : (
              <><AlertTriangle className="h-3 w-3 mr-1" /> {missingCount} hiányzik</>
            )}
          </Badge>
          <Button
            size="sm" variant="outline"
            className="rounded-none uppercase tracking-wider text-[10px] h-7"
            onClick={() => L.refresh()}
          >
            <RefreshCcw className="h-3 w-3 mr-1" /> Frissítés
          </Button>
          <Link
            to="/legal/impresszum"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent hover:underline"
          >
            Megnyit <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="border border-border bg-background p-4 max-h-[420px] overflow-y-auto">
        {fields.map(f => (
          <Row key={f.label} label={f.label} value={f.value} />
        ))}
      </div>
    </div>
  );
};

export default AdminImpresszumLivePreview;

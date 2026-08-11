import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export interface IntegrityCheck {
  ok: boolean;
  summary?: string;
  restored?: number;
  total?: number;
  skipped?: number;
  failed?: number;
  checked_at?: string;
  checks?: Array<{
    key: string;
    label: string;
    ok: boolean;
    detail?: string;
    issues?: Array<Record<string, unknown>>;
  }>;
}

interface Props {
  integrity: IntegrityCheck;
}

/** ✅ Rollback Integrity Check eredménye: ellenőrzés, konzisztencia, QA, üzleti check */
const RollbackIntegrityReport = ({ integrity }: Props) => {
  const ok = integrity.ok;
  return (
    <div className="border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
        <span className="text-sm font-medium">
          {ok ? "Rollback sikeres" : "Rollback részben sikerült"} — {integrity.summary || `${integrity.restored ?? 0}/${integrity.total ?? 0} elem helyreállítva`}
        </span>
      </div>

      <ul className="space-y-1">
        {(integrity.checks || []).map((c) => (
          <li key={c.key} className="flex items-start gap-2 text-xs">
            {c.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
            )}
            <span>
              <span className="font-medium">{c.label}:</span>{" "}
              <span className="text-muted-foreground">{c.detail}</span>
              {(c.issues?.length ?? 0) > 0 && (
                <span className="block text-muted-foreground">
                  {c.issues!.slice(0, 5).map((i, idx) => (
                    <span key={idx} className="block">
                      • {String((i as { title?: string; id?: string }).title || (i as { id?: string }).id)} — {String((i as { reason?: string }).reason || "hiba")}
                    </span>
                  ))}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {(integrity.skipped ?? 0) > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Kihagyva: {integrity.skipped} elem (kézi módosítás vagy hiányzó rekord miatt).
        </p>
      )}
      {integrity.checked_at && (
        <p className="text-[11px] text-muted-foreground">
          Ellenőrizve: {new Date(integrity.checked_at).toLocaleString("hu-HU")}
        </p>
      )}
    </div>
  );
};

export default RollbackIntegrityReport;

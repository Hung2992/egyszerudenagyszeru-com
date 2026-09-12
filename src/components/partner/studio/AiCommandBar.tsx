import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Wand2, Loader2, Undo2, Check, X, AlertTriangle, HelpCircle } from "lucide-react";
import { normalizeBrandDna, type BrandDna } from "@/lib/brand-dna";
import {
  validateProposal,
  applyDesignChanges,
  interpretCommandLocally,
  describeChange,
  type DesignProposal,
} from "@/lib/design-command";

interface Props {
  partnerId: string;
  storefrontId: string | null;
  sf: any;
  onChange: (key: string, value: any) => void;
}

const SCOPE_LABELS: Record<string, string> = {
  global: "Teljes webshop",
  section: "Szekció",
  component: "Komponens",
  page: "Oldal",
};

const EXAMPLES = [
  "Legyen prémiumabb.",
  "Legyen kevésbé lekerekített.",
  "Legyen több térköz a szekciók között.",
  "Legyenek hangsúlyosabbak a gombok.",
];

const AiCommandBar = ({ partnerId, storefrontId, sf, onChange }: Props) => {
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<DesignProposal | null>(null);
  const [clarify, setClarify] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastApplied, setLastApplied] = useState<{ before: BrandDna; command: string } | null>(null);

  const current = normalizeBrandDna(sf?.brand_dna);

  const reset = () => { setProposal(null); setClarify(null); setError(null); };

  const run = async () => {
    const text = command.trim();
    if (!text || loading) return;
    reset();
    setLoading(true);

    let raw: unknown = null;
    try {
      const { data, error: fnError } = await supabase.functions.invoke("partner-design-command", {
        body: { partner_id: partnerId, command: text },
      });
      if (fnError) throw fnError;
      raw = (data as any)?.proposal ?? null;
    } catch {
      // Az AI nem elérhető — determinisztikus tartalék értelmezés.
      raw = interpretCommandLocally(text, current);
    }
    if (!raw) raw = interpretCommandLocally(text, current);

    setLoading(false);
    if (!raw) {
      setError("Ezt a módosítást nem tudtam biztonságosan létrehozni. A webshop változatlan maradt.");
      return;
    }

    const result = validateProposal(raw, current);
    if (!result.ok) {
      const fallback = interpretCommandLocally(text, current);
      const second = fallback ? validateProposal(fallback, current) : null;
      if (second && second.ok) {
        if ("proposal" in second) setProposal(second.proposal);
        else setClarify(second.clarify.question);
        return;
      }
      setError(
        !result.ok && result.error === "no_effective_change"
          ? "A kért beállítás már érvényben van, nincs mit változtatni."
          : "Ezt a módosítást nem tudtam biztonságosan létrehozni. A webshop változatlan maradt.",
      );
      return;
    }
    if ("clarify" in result) { setClarify(result.clarify.question); return; }
    setProposal(result.proposal);
  };

  const recordVersion = async (before: any, summary: string) => {
    if (!storefrontId) return;
    const { data: last } = await supabase
      .from("partner_storefront_versions")
      .select("version_number")
      .eq("storefront_id", storefrontId)
      .order("version_number", { ascending: false })
      .limit(1).maybeSingle();
    const snapshot = { ...before };
    delete snapshot.id; delete snapshot.created_at; delete snapshot.updated_at;
    await supabase.from("partner_storefront_versions").insert({
      storefront_id: storefrontId,
      version_number: ((last as any)?.version_number ?? 0) + 1,
      snapshot,
      change_summary: summary.slice(0, 500),
    });
  };

  const apply = async () => {
    if (!proposal) return;
    const before = current;
    const next = applyDesignChanges(before, proposal.changes);
    const summary = `AI design parancs: „${command.trim()}" — ${proposal.changes.map(describeChange).join(", ")} (érintett: ${proposal.affectedAreas.join(", ") || "—"})`;
    // Verzió a MÓDOSÍTÁS ELŐTTI állapotról, hogy visszaállítható legyen.
    await recordVersion(sf, summary);
    onChange("brand_dna", next);
    setLastApplied({ before, command: command.trim() });
    reset();
    setCommand("");
    toast({ title: "Alkalmazva az előnézeten", description: "A publikáláshoz mentsd, majd külön kérd a publikálást." });
  };

  const undo = () => {
    if (!lastApplied) return;
    onChange("brand_dna", lastApplied.before);
    setLastApplied(null);
    toast({ title: "Visszavonva", description: "Az előző design állapot állt vissza." });
  };

  return (
    <Card className="rounded-none border-foreground/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-widest">AI design parancs</span>
        <Badge variant="outline" className="rounded-none text-[10px]">token-alapú</Badge>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void run(); } }}
          placeholder="Mit szeretnél megváltoztatni a webshopon?"
          className="rounded-none"
          disabled={loading}
          aria-label="AI design parancs"
        />
        <Button onClick={() => void run()} disabled={loading || !command.trim()} className="rounded-none sm:w-40">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Feldolgozás…</> : "Értelmezés"}
        </Button>
        {lastApplied && (
          <Button variant="outline" onClick={undo} className="rounded-none sm:w-36">
            <Undo2 className="mr-2 h-4 w-4" />Visszavonás
          </Button>
        )}
      </div>

      {!proposal && !clarify && !error && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setCommand(ex)}
              className="border border-foreground/20 px-2 py-1 text-[11px] text-muted-foreground hover:bg-foreground/5"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          <span>{error}</span>
        </div>
      )}

      {clarify && (
        <div className="flex items-start gap-2 border border-foreground/20 p-3 text-sm">
          <HelpCircle className="mt-0.5 h-4 w-4" />
          <span>{clarify}</span>
        </div>
      )}

      {proposal && (
        <div className="space-y-3 border border-foreground/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-none">{SCOPE_LABELS[proposal.scope] || proposal.scope}</Badge>
            {proposal.target && <Badge variant="outline" className="rounded-none">{proposal.target}</Badge>}
          </div>
          <p className="text-sm">{proposal.explanation}</p>

          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Előtte → Utána</p>
            <ul className="space-y-1 text-sm">
              {proposal.changes.map((c) => (
                <li key={c.token} className="flex items-center justify-between gap-2 border-b border-foreground/10 py-1">
                  <span>{describeChange(c)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Érintett elemek</p>
            <div className="flex flex-wrap gap-1">
              {proposal.affectedAreas.map((a) => (
                <Badge key={a} variant="outline" className="rounded-none text-[11px]">✓ {a}</Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void apply()} className="rounded-none">
              <Check className="mr-2 h-4 w-4" />Alkalmazás
            </Button>
            <Button variant="outline" onClick={reset} className="rounded-none">
              <X className="mr-2 h-4 w-4" />Mégse
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Az alkalmazás csak az előnézetre és a piszkozatra hat. A publikálás külön, kézi művelet marad.
          </p>
        </div>
      )}
    </Card>
  );
};

export default AiCommandBar;

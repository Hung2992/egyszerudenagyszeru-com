// Szekciónkénti AI újratervezés: szekció kiválasztása → AI elemzés → Before/After →
// jóváhagyás után alkalmazás a vázlatra (publikálás továbbra is kézi).
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Wand2, Loader2, Check, X, ArrowRight } from "lucide-react";
import {
  REDESIGN_SECTIONS,
  getRedesignSection,
  validateRedesign,
  redesignPatch,
  type RedesignProposal,
  type RedesignSectionId,
} from "@/lib/section-redesign";

interface Props {
  partnerId: string;
  sf: Record<string, any>;
  onChange: (key: string, value: unknown) => void;
}

const SectionRedesignPanel = ({ partnerId, sf, onChange }: Props) => {
  const [section, setSection] = useState<RedesignSectionId>("hero");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<RedesignProposal | null>(null);
  const [rejected, setRejected] = useState<string[]>([]);
  const [applied, setApplied] = useState(false);

  const def = useMemo(() => getRedesignSection(section)!, [section]);

  const analyze = async () => {
    setBusy(true);
    setProposal(null);
    setRejected([]);
    setApplied(false);
    try {
      const { data, error } = await supabase.functions.invoke("partner-section-redesign", {
        body: { partner_id: partnerId, section, instruction },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const { proposal: p, rejected: rej } = validateRedesign(section, data.proposal, sf);
      setRejected(rej);
      if (!p) {
        toast({
          title: "Nincs alkalmazható javaslat",
          description: "Az AI nem adott érvényes, a mostanitól eltérő szöveget ehhez a szekcióhoz.",
        });
        return;
      }
      setProposal(p);
    } catch (e: any) {
      const msg = String(e?.message || "");
      const friendly =
        msg.includes("ai_unavailable") ? "Az AI most nem elérhető, próbáld újra pár perc múlva."
        : msg.includes("not_partner") ? "Ehhez a partnerfiókhoz nincs jogosultságod."
        : msg.includes("unauthorized") ? "Jelentkezz be újra."
        : msg.includes("no_storefront") ? "Előbb hozd létre és mentsd a webshopot."
        : "Nem sikerült elkészíteni az új változatot.";
      toast({ title: "Hiba", description: friendly, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!proposal) return;
    const patch = redesignPatch(proposal);
    for (const [k, v] of Object.entries(patch)) onChange(k, v);
    setApplied(true);
    toast({ title: "Alkalmazva a vázlaton", description: "Nézd meg az előnézetben, majd mentsd és publikáld." });
  };

  const undo = () => {
    if (!proposal) return;
    for (const c of proposal.changes) onChange(c.key, c.from);
    setApplied(false);
    toast({ title: "Visszavonva", description: "A szekció eredeti szövegei visszaálltak." });
  };

  return (
    <Card className="rounded-none border-foreground/20 p-4 md:p-5 space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Wand2 className="h-3.5 w-3.5" /> Szekció újratervezése AI-jal
        </div>
        <p className="text-xs text-muted-foreground">
          Válassz egy szekciót, az AI elemzi és új változatot készít. Előtte–utána nézetben döntesz, publikálni külön kell.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {REDESIGN_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setSection(s.id); setProposal(null); setRejected([]); setApplied(false); }}
            aria-pressed={section === s.id}
            className={`border px-2.5 py-1.5 text-xs ${section === s.id ? "border-foreground bg-foreground text-background" : "border-foreground/20 text-muted-foreground"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="border border-foreground/15 p-3 space-y-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Jelenlegi tartalom — {def.label}</p>
        {def.fields.map((f) => (
          <div key={f.key} className="text-xs">
            <span className="text-muted-foreground">{f.label}: </span>
            <span className="break-words">
              {String(sf[f.key] ?? "").replace(/<[^>]*>/g, " ").trim() || <em className="text-muted-foreground">üres</em>}
            </span>
          </div>
        ))}
      </div>

      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => { e.preventDefault(); void analyze(); }}
      >
        <Input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Opcionális kérés, pl.: legyen rövidebb és határozottabb"
          className="rounded-none"
          disabled={busy}
        />
        <Button type="submit" className="rounded-none shrink-0" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          Újratervezés
        </Button>
      </form>

      {proposal && (
        <div className="border border-foreground/20 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Előtte / Utána</p>
            <Badge variant="secondary" className="rounded-none text-[10px]">
              {proposal.changes.length} módosítás
            </Badge>
          </div>

          {proposal.changes.map((c) => (
            <div key={c.key} className="grid gap-2 border-b border-foreground/10 pb-3 last:border-0 last:pb-0 md:grid-cols-[1fr_auto_1fr] md:items-start">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.label} — előtte</p>
                <p className="text-xs break-words line-through opacity-70">{c.from || "üres"}</p>
              </div>
              <ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block md:mt-4" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Utána</p>
                <p className="text-xs break-words font-medium">{c.to}</p>
              </div>
            </div>
          ))}

          {proposal.rationale && (
            <p className="text-xs text-muted-foreground">{proposal.rationale}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {!applied ? (
              <>
                <Button size="sm" className="rounded-none" onClick={apply}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Jóváhagyás és alkalmazás
                </Button>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => setProposal(null)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Elvetés
                </Button>
              </>
            ) : (
              <>
                <Badge variant="default" className="rounded-none">Alkalmazva a vázlaton — mentsd el</Badge>
                <Button size="sm" variant="outline" className="rounded-none" onClick={undo}>
                  Visszavonás
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Elutasított AI javaslatok: {rejected.join(" · ")}
        </p>
      )}
    </Card>
  );
};

export default SectionRedesignPanel;

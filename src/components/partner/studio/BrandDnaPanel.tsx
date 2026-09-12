import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  normalizeBrandDna,
  applyPersonality,
  brandDnaCssVars,
  PERSONALITIES,
  SPACING_LABELS,
  SHADOW_LABELS,
  BUTTON_SHAPE_LABELS,
  CARD_STYLE_LABELS,
  IMAGE_STYLE_LABELS,
  TRACKING_LABELS,
  type BrandDna,
  type PersonalityId,
} from "@/lib/brand-dna";

interface Props {
  sf: Record<string, any>;
  onChange: (key: string, value: unknown) => void;
}

function OptionRow<T extends string>({
  label, value, options, onSelect,
}: { label: string; value: T; options: Record<string, string>; onSelect: (v: T) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] uppercase tracking-widest opacity-70">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {Object.entries(options).map(([key, text]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={value === key ? "default" : "outline"}
            className="rounded-none text-xs"
            onClick={() => onSelect(key as T)}
          >
            {text}
          </Button>
        ))}
      </div>
    </div>
  );
}

const BrandDnaPanel = ({ sf, onChange }: Props) => {
  const dna = useMemo(() => normalizeBrandDna(sf?.brand_dna), [sf?.brand_dna]);
  const set = (patch: Partial<BrandDna>) => onChange("brand_dna", { ...dna, ...patch });

  const previewVars = brandDnaCssVars(dna, sf?.text_color || "#000000") as React.CSSProperties;
  const accent = sf?.accent_color || "#D4AF37";
  const bg = sf?.bg_color || "#0a0a0a";
  const fg = sf?.text_color || "#ffffff";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-widest">Brand DNA</h3>
        <p className="text-xs text-muted-foreground mt-1">
          A bolt vizuális személyisége. Minden érték központi design tokenné válik, és azonnal látszik az élő előnézetben.
        </p>
      </div>

      {/* Személyiség presetek */}
      <div className="space-y-2">
        <Label className="text-[11px] uppercase tracking-widest opacity-70">Vizuális személyiség</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(PERSONALITIES) as PersonalityId[]).map((id) => {
            const p = PERSONALITIES[id];
            const active = dna.personality === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange("brand_dna", applyPersonality(id))}
                className={`border p-3 text-left transition-colors ${active ? "border-foreground bg-muted" : "border-border hover:bg-muted/50"}`}
              >
                <span className="block text-xs font-bold uppercase tracking-widest">{p.label}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{p.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Élő token-előnézet */}
      <div className="border p-4" style={{ ...previewVars, background: bg, color: fg }}>
        <p className="sf-heading text-base" style={{ fontFamily: sf?.font_heading }}>Mintacím</p>
        <p className="mt-1 text-xs opacity-70">Így néznek ki a gombok, kártyák és mezők.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="sf-btn inline-flex items-center px-4 py-2 text-[11px] font-bold uppercase" style={{ background: accent, color: bg }}>Kosárba</span>
          <span className="sf-field inline-flex items-center border px-3 py-2 text-[11px]" style={{ borderColor: `${fg}33` }}>email@cim.hu</span>
        </div>
        <div className="sf-card mt-3 border p-3 text-[11px]" style={{ borderColor: `${fg}25` }}>Termékkártya</div>
      </div>

      {/* Tokenek */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-widest opacity-70">Sarokkerekítés — {dna.radius}px</Label>
          <Slider value={[dna.radius]} min={0} max={32} step={1} onValueChange={([v]) => set({ radius: v })} />
        </div>

        <OptionRow label="Térköz" value={dna.spacing} options={SPACING_LABELS} onSelect={(v) => set({ spacing: v })} />
        <OptionRow label="Árnyék" value={dna.shadow} options={SHADOW_LABELS} onSelect={(v) => set({ shadow: v })} />
        <OptionRow label="Gomb forma" value={dna.buttonShape} options={BUTTON_SHAPE_LABELS} onSelect={(v) => set({ buttonShape: v })} />
        <OptionRow label="Kártya stílus" value={dna.cardStyle} options={CARD_STYLE_LABELS} onSelect={(v) => set({ cardStyle: v })} />
        <OptionRow label="Képek" value={dna.imageStyle} options={IMAGE_STYLE_LABELS} onSelect={(v) => set({ imageStyle: v })} />
        <OptionRow label="Címsor betűköz" value={dna.headingTracking} options={TRACKING_LABELS} onSelect={(v) => set({ headingTracking: v })} />

        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-widest opacity-70">Címsor vastagság — {dna.headingWeight}</Label>
          <Slider value={[dna.headingWeight]} min={400} max={900} step={100} onValueChange={([v]) => set({ headingWeight: v })} />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-widest opacity-70">Keretvastagság — {dna.borderWidth}px</Label>
          <Slider value={[dna.borderWidth]} min={1} max={4} step={1} onValueChange={([v]) => set({ borderWidth: v })} />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        A módosítás a mentés gombbal válik véglegessé; a publikált bolt csak jóváhagyott publikálás után változik.
      </p>
    </div>
  );
};

export default BrandDnaPanel;

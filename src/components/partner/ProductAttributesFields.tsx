import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export type AttrField =
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "bool" };

export const ATTRIBUTE_SCHEMAS: Record<string, AttrField[]> = {
  clothing: [
    { key: "gender", label: "Nem", type: "select", options: ["Férfi", "Női", "Gyerek", "Uniszex"] },
    { key: "color", label: "Szín", type: "text", placeholder: "pl. fekete" },
    { key: "collection", label: "Kollekció", type: "text", placeholder: "pl. SS26" },
  ],
  shoes: [
    { key: "gender", label: "Nem", type: "select", options: ["Férfi", "Női", "Gyerek", "Uniszex"] },
    { key: "color", label: "Szín", type: "text" },
    { key: "shoe_category", label: "Kategória", type: "select", options: ["Sport", "Utcai", "Elegáns", "Túra", "Munka"] },
  ],
  phone: [
    { key: "storage", label: "Tárhely", type: "select", options: ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"] },
    { key: "color", label: "Szín", type: "text" },
    { key: "condition", label: "Állapot", type: "select", options: ["Új", "Felújított", "Használt"] },
  ],
  phone_case: [
    { key: "material", label: "Anyag", type: "select", options: ["Szilikon", "TPU", "Bőr", "Műbőr", "Műanyag", "Fa", "Üveg"] },
    { key: "color", label: "Szín", type: "text" },
    { key: "magsafe", label: "MagSafe támogatás", type: "bool" },
  ],
  screen_protector: [
    { key: "protector_type", label: "Típus", type: "select", options: ["Edzett üveg", "Fólia", "Privacy", "Matt", "Hidrogél"] },
    { key: "color", label: "Keret szín", type: "text" },
  ],
  headphones: [
    { key: "connection", label: "Csatlakozás", type: "select", options: ["Bluetooth", "Vezetékes", "Bluetooth + vezetékes"] },
    { key: "anc", label: "Aktív zajszűrés (ANC)", type: "bool" },
    { key: "color", label: "Szín", type: "text" },
  ],
  home: [
    { key: "dimensions", label: "Méretek", type: "text", placeholder: "pl. 120×80×45 cm" },
    { key: "color", label: "Szín", type: "text" },
    { key: "style", label: "Stílus", type: "select", options: ["Modern", "Vintage", "Skandináv", "Ipari", "Rusztikus", "Klasszikus"] },
  ],
  beauty: [
    { key: "skin_type", label: "Bőrtípus", type: "select", options: ["Normál", "Száraz", "Zsíros", "Kombinált", "Érzékeny", "Mindenkinek"] },
    { key: "volume", label: "Kiszerelés", type: "text", placeholder: "pl. 50 ml" },
    { key: "ingredients", label: "Összetevők", type: "text", placeholder: "pl. hialuronsav, niacinamid" },
  ],
  accessory: [
    { key: "color", label: "Szín", type: "text" },
  ],
  electronics: [
    { key: "color", label: "Szín", type: "text" },
    { key: "condition", label: "Állapot", type: "select", options: ["Új", "Felújított", "Használt"] },
  ],
};

interface Props {
  productType: string;
  attributes: Record<string, any>;
  setAttributes: (a: Record<string, any>) => void;
}

const ProductAttributesFields = ({ productType, attributes, setAttributes }: Props) => {
  const fields = ATTRIBUTE_SCHEMAS[productType] || [];
  const set = (k: string, v: any) => setAttributes({ ...attributes, [k]: v });

  const customEntries = Object.entries(attributes || {}).filter(([k]) => !fields.some(f => f.key === k));

  return (
    <div className="border border-foreground/20 p-3 space-y-3">
      <Label className="text-sm font-bold uppercase tracking-wider">Termék jellemzők</Label>

      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {fields.map(f => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              {f.type === "text" && (
                <Input className="rounded-none" value={attributes[f.key] || ""} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} />
              )}
              {f.type === "select" && (
                <Select value={attributes[f.key] || ""} onValueChange={v => set(f.key, v)}>
                  <SelectTrigger className="rounded-none"><SelectValue placeholder="Válassz" /></SelectTrigger>
                  <SelectContent>
                    {f.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {f.type === "bool" && (
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={!!attributes[f.key]} onCheckedChange={v => set(f.key, v)} />
                  <span className="text-xs text-muted-foreground">{attributes[f.key] ? "Igen" : "Nem"}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Egyéni attribútumok */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Egyéni jellemzők (kulcs / érték)</Label>
          <Button type="button" size="sm" variant="outline" className="rounded-none h-7 text-xs"
            onClick={() => set(`egyeni_${Date.now()}`, "")}><Plus className="h-3 w-3 mr-1" /> Hozzáad</Button>
        </div>
        {customEntries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[1fr_1fr_auto] gap-1">
            <Input className="rounded-none" value={k} onChange={e => {
              const nk = e.target.value; const next: any = { ...attributes };
              delete next[k]; next[nk] = v; setAttributes(next);
            }} placeholder="kulcs (pl. garancia)" />
            <Input className="rounded-none" value={v || ""} onChange={e => set(k, e.target.value)} placeholder="érték" />
            <Button type="button" size="sm" variant="ghost" className="rounded-none h-9 px-2"
              onClick={() => { const next: any = { ...attributes }; delete next[k]; setAttributes(next); }}>
              <X className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductAttributesFields;

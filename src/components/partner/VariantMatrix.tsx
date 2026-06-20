import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export interface Variant {
  size?: string;
  color?: string;
  brand?: string;
  model?: string;
  stock: number;
  sku?: string;
}

interface Props {
  sizes: string[];          // selected sizes (for clothing/shoes)
  devices: { brand: string; model: string }[]; // for cases/protectors
  colors: string[];
  setColors: (c: string[]) => void;
  variants: Variant[];
  setVariants: (v: Variant[]) => void;
  mode: "size" | "device" | "simple"; // simple = just colors
}

const keyOf = (v: { size?: string; color?: string; brand?: string; model?: string }) =>
  `${v.size || ""}|${v.color || ""}|${v.brand || ""}|${v.model || ""}`;

const VariantMatrix = ({ sizes, devices, colors, setColors, variants, setVariants, mode }: Props) => {
  const [newColor, setNewColor] = useState("");

  const addColor = () => {
    const c = newColor.trim();
    if (!c || colors.includes(c)) return;
    setColors([...colors, c]);
    setNewColor("");
  };
  const removeColor = (c: string) => {
    setColors(colors.filter((x) => x !== c));
    setVariants(variants.filter((v) => v.color !== c));
  };

  const getVar = (row: { size?: string; brand?: string; model?: string }, color: string): Variant => {
    const k = keyOf({ ...row, color });
    return variants.find((v) => keyOf(v) === k) || { ...row, color, stock: 0 };
  };

  const setStock = (row: { size?: string; brand?: string; model?: string }, color: string, stock: number) => {
    const k = keyOf({ ...row, color });
    const idx = variants.findIndex((v) => keyOf(v) === k);
    const next = [...variants];
    if (idx >= 0) next[idx] = { ...next[idx], stock };
    else next.push({ ...row, color, stock });
    setVariants(next);
  };

  const rows: { label: string; row: any }[] =
    mode === "size"
      ? sizes.map((s) => ({ label: s, row: { size: s } }))
      : mode === "device"
      ? devices.map((d) => ({ label: `${d.brand} ${d.model}`, row: { brand: d.brand, model: d.model } }))
      : [{ label: "—", row: {} }];

  const total = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

  return (
    <div className="border border-foreground/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold uppercase tracking-wider">Variánsok és készlet</Label>
        <span className="text-[10px] text-muted-foreground">Összes: {total} db</span>
      </div>

      <div>
        <Label className="text-xs">Színek</Label>
        <div className="flex gap-1 mt-1">
          <Input className="rounded-none h-9" placeholder="pl. fekete" value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addColor(); } }} />
          <Button type="button" className="rounded-none h-9" onClick={addColor}><Plus className="h-3 w-3" /></Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {colors.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-foreground/20">
              {c}
              <button type="button" onClick={() => removeColor(c)}><X className="h-3 w-3 text-destructive" /></button>
            </span>
          ))}
          {colors.length === 0 && <span className="text-[10px] text-muted-foreground">Adj hozzá legalább egy színt</span>}
        </div>
      </div>

      {colors.length > 0 && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="border border-foreground/20 p-1 text-left bg-muted">
                  {mode === "size" ? "Méret" : mode === "device" ? "Modell" : ""}
                </th>
                {colors.map((c) => (
                  <th key={c} className="border border-foreground/20 p-1 bg-muted">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, row }) => (
                <tr key={label}>
                  <td className="border border-foreground/20 p-1 font-bold whitespace-nowrap">{label}</td>
                  {colors.map((c) => (
                    <td key={c} className="border border-foreground/20 p-0.5">
                      <Input
                        type="number"
                        min={0}
                        className="rounded-none h-8 text-xs text-center"
                        value={getVar(row, c).stock || ""}
                        onChange={(e) => setStock(row, c, Number(e.target.value) || 0)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mode !== "simple" && rows.length === 0 && (
        <div className="text-[10px] text-muted-foreground">
          {mode === "size" ? "Válassz méreteket fent" : "Válassz kompatibilis modelleket fent"}
        </div>
      )}
    </div>
  );
};

export default VariantMatrix;

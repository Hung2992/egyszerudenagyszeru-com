import Layout from "@/components/Layout";
import { Ruler, Info } from "lucide-react";

const TOPS = [
  { size: "S", chest: "88-92", waist: "72-76", length: "68" },
  { size: "M", chest: "96-100", waist: "80-84", length: "70" },
  { size: "L", chest: "104-108", waist: "88-92", length: "72" },
  { size: "XL", chest: "112-116", waist: "96-100", length: "74" },
  { size: "XXL", chest: "120-124", waist: "104-108", length: "76" },
];

const BOTTOMS = [
  { size: "S", waist: "72-76", hip: "88-92", inseam: "78" },
  { size: "M", waist: "80-84", hip: "96-100", inseam: "80" },
  { size: "L", waist: "88-92", hip: "104-108", inseam: "82" },
  { size: "XL", waist: "96-100", hip: "112-116", inseam: "82" },
];

const SHOES = [
  { eu: "39", cm: "25.0" },
  { eu: "40", cm: "25.5" },
  { eu: "41", cm: "26.5" },
  { eu: "42", cm: "27.0" },
  { eu: "43", cm: "28.0" },
  { eu: "44", cm: "28.5" },
  { eu: "45", cm: "29.5" },
];

const SizeGuide = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Segítség</p>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">
            Mérettáblázat
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-lg">
            Az alábbi mérettáblázatok segítenek kiválasztani a tökéletes méretet. Minden méretek centiméterben vannak megadva.
          </p>
        </div>

        {/* Tops */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="h-4 w-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Felsők (Pólók, Pulóverek, Dzsekik)</h2>
          </div>
          <div className="border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Méret</th>
                  <th className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mellbőség</th>
                  <th className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Derékbőség</th>
                  <th className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hossz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TOPS.map((row) => (
                  <tr key={row.size}>
                    <td className="p-3 font-bold text-foreground">{row.size}</td>
                    <td className="p-3 text-muted-foreground">{row.chest} cm</td>
                    <td className="p-3 text-muted-foreground">{row.waist} cm</td>
                    <td className="p-3 text-muted-foreground">{row.length} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottoms */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="h-4 w-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Alsók (Nadrágok)</h2>
          </div>
          <div className="border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Méret</th>
                  <th className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Derékbőség</th>
                  <th className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Csípőbőség</th>
                  <th className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Belső hossz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {BOTTOMS.map((row) => (
                  <tr key={row.size}>
                    <td className="p-3 font-bold text-foreground">{row.size}</td>
                    <td className="p-3 text-muted-foreground">{row.waist} cm</td>
                    <td className="p-3 text-muted-foreground">{row.hip} cm</td>
                    <td className="p-3 text-muted-foreground">{row.inseam} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shoes */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="h-4 w-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Cipők</h2>
          </div>
          <div className="border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">EU méret</th>
                  <th className="text-left p-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Talpbetét hossz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {SHOES.map((row) => (
                  <tr key={row.eu}>
                    <td className="p-3 font-bold text-foreground">{row.eu}</td>
                    <td className="p-3 text-muted-foreground">{row.cm} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tip */}
        <div className="border border-accent/30 bg-accent/5 p-5 flex gap-3">
          <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">Tipp</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ha két méret között vagy, oversize fazonok esetén a kisebbet, slim fit esetén a nagyobbat javasoljuk. Kérdésed van? Írj nekünk a Kapcsolat oldalon!
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SizeGuide;

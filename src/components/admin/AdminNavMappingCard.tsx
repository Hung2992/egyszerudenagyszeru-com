import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, HelpCircle } from "lucide-react";

interface MappingRow { sheet: string; column: string; navField: string; description: string; example: string; }

const MAPPING: MappingRow[] = [
  { sheet: "Számlák", column: "Számlaszám", navField: "szamlaszam", description: "Egyedi számlasorszám (PTGSZLAH)", example: "EDN-2026-000123" },
  { sheet: "Számlák", column: "Dátum", navField: "teljesites_datuma / kelte", description: "Teljesítés / kelte (YYYY-MM-DD)", example: "2026-06-12" },
  { sheet: "Számlák", column: "Vevő", navField: "vevoNeve", description: "Vevő teljes neve / cégnév", example: "Példa Kft." },
  { sheet: "Számlák", column: "Vevő adószám", navField: "vevoAdoszama", description: "Magyar adószám 8-1-2 / EU adószám", example: "12345678-2-42" },
  { sheet: "Számlák", column: "Cím", navField: "vevoCime", description: "Számlázási cím (irányítószám, város, utca)", example: "1011 Budapest, Példa u. 1." },
  { sheet: "Számlák", column: "Nettó", navField: "nettoOsszeg", description: "ÁFA nélküli alap (HUF)", example: "10000" },
  { sheet: "Számlák", column: "ÁFA kulcs (%)", navField: "afaKulcs", description: "Adómérték (27/18/5/0/AAM/TAM)", example: "27" },
  { sheet: "Számlák", column: "ÁFA", navField: "afaOsszeg", description: "Felszámított ÁFA (HUF)", example: "2700" },
  { sheet: "Számlák", column: "Bruttó", navField: "bruttoOsszeg", description: "Fizetendő végösszeg", example: "12700" },
  { sheet: "Számlák", column: "Pénznem", navField: "penznem", description: "ISO 4217 kód", example: "HUF" },
  { sheet: "Számlák", column: "Állapot", navField: "szamlaStatus", description: "issued / paid / cancelled", example: "paid" },
  { sheet: "ÁFA-összesítő", column: "ÁFA kulcs (%)", navField: "afaKulcs", description: "Adómérték csoportosítás", example: "27" },
  { sheet: "ÁFA-összesítő", column: "Adóalap (nettó)", navField: "adoalap", description: "Adóalap összesen kulcsonként", example: "150000" },
  { sheet: "ÁFA-összesítő", column: "Felszámított ÁFA", navField: "felszamitottAfa", description: "Fizetendő ÁFA kulcsonként", example: "40500" },
  { sheet: "Visszatérítések", column: "Dátum", navField: "stornoDatum", description: "Stornó / visszatérítés dátuma", example: "2026-06-10" },
  { sheet: "Visszatérítések", column: "Tranzakció", navField: "eredetiTranzakcio", description: "Eredeti fizetési azonosító", example: "pi_3O..." },
  { sheet: "Visszatérítések", column: "Összeg", navField: "stornoOsszeg", description: "Visszafizetett bruttó összeg", example: "12700" },
  { sheet: "Költségek", column: "Termék", navField: "koltsegMegnevezes", description: "Beszerzett termék/szolgáltatás", example: "Pamut alapanyag" },
  { sheet: "Költségek", column: "Beszállító", navField: "beszallito", description: "Beszállító neve", example: "Beszállító Kft." },
  { sheet: "Költségek", column: "Összesen", navField: "koltsegOsszeg", description: "Bruttó beszerzési érték", example: "85000" },
];

const AdminNavMappingCard = () => {
  const downloadMapping = () => {
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(MAPPING.map(r => ({
      Lap: r.sheet, "XLSX oszlop": r.column, "NAV mező": r.navField, Leírás: r.description, Példa: r.example,
    })));
    sheet["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 48 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, sheet, "NAV mező-mappelés");
    XLSX.writeFile(wb, "nav_mezo_mappeles.xlsx");
  };

  const downloadSampleInvoiceXlsx = () => {
    const wb = XLSX.utils.book_new();
    const inv = XLSX.utils.json_to_sheet([
      { Számlaszám: "EDN-2026-000001", Dátum: "2026-06-01", Vevő: "Példa Vásárló", "Vevő adószám": "", Cím: "1011 Budapest, Példa u. 1.", Nettó: 7874, "ÁFA kulcs (%)": 27, ÁFA: 2126, Bruttó: 10000, Pénznem: "HUF", Állapot: "paid" },
      { Számlaszám: "EDN-2026-000002", Dátum: "2026-06-03", Vevő: "Példa Kft.", "Vevő adószám": "12345678-2-42", Cím: "6722 Szeged, Példa tér 3.", Nettó: 19685, "ÁFA kulcs (%)": 27, ÁFA: 5315, Bruttó: 25000, Pénznem: "HUF", Állapot: "paid" },
    ]);
    XLSX.utils.book_append_sheet(wb, inv, "Számlák");
    const vat = XLSX.utils.json_to_sheet([
      { "ÁFA kulcs (%)": 27, "Adóalap (nettó)": 27559, "Felszámított ÁFA": 7441, Bruttó: 35000, Tételszám: 2 },
    ]);
    XLSX.utils.book_append_sheet(wb, vat, "ÁFA-összesítő");
    XLSX.writeFile(wb, "pelda_nav_export.xlsx");
  };

  const downloadSampleCsv = () => {
    const csv = [
      "Szamlaszam;Datum;Vevo;Vevo adoszam;Cim;Netto;AFA kulcs;AFA;Brutto;Penznem;Allapot",
      'EDN-2026-000001;2026-06-01;"Példa Vásárló";;"1011 Budapest, Példa u. 1.";7874;27;2126;10000;HUF;paid',
      'EDN-2026-000002;2026-06-03;"Példa Kft.";12345678-2-42;"6722 Szeged, Példa tér 3.";19685;27;5315;25000;HUF;paid',
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pelda_szamla_export.csv";
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-border p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 bg-accent/10 border border-accent flex items-center justify-center shrink-0">
          <HelpCircle className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">NAV mező-mappelés és minták</h3>
          <p className="text-xs text-muted-foreground mt-1">
            A havi audit / könyvelői XLSX export oszlopai és NAV megfeleltetésük. Letölthető minta a könyvelőnek bemutatáshoz.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={downloadMapping} variant="outline" size="sm">
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Mappelés (XLSX)
        </Button>
        <Button onClick={downloadSampleInvoiceXlsx} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Példa export (XLSX)
        </Button>
        <Button onClick={downloadSampleCsv} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Példa export (CSV)
        </Button>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full text-[11px]">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="p-2">Lap</th>
              <th className="p-2">XLSX oszlop</th>
              <th className="p-2">NAV mező</th>
              <th className="p-2">Leírás</th>
              <th className="p-2">Példa</th>
            </tr>
          </thead>
          <tbody>
            {MAPPING.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-2 text-muted-foreground">{r.sheet}</td>
                <td className="p-2 font-bold">{r.column}</td>
                <td className="p-2 font-mono text-accent">{r.navField}</td>
                <td className="p-2 text-muted-foreground">{r.description}</td>
                <td className="p-2 font-mono">{r.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminNavMappingCard;

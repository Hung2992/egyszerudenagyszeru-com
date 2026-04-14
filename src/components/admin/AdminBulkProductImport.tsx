import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileUp, Check, AlertTriangle, Loader2 } from "lucide-react";

interface BulkImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const REQUIRED_HEADERS = ["name", "price", "category"];

const AdminBulkProductImport = ({ onImportDone }: { onImportDone: () => void }) => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(";").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(";").map(v => v.trim());
      if (values.length < headers.length) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
      rows.push(row);
    }
    return rows;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        toast({ title: "Hiba", description: "Üres vagy érvénytelen CSV fájl", variant: "destructive" });
        setImporting(false);
        return;
      }

      // Check headers
      const headers = Object.keys(rows[0]);
      const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        toast({ title: "Hiányzó oszlopok", description: `Kötelező: ${missing.join(", ")}`, variant: "destructive" });
        setImporting(false);
        return;
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of rows) {
        const name = row.name?.trim();
        const price = parseFloat(row.price);
        
        if (!name || isNaN(price)) {
          failed++;
          errors.push(`"${name || "?"}" - érvénytelen név vagy ár`);
          continue;
        }

        const payload: any = {
          name,
          price,
          category: row.category?.trim() || "Egyéb",
          description: row.description?.trim() || null,
          original_price: row.original_price ? parseFloat(row.original_price) || null : null,
          stock: row.stock ? parseInt(row.stock) || 0 : 0,
          sizes: row.sizes ? row.sizes.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          colors: row.colors ? row.colors.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          image_url: row.image_url?.trim() || null,
          is_active: row.is_active ? row.is_active.toLowerCase() !== "false" : true,
        };

        const { error } = await supabase.from("shop_products").insert(payload);
        if (error) {
          failed++;
          errors.push(`"${name}" - ${error.message}`);
        } else {
          success++;
        }
      }

      setResult({ success, failed, errors });
      if (success > 0) {
        toast({ title: `${success} termék importálva!` });
        onImportDone();
      }
    } catch (err: any) {
      toast({ title: "Import hiba", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const csv = "name;price;category;description;original_price;stock;sizes;colors;image_url;is_active\nPélda Póló;8990;Pólók;Leírás ide;12990;25;S,M,L,XL;Fekete,Fehér;;true";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "termek_sablon.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileUp className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Tömeges termékimport (CSV)</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Tölts fel egy CSV fájlt pontosvesszővel (;) elválasztva. Kötelező oszlopok: <strong>name, price, category</strong>.
      </p>
      <div className="flex gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleImport}
          className="hidden"
        />
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
          {importing ? "Importálás..." : "CSV feltöltés"}
        </Button>
        <Button size="sm" variant="ghost" onClick={downloadTemplate}>
          <FileUp className="w-4 h-4 mr-1" /> Sablon letöltése
        </Button>
      </div>

      {result && (
        <div className="border rounded p-3 space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span>{result.success} termék sikeresen importálva</span>
          </div>
          {result.failed > 0 && (
            <>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span>{result.failed} termék sikertelen</span>
              </div>
              <ul className="text-xs text-muted-foreground pl-6 list-disc">
                {result.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                {result.errors.length > 5 && <li>...és még {result.errors.length - 5} hiba</li>}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBulkProductImport;

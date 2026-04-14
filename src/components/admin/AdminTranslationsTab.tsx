import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, X, Check, Globe, Search, Languages } from "lucide-react";

interface Translation {
  id: string;
  language_code: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  translated_value: string;
}

interface ShopProduct {
  id: string;
  name: string;
}

const LANGUAGES = [
  { code: "hu", label: "Magyar" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "ro", label: "Română" },
  { code: "sk", label: "Slovenčina" },
  { code: "sr", label: "Srpski" },
  { code: "hr", label: "Hrvatski" },
];

const ENTITY_TYPES = [
  { key: "product", label: "Termék" },
  { key: "category", label: "Kategória" },
  { key: "banner", label: "Banner" },
];

const FIELD_NAMES: Record<string, string[]> = {
  product: ["name", "description"],
  category: ["name"],
  banner: ["title", "subtitle", "button_text"],
};

const AdminTranslationsTab = () => {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTrans, setEditTrans] = useState<Partial<Translation> | null>(null);
  const [filterLang, setFilterLang] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [supportedLangs, setSupportedLangs] = useState<string[]>(["hu"]);

  const fetchTranslations = async () => {
    const { data } = await supabase.from("translations").select("*").order("language_code", { ascending: true });
    if (data) setTranslations(data as any);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("shop_products").select("id, name").order("name", { ascending: true });
    if (data) setProducts(data as any);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("store_settings").select("supported_languages, default_language").limit(1).single();
    if (data && (data as any).supported_languages) setSupportedLangs((data as any).supported_languages);
  };

  useEffect(() => { fetchTranslations(); fetchProducts(); fetchSettings(); }, []);

  const saveSupportedLanguages = async (langs: string[]) => {
    setSupportedLangs(langs);
    const { data: settings } = await supabase.from("store_settings").select("id").limit(1).single();
    if (settings) {
      await supabase.from("store_settings").update({ supported_languages: langs } as any).eq("id", (settings as any).id);
      toast({ title: "Támogatott nyelvek frissítve!" });
    }
  };

  const saveTranslation = async () => {
    if (!editTrans?.language_code || !editTrans?.entity_type || !editTrans?.entity_id || !editTrans?.field_name || !editTrans?.translated_value) {
      toast({ title: "Hiba", description: "Minden mező kötelező!", variant: "destructive" });
      return;
    }
    const payload = {
      language_code: editTrans.language_code,
      entity_type: editTrans.entity_type,
      entity_id: editTrans.entity_id,
      field_name: editTrans.field_name,
      translated_value: editTrans.translated_value,
    };
    if (editTrans.id) {
      await supabase.from("translations").update(payload).eq("id", editTrans.id);
      toast({ title: "Fordítás frissítve!" });
    } else {
      const { error } = await supabase.from("translations").insert(payload);
      if (error) {
        toast({ title: "Hiba", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Fordítás hozzáadva!" });
    }
    setShowForm(false);
    setEditTrans(null);
    fetchTranslations();
  };

  const deleteTranslation = async (id: string) => {
    await supabase.from("translations").delete().eq("id", id);
    toast({ title: "Fordítás törölve!" });
    fetchTranslations();
  };

  const filtered = translations.filter(t => {
    if (filterLang !== "all" && t.language_code !== filterLang) return false;
    if (filterType !== "all" && t.entity_type !== filterType) return false;
    if (searchTerm && !t.translated_value.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getEntityName = (type: string, id: string) => {
    if (type === "product") {
      const p = products.find(pr => pr.id === id);
      return p ? p.name : id.slice(0, 8) + "...";
    }
    return id.slice(0, 8) + "...";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Többnyelvűség ({translations.length})</h2>
        <Button size="sm" className="rounded-none uppercase tracking-wider text-xs" onClick={() => { setEditTrans({ language_code: "en", entity_type: "product", field_name: "name" }); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Új fordítás
        </Button>
      </div>

      {/* Supported Languages */}
      <div className="border bg-card p-4 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Languages className="h-4 w-4" /> Támogatott nyelvek
        </h3>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <label key={lang.code} className="flex items-center gap-2 border px-3 py-1.5 cursor-pointer hover:border-foreground/30 transition-colors">
              <input
                type="checkbox"
                checked={supportedLangs.includes(lang.code)}
                onChange={e => {
                  const newLangs = e.target.checked
                    ? [...supportedLangs, lang.code]
                    : supportedLangs.filter(l => l !== lang.code);
                  saveSupportedLanguages(newLangs);
                }}
                className="rounded"
              />
              <span className="text-xs font-medium">{lang.label} ({lang.code})</span>
            </label>
          ))}
        </div>
      </div>

      {/* New Translation Form */}
      {showForm && editTrans && (
        <div className="border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">{editTrans.id ? "Szerkesztés" : "Új fordítás"}</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowForm(false); setEditTrans(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nyelv</Label>
              <select value={editTrans.language_code || "en"} onChange={e => setEditTrans({ ...editTrans, language_code: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {LANGUAGES.filter(l => l.code !== "hu").map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Típus</Label>
              <select value={editTrans.entity_type || "product"} onChange={e => setEditTrans({ ...editTrans, entity_type: e.target.value, field_name: FIELD_NAMES[e.target.value]?.[0] || "name" })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {ENTITY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Elem</Label>
              {editTrans.entity_type === "product" ? (
                <select value={editTrans.entity_id || ""} onChange={e => setEditTrans({ ...editTrans, entity_id: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Válassz...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <Input value={editTrans.entity_id || ""} onChange={e => setEditTrans({ ...editTrans, entity_id: e.target.value })} className="mt-1" placeholder="Elem UUID" />
              )}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mező</Label>
              <select value={editTrans.field_name || "name"} onChange={e => setEditTrans({ ...editTrans, field_name: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {(FIELD_NAMES[editTrans.entity_type || "product"] || ["name"]).map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fordítás</Label>
              <Input value={editTrans.translated_value || ""} onChange={e => setEditTrans({ ...editTrans, translated_value: e.target.value })} className="mt-1" placeholder="Lefordított szöveg..." />
            </div>
          </div>
          <Button className="rounded-none uppercase tracking-wider text-xs" onClick={saveTranslation}>
            <Check className="h-3.5 w-3.5 mr-1" /> Mentés
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filterLang} onChange={e => setFilterLang(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="all">Minden nyelv</option>
          {LANGUAGES.filter(l => l.code !== "hu").map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="all">Minden típus</option>
          {ENTITY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-8 pl-7 text-xs" placeholder="Keresés..." />
        </div>
      </div>

      {/* Translation list */}
      <div className="space-y-2">
        {filtered.map(t => (
          <div key={t.id} className="flex items-center gap-3 border bg-card p-3">
            <span className="text-xs font-bold uppercase text-accent w-8">{t.language_code}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{ENTITY_TYPES.find(et => et.key === t.entity_type)?.label || t.entity_type}</span>
                <span>→</span>
                <span>{getEntityName(t.entity_type, t.entity_id)}</span>
                <span>→</span>
                <span>{t.field_name}</span>
              </div>
              <p className="text-sm text-foreground truncate mt-0.5">{t.translated_value}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTrans(t); setShowForm(true); }}>
                <Globe className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTranslation(t.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Még nincsenek fordítások. Adj hozzá egyet!</p>
        )}
      </div>
    </div>
  );
};

export default AdminTranslationsTab;

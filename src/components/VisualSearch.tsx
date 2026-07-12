import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Camera, X, Loader2, ImagePlus, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Match = {
  id: string;
  name: string;
  slug?: string;
  price: number;
  image_url?: string;
  category?: string;
  brand?: string;
  short_description?: string;
  similarity: number;
  matched_image?: string;
};

type Analysis = {
  category?: string;
  colors?: string[];
  style?: string;
  material?: string;
  brand_hint?: string;
  description_hu?: string;
};

const VisualSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [results, setResults] = useState<Match[]>([]);
  const [queryId, setQueryId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPreview(null);
    setAnalysis(null);
    setResults([]);
    setQueryId(null);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Csak kép fájl", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "A kép túl nagy (max 8MB)", variant: "destructive" });
      return;
    }

    setBusy(true);
    setResults([]);
    setAnalysis(null);

    // Local preview
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      // Upload to storage
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id ?? "anon";
      const sessionId =
        localStorage.getItem("visual_search_session") ||
        (() => {
          const s = crypto.randomUUID();
          localStorage.setItem("visual_search_session", s);
          return s;
        })();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${uid}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("visual-search-uploads")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      // Call edge function
      const { data, error } = await supabase.functions.invoke("visual-search", {
        body: { storage_path: path, session_id: sessionId, limit: 12 },
      });
      if (error) throw error;

      setAnalysis(data.analysis ?? {});
      setResults(data.results ?? []);
      setQueryId(data.query_id ?? null);

      if (!data.results?.length) {
        toast({
          title: "Nincs pontos találat",
          description: "Próbálj tisztább képet vagy más szögből.",
        });
      }
    } catch (e: any) {
      console.error("visual search failed", e);
      toast({
        title: "Hiba a képkeresésben",
        description: e?.message || "Próbáld újra",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const onClickProduct = async (m: Match) => {
    if (queryId) {
      await supabase
        .from("visual_search_queries")
        .update({ clicked_product_id: m.id })
        .eq("id", queryId);
    }
    setOpen(false);
    navigate(`/shop?product=${m.id}`);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2 bg-white text-black border border-black px-4 py-3 shadow-lg hover:bg-black hover:text-white transition-colors font-semibold"
        aria-label="Keresés kép alapján"
      >
        <Camera className="w-5 h-5" />
        <span className="hidden sm:inline text-sm uppercase tracking-wider">Kép keresés</span>
      </button>

      {!open && null}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-black w-full max-w-3xl my-8 border-2 border-black">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <h2 className="text-lg font-bold uppercase tracking-wider">
                  Keresés kép alapján
                </h2>
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </div>
              <button onClick={() => { setOpen(false); reset(); }} aria-label="Bezár">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {!preview && !busy && (
                <div className="text-center py-8 space-y-4">
                  <p className="text-sm text-gray-600">
                    Tölts fel egy képet a termékről, ami tetszik. Az AI hasonló darabokat keres a boltunkban.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => cameraRef.current?.click()}
                      className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 hover:bg-gray-800 font-semibold"
                    >
                      <Camera className="w-5 h-5" />
                      Fotózás
                    </button>
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="flex items-center justify-center gap-2 border-2 border-black px-6 py-3 hover:bg-black hover:text-white font-semibold"
                    >
                      <ImagePlus className="w-5 h-5" />
                      Galéria
                    </button>
                  </div>
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              )}

              {preview && (
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4">
                  <img
                    src={preview}
                    alt="Feltöltött kép"
                    className="w-full sm:w-40 h-40 object-cover border border-black"
                  />
                  <div className="text-sm space-y-1">
                    {busy && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI elemzés folyamatban…</span>
                      </div>
                    )}
                    {analysis && (
                      <>
                        {analysis.description_hu && (
                          <p className="italic">{analysis.description_hu}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {analysis.category && <Tag>{analysis.category}</Tag>}
                          {analysis.style && <Tag>{analysis.style}</Tag>}
                          {analysis.material && <Tag>{analysis.material}</Tag>}
                          {(analysis.colors ?? []).map((c) => (
                            <Tag key={c}>{c}</Tag>
                          ))}
                          {analysis.brand_hint && <Tag>{analysis.brand_hint}</Tag>}
                        </div>
                      </>
                    )}
                    <button
                      onClick={reset}
                      className="mt-3 text-xs underline text-gray-600"
                    >
                      Új kép
                    </button>
                  </div>
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-2">
                    Hasonló termékek ({results.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {results.map((m) => (
                      <button
                        key={`${m.id}-${m.matched_image}`}
                        onClick={() => onClickProduct(m)}
                        className="text-left border border-black hover:border-2 transition-all group"
                      >
                        <div className="aspect-square bg-gray-100 overflow-hidden">
                          {(m.matched_image || m.image_url) && (
                            <img
                              src={m.matched_image || m.image_url}
                              alt={m.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                        </div>
                        <div className="p-2 space-y-1">
                          <div className="text-xs font-semibold line-clamp-2">{m.name}</div>
                          <div className="flex items-center justify-between text-xs">
                            <span>{m.price?.toLocaleString("hu-HU")} Ft</span>
                            <span className="bg-black text-white px-1.5 py-0.5">
                              {Math.round(m.similarity * 100)}%
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {preview && !busy && results.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-600">
                  Nincs elég hasonló termék. Nézd meg a{" "}
                  <button
                    className="underline"
                    onClick={() => { setOpen(false); navigate("/shop"); }}
                  >
                    teljes kínálatot
                  </button>
                  .
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block px-2 py-0.5 bg-black text-white text-xs uppercase tracking-wider">
    {children}
  </span>
);

export default VisualSearch;

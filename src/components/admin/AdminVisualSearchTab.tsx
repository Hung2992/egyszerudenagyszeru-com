import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Camera, Loader2, Play, RefreshCw, AlertCircle, TrendingUp, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Stats {
  total_queries: number;
  no_results: number;
  clicked: number;
  avg_similarity: number;
  avg_latency: number;
}

const AdminVisualSearchTab = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [noResults, setNoResults] = useState<any[]>([]);
  const [embedStatus, setEmbedStatus] = useState<{ ready: number; pending: number; error: number; total: number }>({ ready: 0, pending: 0, error: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: queries }, { count: totalProducts }, { data: embeds }] = await Promise.all([
        supabase
          .from("visual_search_queries")
          .select("id,detected_category,no_results,clicked_product_id,top_similarity,latency_ms,ai_description,uploaded_image_url,created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("shop_products").select("id", { count: "exact", head: true }).not("image_url", "is", null),
        supabase.from("product_embeddings").select("status"),
      ]);

      const q = queries ?? [];
      const clicked = q.filter((x) => x.clicked_product_id).length;
      const nr = q.filter((x) => x.no_results);
      const avgSim = q.filter((x) => x.top_similarity).reduce((a, x) => a + Number(x.top_similarity ?? 0), 0) / Math.max(q.filter((x) => x.top_similarity).length, 1);
      const avgLat = q.reduce((a, x) => a + (x.latency_ms ?? 0), 0) / Math.max(q.length, 1);

      setStats({
        total_queries: q.length,
        no_results: nr.length,
        clicked,
        avg_similarity: avgSim,
        avg_latency: avgLat,
      });
      setNoResults(nr.slice(0, 10));

      // Category counts
      const catMap = new Map<string, number>();
      q.forEach((x) => {
        const c = x.detected_category || "ismeretlen";
        catMap.set(c, (catMap.get(c) ?? 0) + 1);
      });
      setTopCategories([...catMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8));

      const st = { ready: 0, pending: 0, error: 0, total: totalProducts ?? 0 };
      (embeds ?? []).forEach((e: any) => {
        if (e.status === "ready") st.ready++;
        else if (e.status === "error") st.error++;
        else st.pending++;
      });
      setEmbedStatus(st);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runIndex = async (force: boolean) => {
    setIndexing(true);
    try {
      const { data, error } = await supabase.functions.invoke("product-embed", {
        body: { batch: true, limit: 20, force },
      });
      if (error) throw error;
      toast({ title: "Indexelés kész", description: `${data?.processed ?? 0} termék feldolgozva` });
      await load();
    } catch (e: any) {
      toast({ title: "Hiba", description: e?.message, variant: "destructive" });
    } finally {
      setIndexing(false);
    }
  };

  if (loading) return <div className="p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const conv = stats && stats.total_queries ? (stats.clicked / stats.total_queries) * 100 : 0;
  const nrRate = stats && stats.total_queries ? (stats.no_results / stats.total_queries) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Camera className="w-6 h-6" />
        <h2 className="text-2xl font-bold uppercase tracking-wider">AI Vizuális Keresés</h2>
      </div>

      {/* Indexelés */}
      <div className="border-2 border-black p-4 space-y-3">
        <h3 className="font-bold uppercase tracking-wider text-sm">Termék indexelés</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="Összes termék" value={embedStatus.total} />
          <Stat label="Indexelve" value={embedStatus.ready} good />
          <Stat label="Folyamatban" value={embedStatus.pending} warn />
          <Stat label="Hiba" value={embedStatus.error} bad />
        </div>
        <div className="w-full bg-gray-200 h-2">
          <div
            className="bg-black h-2 transition-all"
            style={{ width: `${embedStatus.total ? (embedStatus.ready / embedStatus.total) * 100 : 0}%` }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            disabled={indexing}
            onClick={() => runIndex(false)}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 hover:bg-gray-800 disabled:opacity-50 text-sm font-semibold"
          >
            {indexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            20 termék indexelése
          </button>
          <button
            disabled={indexing}
            onClick={() => runIndex(true)}
            className="flex items-center gap-2 border-2 border-black px-4 py-2 hover:bg-black hover:text-white disabled:opacity-50 text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
            Újraindexelés
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 border border-black px-4 py-2 hover:bg-gray-100 text-sm"
          >
            <RefreshCw className="w-3 h-3" /> Frissítés
          </button>
        </div>
      </div>

      {/* Fő KPI-k */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Összes keresés" value={stats?.total_queries ?? 0} />
        <Stat label="Kattintási arány" value={`${conv.toFixed(1)}%`} good />
        <Stat label="Nincs találat" value={`${nrRate.toFixed(1)}%`} bad={nrRate > 20} />
        <Stat label="Átl. egyezés" value={`${((stats?.avg_similarity ?? 0) * 100).toFixed(0)}%`} />
      </div>

      {/* Top kategóriák */}
      <div className="border-2 border-black p-4">
        <h3 className="font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Legkeresettebb kategóriák
        </h3>
        {topCategories.length === 0 ? (
          <p className="text-sm text-gray-600">Még nincs adat.</p>
        ) : (
          <div className="space-y-2">
            {topCategories.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2 text-sm">
                <div className="w-32 truncate">{cat}</div>
                <div className="flex-1 bg-gray-100 h-4">
                  <div
                    className="bg-black h-4"
                    style={{ width: `${(count / topCategories[0][1]) * 100}%` }}
                  />
                </div>
                <div className="w-10 text-right font-mono">{count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sikertelen keresések */}
      <div className="border-2 border-black p-4">
        <h3 className="font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
          <XCircle className="w-4 h-4" /> Sikertelen keresések (termékötletek)
        </h3>
        {noResults.length === 0 ? (
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Nincs sikertelen keresés.
          </p>
        ) : (
          <div className="space-y-2">
            {noResults.map((r) => (
              <div key={r.id} className="flex items-center gap-3 border-b py-2 text-sm">
                {r.uploaded_image_url && (
                  <img src={r.uploaded_image_url} className="w-12 h-12 object-cover border border-black" alt="" />
                )}
                <div className="flex-1">
                  <div className="font-semibold">{r.detected_category ?? "ismeretlen"}</div>
                  <div className="text-xs text-gray-600 line-clamp-1">{r.ai_description}</div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(r.created_at).toLocaleDateString("hu-HU")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value, good, warn, bad }: any) => (
  <div className={`border-2 p-3 ${bad ? "border-red-500" : warn ? "border-yellow-500" : good ? "border-green-500" : "border-black"}`}>
    <div className="text-xs uppercase tracking-wider text-gray-600">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

export default AdminVisualSearchTab;

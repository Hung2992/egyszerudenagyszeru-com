import { useEffect, useState } from "react";
import { Activity, ArrowRight, Crown, ListChecks, RefreshCw, Shield, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { executiveRoles } from "@/lib/empyrean-contracts";

type Destination = "ai_command_center" | "permissions" | "platform_kpi" | "products" | "financial_center" | "ai_agent_bus";
type AgentRow = { slug: string; name: string; role: string; is_active: boolean };
type TaskRow = { id: string; title: string; status: string; created_at: string; agent_slug: string };
type Snapshot = { agents: AgentRow[]; tasks: TaskRow[]; loadedAt: string };
export default function EmpyreanControlPlane({ onOpen }: { onOpen: (destination: Destination) => void }) {
  const [view, setView] = useState<"COMMAND" | "MISSIONS" | "CONTROL">("COMMAND");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const load = async () => {
    setLoading(true); setError(""); setSnapshot(null);
    try {
      const [agents, tasks] = await Promise.all([
        supabase.from("ai_agents").select("slug,name,role,is_active").order("role"),
        supabase.from("ai_agent_tasks").select("id,title,status,created_at,agent_slug").order("created_at", { ascending: false }).limit(50),
      ]);
      if (agents.error || tasks.error) throw new Error("A vállalati adatok most nem olvashatók. Próbáld újra.");
      setSnapshot({ agents: agents.data ?? [], tasks: tasks.data ?? [], loadedAt: new Date().toISOString() });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Az adatok betöltése sikertelen."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const tools: { title: string; label: string; destination: Destination }[] = [
    { title: "CATALYST", label: "Termékek és SEO", destination: "products" },
    { title: "IMPERIUM FINANCE", label: "Pénzügyi adatok", destination: "financial_center" },
    { title: "AEGIS SECURITY", label: "Jogosultságok", destination: "permissions" },
    { title: "NEXUS FLOW", label: "Események", destination: "ai_agent_bus" },
    { title: "GENESIS EVOLUTION", label: "Platform KPI", destination: "platform_kpi" },
  ];
  return <section className="empyrean min-h-[70dvh] bg-background text-foreground border border-border p-4 sm:p-8 space-y-8">
    <header className="flex flex-wrap gap-4 items-start justify-between">
      <div className="space-y-2"><div className="flex items-center gap-2 text-accent text-xs"><Crown size={16} /> BLACK CROWN · FOUNDATION</div><h1 className="text-2xl sm:text-4xl font-semibold">EMPYREAN ∞</h1><p className="text-sm text-muted-foreground">Vállalati irányítóközpont</p></div>
      <Button variant="outline" size="icon" aria-label="Adatok frissítése" title="Adatok frissítése" disabled={loading} onClick={() => void load()}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></Button>
    </header>
    <nav className="grid grid-cols-3 border-b border-border" aria-label="EMPYREAN nézetek">{(["COMMAND", "MISSIONS", "CONTROL"] as const).map((item, index) => {
      const Icon = [Terminal, ListChecks, Shield][index];
      return <Button key={item} variant={view === item ? "secondary" : "ghost"} className="rounded-none text-xs sm:text-sm gap-2 px-2" onClick={() => setView(item)}><Icon size={15} /><span>{item}</span></Button>;
    })}</nav>
    <div className="flex flex-wrap gap-2 justify-between text-xs text-muted-foreground"><span className="flex items-center gap-2"><Shield size={14} /> Írásvédett alapozási mód</span><span>{snapshot ? `Forrás: ai_agents / ai_agent_tasks · ${new Date(snapshot.loadedAt).toLocaleTimeString("hu-HU")}` : "UNKNOWN · nincs ellenőrzött adatpillanatkép"}</span></div>
    {error && <div role="alert" className="border border-destructive p-4 text-destructive">{error}</div>}
    {loading && <p role="status" className="text-muted-foreground">Adatok betöltése…</p>}
    {view === "COMMAND" && <div className="space-y-8">
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); setNotice("Az egységes AI-tervezés még nem aktív. A megadott szöveg a meglévő eszközöket szűri; művelet nem történt."); }}>
        <label htmlFor="empyrean-command" className="text-lg font-medium">Mi legyen a következő lépés?</label>
        <div className="flex gap-2"><Input id="empyrean-command" className="min-w-0 h-12" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Termékek, pénzügy, jogosultságok…" /><Button type="submit" size="icon" className="h-12 w-12 shrink-0" aria-label="Eszközök keresése"><ArrowRight size={18} /></Button></div>
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      </form>
      <div className="grid grid-cols-1 sm:grid-cols-3 border-y border-border divide-y sm:divide-y-0 sm:divide-x divide-border">
        {[{ label: "Nyilvántartott ügynök", value: snapshot?.agents.length }, { label: "Betöltött feladat · legfeljebb 50", value: snapshot?.tasks.length }, { label: "Önállóan igazolt eredmény", value: undefined }].map((item) => <div key={item.label} className="py-5 sm:px-5"><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-2xl mt-2">{item.value ?? "—"}</p><span className="text-xs text-muted-foreground">{item.value === undefined ? "UNKNOWN" : "FACT · nyilvántartás"}</span></div>)}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">{tools.filter((tool) => `${tool.title} ${tool.label}`.toLocaleLowerCase("hu").includes(query.toLocaleLowerCase("hu"))).map((tool) => <Button key={tool.title} variant="outline" className="h-auto py-4 justify-between text-left whitespace-normal" onClick={() => onOpen(tool.destination)}><span><span className="block text-xs text-accent mb-1">{tool.title}</span>{tool.label}</span><ArrowRight size={16} className="shrink-0" /></Button>)}</div>
    </div>}
    {view === "MISSIONS" && <div className="space-y-4"><h2 className="text-xl">Feladatnyilvántartás</h2><p className="text-sm text-muted-foreground">A korábbi „completed” státusz nem jelent függetlenül igazolt végrehajtást.</p>{snapshot && snapshot.tasks.length === 0 && <p>Nincs nyilvántartott feladat.</p>}<div className="divide-y divide-border">{snapshot?.tasks.map((task) => <article key={task.id} className="py-4 flex flex-wrap justify-between gap-3"><div className="min-w-0"><h3 className="text-sm break-words">{task.title}</h3><p className="text-xs text-muted-foreground mt-1">{task.agent_slug} · {new Date(task.created_at).toLocaleString("hu-HU")}</p></div><span className="text-xs text-muted-foreground">{task.status} · nem igazolt</span></article>)}</div></div>}
    {view === "CONTROL" && <div className="space-y-6"><div className="flex gap-3 border-b border-border pb-5"><Shield className="text-accent shrink-0" /><div><h2 className="text-xl">Végrehajtási kapu zárva</h2><p className="text-sm text-muted-foreground mt-2">Az EMPYREAN nem indít autonóm író műveletet. A globális, szerveroldali vészleállítás és jóváhagyás még nem igazolt.</p></div></div><h3 className="text-sm">Vezetői szerepek</h3><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{executiveRoles.map((role) => <div key={role} className="border border-border p-3"><Activity size={16} className="text-muted-foreground mb-2" /><span>{role}</span><p className="text-xs text-muted-foreground mt-1">{snapshot?.agents.some((agent) => agent.role.toUpperCase() === role) ? "Nyilvántartva · jogkör nem igazolt" : "Bekötés nem igazolt"}</p></div>)}</div><Button variant="outline" onClick={() => onOpen("permissions")}><Shield size={16} className="mr-2" />Jogosultságok megnyitása</Button></div>}
  </section>;
}
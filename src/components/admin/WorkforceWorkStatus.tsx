import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Plan = { id: string; goal: string; status: string; risk: string; owner: string | null; due_date: string | null; created_at: string };
type Step = { id: string; plan_id: string; idx: number; task: string; owner: string; status: string; due_date: string | null; executed_at: string | null; result: string | null };
type Img = { id: string; plan_id: string; path: string; url?: string };

export const isTestPlan = (goal: string) => /pr[óo]ba|teszt|test/i.test(goal);
export const isOverdue = (due: string | null, done: boolean, now = new Date()) =>
  !!due && !done && new Date(due + "T23:59:59") < now;
const dur = (ms: number) => { const m = Math.round(ms / 60000); return m < 60 ? `${m} perc` : m < 1440 ? `${(m / 60).toFixed(1)} óra` : `${(m / 1440).toFixed(1)} nap`; };

const WorkforceWorkStatus = () => {
  const [plans, setPlans] = useState<Plan[]>([]); const [steps, setSteps] = useState<Step[]>([]); const [imgs, setImgs] = useState<Img[]>([]);
  const [showTest, setShowTest] = useState(false); const [open, setOpen] = useState<string | null>(null); const [r, setR] = useState(0);
  useEffect(() => { (async () => {
    const [p, s, i] = await Promise.all([
      supabase.from("workforce_plans").select("id,goal,status,risk,owner,due_date,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("workforce_plan_steps").select("id,plan_id,idx,task,owner,status,due_date,executed_at,result").order("idx"),
      supabase.from("workforce_plan_images").select("id,plan_id,path").order("created_at"),
    ]);
    setPlans((p.data ?? []) as Plan[]); setSteps((s.data ?? []) as Step[]);
    const list = (i.data ?? []) as Img[];
    if (list.length) { const { data } = await supabase.storage.from("workforce-images").createSignedUrls(list.map((x) => x.path), 3600); list.forEach((x, k) => (x.url = data?.[k]?.signedUrl)); }
    setImgs(list);
  })(); }, [r]);

  const upload = async (planId: string, files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) { toast.error("Csak kép tölthető fel"); continue; }
      const path = `${planId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("workforce-images").upload(path, f);
      if (up.error) { toast.error(up.error.message); continue; }
      const { error } = await supabase.from("workforce_plan_images").insert({ plan_id: planId, path });
      if (error) toast.error(error.message);
    }
    toast.success("Kép feltöltve"); setR((x) => x + 1);
  };
  const remove = async (img: Img) => {
    if (!confirm("Törlöd a képet?")) return;
    await supabase.storage.from("workforce-images").remove([img.path]);
    await supabase.from("workforce_plan_images").delete().eq("id", img.id); setR((x) => x + 1);
  };

  const shown = plans.filter((p) => showTest || !isTestPlan(p.goal));
  const ids = new Set(shown.map((p) => p.id));
  const all = steps.filter((s) => ids.has(s.plan_id)); const done = all.filter((s) => s.status === "done").length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const overdue = shown.filter((p) => isOverdue(p.due_date, p.status === "done")).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Munka állapot · mi készült el, mi van hátra</h2>
        <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={showTest} onChange={(e) => setShowTest(e.target.checked)} /> Próbatervek is</label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border border-border">
        {([[showTest ? "Összes terv" : "Valós terv", shown.length], ["Kész terv", shown.filter((p) => p.status === "done").length], ["Lejárt", overdue], ["Elkészült lépés", `${done} / ${all.length}`], ["Haladás", `${pct}%`]] as [string, string | number][]).map(([l, v]) =>
          <div key={l} className="bg-background p-3"><p className="text-[11px] text-muted-foreground">{l}</p><p className={`text-xl ${l === "Lejárt" && overdue ? "text-destructive" : ""}`}>{v}</p></div>)}
      </div>
      <div className="h-2 bg-muted"><div className="h-2 bg-accent" style={{ width: `${pct}%` }} /></div>
      <ul className="space-y-2 text-xs">
        {shown.map((p) => {
          const st = steps.filter((s) => s.plan_id === p.id); const ok = st.filter((s) => s.status === "done").length;
          const pp = st.length ? Math.round((ok / st.length) * 100) : 0; const late = isOverdue(p.due_date, p.status === "done");
          const onTime = st.filter((s) => s.status === "done" && (!s.due_date || (s.executed_at && s.executed_at.slice(0, 10) <= s.due_date))).length;
          const pi = imgs.filter((i) => i.plan_id === p.id);
          return (
            <li key={p.id} className={`border p-3 space-y-2 ${late ? "border-destructive" : "border-border"}`}>
              <button className="w-full text-left flex justify-between gap-2" onClick={() => setOpen(open === p.id ? null : p.id)}>
                <span className="font-medium">{p.goal}</span>
                <span className={`shrink-0 ${late ? "text-destructive font-medium" : "text-muted-foreground"}`}>{late ? "LEJÁRT" : p.status}</span>
              </button>
              <div className="h-1.5 bg-muted"><div className="h-1.5 bg-accent" style={{ width: `${pp}%` }} /></div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                <span>Kész: <strong className="text-foreground">{ok}/{st.length}</strong> ({pp}%)</span>
                <span>Tervszerű: {ok ? `${onTime}/${ok}` : "—"}</span>
                <span>Felelős: {p.owner || "—"}</span>
                <span className={late ? "text-destructive" : ""}>Határidő: {p.due_date ? new Date(p.due_date).toLocaleDateString("hu-HU") : "—"}</span>
                <span>Képek: {pi.length}</span>
              </div>
              {open === p.id && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <table className="w-full">
                    <thead><tr className="text-left text-muted-foreground"><th className="p-1">#</th><th className="p-1">Lépés</th><th className="p-1">Állapot</th><th className="p-1">Időtartam</th><th className="p-1">Tervszerű</th></tr></thead>
                    <tbody>{st.map((s, k) => {
                      const start = k === 0 ? p.created_at : st[k - 1].executed_at;
                      const d = s.executed_at && start ? dur(new Date(s.executed_at).getTime() - new Date(start).getTime()) : s.status === "pending" && start ? `fut: ${dur(Date.now() - new Date(start).getTime())}` : "—";
                      const ontime = s.status !== "done" ? (isOverdue(s.due_date, false) ? "késik" : "—") : !s.due_date || s.executed_at!.slice(0, 10) <= s.due_date ? "igen" : "késve";
                      return <tr key={s.id} className="border-t border-border align-top">
                        <td className="p-1">{s.idx + 1}</td>
                        <td className="p-1"><div>{s.task}</div><div className="text-muted-foreground">{s.owner}{s.result ? ` · ${s.result}` : ""}</div></td>
                        <td className={`p-1 ${s.status === "failed" ? "text-destructive" : ""}`}>{s.status === "done" ? "kész" : s.status === "failed" ? "hibás" : "vár"}</td>
                        <td className="p-1">{d}</td>
                        <td className={`p-1 ${ontime === "késik" || ontime === "késve" ? "text-destructive" : ""}`}>{ontime}</td>
                      </tr>; })}</tbody>
                  </table>
                  <div className="grid grid-cols-3 gap-2">
                    {pi.map((i) => <div key={i.id} className="relative"><img src={i.url} alt={p.goal} className="aspect-square w-full object-cover border border-border" /><button onClick={() => remove(i)} className="absolute top-0 right-0 bg-background px-1">✕</button></div>)}
                  </div>
                  <label className="inline-block border border-border px-3 py-2 cursor-pointer">Kép feltöltése<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(p.id, e.target.files)} /></label>
                </div>
              )}
            </li>
          );
        })}
        {shown.length === 0 && <li className="text-muted-foreground">Nincs valós munkaterv. Kapcsold be a „Próbatervek is” jelölőt.</li>}
      </ul>
    </div>
  );
};
export default WorkforceWorkStatus;

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Department } from "@/lib/ai-world";
import type { Staff } from "@/lib/workforce-roles";

// Valódi munkatárs profilja: név, beosztás, terület, eszközök, egyedi feladatok. Az AI-asszisztens ebből dolgozik.
export function WorkforceProfile({ dept, staff }: { dept: Department; staff?: Staff }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ full_name: "", title: "", area: "", tools: "", duties: "" });
  useEffect(() => { setF({ full_name: staff?.full_name ?? "", title: staff?.title ?? "", area: staff?.area ?? dept.name, tools: (staff?.tools ?? []).join(", "), duties: staff?.duties ?? "" }); }, [staff, dept.name]);
  const save = async () => {
    if (f.full_name.trim().length < 2) return toast.error("Add meg a munkatárs nevét");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("workforce_staff").upsert({ dept_id: dept.id, full_name: f.full_name.trim(), title: f.title.trim(), area: f.area.trim(), tools: f.tools.split(",").map(t => t.trim()).filter(Boolean).slice(0, 20), duties: f.duties.trim(), updated_by: u.user?.id, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Munkatárs mentve"); setEdit(false);
  };
  const inp = "w-full bg-muted px-3 py-2 text-sm";
  return (
    <section className="p-4 space-y-2 border-b border-border" aria-label="Munkatárs profil">
      <div className="flex items-center justify-between"><h3 className="font-display text-sm">Munkatárs · szerep és eszközök</h3><Button size="sm" variant="ghost" className="rounded-none h-7 text-xs" onClick={() => setEdit(!edit)}>{edit ? "Mégse" : staff ? "Szerkesztés" : "Munkatárs megadása"}</Button></div>
      {!edit && (staff ? <div className="text-xs space-y-1">
        <div className="text-sm">{staff.full_name}{staff.title && <span className="text-muted-foreground"> · {staff.title}</span>}</div>
        <div className="text-muted-foreground">Terület: {staff.area || dept.name}</div>
        <div>Szerep: {dept.roles.slice(0, 4).join(", ")}</div>
        {!!staff.tools.length && <div className="flex flex-wrap gap-1">{staff.tools.map(t => <span key={t} className="border border-border px-1.5 py-0.5">{t}</span>)}</div>}
        {staff.duties && <div className="whitespace-pre-wrap border-l-2 border-primary pl-2">{staff.duties}</div>}
      </div> : <p className="text-xs text-muted-foreground">Nincs megadva valódi munkatárs. Szerep: {dept.roles.slice(0, 4).join(", ")}.</p>)}
      {edit && <form className="space-y-2" onSubmit={e => { e.preventDefault(); save(); }}>
        <input aria-label="Név" placeholder="Név" maxLength={80} value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} className={inp} />
        <input aria-label="Beosztás" placeholder="Beosztás" maxLength={80} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className={inp} />
        <input aria-label="Terület" placeholder="Terület" maxLength={80} value={f.area} onChange={e => setF({ ...f, area: e.target.value })} className={inp} />
        <input aria-label="Eszközök" placeholder="Eszközök, vesszővel (pl. Canva, Meta Ads)" value={f.tools} onChange={e => setF({ ...f, tools: e.target.value })} className={inp} />
        <textarea aria-label="Egyedi feladatok" placeholder="Egyedi, rendszeres feladatok — soronként egy" rows={4} maxLength={2000} value={f.duties} onChange={e => setF({ ...f, duties: e.target.value })} className={inp} />
        <Button type="submit" size="sm" className="rounded-none">Mentés</Button>
      </form>}
    </section>
  );
}

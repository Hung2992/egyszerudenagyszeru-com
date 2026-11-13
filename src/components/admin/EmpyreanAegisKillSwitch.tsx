import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AEGIS_AGENTS, STATE_LABEL, reasonOk, type AgentState } from "@/lib/aegis-agents";

const STATES: AgentState[] = ["paused", "isolated", "revoked", "killed"];

export default function EmpyreanAegisKillSwitch() {
  const [map, setMap] = useState<Record<string, AgentState>>({});
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<string>("block");
  const load = useCallback(async () => {
    const { data: st } = await supabase.from("aegis_settings").select("input_mode").maybeSingle();
    if (st) setMode(st.input_mode);
    const { data } = await supabase.from("aegis_agent_controls").select("agent,state");
    setMap(Object.fromEntries((data ?? []).map((r) => [r.agent, r.state as AgentState])));
  }, []);
  useEffect(() => { void load(); }, [load]);
  const set = async (agent: string, state: AgentState) => {
    if (!reasonOk(map[agent] ?? "active", state, reason)) return toast.error(map[agent] === "killed" && state === "active" ? "Leállított ügynök újraindításához min. 20 karakteres indoklás kell" : "Indoklás kötelező (min. 5 karakter)");
    const { error } = await supabase.rpc("aegis_set_agent_state", { _agent: agent, _state: state, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success(`${agent === "*" ? "GLOBAL STOP" : agent}: ${STATE_LABEL[state]}`); load();
  };
  const setInput = async (m: "flag" | "block") => {
    const { error } = await supabase.rpc("aegis_set_input_mode", { _mode: m, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success(m === "block" ? "Szigorú mód: veszélyes kérések elutasítva" : "Figyelő mód: csak jelzés"); load();
  };
  const global = map["*"] ?? "active";
  const stopped = AEGIS_AGENTS.filter((a) => (map[a] ?? "active") !== "active").length;
  return (
    <section className="space-y-2" aria-labelledby="aegis-kill">
      <h2 id="aegis-kill" className="text-lg font-medium">AEGIS · AI vészleállítás</h2>
      <p className="text-xs text-muted-foreground">{AEGIS_AGENTS.length} ügynök · {stopped} megállítva. Minden váltás indoklással, naplózva. Ellenőrzés 15 másodpercen belül érvényes.</p>
      <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Indoklás (kötelező)" className="rounded-none h-8" />
      <div className={`border p-2 flex flex-wrap items-center gap-2 ${global !== "active" ? "border-destructive" : "border-border"}`}>
        <span className="text-sm font-medium">GLOBAL STOP</span>
        <span className={`text-xs ${global !== "active" ? "text-destructive" : "text-muted-foreground"}`}>{global === "active" ? "Minden AI fut" : "Minden AI leállítva"}</span>
        {global === "active"
          ? <Button size="sm" variant="destructive" className="rounded-none h-7 ml-auto" onClick={() => set("*", "killed")}>Teljes AI leállítás</Button>
          : <Button size="sm" className="rounded-none h-7 ml-auto" onClick={() => set("*", "active")}>Újraindítás</Button>}
      </div>
      <div className="border border-border p-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Bemenet-védelem</span>
        <span className={`text-xs ${mode === "block" ? "" : "text-destructive"}`}>{mode === "block" ? "Szigorú: a veszélyes kéréseket elutasítja" : "Figyelő: csak jelzi (gyengébb)"}</span>
        {mode === "block"
          ? <Button size="sm" variant="outline" className="rounded-none h-7 ml-auto" onClick={() => setInput("flag")}>Figyelő mód (indoklással)</Button>
          : <Button size="sm" className="rounded-none h-7 ml-auto" onClick={() => setInput("block")}>Szigorú mód</Button>}
      </div>
      <ul className="border border-border divide-y divide-border text-xs max-h-80 overflow-y-auto">
        {AEGIS_AGENTS.map((a) => {
          const st = map[a] ?? "active";
          return (
            <li key={a} className="p-2 flex flex-wrap items-center gap-1">
              <span className="font-medium break-all mr-auto">{a}</span>
              <span className={st === "active" ? "text-muted-foreground" : "text-destructive"}>{STATE_LABEL[st]}</span>
              {st === "active"
                ? STATES.map((s) => <button key={s} type="button" onClick={() => set(a, s)} className="border border-border px-1.5 py-0.5 hover:bg-muted">{STATE_LABEL[s]}</button>)
                : <button type="button" onClick={() => set(a, "active")} className="border border-border px-1.5 py-0.5 hover:bg-muted">Aktiválás</button>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

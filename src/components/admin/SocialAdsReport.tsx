import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/untyped-client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { BarChart3 } from "lucide-react";
type Report = { account: { name: string; currency: string; timezone_name: string }; rows: { spend: string; impressions: string; clicks: string; inline_link_clicks?: string }[]; checked_at: string };
export default function SocialAdsReport() {
  const today = new Date().toISOString().slice(0, 10);
  const [since, setSince] = useState(new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [until, setUntil] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("social-connections", { body: { action: "ads_report", since, until } });
    setBusy(false);
    if (error) { toast.error(error instanceof FunctionsHttpError ? await error.context.text() : error.message); return; }
    setReport(data);
  };
  const total = (key: "spend" | "impressions" | "clicks" | "inline_link_clicks") => report?.rows.reduce((sum, r) => sum + Number(r[key] ?? 0), 0) ?? 0;
  return <section className="space-y-4 border-t border-border pt-5"><h2 className="font-display text-xl">Facebook · költség és teljesítmény</h2><div className="flex flex-wrap gap-2"><Input className="w-44" type="date" aria-label="Hirdetési időszak kezdete" value={since} onChange={e => setSince(e.target.value)} /><Input className="w-44" type="date" aria-label="Hirdetési időszak vége" value={until} onChange={e => setUntil(e.target.value)} /><Button variant="outline" disabled={busy || !since || !until} onClick={() => void load()}><BarChart3 className="mr-2 h-4 w-4" />Valós teljesítmény lekérése</Button></div>{report && <><p className="text-xs text-muted-foreground">{report.account.name} · {report.account.currency} · fiókidőzóna: {report.account.timezone_name}</p>{!report.rows.length ? <p className="text-sm">Ebben az időszakban nincs rögzített hirdetési kiszolgálás.</p> : <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[["Költés", `${total("spend").toLocaleString("hu-HU")} ${report.account.currency}`], ["Megjelenés", total("impressions")], ["Összes kattintás", total("clicks")], ["Linkkattintás", total("inline_link_clicks")]].map(([name, value]) => <div key={name} className="border-b border-border py-3"><p className="text-xs text-muted-foreground">{name}</p><p className="font-display text-xl">{value}</p></div>)}</div>}</>}</section>;
}
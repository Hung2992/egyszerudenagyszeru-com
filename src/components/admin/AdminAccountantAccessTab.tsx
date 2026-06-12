import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Calculator, Mail, Trash2, Loader2, Copy, ExternalLink } from "lucide-react";
import AdminAuditExportCard from "./AdminAuditExportCard";

interface AccountantUser { user_id: string; email: string; granted_at: string; }
interface PendingInvite { id: string; email: string; invited_at: string; accepted_at: string | null; }

const AdminAccountantAccessTab = () => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [accountants, setAccountants] = useState<AccountantUser[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [a, p] = await Promise.all([
      supabase.rpc("list_accountants"),
      supabase.from("pending_accountant_invites").select("id,email,invited_at,accepted_at").order("invited_at", { ascending: false }),
    ]);
    setAccountants((a.data as AccountantUser[]) ?? []);
    setPending((p.data as PendingInvite[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const invite = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast({ title: "Érvénytelen email", variant: "destructive" });
      return;
    }
    setSending(true);
    setLastInviteLink(null);
    const { data, error } = await supabase.functions.invoke("invite-accountant", { body: { email: clean } });
    setSending(false);
    if (error || !data?.ok) {
      toast({ title: "Sikertelen meghívás", description: error?.message || data?.error || "Ismeretlen hiba", variant: "destructive" });
      return;
    }
    setEmail("");
    if (data.invite_link) setLastInviteLink(data.invite_link);
    toast({ title: "Meghívás elküldve", description: `${clean} most már regisztrálhat könyvelőként.` });
    await load();
  };

  const revoke = async (user_id: string, who: string) => {
    if (!confirm(`Biztos visszavonod a hozzáférést ettől: ${who}?`)) return;
    const { error } = await supabase.rpc("revoke_accountant", { _user_id: user_id });
    if (error) { toast({ title: "Sikertelen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Hozzáférés visszavonva" });
    await load();
  };

  const deleteInvite = async (id: string) => {
    await supabase.from("pending_accountant_invites").delete().eq("id", id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="border border-border p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 bg-accent/10 border border-accent flex items-center justify-center shrink-0">
            <Calculator className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Könyvelő hozzáférés</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Adj meg egy email címet; a könyvelő egy linket kap a regisztrációhoz. Belépés után csak a pénzügyi felületet (/konyvelo) láthatja, semmi mást.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <Input type="email" placeholder="konyvelo@pelda.hu" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sending} />
          <Button onClick={invite} disabled={sending || !email}>
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
            Meghívás küldése
          </Button>
        </div>

        {lastInviteLink && (
          <div className="mt-4 border border-accent/40 bg-accent/5 p-3 text-xs">
            <p className="font-bold uppercase tracking-wide text-accent mb-2">Egyszer használatos meghívó link (másold át ha az email nem érkezik meg):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate bg-background p-2 border border-border text-[11px]">{lastInviteLink}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(lastInviteLink); toast({ title: "Vágólapra másolva" }); }}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={lastInviteLink} target="_blank" rel="noopener"><ExternalLink className="h-3 w-3" /></a>
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="border border-border">
        <div className="p-4 border-b border-border bg-secondary/30">
          <h3 className="text-sm font-bold uppercase tracking-wide">Aktív könyvelők ({accountants.length})</h3>
        </div>
        {loading ? <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" /></div> : (
          accountants.length === 0
            ? <p className="p-6 text-xs text-muted-foreground text-center">Nincs aktív könyvelő</p>
            : <table className="w-full text-xs">
                <tbody>
                  {accountants.map(a => (
                    <tr key={a.user_id} className="border-t border-border">
                      <td className="p-3"><span className="font-bold">{a.email}</span></td>
                      <td className="p-3 text-muted-foreground">Hozzáadva: {new Date(a.granted_at).toLocaleDateString("hu-HU")}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => revoke(a.user_id, a.email)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Visszavonás
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}
      </div>

      <div className="border border-border">
        <div className="p-4 border-b border-border bg-secondary/30">
          <h3 className="text-sm font-bold uppercase tracking-wide">Függő meghívások ({pending.filter(p => !p.accepted_at).length})</h3>
        </div>
        {pending.length === 0 ? <p className="p-6 text-xs text-muted-foreground text-center">Nincs meghívás</p> : (
          <table className="w-full text-xs">
            <tbody>
              {pending.map(p => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-bold">{p.email}</td>
                  <td className="p-3 text-muted-foreground">
                    {p.accepted_at
                      ? <span className="text-accent">Elfogadva {new Date(p.accepted_at).toLocaleDateString("hu-HU")}</span>
                      : <span>Küldve {new Date(p.invited_at).toLocaleDateString("hu-HU")} — még nem regisztrált</span>}
                  </td>
                  <td className="p-3 text-right">
                    {!p.accepted_at && <Button size="sm" variant="ghost" onClick={() => deleteInvite(p.id)}><Trash2 className="h-3 w-3" /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border border-border p-4 bg-secondary/20 text-xs text-muted-foreground">
        <p className="font-bold text-foreground mb-1">Mit lát a könyvelő?</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Számlák (havi bontás, vevő, nettó/ÁFA/bruttó, PDF letöltés)</li>
          <li>Visszatérítések</li>
          <li>Beszerzési költségek</li>
          <li>ÁFA-összesítő kulcsonként</li>
          <li>Cégadatok (impresszum/számla fej)</li>
          <li>CSV export könyvelőprogramba</li>
        </ul>
        <p className="mt-2 font-bold text-foreground">Mit NEM lát:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Termékárazás, kedvezménystratégia, marketing</li>
          <li>AI-rendszer, képgenerálás, közösségi tartalmak</li>
          <li>Vásárlói profilok, jelszavak</li>
          <li>Bolti beállítások módosítása</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminAccountantAccessTab;

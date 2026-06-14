import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, CheckCircle2, XCircle, Clock, FileText, Eye } from "lucide-react";

interface KycRow {
  id: string;
  user_id: string;
  full_name: string;
  birth_name: string | null;
  birth_place: string;
  birth_date: string;
  mother_name: string;
  nationality: string;
  id_card_number: string;
  address_card_number: string;
  tax_id: string | null;
  address_country: string;
  address_zip: string;
  address_city: string;
  address_street: string;
  phone: string;
  email: string;
  bank_name: string;
  bank_account_holder: string;
  bank_account_number: string;
  company_name: string | null;
  company_tax_number: string | null;
  company_reg_number: string | null;
  id_card_front_url: string | null;
  id_card_back_url: string | null;
  address_card_url: string | null;
  selfie_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const AdminKycTab = () => {
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KycRow | null>(null);
  const [note, setNote] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const fetchRows = async () => {
    setLoading(true);
    const { data } = await supabase.from("tenant_kyc_submissions").select("*").order("created_at", { ascending: false });
    if (data) setRows(data as KycRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const openDetail = async (row: KycRow) => {
    setSelected(row);
    setNote(row.admin_note || "");
    const paths = [row.id_card_front_url, row.id_card_back_url, row.address_card_url, row.selfie_url].filter(Boolean) as string[];
    const urls: Record<string, string> = {};
    for (const p of paths) {
      const { data } = await supabase.storage.from("tenant-kyc").createSignedUrl(p, 600);
      if (data?.signedUrl) urls[p] = data.signedUrl;
    }
    setSignedUrls(urls);
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!selected) return;
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("tenant_kyc_submissions").update({
      status, admin_note: note || null, reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id,
    }).eq("id", selected.id);
    if (error) { toast({ title: "Hiba", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "approved" ? "Jóváhagyva" : "Elutasítva" });
    setSelected(null);
    fetchRows();
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Jóváhagyva</Badge>;
    if (s === "rejected") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Elutasítva</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Várakozik</Badge>;
  };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5" />
        <h2 className="font-bold text-lg">Bérlő KYC ellenőrzések</h2>
        <Badge variant="outline">{rows.filter(r => r.status === "pending").length} várakozik</Badge>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nincs beadott KYC.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="border p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.full_name}</span>
                  {statusBadge(r.status)}
                </div>
                <p className="text-xs text-muted-foreground">{r.email} · {r.phone} · {new Date(r.created_at).toLocaleString("hu")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openDetail(r)}><Eye className="w-4 h-4 mr-1" />Megtekint</Button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-card border p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent" />
                <h3 className="font-bold">{selected.full_name}</h3>
                {statusBadge(selected.status)}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Bezár</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Info label="Születési név" v={selected.birth_name} />
              <Info label="Anyja neve" v={selected.mother_name} />
              <Info label="Születési hely" v={selected.birth_place} />
              <Info label="Születési dátum" v={selected.birth_date} />
              <Info label="Állampolgárság" v={selected.nationality} />
              <Info label="Szem. ig. szám" v={selected.id_card_number} />
              <Info label="Lakcímkártya" v={selected.address_card_number} />
              <Info label="Adóazonosító" v={selected.tax_id} />
              <Info label="Lakcím" v={`${selected.address_country}, ${selected.address_zip} ${selected.address_city}, ${selected.address_street}`} full />
              <Info label="Telefon" v={selected.phone} />
              <Info label="E-mail" v={selected.email} />
              <Info label="Bank" v={selected.bank_name} />
              <Info label="Számlatulajdonos" v={selected.bank_account_holder} />
              <Info label="Számlaszám" v={selected.bank_account_number} full />
              {selected.company_name && <Info label="Cégnév" v={selected.company_name} />}
              {selected.company_tax_number && <Info label="Adószám" v={selected.company_tax_number} />}
              {selected.company_reg_number && <Info label="Cégjegyzék" v={selected.company_reg_number} />}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Dokumentumok</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { p: selected.id_card_front_url, l: "Szem.ig. elő" },
                  { p: selected.id_card_back_url, l: "Szem.ig. hát" },
                  { p: selected.address_card_url, l: "Lakcímkártya" },
                  { p: selected.selfie_url, l: "Selfie" },
                ].map(({ p, l }) => p ? (
                  <a key={p} href={signedUrls[p]} target="_blank" rel="noreferrer" className="border p-2 hover:bg-accent/5">
                    {signedUrls[p] && (signedUrls[p].includes(".pdf") ? (
                      <div className="flex items-center justify-center h-24 bg-muted"><FileText className="w-6 h-6" /></div>
                    ) : (
                      <img src={signedUrls[p]} alt={l} className="w-full h-24 object-cover" />
                    ))}
                    <p className="text-[10px] text-center mt-1">{l}</p>
                  </a>
                ) : null)}
              </div>
            </div>

            <div>
              <Label>Admin megjegyzés</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="mt-1" placeholder="Pl. elutasítás indoka..." />
            </div>

            {selected.status === "pending" && (
              <div className="flex gap-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => decide("approved")}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />Jóváhagyás
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => decide("rejected")}>
                  <XCircle className="w-4 h-4 mr-1" />Elutasítás
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{children}</p>
);

const Info = ({ label, v, full }: { label: string; v: string | null; full?: boolean }) => (
  <div className={full ? "sm:col-span-2" : ""}>
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="font-mono">{v || "—"}</p>
  </div>
);

export default AdminKycTab;

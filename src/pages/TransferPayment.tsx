// Átutalási oldal: a rendelés egyedi kulcsával megjeleníti a banki adatokat és a rendelés adatait.
// A partner (és admin) bejelentkezve frissítheti a rendelés / fizetés állapotát.
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";
import { Banknote, Copy, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

type TransferOrder = {
  order_number: string;
  total_huf: number;
  subtotal_huf: number;
  shipping_huf: number;
  status: string;
  payment_status: string;
  created_at: string;
  paid_at: string | null;
  customer_name: string;
  items: { title?: string; qty?: number; line_total_huf?: number }[];
  store_name: string;
  store_slug: string;
  bank: {
    bank_account_holder: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_iban: string | null;
    payment_instructions: string | null;
  };
};

const huf = (n: number) => `${Number(n || 0).toLocaleString("hu-HU")} Ft`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TransferPayment = () => {
  const { token: routeToken } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initial = routeToken || params.get("token") || "";
  const [token, setToken] = useState(initial);
  const [input, setInput] = useState(initial);
  const [order, setOrder] = useState<TransferOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (t: string) => {
    if (!UUID_RE.test(t)) {
      setNotFound(true);
      setOrder(null);
      return;
    }
    setLoading(true);
    setNotFound(false);
    const { data, error } = await supabase.rpc("get_transfer_order_public", { _transfer_access_token: t });
    if (error || !data) {
      setOrder(null);
      setNotFound(true);
    } else {
      setOrder(data as TransferOrder);
    }
    // Partneri / admin hozzáférés vizsgálata: RLS dönt, hogy látja-e a sort.
    const { data: own } = await supabase
      .from("partner_orders")
      .select("id")
      .eq("transfer_access_token", t)
      .maybeSingle();
    setOrderId((own as { id: string } | null)?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const updateStatus = async (patch: Record<string, unknown>, label: string) => {
    if (!orderId) return;
    setSaving(true);
    const { error } = await supabase.from("partner_orders").update(patch).eq("id", orderId);
    setSaving(false);
    if (error) {
      toast({ title: "Nem sikerült menteni", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: label });
    void load(token);
  };

  const bank = order?.bank;
  const hasBank = !!(bank && (bank.bank_account_number || bank.bank_iban));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Átutalási adatok | Rendelés befizetése</title>
        <meta name="description" content="Az egyedi rendelési kulccsal megtekinthetők az átutaláshoz szükséges banki adatok és a rendelés állapota." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-28 space-y-6">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Banknote className="h-6 w-6" /> Átutalási adatok
          </h1>
          <p className="text-sm text-muted-foreground">
            Add meg a rendeléshez kapott egyedi kulcsot. Az adatokat kizárólag a kulcs birtokosa látja.
          </p>
        </header>

        <Card className="space-y-3 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value.trim())}
              placeholder="Rendelési kulcs (pl. 78dfce6a-...)"
              aria-label="Rendelési kulcs"
            />
            <Button
              onClick={() => {
                setToken(input);
                navigate(input ? `/atutalas/${input}` : "/atutalas", { replace: true });
              }}
              disabled={!input || loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Megnyitás
            </Button>
          </div>
          {notFound && !loading && (
            <p className="text-sm text-destructive">Nem található átutalásos rendelés ezzel a kulccsal.</p>
          )}
        </Card>

        {order && (
          <>
            <Card className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">{order.store_name}</p>
                  <p className="text-lg font-semibold">{order.order_number}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{order.status}</Badge>
                  <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                    {order.payment_status === "paid" ? "Fizetve" : "Fizetésre vár"}
                  </Badge>
                </div>
              </div>
              <ul className="space-y-1 text-sm">
                {(order.items || []).map((it, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{it.qty} × {it.title}</span>
                    <span>{huf(Number(it.line_total_huf || 0))}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1 border-t pt-2 text-sm">
                <div className="flex justify-between"><span>Termékek</span><span>{huf(order.subtotal_huf)}</span></div>
                <div className="flex justify-between"><span>Szállítás</span><span>{huf(order.shipping_huf)}</span></div>
                <div className="flex justify-between font-semibold"><span>Fizetendő</span><span>{huf(order.total_huf)}</span></div>
              </div>
            </Card>

            <Card className="space-y-3 p-4">
              <h2 className="font-semibold">Banki adatok</h2>
              {hasBank ? (
                <div className="space-y-2 text-sm">
                  {[
                    ["Kedvezményezett", bank?.bank_account_holder],
                    ["Bank", bank?.bank_name],
                    ["Számlaszám", bank?.bank_account_number],
                    ["IBAN", bank?.bank_iban],
                  ].filter(([, v]) => !!v).map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between gap-3 border-b pb-2">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="flex items-center gap-2 font-medium">
                        {value}
                        <Button size="icon" variant="ghost" aria-label={`${label} másolása`} onClick={() => copyToClipboard(String(value))}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Közlemény</span>
                    <span className="flex items-center gap-2 font-medium">
                      {order.order_number}
                      <Button size="icon" variant="ghost" aria-label="Közlemény másolása" onClick={() => copyToClipboard(order.order_number)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </span>
                  </div>
                  {bank?.payment_instructions && (
                    <p className="pt-2 text-muted-foreground">{bank.payment_instructions}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  A bolt még nem adta meg a bankszámlaadatait. Vedd fel a kapcsolatot a bolttal a rendelési szám megadásával.
                </p>
              )}
            </Card>

            {orderId && (
              <Card className="space-y-3 p-4">
                <h2 className="font-semibold">Rendelés kezelése (partner)</h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={saving || order.payment_status === "paid"}
                    onClick={() => updateStatus({ payment_status: "paid", paid_at: new Date().toISOString(), status: "processing" }, "Fizetés rögzítve")}
                  >
                    Utalás megérkezett
                  </Button>
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => updateStatus({ status: "shipped", shipped_at: new Date().toISOString() }, "Feladva")}>
                    Feladva
                  </Button>
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => updateStatus({ status: "delivered", delivered_at: new Date().toISOString() }, "Kézbesítve")}>
                    Kézbesítve
                  </Button>
                  <Button size="sm" variant="ghost" disabled={saving} onClick={() => updateStatus({ status: "cancelled" }, "Lemondva")}>
                    Lemondás
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => load(token)} disabled={loading}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Frissítés
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TransferPayment;

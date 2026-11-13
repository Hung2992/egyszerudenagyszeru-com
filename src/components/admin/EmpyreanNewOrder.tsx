import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { huf } from "@/lib/empyrean-bi";

type P = { id: string; title: string; price_huf: number; stock_qty: number | null };
type Paid = { order_number: string; total_huf: number; paid_at: string; customer_name: string };

export default function EmpyreanNewOrder() {
  const [products, setProducts] = useState<P[]>([]);
  const [paid, setPaid] = useState<Paid[]>([]);
  const [f, setF] = useState({ product: "", qty: "1", name: "", email: "", ship: "0", pay: "bank_transfer" });
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const [p, o] = await Promise.all([
      supabase.from("partner_products").select("id,title,price_huf,stock_qty").eq("status", "active").order("title").limit(200),
      supabase.from("partner_orders").select("order_number,total_huf,paid_at,customer_name").not("paid_at", "is", null).order("paid_at", { ascending: false }).limit(50),
    ]);
    setProducts((p.data ?? []) as P[]); setPaid((o.data ?? []) as Paid[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const create = async () => {
    setMsg("");
    const { data, error } = await supabase.rpc("empyrean_create_order", { _product_id: f.product, _qty: Number(f.qty), _customer_name: f.name, _customer_email: f.email, _shipping_huf: Number(f.ship), _payment_method: f.pay } as never);
    if (error) { setMsg(error.message === "not enough stock" ? "Nincs elég készlet." : error.message === "invalid input" ? "Hibás adat (név, e-mail, mennyiség, szállítási díj)." : error.message); return; }
    const d = data as unknown as { order_number: string; total_huf: number };
    setMsg(`Rendelés létrehozva: ${d.order_number} · ${huf(d.total_huf)}. Feladás és kifizetés dátumát a Rendelések panelen add meg.`);
    await load();
  };
  return (
    <section className="space-y-3 border border-border p-4" aria-labelledby="new-order">
      <h2 id="new-order" className="text-lg font-medium">Új partnerrendelés</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <select aria-label="Termék" className="h-9 border border-input bg-background px-2 text-sm sm:col-span-2" value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })}>
          <option value="">Termék…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.title} · {huf(p.price_huf)}{p.stock_qty != null ? ` · készlet ${p.stock_qty}` : ""}</option>)}
        </select>
        <Input aria-label="Mennyiség" type="number" min={1} className="rounded-none h-9" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
        <Input aria-label="Szállítási díj (Ft)" type="number" min={0} placeholder="Szállítási díj (Ft)" className="rounded-none h-9" value={f.ship} onChange={(e) => setF({ ...f, ship: e.target.value })} />
        <Input aria-label="Vásárló neve" placeholder="Vásárló neve" className="rounded-none h-9" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input aria-label="Vásárló e-mail" type="email" placeholder="Vásárló e-mail" className="rounded-none h-9" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <select aria-label="Fizetési mód" className="h-9 border border-input bg-background px-2 text-sm" value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}>
          <option value="bank_transfer">Átutalás</option><option value="cod">Utánvét</option><option value="cash">Készpénz</option>
        </select>
        <Button size="sm" className="rounded-none h-9" disabled={!f.product || !f.name || !f.email} onClick={create}>Rendelés létrehozása</Button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      <h3 className="text-sm font-medium pt-2">Kifizetett rendelések</h3>
      {paid.length === 0 ? <p className="text-sm text-muted-foreground">Még nincs kifizetett rendelés.</p> :
        <ul className="divide-y divide-border border border-border text-sm">{paid.map((o) => (
          <li key={o.order_number} className="p-2 flex justify-between gap-2"><span className="truncate">{o.order_number} · {o.customer_name}</span><span className="shrink-0">{huf(o.total_huf)} · {o.paid_at.slice(0, 10)}</span></li>))}</ul>}
    </section>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { useCart } from "@/contexts/CartContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Gift, Search, Check, CreditCard } from "lucide-react";

const AMOUNTS = [5000, 10000, 15000, 25000, 50000];

const GiftCards = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<"buy" | "redeem">("buy");

  // Buy state
  const [amount, setAmount] = useState(10000);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  // Redeem state
  const [redeemCode, setRedeemCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [cardInfo, setCardInfo] = useState<any>(null);

  // My cards
  const [myCards, setMyCards] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchMyCards(session.user.id);
      }
    });
  }, []);

  const fetchMyCards = async (uid: string) => {
    const { data } = await (supabase.from("gift_cards" as any) as any)
      .select("*")
      .eq("purchased_by", uid)
      .order("created_at", { ascending: false });
    if (data) setMyCards(data);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "EDN-";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handlePurchase = async () => {
    if (!userId) { navigate("/auth"); return; }
    const finalAmount = customAmount ? parseInt(customAmount) : amount;
    if (!finalAmount || finalAmount < 1000) {
      toast({ title: "Minimum összeg: 1 000 Ft", variant: "destructive" });
      return;
    }

    setPurchasing(true);
    const code = generateCode();
    const { error } = await (supabase.from("gift_cards" as any) as any).insert({
      code,
      original_amount: finalAmount,
      balance: finalAmount,
      purchased_by: userId,
      recipient_name: recipientName || null,
      recipient_email: recipientEmail || null,
      message: message || null,
      status: "active",
    });

    setPurchasing(false);
    if (error) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ajándékutalvány megvásárolva! 🎉", description: `Kód: ${code}` });
      setRecipientName("");
      setRecipientEmail("");
      setMessage("");
      setCustomAmount("");
      fetchMyCards(userId);
    }
  };

  const handleCheckCard = async () => {
    if (!redeemCode.trim()) return;
    setChecking(true);
    const { data } = await (supabase.from("gift_cards" as any) as any)
      .select("*")
      .eq("code", redeemCode.toUpperCase().trim())
      .maybeSingle();

    setChecking(false);
    if (!data) {
      toast({ title: "Érvénytelen kód", variant: "destructive" });
      setCardInfo(null);
    } else {
      setCardInfo(data);
    }
  };

  const finalAmount = customAmount ? parseInt(customAmount) || 0 : amount;

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Ajándékozz</p>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">Ajándékutalvány</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setTab("buy")}
            className={`flex items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${
              tab === "buy" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Gift className="h-3.5 w-3.5" />
            Vásárlás
          </button>
          <button
            onClick={() => setTab("redeem")}
            className={`flex items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${
              tab === "redeem" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Egyenleg lekérdezés
          </button>
        </div>

        {tab === "buy" && (
          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Összeg kiválasztása
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setAmount(a); setCustomAmount(""); }}
                    className={`border p-3 text-center transition-all ${
                      !customAmount && amount === a
                        ? "border-accent bg-accent/10 text-foreground font-bold"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-sm font-semibold">{a.toLocaleString()}</span>
                    <span className="text-[10px] block">Ft</span>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">Egyedi összeg (Ft)</Label>
                <Input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="pl. 20000"
                  className="rounded-none h-11 text-sm"
                  min={1000}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Címzett (opcionális)
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">Név</Label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Ajándékozott neve"
                    className="rounded-none h-11 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">E-mail</Label>
                  <Input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="email@pelda.hu"
                    className="rounded-none h-11 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">Üzenet</Label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Boldog szülinapot! 🎂"
                  className="flex min-h-[80px] w-full border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
            </section>

            <div className="border border-accent/30 bg-accent/5 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Utalvány értéke</p>
                <p className="text-2xl font-bold text-accent">{finalAmount.toLocaleString()} Ft</p>
              </div>
              <Gift className="h-8 w-8 text-accent/50" />
            </div>

            <Button
              onClick={handlePurchase}
              disabled={purchasing || finalAmount < 1000}
              className="w-full rounded-none h-12 uppercase tracking-wider text-xs"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {purchasing ? "Vásárlás..." : `Utalvány vásárlása — ${finalAmount.toLocaleString()} Ft`}
            </Button>

            {/* My purchased cards */}
            {myCards.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                  Vásárolt utalványaim
                </h2>
                <div className="space-y-2">
                  {myCards.map((card: any) => (
                    <div key={card.id} className="border border-border p-4 flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-foreground tracking-wider">{card.code}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                          {new Date(card.created_at).toLocaleDateString("hu-HU")}
                          {card.recipient_name && ` — ${card.recipient_name}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-accent">{Number(card.balance).toLocaleString()} Ft</p>
                        <p className="text-[10px] text-muted-foreground">/ {Number(card.original_amount).toLocaleString()} Ft</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === "redeem" && (
          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Utalvány kód megadása
              </h2>
              <div className="flex gap-2">
                <Input
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="EDN-XXXXXXXX"
                  className="rounded-none h-11 font-mono uppercase tracking-wider text-sm"
                />
                <Button
                  variant="outline"
                  className="rounded-none uppercase tracking-wider text-xs shrink-0 h-11"
                  onClick={handleCheckCard}
                  disabled={checking}
                >
                  {checking ? "..." : "Lekérdezés"}
                </Button>
              </div>
            </section>

            {cardInfo && (
              <div className="border border-accent/30 bg-accent/5 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Gift className="h-8 w-8 text-accent" />
                  <div>
                    <p className="font-mono font-bold text-foreground text-lg tracking-wider">{cardInfo.code}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${
                      cardInfo.status === "active" ? "text-green-500" : "text-destructive"
                    }`}>
                      {cardInfo.status === "active" ? "Aktív" : "Felhasznált"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Egyenleg</p>
                    <p className="text-2xl font-bold text-accent">{Number(cardInfo.balance).toLocaleString()} Ft</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Eredeti érték</p>
                    <p className="text-lg font-semibold text-foreground">{Number(cardInfo.original_amount).toLocaleString()} Ft</p>
                  </div>
                </div>
                {cardInfo.expires_at && (
                  <p className="text-xs text-muted-foreground">
                    Érvényes: {new Date(cardInfo.expires_at).toLocaleDateString("hu-HU")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GiftCards;

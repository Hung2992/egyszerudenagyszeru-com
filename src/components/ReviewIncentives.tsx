import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Star, Gift, Send } from "lucide-react";

interface Props { userId: string; }

const ReviewIncentives = ({ userId }: Props) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetch = async () => {
    const { data } = await (supabase.from("review_incentives" as any) as any)
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setReviews(data || []);
    setLoaded(true);
  };

  useEffect(() => { fetch(); }, [userId]);

  const submit = async () => {
    if (!text.trim()) { toast({ title: "Írj véleményt!", variant: "destructive" }); return; }
    setSaving(true);
    const code = `REV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await (supabase.from("review_incentives" as any) as any).insert({
      user_id: userId, review_text: text, rating, reward_code: code, reward_claimed: false,
    });
    toast({ title: `Vélemény elküldve! Kuponkód: ${code}` });
    setText(""); setRating(5); setSaving(false);
    fetch();
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Star className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vélemény & jutalom</p>
      </div>
      <p className="text-[10px] text-muted-foreground">Írj véleményt és kapj kedvezménykupont cserébe!</p>

      <div className="border border-border p-3 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Értékelés</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)}
                className={`p-1 transition-colors ${s <= rating ? "text-accent" : "text-muted-foreground/30"}`}>
                <Star className="h-5 w-5" fill={s <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Vélemény</p>
          <Input value={text} onChange={e => setText(e.target.value)}
            placeholder="Oszd meg tapasztalatod..." className="rounded-none h-9 text-xs" />
        </div>
        <Button onClick={submit} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
          <Send className="h-3 w-3 mr-1" />{saving ? "Küldés..." : "Vélemény beküldése"}
        </Button>
      </div>

      {reviews.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Korábbi vélemények</p>
          {reviews.map((r: any) => (
            <div key={r.id} className="border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="h-3 w-3" fill={s <= r.rating ? "currentColor" : "none"}
                      strokeWidth={s <= r.rating ? 0 : 1.5}
                      style={{ color: s <= r.rating ? "hsl(var(--accent))" : undefined }} />
                  ))}
                </div>
                <span className="text-[9px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("hu-HU")}</span>
              </div>
              <p className="text-xs text-foreground">{r.review_text}</p>
              {r.reward_code && (
                <div className="flex items-center gap-1 mt-1.5">
                  <Gift className="h-3 w-3 text-accent" />
                  <span className="text-[10px] font-mono font-bold text-accent">{r.reward_code}</span>
                  {r.reward_claimed && <span className="text-[9px] text-muted-foreground ml-1">(beváltva)</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewIncentives;

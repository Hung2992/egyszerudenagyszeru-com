import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";

interface Props {
  productId: string;
  userId: string | null;
  onAuth: () => void;
}

const ProductWaitlist = ({ productId, userId, onAuth }: Props) => {
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const e = session?.user?.email || "";
      setEmail(e);
      if (e) {
        const { data } = await supabase
          .from("product_waitlist")
          .select("id")
          .eq("product_id", productId)
          .eq("email", e)
          .maybeSingle();
        setJoined(!!data);
      }
    };
    init();
  }, [productId, userId]);

  const toggleWaitlist = async () => {
    if (!userId || !email) { onAuth(); return; }
    setLoading(true);
    if (joined) {
      const { error } = await supabase
        .from("product_waitlist")
        .delete()
        .eq("product_id", productId)
        .eq("email", email);
      if (error) {
        toast({ title: "Hiba", description: error.message, variant: "destructive" });
      } else {
        setJoined(false);
        toast({ title: "Várólistáról levéve" });
      }
    } else {
      const { error } = await supabase.from("product_waitlist").insert({
        product_id: productId,
        email,
        user_id: userId,
        source: "product_page",
      });
      if (error) {
        toast({ title: "Hiba", description: error.message, variant: "destructive" });
      } else {
        setJoined(true);
        toast({ title: "Feliratkoztál a várólistára! ⏳", description: "Értesítünk, amint elérhető." });
      }
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggleWaitlist}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider py-2.5 border transition-colors ${
        joined
          ? "border-accent text-accent bg-accent/10 font-bold"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
      }`}
    >
      <Clock className="h-3 w-3" />
      {joined ? "Várólistán vagy ✓" : "Feliratkozás a várólistára"}
    </button>
  );
};

export default ProductWaitlist;

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Clock, Users } from "lucide-react";

interface Props {
  productId: string;
  userId: string | null;
  onAuth: () => void;
}

const ProductWaitlist = ({ productId, userId, onAuth }: Props) => {
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleWaitlist = async () => {
    if (!userId) { onAuth(); return; }
    setLoading(true);
    if (joined) {
      await (supabase.from("product_waitlists" as any) as any).delete().eq("user_id", userId).eq("product_id", productId);
      setJoined(false);
      toast({ title: "Várólistáról levéve" });
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      await (supabase.from("product_waitlists" as any) as any).insert({
        user_id: userId,
        product_id: productId,
        email: session?.user?.email || "",
      });
      setJoined(true);
      toast({ title: "Feliratkoztál a várólistára! ⏳", description: "Értesítünk, amint elérhető." });
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

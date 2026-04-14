import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Vote, BarChart3, Clock } from "lucide-react";

interface Poll {
  id: string;
  title: string;
  description: string | null;
  options: string[];
  ends_at: string | null;
}

interface Props {
  userId: string | null;
  onAuth: () => void;
}

const ProductPolls = ({ userId, onAuth }: Props) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<Record<string, number>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<number, number>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: pollsData } = await (supabase.from("product_polls" as any) as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);

      const ps = (pollsData || []).map((p: any) => ({
        ...p,
        options: Array.isArray(p.options) ? p.options : [],
      })) as Poll[];
      setPolls(ps);

      // Fetch user votes
      if (userId && ps.length > 0) {
        const { data: votes } = await (supabase.from("poll_votes" as any) as any)
          .select("poll_id, option_index")
          .eq("user_id", userId);
        const vMap: Record<string, number> = {};
        (votes || []).forEach((v: any) => { vMap[v.poll_id] = v.option_index; });
        setVotedPolls(vMap);
      }

      // Fetch all vote counts — we need a workaround since we can only see own votes
      // We'll count from the polls themselves or use a simple approach
      setLoading(false);
    };
    fetch();
  }, [userId]);

  const vote = async (pollId: string, optionIndex: number) => {
    if (!userId) { onAuth(); return; }
    if (votedPolls[pollId] !== undefined) {
      toast({ title: "Már szavaztál erre!", variant: "destructive" });
      return;
    }
    await (supabase.from("poll_votes" as any) as any).insert({
      poll_id: pollId,
      user_id: userId,
      option_index: optionIndex,
    });
    setVotedPolls(prev => ({ ...prev, [pollId]: optionIndex }));
    toast({ title: "Szavazat rögzítve! 🗳️" });
  };

  if (loading || polls.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Vote className="h-4 w-4 text-accent" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Közösségi szavazások
        </p>
      </div>
      {polls.map(poll => {
        const hasVoted = votedPolls[poll.id] !== undefined;
        return (
          <div key={poll.id} className="border border-border bg-card p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">{poll.title}</h3>
              {poll.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{poll.description}</p>
              )}
            </div>
            <div className="space-y-1.5">
              {poll.options.map((option: string, idx: number) => {
                const isSelected = votedPolls[poll.id] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => vote(poll.id, idx)}
                    disabled={hasVoted}
                    className={`w-full text-left px-3 py-2.5 text-xs border transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-accent bg-accent/10 text-accent font-bold"
                        : hasVoted
                        ? "border-border text-muted-foreground"
                        : "border-border text-foreground hover:border-accent/50 hover:bg-accent/5"
                    }`}
                  >
                    <span>{option}</span>
                    {isSelected && <span className="text-[10px]">✓ Szavazatod</span>}
                  </button>
                );
              })}
            </div>
            {poll.ends_at && (
              <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                Szavazás vége: {new Date(poll.ends_at).toLocaleDateString("hu-HU")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProductPolls;

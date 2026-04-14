import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Camera, Plus, X, Heart, User } from "lucide-react";

interface Lookbook {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_urls: string[];
  likes_count: number;
  created_at: string;
}

interface Props {
  userId: string | null;
  onAuth: () => void;
}

const CommunityLookbook = ({ userId, onAuth }: Props) => {
  const [lookbooks, setLookbooks] = useState<Lookbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchLookbooks = async () => {
    const { data } = await (supabase.from("community_lookbooks" as any) as any)
      .select("*").order("created_at", { ascending: false }).limit(20);
    setLookbooks((data || []) as Lookbook[]);
    setLoading(false);
  };

  useEffect(() => { fetchLookbooks(); }, []);

  const submit = async () => {
    if (!userId) { onAuth(); return; }
    if (!title.trim()) return;
    setSubmitting(true);
    const urls = imageUrl.trim() ? [imageUrl.trim()] : [];
    await (supabase.from("community_lookbooks" as any) as any).insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      image_urls: urls,
    });
    toast({ title: "Lookbook közzétéve! 📸" });
    setTitle(""); setDescription(""); setImageUrl("");
    setShowForm(false);
    setSubmitting(false);
    fetchLookbooks();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-accent" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Közösségi Lookbook
          </p>
        </div>
        <Button size="sm" variant="outline"
          className="rounded-none text-[10px] uppercase tracking-wider h-7"
          onClick={() => userId ? setShowForm(!showForm) : onAuth()}
        >
          <Plus className="h-3 w-3 mr-1" />
          Új outfit
        </Button>
      </div>

      {showForm && (
        <div className="border border-accent/30 bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">Új Outfit</p>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Outfit neve..." className="rounded-none h-9 text-xs" />
          <Textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Leírás, stílus tippek..." className="rounded-none min-h-[60px] text-xs resize-none" />
          <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
            placeholder="Kép URL (opcionális)..." className="rounded-none h-9 text-xs" />
          <Button onClick={submit} disabled={submitting || !title.trim()}
            className="rounded-none uppercase tracking-wider text-[10px] h-8">
            {submitting ? "Közzététel..." : "Megosztás"}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      ) : lookbooks.length === 0 ? (
        <div className="text-center py-8 border border-border bg-card">
          <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Még nincsenek outfit posztok</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {lookbooks.map(lb => (
            <div key={lb.id} className="border border-border bg-card overflow-hidden">
              {lb.image_urls?.[0] && (
                <img src={lb.image_urls[0]} alt={lb.title}
                  className="w-full h-48 object-cover" />
              )}
              <div className="p-3">
                <p className="text-sm font-bold text-foreground">{lb.title}</p>
                {lb.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lb.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <User className="h-3 w-3" />
                    {new Date(lb.created_at).toLocaleDateString("hu-HU")}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Heart className="h-3 w-3" />
                    {lb.likes_count}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommunityLookbook;

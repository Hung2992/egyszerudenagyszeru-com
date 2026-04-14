import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MessageCircle, Plus, X, ChevronDown, Send, User, Lightbulb, ShoppingBag, HelpCircle } from "lucide-react";
import ProductPolls from "@/components/ProductPolls";
import CommunityLookbook from "@/components/CommunityLookbook";

interface Post {
  id: string;
  user_id: string;
  product_id: string | null;
  title: string;
  content: string;
  post_type: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
}

interface Reply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

const POST_TYPES = [
  { value: "question", label: "Kérdés", icon: HelpCircle },
  { value: "tip", label: "Tipp", icon: Lightbulb },
  { value: "outfit", label: "Outfit", icon: ShoppingBag },
];

const Community = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("question");
  const [submitting, setSubmitting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);
      fetchPosts();
    };
    init();
  }, []);

  const fetchPosts = async () => {
    const { data } = await (supabase.from("community_posts" as any) as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts((data || []) as Post[]);
    setLoading(false);
  };

  const fetchReplies = async (postId: string) => {
    const { data } = await (supabase.from("community_replies" as any) as any)
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setReplies(prev => ({ ...prev, [postId]: (data || []) as Reply[] }));
  };

  const handleExpand = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!replies[postId]) fetchReplies(postId);
    }
  };

  const submitPost = async () => {
    if (!userId) { navigate("/auth"); return; }
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    await (supabase.from("community_posts" as any) as any).insert({
      user_id: userId,
      title: newTitle.trim(),
      content: newContent.trim(),
      post_type: newType,
    });
    toast({ title: "Bejegyzés közzétéve! ✓" });
    setNewTitle("");
    setNewContent("");
    setNewType("question");
    setShowNewPost(false);
    setSubmitting(false);
    fetchPosts();
  };

  const submitReply = async (postId: string) => {
    if (!userId) { navigate("/auth"); return; }
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    await (supabase.from("community_replies" as any) as any).insert({
      post_id: postId,
      user_id: userId,
      content: replyText.trim(),
    });
    toast({ title: "Válasz elküldve! ✓" });
    setReplyText("");
    setReplySubmitting(false);
    fetchReplies(postId);
  };

  const filtered = filterType === "all" ? posts : posts.filter(p => p.post_type === filterType);

  const getTypeInfo = (type: string) => POST_TYPES.find(t => t.value === type) || POST_TYPES[0];

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Közösség</p>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">Vásárlói Fórum</h1>
            <p className="text-xs text-muted-foreground mt-1">Kérdezz, ossz meg tippeket és outfit ötleteket</p>
          </div>
          <Button
            className="rounded-none uppercase tracking-wider text-[10px] h-9"
            onClick={() => userId ? setShowNewPost(true) : navigate("/auth")}
          >
            <Plus className="h-3 w-3 mr-1" />
            Új bejegyzés
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterType("all")}
            className={`text-[10px] uppercase tracking-widest px-3 py-1.5 border whitespace-nowrap transition-all ${
              filterType === "all" ? "bg-foreground text-background border-foreground font-bold" : "text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            Összes
          </button>
          {POST_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`flex items-center gap-1 text-[10px] uppercase tracking-widest px-3 py-1.5 border whitespace-nowrap transition-all ${
                filterType === t.value ? "bg-foreground text-background border-foreground font-bold" : "text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
            </button>
          ))}
        </div>

        {/* New Post Form */}
        {showNewPost && (
          <div className="border border-accent/30 bg-card p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-foreground">Új bejegyzés</p>
              <button onClick={() => setShowNewPost(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              {POST_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setNewType(t.value)}
                  className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-all ${
                    newType === t.value ? "border-accent text-accent font-bold bg-accent/10" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="h-3 w-3" />
                  {t.label}
                </button>
              ))}
            </div>
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Cím..."
              className="rounded-none h-10 text-sm"
            />
            <Textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Írd le a gondolatodat..."
              className="rounded-none min-h-[80px] text-sm resize-none"
            />
            <Button
              className="rounded-none uppercase tracking-wider text-[10px] h-9"
              onClick={submitPost}
              disabled={submitting || !newTitle.trim() || !newContent.trim()}
            >
              {submitting ? "Küldés..." : "Közzététel"}
            </Button>
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-border bg-card">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Még nincsenek bejegyzések</p>
            <Button
              variant="outline"
              className="rounded-none uppercase tracking-wider text-xs"
              onClick={() => userId ? setShowNewPost(true) : navigate("/auth")}
            >
              Légy az első!
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(post => {
              const typeInfo = getTypeInfo(post.post_type);
              const TypeIcon = typeInfo.icon;
              const isExpanded = expandedPost === post.id;
              const postReplies = replies[post.id] || [];

              return (
                <div key={post.id} className="border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => handleExpand(post.id)}
                    className="w-full p-4 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <TypeIcon className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] uppercase tracking-wider text-accent font-bold">{typeInfo.label}</span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString("hu-HU")}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-foreground">{post.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {post.replies_count} válasz
                          </span>
                          <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>

                      {postReplies.length > 0 && (
                        <div className="space-y-2 border-t border-border pt-3">
                          {postReplies.map(reply => (
                            <div key={reply.id} className="flex items-start gap-2 pl-4 border-l-2 border-accent/30">
                              <User className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />
                              <div>
                                <p className="text-xs text-foreground">{reply.content}</p>
                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                  {new Date(reply.created_at).toLocaleDateString("hu-HU")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {userId && (
                        <div className="flex gap-2 pt-2">
                          <Input
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Válaszolj..."
                            className="rounded-none h-9 text-xs flex-1"
                          />
                          <Button
                            size="sm"
                            className="rounded-none h-9 px-3"
                            onClick={() => submitReply(post.id)}
                            disabled={replySubmitting || !replyText.trim()}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Lookbook section */}
        <div className="mt-10 border-t border-border pt-8">
          <CommunityLookbook userId={userId} onAuth={() => navigate("/auth")} />
        </div>

        {/* Polls section */}
        <div className="mt-10 border-t border-border pt-8">
          <ProductPolls userId={userId} onAuth={() => navigate("/auth")} />
        </div>
      </div>
    </Layout>
  );
};

export default Community;

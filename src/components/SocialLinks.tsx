import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Share2, Plus, Trash2, Save } from "lucide-react";

const PLATFORMS = ["Instagram", "TikTok", "Facebook", "Pinterest", "YouTube", "X (Twitter)"];

interface Props { userId: string; }

const SocialLinks = ({ userId }: Props) => {
  const [links, setLinks] = useState<any[]>([]);
  const [platform, setPlatform] = useState("Instagram");
  const [username, setUsername] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchLinks = async () => {
    const { data } = await (supabase.from("social_links" as any) as any)
      .select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setLinks(data || []);
    setLoaded(true);
  };

  useEffect(() => { fetchLinks(); }, [userId]);

  const create = async () => {
    if (!username.trim()) { toast({ title: "Add meg a felhasználónevet!", variant: "destructive" }); return; }
    setSaving(true);
    await (supabase.from("social_links" as any) as any).insert({
      user_id: userId, platform, username, profile_url: profileUrl || null, is_public: isPublic,
    });
    toast({ title: "Social link hozzáadva! ✓" });
    setUsername(""); setProfileUrl(""); setShowForm(false); setSaving(false);
    fetchLinks();
  };

  const remove = async (id: string) => {
    await (supabase.from("social_links" as any) as any).delete().eq("id", id);
    toast({ title: "Link törölve" }); fetchLinks();
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-accent" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Social media</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="text-accent hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {showForm && (
        <div className="border border-border p-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Platform</p>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`text-[10px] px-2.5 py-1.5 border transition-all ${
                    platform === p ? "border-accent text-accent bg-accent/10 font-bold"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Felhasználónév</p>
            <Input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="@username" className="rounded-none h-9 text-xs" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Profil URL</p>
            <Input value={profileUrl} onChange={e => setProfileUrl(e.target.value)}
              placeholder="https://..." className="rounded-none h-9 text-xs" />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-foreground">Publikus profil</span>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <Button onClick={create} disabled={saving} className="rounded-none uppercase tracking-wider text-[10px] h-9 w-full">
            <Save className="h-3 w-3 mr-1" />{saving ? "Mentés..." : "Link hozzáadása"}
          </Button>
        </div>
      )}
      {links.length > 0 ? (
        <div className="space-y-2">
          {links.map((l: any) => (
            <div key={l.id} className="flex items-center justify-between border border-border p-3">
              <div>
                <p className="text-xs font-bold text-foreground">{l.platform}</p>
                <p className="text-[9px] text-accent">@{l.username}</p>
                {l.is_public && <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Publikus</span>}
              </div>
              <button onClick={() => remove(l.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <p className="text-xs text-muted-foreground text-center py-4">Még nincs social media linked</p>
      )}
    </div>
  );
};

export default SocialLinks;

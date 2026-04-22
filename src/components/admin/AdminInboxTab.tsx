import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { sendAppEmail } from "@/lib/app-email";
import {
  Inbox, Search, Star, Archive, Trash2, RefreshCw, Send, ArrowLeft,
  Mail, MailOpen, Reply, Loader2, Filter, CheckCheck, AlertCircle,
} from "lucide-react";

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string; // unread | read | replied
  is_starred: boolean;
  is_archived: boolean;
  reply_text: string | null;
  replied_at: string | null;
  created_at: string;
  read_at: string | null;
}

type Folder = "inbox" | "starred" | "replied" | "archived";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return d.toLocaleDateString("hu-HU", { weekday: "short" });
  return d.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
};

const initials = (name: string) =>
  name.split(/\s+/).map(s => s[0]?.toUpperCase() ?? "").slice(0, 2).join("") || "?";

const avatarColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h} 60% 45%)`;
};

export default function AdminInboxTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const loadMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Betöltési hiba", description: error.message, variant: "destructive" });
    } else {
      setMessages((data as Message[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel("contact_messages_inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    let list = messages;
    if (folder === "inbox") list = list.filter(m => !m.is_archived);
    else if (folder === "starred") list = list.filter(m => m.is_starred && !m.is_archived);
    else if (folder === "replied") list = list.filter(m => m.status === "replied" && !m.is_archived);
    else if (folder === "archived") list = list.filter(m => m.is_archived);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.subject || "").toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    }
    return list;
  }, [messages, folder, search]);

  const selected = useMemo(() => messages.find(m => m.id === selectedId) || null, [messages, selectedId]);
  const unreadCount = messages.filter(m => m.status === "unread" && !m.is_archived).length;
  const starredCount = messages.filter(m => m.is_starred && !m.is_archived).length;
  const repliedCount = messages.filter(m => m.status === "replied" && !m.is_archived).length;
  const archivedCount = messages.filter(m => m.is_archived).length;

  const openMessage = async (m: Message) => {
    setSelectedId(m.id);
    setReply("");
    if (m.status === "unread") {
      await supabase.from("contact_messages")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("id", m.id);
    }
  };

  const toggleStar = async (m: Message) => {
    await supabase.from("contact_messages").update({ is_starred: !m.is_starred }).eq("id", m.id);
  };

  const archiveMsg = async (m: Message) => {
    await supabase.from("contact_messages").update({ is_archived: !m.is_archived }).eq("id", m.id);
    if (selectedId === m.id) setSelectedId(null);
  };

  const deleteMsg = async (m: Message) => {
    if (!confirm("Biztosan törlöd ezt az üzenetet?")) return;
    await supabase.from("contact_messages").delete().eq("id", m.id);
    if (selectedId === m.id) setSelectedId(null);
    toast({ title: "Üzenet törölve" });
  };

  const markAllRead = async () => {
    const ids = messages.filter(m => m.status === "unread" && !m.is_archived).map(m => m.id);
    if (!ids.length) return;
    await supabase.from("contact_messages")
      .update({ status: "read", read_at: new Date().toISOString() })
      .in("id", ids);
    toast({ title: "Mindet olvasottnak jelölve" });
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await sendAppEmail({
        templateName: "contact-reply",
        recipientEmail: selected.email,
        idempotencyKey: `contact-reply-${selected.id}-${Date.now()}`,
        templateData: {
          name: selected.name,
          replyText: reply.trim(),
          originalMessage: selected.message,
          originalSubject: selected.subject || "",
        },
      });
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("contact_messages").update({
        status: "replied",
        reply_text: reply.trim(),
        replied_at: new Date().toISOString(),
        replied_by: userData.user?.id ?? null,
      }).eq("id", selected.id);
      toast({ title: "Válasz elküldve! ✉️", description: selected.email });
      setReply("");
    } catch (e: any) {
      toast({ title: "Küldési hiba", description: e?.message || "Próbáld újra", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const folders: { key: Folder; label: string; icon: any; count: number }[] = [
    { key: "inbox", label: "Beérkezett", icon: Inbox, count: unreadCount },
    { key: "starred", label: "Csillagozott", icon: Star, count: starredCount },
    { key: "replied", label: "Megválaszolt", icon: CheckCheck, count: repliedCount },
    { key: "archived", label: "Archív", icon: Archive, count: archivedCount },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wider flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent" /> Üzenetek
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Kapcsolati űrlapról érkezett üzenetek — Gmail-szerű felület
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead} className="rounded-none">
            <CheckCheck className="h-4 w-4 mr-1" /> Mind olvasott
          </Button>
          <Button variant="outline" size="sm" onClick={loadMessages} className="rounded-none">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Keresés név, email, tárgy vagy szöveg alapján..."
          className="pl-9 rounded-none h-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[600px]">
        {/* Sidebar */}
        <aside className="md:col-span-2 border border-border bg-card">
          <nav className="p-2 space-y-1">
            {folders.map(f => {
              const Icon = f.icon;
              const active = folder === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => { setFolder(f.key); setSelectedId(null); }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                    active ? "bg-accent text-accent-foreground font-bold" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {f.label}
                  </span>
                  {f.count > 0 && (
                    <Badge variant={active ? "secondary" : "default"} className="rounded-none text-[10px] h-5 px-1.5">
                      {f.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Message list */}
        <section className={`${selected ? "md:col-span-4 hidden md:block" : "md:col-span-10"} border border-border bg-card overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center h-full p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Nincs üzenet ebben a mappában</p>
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {filtered.map(m => {
                const isUnread = m.status === "unread";
                const isSelected = selectedId === m.id;
                return (
                  <li
                    key={m.id}
                    onClick={() => openMessage(m)}
                    className={`flex gap-3 p-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-accent/10 border-l-2 border-l-accent" : "hover:bg-muted/50"
                    } ${isUnread ? "bg-card" : ""}`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStar(m); }}
                      className="shrink-0 mt-1"
                      aria-label="Csillag"
                    >
                      <Star className={`h-4 w-4 ${m.is_starred ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                    </button>
                    <div
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: avatarColor(m.email) }}
                    >
                      {initials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${isUnread ? "font-bold" : "font-medium"}`}>
                          {m.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(m.created_at)}</span>
                      </div>
                      <p className={`text-xs truncate ${isUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {m.subject || "(nincs tárgy)"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {m.message.slice(0, 80)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {isUnread && <Badge className="rounded-none text-[9px] h-4 px-1 bg-accent text-accent-foreground">Új</Badge>}
                        {m.status === "replied" && <Badge variant="secondary" className="rounded-none text-[9px] h-4 px-1"><CheckCheck className="h-2.5 w-2.5 mr-0.5" />Megválaszolva</Badge>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Detail / Reply */}
        {selected && (
          <section className="md:col-span-6 border border-border bg-card flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="md:hidden rounded-none">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 ml-auto">
                <Button variant="ghost" size="sm" onClick={() => toggleStar(selected)} className="rounded-none" title="Csillag">
                  <Star className={`h-4 w-4 ${selected.is_starred ? "fill-accent text-accent" : ""}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => archiveMsg(selected)} className="rounded-none" title="Archiválás">
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMsg(selected)} className="rounded-none text-destructive" title="Törlés">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-bold">{selected.subject || "(nincs tárgy)"}</h3>
                {selected.status === "replied" && (
                  <Badge variant="secondary" className="rounded-none mt-1">
                    <CheckCheck className="h-3 w-3 mr-1" /> Megválaszolva
                  </Badge>
                )}
              </div>

              <div className="flex items-start gap-3 pb-4 border-b border-border">
                <div
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: avatarColor(selected.email) }}
                >
                  {initials(selected.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm">{selected.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(selected.created_at).toLocaleString("hu-HU")}
                    </span>
                  </div>
                  <a href={`mailto:${selected.email}`} className="text-xs text-accent hover:underline">
                    {selected.email}
                  </a>
                </div>
              </div>

              <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                {selected.message}
              </div>

              {selected.reply_text && (
                <div className="mt-6 border-l-2 border-accent pl-4 py-2 bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Reply className="h-3.5 w-3.5 text-accent" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      Válaszunk — {selected.replied_at && new Date(selected.replied_at).toLocaleString("hu-HU")}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap text-foreground">{selected.reply_text}</div>
                </div>
              )}
            </div>

            {/* Reply box */}
            <div className="p-4 border-t border-border bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Reply className="h-3.5 w-3.5" /> Válasz neki: <span className="font-mono text-foreground">{selected.email}</span>
              </div>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Írd ide a választ..."
                rows={5}
                className="w-full border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted-foreground">
                  Az e-mail a webshop branded sablonjával kerül kiküldésre.
                </p>
                <Button
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  className="rounded-none uppercase tracking-wider text-xs h-10"
                >
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  {sending ? "Küldés..." : "Válasz küldése"}
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

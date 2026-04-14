import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, HelpCircle, BookOpen, Check, X } from "lucide-react";

interface FAQ {
  id: string;
  product_id: string | null;
  question: string;
  answer: string | null;
  is_approved: boolean;
  sort_order: number;
  created_at: string;
}

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  is_published: boolean;
  view_count: number;
  created_at: string;
}

const AdminFaqKnowledgeTab = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "" });
  const [articleForm, setArticleForm] = useState({ title: "", content: "", category: "general" });
  const [editingFaq, setEditingFaq] = useState<string | null>(null);
  const [editAnswer, setEditAnswer] = useState("");

  const fetchData = async () => {
    const [fRes, aRes] = await Promise.all([
      supabase.from("product_faqs").select("*").order("created_at", { ascending: false }),
      supabase.from("knowledge_base_articles").select("*").order("created_at", { ascending: false }),
    ]);
    if (fRes.data) setFaqs(fRes.data as FAQ[]);
    if (aRes.data) setArticles(aRes.data as Article[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addFaq = async () => {
    if (!faqForm.question.trim()) return;
    const { error } = await supabase.from("product_faqs").insert({ question: faqForm.question, answer: faqForm.answer || null, is_approved: true });
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "GYIK hozzáadva" }); setShowFaqForm(false); setFaqForm({ question: "", answer: "" }); fetchData(); }
  };

  const approveFaq = async (id: string) => {
    await supabase.from("product_faqs").update({ is_approved: true }).eq("id", id);
    fetchData();
  };

  const saveFaqAnswer = async (id: string) => {
    await supabase.from("product_faqs").update({ answer: editAnswer, is_approved: true }).eq("id", id);
    setEditingFaq(null); fetchData();
  };

  const deleteFaq = async (id: string) => { await supabase.from("product_faqs").delete().eq("id", id); fetchData(); };

  const addArticle = async () => {
    if (!articleForm.title.trim()) return;
    const { error } = await supabase.from("knowledge_base_articles").insert(articleForm);
    if (error) toast({ title: "Hiba", description: error.message, variant: "destructive" });
    else { toast({ title: "Cikk létrehozva" }); setShowArticleForm(false); setArticleForm({ title: "", content: "", category: "general" }); fetchData(); }
  };

  const togglePublish = async (id: string, pub: boolean) => {
    await supabase.from("knowledge_base_articles").update({ is_published: pub }).eq("id", id);
    fetchData();
  };

  const deleteArticle = async (id: string) => { await supabase.from("knowledge_base_articles").delete().eq("id", id); fetchData(); };

  if (loading) return <p className="text-muted-foreground p-4">Betöltés...</p>;

  const pendingFaqs = faqs.filter(f => !f.is_approved);
  const approvedFaqs = faqs.filter(f => f.is_approved);

  return (
    <div className="space-y-8">
      {/* GYIK */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><HelpCircle className="w-5 h-5" /><h2 className="font-bold text-lg">Termék GYIK</h2></div>
          <Button size="sm" onClick={() => setShowFaqForm(!showFaqForm)}><Plus className="w-4 h-4 mr-1" /> Új kérdés</Button>
        </div>

        {showFaqForm && (
          <div className="border rounded-lg p-4 space-y-3">
            <div><Label>Kérdés</Label><Input value={faqForm.question} onChange={e => setFaqForm({ ...faqForm, question: e.target.value })} /></div>
            <div><Label>Válasz</Label><Textarea value={faqForm.answer} onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })} rows={3} /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addFaq}>Mentés</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowFaqForm(false)}>Mégse</Button>
            </div>
          </div>
        )}

        {pendingFaqs.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Jóváhagyásra vár ({pendingFaqs.length})</p>
            {pendingFaqs.map(f => (
              <div key={f.id} className="border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-3 space-y-2">
                <p className="font-medium text-sm">{f.question}</p>
                {editingFaq === f.id ? (
                  <div className="space-y-2">
                    <Textarea value={editAnswer} onChange={e => setEditAnswer(e.target.value)} rows={2} placeholder="Írj választ..." />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveFaqAnswer(f.id)}><Check className="w-3 h-3 mr-1" /> Mentés</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingFaq(null)}>Mégse</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingFaq(f.id); setEditAnswer(f.answer || ""); }}>Válaszolás</Button>
                    <Button size="sm" variant="ghost" onClick={() => approveFaq(f.id)}><Check className="w-3 h-3 mr-1" /> Jóváhagyás</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteFaq(f.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Table>
          <TableHeader><TableRow><TableHead>Kérdés</TableHead><TableHead>Válasz</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {approvedFaqs.map(f => (
              <TableRow key={f.id}>
                <TableCell className="font-medium text-sm">{f.question}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{f.answer || "–"}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => deleteFaq(f.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {approvedFaqs.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek jóváhagyott kérdések.</p>}
      </div>

      {/* Tudásbázis */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="w-5 h-5" /><h2 className="font-bold text-lg">Tudásbázis cikkek</h2></div>
          <Button size="sm" onClick={() => setShowArticleForm(!showArticleForm)}><Plus className="w-4 h-4 mr-1" /> Új cikk</Button>
        </div>

        {showArticleForm && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Cím</Label><Input value={articleForm.title} onChange={e => setArticleForm({ ...articleForm, title: e.target.value })} /></div>
              <div><Label>Kategória</Label><Input value={articleForm.category} onChange={e => setArticleForm({ ...articleForm, category: e.target.value })} placeholder="pl. szállítás, fizetés" /></div>
            </div>
            <div><Label>Tartalom</Label><Textarea value={articleForm.content} onChange={e => setArticleForm({ ...articleForm, content: e.target.value })} rows={6} /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addArticle}>Mentés</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowArticleForm(false)}>Mégse</Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader><TableRow><TableHead>Cím</TableHead><TableHead>Kategória</TableHead><TableHead>Megtekintés</TableHead><TableHead>Publikált</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {articles.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.title}</TableCell>
                <TableCell><Badge variant="outline">{a.category}</Badge></TableCell>
                <TableCell>{a.view_count}</TableCell>
                <TableCell><Switch checked={a.is_published} onCheckedChange={v => togglePublish(a.id, v)} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => deleteArticle(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {articles.length === 0 && <p className="text-sm text-muted-foreground">Nincsenek tudásbázis cikkek.</p>}
      </div>
    </div>
  );
};

export default AdminFaqKnowledgeTab;

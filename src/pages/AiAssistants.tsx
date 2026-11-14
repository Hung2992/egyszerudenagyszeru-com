import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { departments } from "@/lib/ai-world";

const AiAssistants = () => {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !isAdmin) navigate("/"); }, [loading, isAdmin, navigate]);
  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="p-4 border-b border-border">
        <Link to="/admin/ai-workforce" className="flex items-center gap-2 text-xs text-muted-foreground"><ArrowLeft className="h-3 w-3" /> AI WORKFORCE</Link>
        <h1 className="mt-2 font-display text-lg">AI asszisztensek</h1>
        <p className="text-xs text-muted-foreground">{departments.length} sziget · AEGIS őr alatt · minden munkatársnak saját oldala van</p>
      </header>
      <main className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => (
          <Link key={d.id} to={`/admin/ai-asszisztensek/${d.id}`}
            className="flex items-center gap-3 bg-background p-4 hover:bg-muted">
            <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-primary text-primary-foreground font-mono text-sm">{d.id}</div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm">{d.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{d.roles.slice(0, 3).join(", ")}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </main>
    </div>
  );
};

export default AiAssistants;

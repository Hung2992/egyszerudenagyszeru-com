import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import PartnerApprovalsPanel from "@/components/admin/PartnerApprovalsPanel";
import { ArrowLeft } from "lucide-react";

const PartnerApprovals = () => {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !isAdmin) navigate("/"); }, [loading, isAdmin, navigate]);
  if (loading || !isAdmin) return <div className="min-h-screen flex items-center justify-center">…</div>;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-4">
        <Link to="/admin" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest"><ArrowLeft className="h-3 w-3" /> Admin</Link>
        <PartnerApprovalsPanel />
      </div>
    </div>
  );
};
export default PartnerApprovals;

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RetryCardProps {
  title?: string;
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

/**
 * Compact error card with retry action — for section-level Supabase failures
 * that shouldn't take down the whole page.
 */
export const RetryCard = ({
  title = "Nem sikerült betölteni",
  message = "Átmeneti hálózati hiba. Kérlek próbáld újra.",
  onRetry,
  isRetrying,
}: RetryCardProps) => (
  <div className="border border-border/60 bg-secondary/30 p-6 text-center">
    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
      {title}
    </h3>
    <p className="mt-2 text-xs text-muted-foreground">{message}</p>
    <Button
      variant="outline"
      size="sm"
      onClick={onRetry}
      disabled={isRetrying}
      className="mt-4 rounded-none uppercase tracking-[0.2em] text-[10px]"
    >
      <RefreshCw className={`mr-2 h-3 w-3 ${isRetrying ? "animate-spin" : ""}`} />
      Újrapróbálás
    </Button>
  </div>
);

export default RetryCard;
